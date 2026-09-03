import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './server/db.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '64kb' }));

// -------------------------------------------------------
// Public endpoint safety: rate limiting + strict payloads
// -------------------------------------------------------
type PublicRateEntry = { count: number; resetAt: number };
const publicRateStore = new Map<string, PublicRateEntry>();

function publicRateLimit(name: string, windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const clientKey = `${name}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const current = publicRateStore.get(clientKey);
    if (!current || current.resetAt <= now) {
      publicRateStore.set(clientKey, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (current.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
    }
    current.count += 1;
    return next();
  };
}

const publicReservationLimiter = publicRateLimit('reservation', 10 * 60 * 1000, 10);
const publicRoomServiceLimiter = publicRateLimit('room-service', 10 * 60 * 1000, 30);

function cleanText(value: unknown, field: string, maxLength: number, required = true): string {
  if (value == null || value === '') {
    if (required) throw new Error(`${field} é obrigatório.`);
    return '';
  }
  if (typeof value !== 'string') throw new Error(`${field} inválido.`);
  const cleaned = value.trim();
  if (required && !cleaned) throw new Error(`${field} é obrigatório.`);
  if (cleaned.length > maxLength) throw new Error(`${field} excede o tamanho permitido.`);
  return cleaned;
}

function positiveInteger(value: unknown, field: string, min: number, max: number): number {
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) {
    throw new Error(`${field} inválido.`);
  }
  return Number(value);
}

function strictDate(value: unknown, field: string): string {
  const date = cleanText(value, field, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${field} inválida.`);
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`${field} inválida.`);
  }
  return date;
}

function sanitizePublicReservation(body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dados da reserva inválidos.');
  const guestName = cleanText(body.guestName, 'Nome do hóspede', 120);
  const guestEmail = cleanText(body.guestEmail, 'E-mail', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) throw new Error('E-mail inválido.');
  const guestPhone = cleanText(body.guestPhone, 'Telefone', 40);
  const document = cleanText(body.document, 'Documento', 80, false) || undefined;
  const roomTypeId = cleanText(body.roomTypeId, 'Tipo de quarto', 80);
  const checkInDate = strictDate(body.checkInDate, 'Data de check-in');
  const checkOutDate = strictDate(body.checkOutDate, 'Data de check-out');
  const checkIn = new Date(`${checkInDate}T12:00:00Z`);
  const checkOut = new Date(`${checkOutDate}T12:00:00Z`);
  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
  if (nights < 1 || nights > 60) throw new Error('O período da reserva deve ter entre 1 e 60 noites.');
  const adults = positiveInteger(body.adults, 'Número de adultos', 1, 10);
  const children = positiveInteger(body.children, 'Número de crianças', 0, 10);
  const allowedPaymentMethods = ['PIX', 'Cartao_Credito', 'Cartao_Debito', 'Dinheiro'];
  const paymentMethod = cleanText(body.paymentMethod, 'Forma de pagamento', 40);
  if (!allowedPaymentMethods.includes(paymentMethod)) throw new Error('Forma de pagamento não permitida para reserva online.');
  const notes = cleanText(body.notes, 'Observações', 1000, false) || undefined;
  return { guestName, guestEmail, guestPhone, document, roomTypeId, checkInDate, checkOutDate, adults, children, paymentMethod, notes };
}

function sanitizePublicOrder(body: any) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Dados do pedido inválidos.');
  const roomId = cleanText(body.roomId, 'Quarto', 80);
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) {
    throw new Error('O pedido deve conter entre 1 e 20 itens.');
  }
  const items = body.items.map((item: any) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Item do pedido inválido.');
    return {
      menuItemId: cleanText(item.menuItemId, 'Item do cardápio', 80),
      quantity: positiveInteger(item.quantity, 'Quantidade', 1, 20),
      notes: cleanText(item.notes, 'Observação do item', 300, false) || undefined
    };
  });
  const destination = cleanText(body.destination, 'Destino', 30);
  if (!['Quarto', 'Restaurante', 'Piscina'].includes(destination)) throw new Error('Destino inválido.');
  const deliverySector = cleanText(body.deliverySector, 'Setor de entrega', 30);
  if (!['Cozinha', 'Room Service'].includes(deliverySector)) throw new Error('Setor de entrega inválido.');
  const specialInstructions = cleanText(body.specialInstructions, 'Instruções especiais', 1000, false) || undefined;
  return { roomId, items, destination, deliverySector, specialInstructions };
}

// -------------------------------------------------------
// Authentication middleware (Supabase Bearer token)
// -------------------------------------------------------
async function requireSupabaseAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authorization = req.header('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return res.status(401).json( { error: 'Autenticação obrigatória.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({
        error: 'Autenticação segura indisponível: Supabase não configurado no servidor.'
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data, error } = await authClient.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }

    const email = data.user.email;
    const staffUser = email ? dbManager.getUserByEmail(email) : undefined;
    if (!staffUser || staffUser.status !== 'Ativo') {
      return res.status(403).json({ error: 'Colaborador sem perfil ativo no hotel.' });
    }

    (req as Request & { authUser?: { id: string; email?: string; staffUser?: any } }).authUser = {
      id: data.user.id,
      email,
      staffUser
    };

    next();
  } catch (err) {
    console.error('[Auth] Bearer validation failure:', err);
    return res.status(401).json({ error: 'Não foi possível validar a sessão.' });
  }
}

function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authUser = (req as Request & { authUser?: { staffUser?: any } }).authUser;
    const staffUser = authUser?.staffUser;
    if (!staffUser) {
      return res.status(401).json({ error: 'Autenticação obrigatória.' });
    }
    if (staffUser.role === 'admin' || staffUser.permissions?.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: 'Permissão insuficiente para esta operação.' });
  };
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public hotel presentation settings (sanitized)
app.get('/api/public/settings', (req: Request, res: Response) => {
  try {
    const settings = dbManager.getSettings();
    const { hotelName, tagline, address, phone, email, currency, roomTypes, amenities, taxes, checkInTime, checkOutTime, logoUrl, primaryColor, secondaryColor } = settings as any;
    res.json({ hotelName, tagline, address, phone, email, currency, roomTypes, amenities, taxes, checkInTime, checkOutTime, logoUrl, primaryColor, secondaryColor });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Settings (Front-end configurável)
app.get('/api/settings', requireSupabaseAuth, requirePermission('manage_settings'), (req: Request, res: Response) => {
  try {
    const settings = dbManager.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', requireSupabaseAuth, requirePermission('manage_settings'), (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supabase Status & SQL Schema Generator
app.get('/api/supabase/status', requireSupabaseAuth, requirePermission('manage_settings'), (req: Request, res: Response) => {
  try {
    const status = dbManager.getSupabaseStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supabase/schema-sql', requireSupabaseAuth, requirePermission('manage_settings'), (req: Request, res: Response) => {
  try {
    const sql = dbManager.getSupabaseSchemaSQL();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/reconnect', requireSupabaseAuth, requirePermission('manage_settings'), (req: Request, res: Response) => {
  try {
    dbManager.initSupabaseClient();
    const status = dbManager.getSupabaseStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Guests (Cadastro de Hóspedes)
app.get('/api/guests', requireSupabaseAuth, requirePermission('view_guests'), (req: Request, res: Response) => {
  try {
    const guests = dbManager.getGuests();
    res.json(guests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guests', requireSupabaseAuth, requirePermission('manage_guests'), (req: Request, res: Response) => {
  try {
    const guest = dbManager.createGuest(req.body);
    res.status(201).json(guest);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/guests/:id', requireSupabaseAuth, requirePermission('manage_guests'), (req: Request, res: Response) => {
  try {
    const guest = dbManager.updateGuest(req.params.id, req.body);
    if (!guest) return res.status(404).json({ error: 'Hóspede não encontrado.' });
    res.json(guest);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/guests/:id', requireSupabaseAuth, requirePermission('manage_guests'), (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteGuest(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Hóspede não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rooms
app.get('/api/rooms', requireSupabaseAuth, requirePermission('view_rooms'), (req: Request, res: Response) => {
  try {
    const rooms = dbManager.getRooms();
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', requireSupabaseAuth, requirePermission('manage_rooms'), (req: Request, res: Response) => {
  try {
    const room = dbManager.createRoom(req.body);
    res.status(201).json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/rooms/:id', requireSupabaseAuth, requirePermission('manage_rooms'), (req: Request, res: Response) => {
  try {
    const room = dbManager.updateRoom(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/rooms/:id/status', requireSupabaseAuth, requirePermission('manage_rooms'), (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const room = dbManager.updateRoomStatus(req.params.id, status, notes);
    if (!room) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/rooms/:id', requireSupabaseAuth, requirePermission('manage_rooms'), (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteRoom(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reservations (Online Booking Engine & Internal)
app.get('/api/reservations', requireSupabaseAuth, requirePermission('view_checkinout'), (req: Request, res: Response) => {
  try {
    const reservations = dbManager.getReservations();
    res.json(reservations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', publicReservationLimiter, (req: Request, res: Response) => {
  try {
    const payload = sanitizePublicReservation(req.body);
    const reservation = dbManager.createReservation(payload as any);
    res.status(201).json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/reservations/:id', requireSupabaseAuth, requirePermission('manage_checkinout'), (req: Request, res: Response) => {
  try {
    const reservation = dbManager.updateReservation(req.params.id, req.body);
    if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });
    res.json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Check-in & Check-out Flows
app.post('/api/checkin', requireSupabaseAuth, requirePermission('manage_checkinout'), (req: Request, res: Response) => {
  try {
    const result = dbManager.processCheckIn(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/checkout', requireSupabaseAuth, requirePermission('manage_checkinout'), (req: Request, res: Response) => {
  try {
    const result = dbManager.processCheckOut(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Minibar (Frigobar)
app.get('/api/minibar/items', requireSupabaseAuth, requirePermission('view_fnb'), (req: Request, res: Response) => {
  try {
    const items = dbManager.getMinibarItems();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/minibar/items', requireSupabaseAuth, requirePermission('manage_fnb'), (req: Request, res: Response) => {
  try {
    const item = dbManager.createMinibarItem(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/minibar/items/:id', requireSupabaseAuth, requirePermission('manage_fnb'), (req: Request, res: Response) => {
  try {
    const item = dbManager.updateMinibarItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item de frigobar não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/minibar/items/:id/restock', requireSupabaseAuth, requirePermission('manage_fnb'), (req: Request, res: Response) => {
  try {
    const { quantityToAdd } = req.body;
    const item = dbManager.restockMinibarItem(req.params.id, quantityToAdd);
    if (!item) return res.status(404).json({ error: 'Item de frigobar não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/minibar/items/:id', requireSupabaseAuth, requirePermission('manage_fnb'), (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteMinibarItem(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Item de frigobar não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/minibar/consumptions', requireSupabaseAuth, requirePermission('view_fnb'), (req: Request, res: Response) => {
  try {
    const roomId = req.query.roomId as string | undefined;
    const consumptions = dbManager.getRoomConsumptions(roomId);
    res.json(consumptions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/minibar/consumptions', requireSupabaseAuth, requirePermission('manage_fnb'), (req: Request, res: Response) => {
  try {
    const consumption = dbManager.registerMinibarConsumption(req.body);
    res.status(201).json(consumption);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Kitchen & Room Service (Cozinha & Room Service)
app.get('/api/kitchen/menu', (req: Request, res: Response) => {
  try {
    const menu = dbManager.getMenuItems();
    res.json(menu);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/kitchen/orders', requireSupabaseAuth, requirePermission('view_fnb'), (req: Request, res: Response) => {
  try {
    const orders = dbManager.getOrders();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kitchen/orders', publicRoomServiceLimiter, (req: Request, res: Response) => {
  try {
    const payload = sanitizePublicOrder(req.body);
    const order = dbManager.createOrder(payload as any);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/kitchen/orders/:id/status', requireSupabaseAuth, requirePermission('manage_fnb'), (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = dbManager.updateOrderStatus(req.params.id, status);
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado.' });
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Kanbans por Setor em Tempo Real
app.get('/api/tasks', requireSupabaseAuth, requirePermission('view_kanbans'), (req: Request, res: Response) => {
  try {
    const sector = req.query.sector as any;
    const tasks = dbManager.getTasks(sector);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', requireSupabaseAuth, (req: Request, res: Response) => {
  try {
    const task = dbManager.createTask(req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', requireSupabaseAuth, (req: Request, res: Response) => {
  try {
    const task = dbManager.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', requireSupabaseAuth, (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteTask(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Financial Control & Stats (Faturamento e Controle Financeiro)
app.get('/api/financial/transactions', requireSupabaseAuth, requirePermission('view_financial'), (req: Request, res: Response) => {
  try {
    const transactions = dbManager.getTransactions();
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/financial/transactions', requireSupabaseAuth, requirePermission('manage_financial'), (req: Request, res: Response) => {
  try {
    const tx = dbManager.createTransaction(req.body);
    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/financial/stats', requireSupabaseAuth, requirePermission('view_financial'), (req: Request, res: Response) => {
  try {
    const stats = dbManager.getFinancialStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Integrated Real-Time Inventory & Kardex Routes
// -------------------------------------------------------------
app.get('/api/inventory/items', requireSupabaseAuth, requirePermission('view_inventory'), (req: Request, res: Response) => {
  try {
    const sector = req.query.sector as string | undefined;
    const lowStockOnly = req.query.lowStock === 'true';
    const items = dbManager.getInventoryItems(sector, lowStockOnly);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/items/:id', requireSupabaseAuth, requirePermission('view_inventory'), (req: Request, res: Response) => {
  try {
    const item = dbManager.getInventoryItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/items', requireSupabaseAuth, requirePermission('manage_inventory'), (req: Request, res: Response) => {
  try {
    const item = dbManager.createInventoryItem(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/inventory/items/:id', requireSupabaseAuth, requirePermission('manage_inventory'), (req: Request, res: Response) => {
  try {
    const item = dbManager.updateInventoryItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/inventory/items/:id', requireSupabaseAuth, requirePermission('manage_inventory'), (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteInventoryItem(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/movements', requireSupabaseAuth, requirePermission('manage_inventory'), (req: Request, res: Response) => {
  try {
    const result = dbManager.registerStockMovement(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/inventory/movements', requireSupabaseAuth, requirePermission('view_inventory'), (req: Request, res: Response) => {
  try {
    const { itemId, sector, type, limit } = req.query;
    const movements = dbManager.getStockMovements({
      itemId: itemId as string | undefined,
      sector: sector as string | undefined,
      type: type as string | undefined,
      limit: limit ? Number(limit) : undefined
    });
    res.json(movements);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/stats', requireSupabaseAuth, requirePermission('view_inventory'), (req: Request, res: Response) => {
  try {
    const stats = dbManager.getInventoryStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/replenish-order', requireSupabaseAuth, requirePermission('manage_inventory'), (req: Request, res: Response) => {
  try {
    const { itemIds } = req.body || {};
    const result = dbManager.generateReplenishmentOrders(itemIds);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// Staff Users & Supabase Auth RBAC Endpoints
// -------------------------------------------------------------
app.get('/api/auth/me', requireSupabaseAuth, (req: Request, res: Response) => {
  const authUser = (req as Request & { authUser?: { staffUser?: any } }).authUser;
  res.json(authUser?.staffUser);
});

app.get('/api/users', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const users = dbManager.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const newUser = dbManager.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const success = dbManager.deleteUser(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Login endpoint: credentials are always verified by Supabase Auth.
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return res.status(503).json({
        error: 'Autenticação segura indisponível: configure SUPABASE_URL e SUPABASE_ANON_KEY no servidor.'
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const verifiedEmail = authData.user.email;
    if (!verifiedEmail) {
      return res.status(401).json({ error: 'Conta autenticada sem e-mail válido.' });
    }

    const user = dbManager.getUserByEmail(verifiedEmail);

    // Supabase identity alone never grants hotel staff access.
    // A staff profile must be provisioned beforehand by an authorized manager/admin.
    if (!user) {
      return res.status(403).json({
        error: 'Conta autenticada, mas sem perfil de colaborador autorizado neste hotel.'
      });
    }

    if (user.status !== 'Ativo') {
      return res.status(403).json({ error: `Usuário encontra-se ${user.status.toLowerCase()}. Acesso bloqueado.` });
    }

    const updatedUser = dbManager.updateUser(user.id, {
      lastLoginAt: new Date().toISOString(),
      supabaseAuthId: authData.user.id
    });

    res.json({
      user: updatedUser,
      token: authData.session.access_token
    });
  } catch (err: any) {
    console.error('[Auth] Login failure:', err);
    res.status(500).json({ error: 'Falha interna ao autenticar usuário.' });
  }
});

app.post('/api/auth/register', requireSupabaseAuth, requirePermission('manage_users'), (req: Request, res: Response) => {
  try {
    const { email, fullName, role, sector, phone, permissions, supabaseAuthId } = req.body;
    if (!email || !fullName) {
      return res.status(400).json({ error: 'E-mail e Nome Completo são obrigatórios.' });
    }

    const newUser = dbManager.createUser({
      email,
      fullName,
      role: role || 'recepcionista',
      sector: sector || 'Recepcao',
      status: 'Ativo',
      phone: phone || '',
      permissions: permissions || ['view_rooms', 'view_checkinout', 'manage_checkinout', 'view_guests'],
      supabaseAuthId
    });

    res.status(201).json({ user: newUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});


// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SaaS Hoteleiro Server] Running on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
});