import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { dbManager } from './server/db.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Settings (Front-end configurável)
app.get('/api/settings', (req: Request, res: Response) => {
  try {
    const settings = dbManager.getSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateSettings(req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Supabase Status & SQL Schema Generator
app.get('/api/supabase/status', (req: Request, res: Response) => {
  try {
    const status = dbManager.getSupabaseStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/supabase/schema-sql', (req: Request, res: Response) => {
  try {
    const sql = dbManager.getSupabaseSchemaSQL();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(sql);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/supabase/reconnect', (req: Request, res: Response) => {
  try {
    dbManager.initSupabaseClient();
    const status = dbManager.getSupabaseStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Guests (Cadastro de Hóspedes)
app.get('/api/guests', (req: Request, res: Response) => {
  try {
    const guests = dbManager.getGuests();
    res.json(guests);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/guests', (req: Request, res: Response) => {
  try {
    const guest = dbManager.createGuest(req.body);
    res.status(201).json(guest);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/guests/:id', (req: Request, res: Response) => {
  try {
    const guest = dbManager.updateGuest(req.params.id, req.body);
    if (!guest) return res.status(404).json({ error: 'Hóspede não encontrado.' });
    res.json(guest);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/guests/:id', (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteGuest(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Hóspede não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rooms
app.get('/api/rooms', (req: Request, res: Response) => {
  try {
    const rooms = dbManager.getRooms();
    res.json(rooms);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', (req: Request, res: Response) => {
  try {
    const room = dbManager.createRoom(req.body);
    res.status(201).json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/rooms/:id', (req: Request, res: Response) => {
  try {
    const room = dbManager.updateRoom(req.params.id, req.body);
    if (!room) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/rooms/:id/status', (req: Request, res: Response) => {
  try {
    const { status, notes } = req.body;
    const room = dbManager.updateRoomStatus(req.params.id, status, notes);
    if (!room) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json(room);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/rooms/:id', (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteRoom(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Quarto não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Reservations (Online Booking Engine & Internal)
app.get('/api/reservations', (req: Request, res: Response) => {
  try {
    const reservations = dbManager.getReservations();
    res.json(reservations);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reservations', (req: Request, res: Response) => {
  try {
    const reservation = dbManager.createReservation(req.body);
    res.status(201).json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/reservations/:id', (req: Request, res: Response) => {
  try {
    const reservation = dbManager.updateReservation(req.params.id, req.body);
    if (!reservation) return res.status(404).json({ error: 'Reserva não encontrada.' });
    res.json(reservation);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Check-in & Check-out Flows
app.post('/api/checkin', (req: Request, res: Response) => {
  try {
    const result = dbManager.processCheckIn(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/checkout', (req: Request, res: Response) => {
  try {
    const result = dbManager.processCheckOut(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Minibar (Frigobar)
app.get('/api/minibar/items', (req: Request, res: Response) => {
  try {
    const items = dbManager.getMinibarItems();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/minibar/items', (req: Request, res: Response) => {
  try {
    const item = dbManager.createMinibarItem(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/minibar/items/:id', (req: Request, res: Response) => {
  try {
    const item = dbManager.updateMinibarItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item de frigobar não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/minibar/items/:id/restock', (req: Request, res: Response) => {
  try {
    const { quantityToAdd } = req.body;
    const item = dbManager.restockMinibarItem(req.params.id, quantityToAdd);
    if (!item) return res.status(404).json({ error: 'Item de frigobar não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/minibar/items/:id', (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteMinibarItem(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Item de frigobar não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/minibar/consumptions', (req: Request, res: Response) => {
  try {
    const roomId = req.query.roomId as string | undefined;
    const consumptions = dbManager.getRoomConsumptions(roomId);
    res.json(consumptions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/minibar/consumptions', (req: Request, res: Response) => {
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

app.get('/api/kitchen/orders', (req: Request, res: Response) => {
  try {
    const orders = dbManager.getOrders();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kitchen/orders', (req: Request, res: Response) => {
  try {
    const order = dbManager.createOrder(req.body);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/kitchen/orders/:id/status', (req: Request, res: Response) => {
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
app.get('/api/tasks', (req: Request, res: Response) => {
  try {
    const sector = req.query.sector as any;
    const tasks = dbManager.getTasks(sector);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', (req: Request, res: Response) => {
  try {
    const task = dbManager.createTask(req.body);
    res.status(201).json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const task = dbManager.updateTask(req.params.id, req.body);
    if (!task) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.json(task);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteTask(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Tarefa não encontrada.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Financial Control & Stats (Faturamento e Controle Financeiro)
app.get('/api/financial/transactions', (req: Request, res: Response) => {
  try {
    const transactions = dbManager.getTransactions();
    res.json(transactions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/financial/transactions', (req: Request, res: Response) => {
  try {
    const tx = dbManager.createTransaction(req.body);
    res.status(201).json(tx);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/financial/stats', (req: Request, res: Response) => {
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
app.get('/api/inventory/items', (req: Request, res: Response) => {
  try {
    const sector = req.query.sector as string | undefined;
    const lowStockOnly = req.query.lowStock === 'true';
    const items = dbManager.getInventoryItems(sector, lowStockOnly);
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/inventory/items/:id', (req: Request, res: Response) => {
  try {
    const item = dbManager.getInventoryItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/items', (req: Request, res: Response) => {
  try {
    const item = dbManager.createInventoryItem(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/inventory/items/:id', (req: Request, res: Response) => {
  try {
    const item = dbManager.updateInventoryItem(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/inventory/items/:id', (req: Request, res: Response) => {
  try {
    const ok = dbManager.deleteInventoryItem(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Item não encontrado.' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/movements', (req: Request, res: Response) => {
  try {
    const result = dbManager.registerStockMovement(req.body);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/inventory/movements', (req: Request, res: Response) => {
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

app.get('/api/inventory/stats', (req: Request, res: Response) => {
  try {
    const stats = dbManager.getInventoryStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory/replenish-order', (req: Request, res: Response) => {
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
app.get('/api/users', (req: Request, res: Response) => {
  try {
    const users = dbManager.getUsers();
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req: Request, res: Response) => {
  try {
    const newUser = dbManager.createUser(req.body);
    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  try {
    const updated = dbManager.updateUser(req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', (req: Request, res: Response) => {
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

// Login endpoint (harmonizado com Supabase Auth)
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password, supabaseAuthId } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    let user = dbManager.getUserByEmail(email);

    // Se o usuário autenticou no Supabase e ainda não constava no perfil local, criar perfil
    if (!user && supabaseAuthId) {
      user = dbManager.createUser({
        email,
        fullName: email.split('@')[0],
        role: 'recepcionista',
        sector: 'Recepcao',
        status: 'Ativo',
        permissions: ['view_rooms', 'view_checkinout', 'manage_checkinout', 'view_guests', 'view_kanbans'],
        supabaseAuthId
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado com este e-mail.' });
    }

    if (user.status !== 'Ativo') {
      return res.status(403).json({ error: `Usuário encontra-se ${user.status.toLowerCase()}. Acesso bloqueado.` });
    }

    // Atualizar último login
    const updatedUser = dbManager.updateUser(user.id, {
      lastLoginAt: new Date().toISOString(),
      supabaseAuthId: supabaseAuthId || user.supabaseAuthId
    });

    res.json({
      user: updatedUser,
      token: `staff_token_${updatedUser.id}_${Date.now()}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', (req: Request, res: Response) => {
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

    res.status(201).json({
      user: newUser,
      token: `staff_token_${newUser.id}_${Date.now()}`
    });
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
