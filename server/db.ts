import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  HotelSettings,
  Guest,
  Room,
  Reservation,
  MinibarItem,
  RoomMinibarConsumption,
  MenuItem,
  KitchenOrder,
  KanbanTask,
  FinancialTransaction,
  FinancialStats,
  SupabaseConfigStatus,
  InventoryItem,
  StockMovement,
  InventoryStats,
  InventorySector,
  StockMovementType,
  StaffUser
} from '../src/types.ts';
import {
  defaultSettings,
  defaultRooms,
  defaultGuests,
  defaultReservations,
  defaultMinibarItems,
  defaultMenuItems,
  defaultTasks,
  defaultTransactions,
  defaultInventoryItems,
  defaultStockMovements,
  defaultStaffUsers
} from './initialData.ts';

const DB_FILE_PATH = path.join(process.cwd(), 'hotel_database.json');

export interface HotelDatabase {
  settings: HotelSettings;
  guests: Guest[];
  rooms: Room[];
  reservations: Reservation[];
  minibarItems: MinibarItem[];
  consumptions: RoomMinibarConsumption[];
  menuItems: MenuItem[];
  orders: KitchenOrder[];
  tasks: KanbanTask[];
  transactions: FinancialTransaction[];
  inventoryItems: InventoryItem[];
  stockMovements: StockMovement[];
  users: StaffUser[];
  lastUpdated: string;
}

class DatabaseManager {
  private data: HotelDatabase;
  private supabase: SupabaseClient | null = null;
  private supabaseConnected: boolean = false;

  constructor() {
    this.data = this.loadDatabase();
    this.initSupabaseClient();
  }

  private loadDatabase(): HotelDatabase {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: parsed.settings || defaultSettings,
          guests: parsed.guests || defaultGuests,
          rooms: parsed.rooms || defaultRooms,
          reservations: parsed.reservations || defaultReservations,
          minibarItems: parsed.minibarItems || defaultMinibarItems,
          consumptions: parsed.consumptions || [],
          menuItems: parsed.menuItems || defaultMenuItems,
          orders: parsed.orders || [],
          tasks: parsed.tasks || defaultTasks,
          transactions: parsed.transactions || defaultTransactions,
          inventoryItems: parsed.inventoryItems || defaultInventoryItems,
          stockMovements: parsed.stockMovements || defaultStockMovements,
          users: parsed.users && parsed.users.length > 0 ? parsed.users : defaultStaffUsers,
          lastUpdated: parsed.lastUpdated || new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('Could not read existing database file, initializing defaults:', err);
    }

    const initial: HotelDatabase = {
      settings: defaultSettings,
      guests: defaultGuests,
      rooms: defaultRooms,
      reservations: defaultReservations,
      minibarItems: defaultMinibarItems,
      consumptions: [],
      menuItems: defaultMenuItems,
      orders: [],
      tasks: defaultTasks,
      transactions: defaultTransactions,
      inventoryItems: defaultInventoryItems,
      stockMovements: defaultStockMovements,
      users: defaultStaffUsers,
      lastUpdated: new Date().toISOString()
    };

    this.persistToFile(initial);
    return initial;
  }

  private persistToFile(dataToSave: HotelDatabase) {
    try {
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private persist() {
    this.data.lastUpdated = new Date().toISOString();
    this.persistToFile(this.data);
  }

  public initSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && supabaseUrl.trim() !== '' && supabaseKey.trim() !== '') {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false }
        });
        this.supabaseConnected = true;
        console.log(`[Supabase] Client initialized with URL: ${supabaseUrl}`);
      } catch (err) {
        console.error('[Supabase] Initialization failed:', err);
        this.supabase = null;
        this.supabaseConnected = false;
      }
    } else {
      this.supabase = null;
      this.supabaseConnected = false;
    }
  }

  public getSupabaseStatus(): SupabaseConfigStatus {
    const supabaseUrl = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const hasKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey);
    const isConfigured = Boolean(supabaseUrl && supabaseUrl.trim() !== '' && hasKey);

    return {
      connected: this.supabaseConnected && isConfigured,
      urlConfigured: isConfigured,
      mode: isConfigured ? 'supabase_cloud' : 'local_sql_engine',
      supabaseUrl: supabaseUrl || undefined,
      supabaseAnonKey: anonKey || undefined,
      message: isConfigured
        ? 'Conectado à API Supabase SQL para sincronização de tabelas e Realtime na nuvem.'
        : 'Operando em Servidor SQL Dedicado (Backend sem LocalStorage). Configure as variáveis SUPABASE_URL e SUPABASE_ANON_KEY em .env para sincronizar com seu banco de dados Supabase.',
      tableCounts: {
        settings: 1,
        guests: this.data.guests.length,
        rooms: this.data.rooms.length,
        reservations: this.data.reservations.length,
        kanban_tasks: this.data.tasks.length,
        orders: this.data.orders.length,
        financial_transactions: this.data.transactions.length
      }
    };
  }

  // Generates the official Supabase SQL DDL script for copying to Supabase SQL editor
  public getSupabaseSchemaSQL(): string {
    return `-- ==========================================================
-- SCHEMA SQL PARA SAAS HOTELEIRO (SUPABASE POSTGRESQL)
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- ==========================================================

-- 1. Tabela de Configurações do Hotel
CREATE TABLE IF NOT EXISTS hotel_settings (
  id TEXT PRIMARY KEY DEFAULT 'hotel_1',
  hotel_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  logo_icon TEXT DEFAULT 'hotel',
  primary_color TEXT DEFAULT 'emerald',
  currency TEXT DEFAULT 'R$',
  tax_rate_percent NUMERIC DEFAULT 5.0,
  check_in_time TEXT DEFAULT '14:00',
  check_out_time TEXT DEFAULT '11:00',
  address TEXT,
  city_state TEXT,
  phone TEXT,
  email TEXT,
  booking_policies TEXT,
  wifi_password TEXT,
  room_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Hóspedes
CREATE TABLE IF NOT EXISTS guests (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  document TEXT NOT NULL,
  document_type TEXT DEFAULT 'CPF',
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  birth_date DATE,
  preferences TEXT,
  allergies_notes TEXT,
  status TEXT DEFAULT 'Ativo',
  total_stays INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Quartos
CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  type_id TEXT NOT NULL,
  type_name TEXT NOT NULL,
  floor INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Disponivel',
  price_per_night NUMERIC NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 2,
  current_reservation_id TEXT,
  current_guest_name TEXT,
  amenities TEXT[] DEFAULT '{}',
  notes TEXT
);

-- 4. Tabela de Reservas Online e Balcão
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  guest_id TEXT REFERENCES guests(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  room_number TEXT NOT NULL,
  room_type_name TEXT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  nights INTEGER NOT NULL,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER DEFAULT 0,
  price_per_night NUMERIC NOT NULL,
  total_nights_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'Pendente',
  payment_status TEXT DEFAULT 'Pendente',
  payment_method TEXT DEFAULT 'PIX',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_out_at TIMESTAMP WITH TIME ZONE
);

-- 5. Itens de Frigobar
CREATE TABLE IF NOT EXISTS minibar_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 50,
  unit TEXT DEFAULT 'un'
);

-- 6. Consumo de Frigobar nos Quartos
CREATE TABLE IF NOT EXISTS room_consumptions (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  reservation_id TEXT,
  guest_name TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  registered_by TEXT NOT NULL,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  status TEXT DEFAULT 'Lançado'
);

-- 7. Cardápio de Cozinha & Room Service
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  prep_time_minutes INTEGER DEFAULT 20,
  available BOOLEAN DEFAULT true
);

-- 8. Pedidos de Cozinha & Room Service
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  room_id TEXT NOT NULL,
  room_number TEXT NOT NULL,
  reservation_id TEXT,
  guest_name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_amount NUMERIC NOT NULL,
  delivery_fee NUMERIC DEFAULT 0,
  destination TEXT DEFAULT 'Quarto',
  delivery_sector TEXT DEFAULT 'Room Service',
  status TEXT DEFAULT 'Recebido',
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 9. Kanbans em Tempo Real por Setor
CREATE TABLE IF NOT EXISTS kanban_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  sector TEXT NOT NULL, -- 'Recepcao', 'Governanca', 'Cozinha', 'RoomService', 'Manutencao'
  status TEXT NOT NULL DEFAULT 'A_Fazer', -- 'A_Fazer', 'Em_Andamento', 'Concluido'
  priority TEXT NOT NULL DEFAULT 'Media', -- 'Baixa', 'Media', 'Alta', 'Urgente'
  room_number TEXT,
  guest_name TEXT,
  assigned_to TEXT,
  related_type TEXT,
  related_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Controle Financeiro Integrado
CREATE TABLE IF NOT EXISTS financial_transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'Receita' ou 'Despesa'
  category TEXT NOT NULL, -- 'Diarias', 'Frigobar', 'Cozinha', 'RoomService', 'Taxas', 'Operacional', 'Manutencao'
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL, -- 'PIX', 'Cartao_Credito', 'Cartao_Debito', 'Dinheiro', 'Faturado'
  status TEXT NOT NULL DEFAULT 'Pago',
  reservation_id TEXT,
  room_number TEXT,
  guest_name TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 11. Gestão de Equipe & Controle de Acesso (Supabase Auth & RBAC Hoteleiro)
CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'admin', 'gerente', 'recepcionista', 'governanca', 'cozinha_roomservice', 'manutencao', 'financeiro'
  sector TEXT NOT NULL, -- 'Geral', 'Recepcao', 'Governanca', 'Cozinha', 'RoomService', 'Manutencao', 'Financeiro'
  status TEXT NOT NULL DEFAULT 'Ativo', -- 'Ativo', 'Inativo', 'Bloqueado'
  phone TEXT,
  avatar_url TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  supabase_auth_id UUID,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_kanban_sector ON kanban_tasks(sector, status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_staff_email ON staff_users(email);
CREATE INDEX IF NOT EXISTS idx_staff_sector ON staff_users(sector, role);

-- Habilitar Supabase Realtime para notificações instantâneas de Room Service, Kanban e Equipe
ALTER PUBLICATION supabase_realtime ADD TABLE kitchen_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE kanban_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE staff_users;
`;
  }

  // --- Settings ---
  // Transitional repository: Supabase is preferred when the server has credentials;
  // the local JSON object remains a temporary cache/fallback until Phase 2.7.
  private mapSettingsFromSupabase(row: any): HotelSettings {
    return {
      id: row.id,
      hotelName: row.hotel_name,
      tagline: row.tagline || '',
      description: row.description || '',
      logoIcon: row.logo_icon || 'hotel',
      primaryColor: row.primary_color || 'emerald',
      currency: row.currency || 'R$',
      taxRatePercent: Number(row.tax_rate_percent || 0),
      checkInTime: row.check_in_time || '14:00',
      checkOutTime: row.check_out_time || '11:00',
      address: row.address || '',
      cityState: row.city_state || '',
      phone: row.phone || '',
      email: row.email || '',
      bookingPolicies: row.booking_policies || '',
      wifiPassword: row.wifi_password || '',
      roomTypes: Array.isArray(row.room_types) ? row.room_types : []
    } as HotelSettings;
  }

  private mapSettingsToSupabase(settings: HotelSettings) {
    return {
      id: settings.id || 'hotel_1',
      hotel_name: settings.hotelName,
      tagline: settings.tagline,
      description: settings.description,
      logo_icon: settings.logoIcon,
      primary_color: settings.primaryColor,
      currency: settings.currency,
      tax_rate_percent: settings.taxRatePercent,
      check_in_time: settings.checkInTime,
      check_out_time: settings.checkOutTime,
      address: settings.address,
      city_state: settings.cityState,
      phone: settings.phone,
      email: settings.email,
      booking_policies: settings.bookingPolicies,
      wifi_password: settings.wifiPassword,
      room_types: settings.roomTypes || [],
      updated_at: new Date().toISOString()
    };
  }

  public getSettings(): HotelSettings {
    return this.data.settings;
  }

  public async getSettingsPersistent(): Promise<HotelSettings> {
    if (!this.supabase) return this.getSettings();
    try {
      const { data, error } = await this.supabase
        .from('hotel_settings')
        .select('*')
        .eq('id', 'hotel_1')
        .maybeSingle();
      if (error) throw error;
      if (!data) return this.getSettings();
      const settings = this.mapSettingsFromSupabase(data);
      this.data.settings = settings;
      this.persist();
      return settings;
    } catch (err) {
      console.warn('[Supabase] Falha ao ler hotel_settings; usando fallback JSON temporário:', err);
      return this.getSettings();
    }
  }

  public updateSettings(updates: Partial<HotelSettings>): HotelSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.persist();
    return this.data.settings;
  }

  public async updateSettingsPersistent(updates: Partial<HotelSettings>): Promise<HotelSettings> {
    const merged = { ...this.data.settings, ...updates } as HotelSettings;
    if (!this.supabase) return this.updateSettings(updates);
    try {
      const { data, error } = await this.supabase
        .from('hotel_settings')
        .upsert(this.mapSettingsToSupabase(merged), { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw error;
      const settings = this.mapSettingsFromSupabase(data);
      this.data.settings = settings;
      this.persist();
      return settings;
    } catch (err) {
      console.warn('[Supabase] Falha ao gravar hotel_settings; usando fallback JSON temporário:', err);
      return this.updateSettings(updates);
    }
  }

  // --- Guests ---
  private mapGuestFromSupabase(row: any): Guest {
    return {
      id: row.id,
      fullName: row.full_name,
      document: row.document || '',
      documentType: row.document_type || 'CPF',
      email: row.email || '',
      phone: row.phone || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      birthDate: row.birth_date || undefined,
      preferences: row.preferences || '',
      allergiesNotes: row.allergies_notes || '',
      status: row.status || 'Ativo',
      totalStays: Number(row.total_stays || 0),
      totalSpent: Number(row.total_spent || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } as Guest;
  }

  private mapGuestToSupabase(guest: Guest) {
    return {
      id: guest.id,
      full_name: guest.fullName,
      document: guest.document || null,
      document_type: guest.documentType || null,
      email: guest.email || null,
      phone: guest.phone || null,
      address: guest.address || null,
      city: guest.city || null,
      state: guest.state || null,
      birth_date: guest.birthDate || null,
      preferences: guest.preferences || null,
      allergies_notes: guest.allergiesNotes || null,
      status: guest.status || 'Ativo',
      total_stays: Number(guest.totalStays || 0),
      total_spent: Number(guest.totalSpent || 0),
      created_at: guest.createdAt || new Date().toISOString(),
      updated_at: guest.updatedAt || new Date().toISOString()
    };
  }

  public getGuests(): Guest[] {
    return this.data.guests;
  }

  public async getGuestsPersistent(): Promise<Guest[]> {
    if (!this.supabase) return this.getGuests();
    try {
      const { data, error } = await this.supabase.from('guests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const guests = (data || []).map(row => this.mapGuestFromSupabase(row));
      this.data.guests = guests;
      this.persist();
      return guests;
    } catch (err) {
      console.warn('[Supabase] Falha ao ler guests; usando fallback JSON temporário:', err);
      return this.getGuests();
    }
  }

  public getGuestById(id: string): Guest | undefined {
    return this.data.guests.find(g => g.id === id);
  }

  public createGuest(guestData: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'totalStays' | 'totalSpent'>): Guest {
    const newGuest: Guest = {
      ...guestData,
      id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      totalStays: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.guests.unshift(newGuest);
    this.persist();
    return newGuest;
  }

  public updateGuest(id: string, updates: Partial<Guest>): Guest | null {
    const idx = this.data.guests.findIndex(g => g.id === id);
    if (idx === -1) return null;
    this.data.guests[idx] = {
      ...this.data.guests[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.guests[idx];
  }

  public deleteGuest(id: string): boolean {
    const idx = this.data.guests.findIndex(g => g.id === id);
    if (idx === -1) return false;
    this.data.guests.splice(idx, 1);
    this.persist();
    return true;
  }

  public async createGuestPersistent(guestData: Omit<Guest, 'id' | 'createdAt' | 'updatedAt' | 'totalStays' | 'totalSpent'>): Promise<Guest> {
    if (!this.supabase) return this.createGuest(guestData);
    const now = new Date().toISOString();
    const guest: Guest = { ...guestData, id: `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}`, totalStays: 0, totalSpent: 0, createdAt: now, updatedAt: now };
    try {
      const { data, error } = await this.supabase.from('guests').insert(this.mapGuestToSupabase(guest)).select('*').single();
      if (error) throw error;
      const saved = this.mapGuestFromSupabase(data);
      this.data.guests = [saved, ...this.data.guests.filter(g => g.id !== saved.id)];
      this.persist();
      return saved;
    } catch (err) {
      console.warn('[Supabase] Falha ao criar guest; usando fallback JSON temporário:', err);
      return this.createGuest(guestData);
    }
  }

  public async updateGuestPersistent(id: string, updates: Partial<Guest>): Promise<Guest | null> {
    if (!this.supabase) return this.updateGuest(id, updates);
    try {
      const { data: currentRow, error: readError } = await this.supabase.from('guests').select('*').eq('id', id).maybeSingle();
      if (readError) throw readError;
      if (!currentRow) return null;
      const merged = { ...this.mapGuestFromSupabase(currentRow), ...updates, id, updatedAt: new Date().toISOString() } as Guest;
      const { data, error } = await this.supabase.from('guests').update(this.mapGuestToSupabase(merged)).eq('id', id).select('*').single();
      if (error) throw error;
      const saved = this.mapGuestFromSupabase(data);
      const idx = this.data.guests.findIndex(g => g.id === id);
      if (idx >= 0) this.data.guests[idx] = saved; else this.data.guests.unshift(saved);
      this.persist();
      return saved;
    } catch (err) {
      console.warn('[Supabase] Falha ao atualizar guest; usando fallback JSON temporário:', err);
      return this.updateGuest(id, updates);
    }
  }

  public async deleteGuestPersistent(id: string): Promise<boolean> {
    if (!this.supabase) return this.deleteGuest(id);
    try {
      const { error } = await this.supabase.from('guests').delete().eq('id', id);
      if (error) throw error;
      this.data.guests = this.data.guests.filter(g => g.id !== id);
      this.persist();
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao excluir guest; usando fallback JSON temporário:', err);
      return this.deleteGuest(id);
    }
  }

  // --- Rooms ---
  private mapRoomFromSupabase(row: any): Room {
    return {
      id: row.id, number: row.number, typeId: row.type_id, typeName: row.type_name,
      floor: Number(row.floor || 1), status: row.status, pricePerNight: Number(row.price_per_night || 0),
      capacity: Number(row.capacity || 1), currentReservationId: row.current_reservation_id || undefined,
      currentGuestName: row.current_guest_name || undefined, amenities: Array.isArray(row.amenities) ? row.amenities : [],
      notes: row.notes || undefined
    } as Room;
  }

  private mapRoomToSupabase(room: Room) {
    return {
      id: room.id, number: room.number, type_id: room.typeId, type_name: room.typeName, floor: Number(room.floor || 1),
      status: room.status, price_per_night: Number(room.pricePerNight || 0), capacity: Number(room.capacity || 1),
      current_reservation_id: room.currentReservationId || null, current_guest_name: room.currentGuestName || null,
      amenities: room.amenities || [], notes: room.notes || null
    };
  }

  public getRooms(): Room[] {
    return this.data.rooms;
  }

  public async getRoomsPersistent(): Promise<Room[]> {
    if (!this.supabase) return this.getRooms();
    try {
      const { data, error } = await this.supabase.from('rooms').select('*').order('number', { ascending: true });
      if (error) throw error;
      const rooms = (data || []).map(row => this.mapRoomFromSupabase(row)).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      this.data.rooms = rooms;
      this.persist();
      return rooms;
    } catch (err) {
      console.warn('[Supabase] Falha ao ler rooms; usando fallback JSON temporário:', err);
      return this.getRooms();
    }
  }

  public createRoom(roomData: Omit<Room, 'id'>): Room {
    // Check if room number already exists
    const exists = this.data.rooms.some(r => r.number.trim() === roomData.number.trim());
    if (exists) {
      throw new Error(`Já existe um quarto cadastrado com o número ${roomData.number}`);
    }

    const newRoom: Room = {
      ...roomData,
      id: `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amenities: roomData.amenities || ['Wi-Fi 500Mbps', 'Ar Condicionado', 'Smart TV', 'Frigobar']
    };

    this.data.rooms.push(newRoom);
    // Sort rooms naturally by floor and room number
    this.data.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    this.persist();
    return newRoom;
  }

  public updateRoom(id: string, updates: Partial<Room>): Room | null {
    const idx = this.data.rooms.findIndex(r => r.id === id);
    if (idx === -1) return null;

    // If changing room number, check uniqueness
    if (updates.number && updates.number !== this.data.rooms[idx].number) {
      const exists = this.data.rooms.some(r => r.id !== id && r.number.trim() === updates.number!.trim());
      if (exists) {
        throw new Error(`O número de quarto ${updates.number} já está em uso.`);
      }
    }

    this.data.rooms[idx] = { ...this.data.rooms[idx], ...updates };
    this.persist();
    return this.data.rooms[idx];
  }

  public updateRoomStatus(id: string, newStatus: Room['status'], statusNotes?: string): Room | null {
    const idx = this.data.rooms.findIndex(r => r.id === id);
    if (idx === -1) return null;

    const room = this.data.rooms[idx];
    const prevStatus = room.status;
    room.status = newStatus;
    if (statusNotes !== undefined) {
      room.notes = statusNotes;
    }

    // Auto-trigger tasks based on status
    if (newStatus === 'Limpeza' && prevStatus !== 'Limpeza') {
      this.createTask({
        title: `Higienização e Preparo - Quarto ${room.number}`,
        description: `Quarto colocado em status Limpeza. Realizar troca de enxoval, limpeza geral e reposição do frigobar. ${statusNotes ? `Observação: ${statusNotes}` : ''}`,
        sector: 'Governanca',
        priority: 'Alta',
        status: 'A_Fazer',
        roomNumber: room.number,
        assignedTo: 'Equipe Governança',
        relatedType: 'CheckOut',
        relatedId: room.id
      });
    } else if (newStatus === 'Manutencao' && prevStatus !== 'Manutencao') {
      this.createTask({
        title: `Manutenção Técnica - Quarto ${room.number}`,
        description: `Reparo solicitado para o quarto ${room.number}. ${statusNotes ? `Motivo: ${statusNotes}` : 'Verificar instalações elétricas, hidráulicas ou ar-condicionado.'}`,
        sector: 'Manutencao',
        priority: 'Urgente',
        status: 'A_Fazer',
        roomNumber: room.number,
        assignedTo: 'Equipe Manutenção',
        relatedType: 'Manutencao',
        relatedId: room.id
      });
    } else if (newStatus === 'Disponivel') {
      // Clear occupant info if room is released
      room.currentGuestName = undefined;
      room.currentReservationId = undefined;

      // Mark pending cleaning and maintenance tasks for this room as Concluido
      this.data.tasks.forEach(task => {
        if (task.roomNumber === room.number && task.status !== 'Concluido') {
          if (task.sector === 'Governanca' || task.sector === 'Manutencao') {
            task.status = 'Concluido';
            task.updatedAt = new Date().toISOString();
          }
        }
      });
    }

    this.persist();
    return room;
  }

  public deleteRoom(id: string): boolean {
    const idx = this.data.rooms.findIndex(r => r.id === id);
    if (idx === -1) return false;

    if (this.data.rooms[idx].status === 'Ocupado') {
      throw new Error('Não é possível excluir um quarto com hóspede instalado.');
    }

    this.data.rooms.splice(idx, 1);
    this.persist();
    return true;
  }

  public async createRoomPersistent(roomData: Omit<Room, 'id'>): Promise<Room> {
    if (!this.supabase) return this.createRoom(roomData);
    try {
      const { data: existing, error: checkError } = await this.supabase.from('rooms').select('id').eq('number', roomData.number.trim()).maybeSingle();
      if (checkError) throw checkError;
      if (existing) throw new Error(`Já existe um quarto cadastrado com o número ${roomData.number}`);
      const room: Room = { ...roomData, id: `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`, amenities: roomData.amenities || ['Wi-Fi 500Mbps', 'Ar Condicionado', 'Smart TV', 'Frigobar'] };
      const { data, error } = await this.supabase.from('rooms').insert(this.mapRoomToSupabase(room)).select('*').single();
      if (error) throw error;
      const saved = this.mapRoomFromSupabase(data);
      this.data.rooms = [...this.data.rooms.filter(r => r.id !== saved.id), saved].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      this.persist();
      return saved;
    } catch (err: any) {
      if (String(err?.message || '').includes('Já existe um quarto')) throw err;
      console.warn('[Supabase] Falha ao criar room; usando fallback JSON temporário:', err);
      return this.createRoom(roomData);
    }
  }

  public async updateRoomPersistent(id: string, updates: Partial<Room>): Promise<Room | null> {
    if (!this.supabase) return this.updateRoom(id, updates);
    try {
      const { data: currentRow, error: readError } = await this.supabase.from('rooms').select('*').eq('id', id).maybeSingle();
      if (readError) throw readError;
      if (!currentRow) return null;
      const merged = { ...this.mapRoomFromSupabase(currentRow), ...updates, id } as Room;
      const { data, error } = await this.supabase.from('rooms').update(this.mapRoomToSupabase(merged)).eq('id', id).select('*').single();
      if (error) throw error;
      const saved = this.mapRoomFromSupabase(data);
      const idx = this.data.rooms.findIndex(r => r.id === id);
      if (idx >= 0) this.data.rooms[idx] = saved; else this.data.rooms.push(saved);
      this.data.rooms.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      this.persist();
      return saved;
    } catch (err) {
      console.warn('[Supabase] Falha ao atualizar room; usando fallback JSON temporário:', err);
      return this.updateRoom(id, updates);
    }
  }

  public async updateRoomStatusPersistent(id: string, status: Room['status'], notes?: string): Promise<Room | null> {
    if (!this.supabase) return this.updateRoomStatus(id, status, notes);
    try {
      await this.getRoomsPersistent();
      const updated = this.updateRoomStatus(id, status, notes);
      if (!updated) return null;
      const { data, error } = await this.supabase.from('rooms').update(this.mapRoomToSupabase(updated)).eq('id', id).select('*').single();
      if (error) throw error;
      const saved = this.mapRoomFromSupabase(data);
      const idx = this.data.rooms.findIndex(r => r.id === id);
      if (idx >= 0) this.data.rooms[idx] = saved;
      this.persist();
      return saved;
    } catch (err) {
      console.warn('[Supabase] Falha ao atualizar status do room; usando fallback JSON temporário:', err);
      return this.updateRoomStatus(id, status, notes);
    }
  }

  public async deleteRoomPersistent(id: string): Promise<boolean> {
    if (!this.supabase) return this.deleteRoom(id);
    try {
      const { data: currentRow, error: readError } = await this.supabase.from('rooms').select('*').eq('id', id).maybeSingle();
      if (readError) throw readError;
      if (!currentRow) return false;
      const current = this.mapRoomFromSupabase(currentRow);
      if (current.status === 'Ocupado') throw new Error('Não é possível excluir um quarto com hóspede instalado.');
      const { error } = await this.supabase.from('rooms').delete().eq('id', id);
      if (error) throw error;
      this.data.rooms = this.data.rooms.filter(r => r.id !== id);
      this.persist();
      return true;
    } catch (err: any) {
      if (String(err?.message || '').includes('Não é possível excluir')) throw err;
      console.warn('[Supabase] Falha ao excluir room; usando fallback JSON temporário:', err);
      return this.deleteRoom(id);
    }
  }

  // --- Reservations & Online Booking ---
  public getReservations(): Reservation[] {
    return this.data.reservations;
  }

  public createReservation(data: {
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    document?: string;
    roomTypeId: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
    paymentMethod: Reservation['paymentMethod'];
    notes?: string;
  }): Reservation {
    // 1. Find or create guest
    let guest = this.data.guests.find(
      g => g.email.toLowerCase() === data.guestEmail.toLowerCase() ||
           (data.document && g.document === data.document)
    );

    if (!guest) {
      guest = {
        id: `guest_${Date.now()}`,
        fullName: data.guestName,
        document: data.document || 'A Informar no Check-in',
        documentType: 'CPF',
        email: data.guestEmail,
        phone: data.guestPhone,
        address: 'Cadastrado via Reserva Online',
        city: 'Online',
        state: 'BR',
        preferences: '',
        allergiesNotes: '',
        status: 'Ativo',
        totalStays: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.data.guests.push(guest);
    }

    // 2. Find room type
    const roomType = this.data.settings.roomTypes.find(rt => rt.id === data.roomTypeId) || this.data.settings.roomTypes[0];

    // 3. Find available room of this type
    const occupiedRoomIds = this.data.reservations
      .filter(r => (r.status === 'CheckIn' || r.status === 'Confirmada') &&
        !(data.checkOutDate <= r.checkInDate || data.checkInDate >= r.checkOutDate)
      )
      .map(r => r.roomId);

    let assignedRoom = this.data.rooms.find(
      r => r.typeId === roomType.id && r.status === 'Disponivel' && !occupiedRoomIds.includes(r.id)
    );

    // If none found with strict match, fallback to any available room of that type
    if (!assignedRoom) {
      assignedRoom = this.data.rooms.find(r => r.typeId === roomType.id) || this.data.rooms[0];
    }

    // 4. Calculate nights
    const start = new Date(data.checkInDate);
    const end = new Date(data.checkOutDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const totalAmount = nights * roomType.basePrice;

    const reservationCode = `RES-${Math.floor(10000 + Math.random() * 90000)}`;

    const newReservation: Reservation = {
      id: `res_${Date.now()}`,
      code: reservationCode,
      guestId: guest.id,
      guestName: guest.fullName,
      guestEmail: guest.email,
      guestPhone: guest.phone,
      roomId: assignedRoom.id,
      roomNumber: assignedRoom.number,
      roomTypeName: roomType.name,
      checkInDate: data.checkInDate,
      checkOutDate: data.checkOutDate,
      nights,
      adults: data.adults,
      children: data.children,
      pricePerNight: roomType.basePrice,
      totalNightsAmount: totalAmount,
      status: 'Confirmada',
      paymentStatus: data.paymentMethod === 'PIX' ? 'Pago' : 'Pendente',
      paymentMethod: data.paymentMethod,
      notes: data.notes || 'Reserva efetuada pelo sistema de reserva online.',
      createdAt: new Date().toISOString()
    };

    this.data.reservations.unshift(newReservation);

    // Create Kanban task for Reception
    this.createTask({
      title: `Nova Reserva Confirmada: ${reservationCode} - ${guest.fullName}`,
      description: `Chegada: ${data.checkInDate} | Quarto: ${assignedRoom.number} (${roomType.name}). Conferir dados e preparar chaves.`,
      sector: 'Recepcao',
      priority: 'Media',
      status: 'A_Fazer',
      roomNumber: assignedRoom.number,
      guestName: guest.fullName,
      assignedTo: 'Recepção',
      relatedType: 'Reserva',
      relatedId: newReservation.id
    });

    // If paid via PIX, add transaction
    if (data.paymentMethod === 'PIX') {
      this.createTransaction({
        type: 'Receita',
        category: 'Diarias',
        description: `Pagamento Reserva Online (${reservationCode}) - ${guest.fullName}`,
        amount: totalAmount,
        paymentMethod: 'PIX',
        status: 'Pago',
        reservationId: newReservation.id,
        roomNumber: assignedRoom.number,
        guestName: guest.fullName,
        date: new Date().toISOString().split('T')[0]
      });
    }

    this.persist();
    return newReservation;
  }

  public updateReservation(id: string, updates: Partial<Reservation>): Reservation | null {
    const idx = this.data.reservations.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.data.reservations[idx] = { ...this.data.reservations[idx], ...updates };
    this.persist();
    return this.data.reservations[idx];
  }

  // --- Complete Check-In Flow ---
  public processCheckIn(data: {
    reservationId: string;
    roomId: string;
    depositAmount?: number;
    paymentMethod?: Reservation['paymentMethod'];
    keyCardNumber?: string;
    notes?: string;
  }): { reservation: Reservation; room: Room; task: KanbanTask } {
    const resIdx = this.data.reservations.findIndex(r => r.id === data.reservationId);
    if (resIdx === -1) throw new Error('Reserva não encontrada.');

    const roomIdx = this.data.rooms.findIndex(r => r.id === data.roomId);
    if (roomIdx === -1) throw new Error('Quarto não encontrado.');

    const reservation = this.data.reservations[resIdx];
    const room = this.data.rooms[roomIdx];

    // Update reservation
    reservation.status = 'CheckIn';
    reservation.checkedInAt = new Date().toISOString();
    reservation.roomId = room.id;
    reservation.roomNumber = room.number;
    if (data.notes) {
      reservation.notes = (reservation.notes ? `${reservation.notes} | ` : '') + data.notes;
    }

    // Update Room
    room.status = 'Ocupado';
    room.currentReservationId = reservation.id;
    room.currentGuestName = reservation.guestName;

    // Handle deposit transaction if provided
    if (data.depositAmount && data.depositAmount > 0) {
      this.createTransaction({
        type: 'Receita',
        category: 'Diarias',
        description: `Depósito/Entrada Check-in (${reservation.code}) - ${reservation.guestName} - Quarto ${room.number}`,
        amount: data.depositAmount,
        paymentMethod: data.paymentMethod || 'Cartao_Credito',
        status: 'Pago',
        reservationId: reservation.id,
        roomNumber: room.number,
        guestName: reservation.guestName,
        date: new Date().toISOString().split('T')[0]
      });

      if (data.depositAmount >= reservation.totalNightsAmount) {
        reservation.paymentStatus = 'Pago';
      } else {
        reservation.paymentStatus = 'Parcial';
      }
    }

    // Update guest total stays
    const guest = this.data.guests.find(g => g.id === reservation.guestId);
    if (guest) {
      guest.totalStays += 1;
      guest.updatedAt = new Date().toISOString();
    }

    // Trigger task for Room Service / Governança
    const task = this.createTask({
      title: `Hóspede Instalado - Quarto ${room.number} (${reservation.guestName})`,
      description: `Check-in realizado às ${new Date().toLocaleTimeString('pt-BR')}. Verificar entrega de boas-vindas e preferências.`,
      sector: 'Governanca',
      priority: 'Media',
      status: 'Em_Andamento',
      roomNumber: room.number,
      guestName: reservation.guestName,
      assignedTo: 'Governança',
      relatedType: 'CheckIn',
      relatedId: reservation.id
    });

    this.persist();
    return { reservation, room, task };
  }

  // --- Complete Check-Out Flow ---
  public processCheckOut(data: {
    reservationId: string;
    paymentMethod: Reservation['paymentMethod'];
    amountPaid: number;
    discount?: number;
    inspectorName?: string;
    notes?: string;
  }): {
    reservation: Reservation;
    room: Room;
    folio: {
      nightsTotal: number;
      minibarTotal: number;
      kitchenTotal: number;
      totalCharges: number;
      amountPaid: number;
      balance: number;
    };
    task: KanbanTask;
  } {
    const resIdx = this.data.reservations.findIndex(r => r.id === data.reservationId);
    if (resIdx === -1) throw new Error('Reserva não encontrada.');

    const reservation = this.data.reservations[resIdx];
    const room = this.data.rooms.find(r => r.id === reservation.roomId);
    if (!room) throw new Error('Quarto associado não encontrado.');

    // Calculate all charges
    const nightsTotal = reservation.totalNightsAmount;

    const minibarConsumptions = this.data.consumptions.filter(
      c => c.reservationId === reservation.id
    );
    const minibarTotal = minibarConsumptions.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const roomOrders = this.data.orders.filter(
      o => o.reservationId === reservation.id && o.status !== 'Cancelado'
    );
    const kitchenTotal = roomOrders.reduce((acc, curr) => acc + curr.totalAmount + (curr.deliveryFee || 0), 0);

    const discount = data.discount || 0;
    const totalCharges = Math.max(0, nightsTotal + minibarTotal + kitchenTotal - discount);

    // Update reservation
    reservation.status = 'CheckOut';
    reservation.paymentStatus = 'Pago';
    reservation.checkedOutAt = new Date().toISOString();
    reservation.paymentMethod = data.paymentMethod;

    // Update Room status to 'Limpeza'
    room.status = 'Limpeza';
    room.currentReservationId = undefined;
    room.currentGuestName = undefined;
    room.notes = `Aguardando higienização pós checkout de ${reservation.guestName}.`;

    // Mark minibar consumptions as 'Faturado'
    minibarConsumptions.forEach(c => {
      c.status = 'Faturado';
    });

    // Record checkout settlement transaction
    if (data.amountPaid > 0) {
      this.createTransaction({
        type: 'Receita',
        category: 'Diarias',
        description: `Fechamento Check-out Final (${reservation.code}) - ${reservation.guestName} - Quarto ${room.number}`,
        amount: data.amountPaid,
        paymentMethod: data.paymentMethod,
        status: 'Pago',
        reservationId: reservation.id,
        roomNumber: room.number,
        guestName: reservation.guestName,
        date: new Date().toISOString().split('T')[0]
      });
    }

    // Update guest total spent
    const guest = this.data.guests.find(g => g.id === reservation.guestId);
    if (guest) {
      guest.totalSpent += totalCharges;
      guest.updatedAt = new Date().toISOString();
    }

    // Automatically create urgent cleaning task in Governança Kanban
    const task = this.createTask({
      title: `LIMPEZA DE CHECK-OUT - Quarto ${room.number}`,
      description: `Hóspede anterior: ${reservation.guestName}. Realizar troca integral de enxoval, higienização de banheiro, reposição de frigobar e selar quarto.`,
      sector: 'Governanca',
      priority: 'Alta',
      status: 'A_Fazer',
      roomNumber: room.number,
      assignedTo: data.inspectorName || 'Equipe Governança',
      relatedType: 'CheckOut',
      relatedId: reservation.id
    });

    this.persist();

    return {
      reservation,
      room,
      folio: {
        nightsTotal,
        minibarTotal,
        kitchenTotal,
        totalCharges,
        amountPaid: data.amountPaid,
        balance: 0
      },
      task
    };
  }

  // --- Minibar & Consumptions ---
  public getMinibarItems(): MinibarItem[] {
    return this.data.minibarItems;
  }

  public createMinibarItem(itemData: Omit<MinibarItem, 'id'>): MinibarItem {
    const newItem: MinibarItem = {
      ...itemData,
      id: `mb_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      stockQty: Number(itemData.stockQty) || 0,
      price: Number(itemData.price) || 0,
      unit: itemData.unit || 'un'
    };
    this.data.minibarItems.push(newItem);
    this.persist();
    return newItem;
  }

  public updateMinibarItem(id: string, updates: Partial<MinibarItem>): MinibarItem | null {
    const idx = this.data.minibarItems.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.data.minibarItems[idx] = {
      ...this.data.minibarItems[idx],
      ...updates,
      price: updates.price !== undefined ? Number(updates.price) : this.data.minibarItems[idx].price,
      stockQty: updates.stockQty !== undefined ? Number(updates.stockQty) : this.data.minibarItems[idx].stockQty
    };
    this.persist();
    return this.data.minibarItems[idx];
  }

  public restockMinibarItem(id: string, quantityToAdd: number): MinibarItem | null {
    const idx = this.data.minibarItems.findIndex(i => i.id === id);
    if (idx === -1) return null;
    this.data.minibarItems[idx].stockQty = Math.max(0, this.data.minibarItems[idx].stockQty + Number(quantityToAdd));
    this.persist();
    return this.data.minibarItems[idx];
  }

  public deleteMinibarItem(id: string): boolean {
    const idx = this.data.minibarItems.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.data.minibarItems.splice(idx, 1);
    this.persist();
    return true;
  }

  public getRoomConsumptions(roomId?: string): RoomMinibarConsumption[] {
    if (roomId) {
      return this.data.consumptions.filter(c => c.roomId === roomId);
    }
    return this.data.consumptions;
  }

  public registerMinibarConsumption(data: {
    roomId: string;
    itemId: string;
    quantity: number;
    registeredBy: string;
  }): RoomMinibarConsumption {
    const room = this.data.rooms.find(r => r.id === data.roomId);
    if (!room) throw new Error('Quarto não encontrado');

    const item = this.data.minibarItems.find(i => i.id === data.itemId);
    if (!item) throw new Error('Item de frigobar não encontrado');

    const reservation = this.data.reservations.find(
      r => r.roomId === room.id && r.status === 'CheckIn'
    );

    const totalPrice = item.price * data.quantity;
    const newConsumption: RoomMinibarConsumption = {
      id: `cons_${Date.now()}`,
      roomId: room.id,
      roomNumber: room.number,
      reservationId: reservation?.id || 'SEM_RESERVA',
      guestName: room.currentGuestName || 'Hóspede do Quarto',
      itemId: item.id,
      itemName: item.name,
      quantity: data.quantity,
      unitPrice: item.price,
      totalPrice,
      registeredBy: data.registeredBy || 'Room Service',
      registeredAt: new Date().toISOString(),
      status: 'Lançado'
    };

    this.data.consumptions.unshift(newConsumption);

    // Decrement stock
    item.stockQty = Math.max(0, item.stockQty - data.quantity);

    // Sync integrated real-time inventory and Kardex
    if (this.data.inventoryItems) {
      const invItem = this.data.inventoryItems.find(
        inv => inv.linkedMinibarItemId === item.id || inv.name.toLowerCase() === item.name.toLowerCase()
      );
      if (invItem) {
        const prevStock = invItem.currentStock;
        invItem.currentStock = Math.max(0, invItem.currentStock - data.quantity);
        invItem.updatedAt = new Date().toISOString();

        const stockMov: StockMovement = {
          id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          itemId: invItem.id,
          itemName: invItem.name,
          sector: invItem.sector,
          type: 'Saida_Consumo_Quarto',
          quantity: data.quantity,
          previousStock: prevStock,
          newStock: invItem.currentStock,
          unitCost: invItem.costPrice,
          totalCost: Number((invItem.costPrice * data.quantity).toFixed(2)),
          originLocation: `Frigobar Quarto ${room.number}`,
          destinationLocation: `Consumo Hóspede (${room.currentGuestName || 'Quarto ' + room.number})`,
          relatedRoomNumber: room.number,
          relatedReservationId: reservation?.id,
          operator: data.registeredBy || 'Governança / Room Service',
          documentNumber: `CONS-${newConsumption.id}`,
          notes: `Lançamento em tempo real de frigobar no Quarto ${room.number}`
        };
        if (!this.data.stockMovements) this.data.stockMovements = [];
        this.data.stockMovements.unshift(stockMov);
      }
    }

    // Register financial transaction as 'Faturado' (Pendente até o checkout)
    this.createTransaction({
      type: 'Receita',
      category: 'Frigobar',
      description: `Consumo Frigobar: ${data.quantity}x ${item.name} - Quarto ${room.number}`,
      amount: totalPrice,
      paymentMethod: 'Faturado',
      status: 'Pendente',
      reservationId: reservation?.id,
      roomNumber: room.number,
      guestName: room.currentGuestName,
      date: new Date().toISOString().split('T')[0]
    });

    // Create Kanban task for Room Service restocking if low
    this.createTask({
      title: `Reposição Frigobar: ${data.quantity}x ${item.name} no Quarto ${room.number}`,
      description: `Item consumido e lançado na conta. Reabastecer o frigobar do quarto.`,
      sector: 'RoomService',
      priority: 'Baixa',
      status: 'A_Fazer',
      roomNumber: room.number,
      relatedType: 'Frigobar',
      relatedId: newConsumption.id
    });

    this.persist();
    return newConsumption;
  }

  // --- Kitchen & Room Service ---
  public getMenuItems(): MenuItem[] {
    return this.data.menuItems;
  }

  public getOrders(): KitchenOrder[] {
    return this.data.orders;
  }

  public createOrder(data: {
    roomId: string;
    items: { menuItemId: string; quantity: number; notes?: string }[];
    destination: 'Quarto' | 'Restaurante' | 'Piscina';
    deliverySector: 'Cozinha' | 'Room Service';
    specialInstructions?: string;
  }): KitchenOrder {
    const room = this.data.rooms.find(r => r.id === data.roomId);
    if (!room) throw new Error('Quarto não encontrado');

    const reservation = this.data.reservations.find(
      r => r.roomId === room.id && r.status === 'CheckIn'
    );

    let totalAmount = 0;
    const orderItems = data.items.map(item => {
      const menuItem = this.data.menuItems.find(m => m.id === item.menuItemId);
      if (!menuItem) throw new Error(`Item do menu ${item.menuItemId} não encontrado`);
      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;
      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        notes: item.notes
      };
    });

    const deliveryFee = data.destination === 'Quarto' ? 15.0 : 0.0;
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: KitchenOrder = {
      id: `ord_${Date.now()}`,
      orderNumber,
      roomId: room.id,
      roomNumber: room.number,
      reservationId: reservation?.id || 'SEM_RESERVA',
      guestName: room.currentGuestName || 'Hóspede',
      items: orderItems,
      totalAmount,
      deliveryFee,
      destination: data.destination,
      deliverySector: data.deliverySector,
      status: 'Recebido',
      specialInstructions: data.specialInstructions,
      createdAt: new Date().toISOString()
    };

    this.data.orders.unshift(newOrder);

    // Sync integrated real-time inventory and Kardex for kitchen/room service
    if (this.data.inventoryItems) {
      orderItems.forEach(ordItem => {
        const invItem = this.data.inventoryItems.find(
          inv =>
            inv.linkedMenuItemId === ordItem.menuItemId ||
            inv.name.toLowerCase().includes(ordItem.name.toLowerCase()) ||
            ordItem.name.toLowerCase().includes(inv.name.toLowerCase())
        );
        if (invItem) {
          const prevStock = invItem.currentStock;
          invItem.currentStock = Math.max(0, invItem.currentStock - ordItem.quantity);
          invItem.updatedAt = new Date().toISOString();

          const stockMov: StockMovement = {
            id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            timestamp: new Date().toISOString(),
            itemId: invItem.id,
            itemName: invItem.name,
            sector: invItem.sector,
            type: 'Saida_Venda_A_B',
            quantity: ordItem.quantity,
            previousStock: prevStock,
            newStock: invItem.currentStock,
            unitCost: invItem.costPrice,
            totalCost: Number((invItem.costPrice * ordItem.quantity).toFixed(2)),
            originLocation: 'Cozinha / Restaurante',
            destinationLocation: `${data.destination} (${room.number})`,
            relatedRoomNumber: room.number,
            relatedReservationId: reservation?.id,
            relatedOrderId: newOrder.id,
            operator: 'Setor A&B / Cozinha',
            documentNumber: orderNumber,
            notes: `Baixa em tempo real por pedido ${orderNumber}`
          };
          if (!this.data.stockMovements) this.data.stockMovements = [];
          this.data.stockMovements.unshift(stockMov);
        }
      });
    }

    // Register financial transaction
    this.createTransaction({
      type: 'Receita',
      category: data.deliverySector === 'Room Service' ? 'RoomService' : 'Cozinha',
      description: `Pedido ${orderNumber} (${data.items.length} itens) - Quarto ${room.number}`,
      amount: totalAmount + deliveryFee,
      paymentMethod: 'Faturado',
      status: 'Pendente',
      reservationId: reservation?.id,
      roomNumber: room.number,
      guestName: room.currentGuestName,
      date: new Date().toISOString().split('T')[0]
    });

    // Create tasks in Cozinha Kanban
    this.createTask({
      title: `Pedido ${orderNumber}: ${orderItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
      description: `Destino: ${data.destination} (Quarto ${room.number}) | Instruções: ${data.specialInstructions || 'Nenhuma'}`,
      sector: 'Cozinha',
      priority: 'Alta',
      status: 'A_Fazer',
      roomNumber: room.number,
      guestName: room.currentGuestName,
      relatedType: 'Cozinha',
      relatedId: newOrder.id
    });

    // If Room Service destination is Quarto, create delivery task
    if (data.destination === 'Quarto') {
      this.createTask({
        title: `Entrega de Room Service ${orderNumber} - Quarto ${room.number}`,
        description: `Aguardar preparo na cozinha para entrega com cloche e recolhimento de assinatura.`,
        sector: 'RoomService',
        priority: 'Alta',
        status: 'A_Fazer',
        roomNumber: room.number,
        guestName: room.currentGuestName,
        relatedType: 'Cozinha',
        relatedId: newOrder.id
      });
    }

    this.persist();

    // Sincronizar em tempo real com a tabela kitchen_orders no banco de dados Supabase
    if (this.supabase) {
      try {
        this.supabase
          .from('kitchen_orders')
          .insert([
            {
              id: newOrder.id,
              order_number: newOrder.orderNumber,
              room_id: newOrder.roomId,
              room_number: newOrder.roomNumber,
              reservation_id: newOrder.reservationId,
              guest_name: newOrder.guestName,
              items: newOrder.items,
              total_amount: newOrder.totalAmount,
              delivery_fee: newOrder.deliveryFee,
              destination: newOrder.destination,
              delivery_sector: newOrder.deliverySector,
              status: newOrder.status,
              special_instructions: newOrder.specialInstructions || '',
              created_at: newOrder.createdAt
            }
          ])
          .then(
            ({ error }: any) => {
              if (error) {
                console.error('[Supabase] Erro ao sincronizar pedido no Supabase:', error.message);
              } else {
                console.log(`[Supabase Realtime] Pedido ${newOrder.orderNumber} inserido com sucesso no banco Supabase!`);
              }
            },
            (err: any) => console.error('[Supabase] Falha ao enviar pedido:', err)
          );
      } catch (err: any) {
        console.error('[Supabase] Erro inesperado ao inserir pedido:', err);
      }
    }

    return newOrder;
  }

  public updateOrderStatus(id: string, status: KitchenOrder['status']): KitchenOrder | null {
    const order = this.data.orders.find(o => o.id === id);
    if (!order) return null;
    order.status = status;
    if (status === 'Entregue' || status === 'Pronto') {
      order.completedAt = new Date().toISOString();
    }
    this.persist();

    if (this.supabase) {
      try {
        this.supabase
          .from('kitchen_orders')
          .update({
            status: order.status,
            completed_at: order.completedAt || null
          })
          .eq('id', order.id)
          .then(
            ({ error }: any) => {
              if (error) console.error('[Supabase] Erro ao atualizar status no Supabase:', error.message);
            },
            (err: any) => console.error('[Supabase] Erro ao atualizar status:', err)
          );
      } catch (err: any) {
        console.error('[Supabase] Erro inesperado ao atualizar pedido:', err);
      }
    }

    return order;
  }

  // --- Kanbans por Setor em Tempo Real ---
  public getTasks(sector?: KanbanTask['sector']): KanbanTask[] {
    if (sector) {
      return this.data.tasks.filter(t => t.sector === sector);
    }
    return this.data.tasks;
  }

  public createTask(taskData: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>): KanbanTask {
    const newTask: KanbanTask = {
      ...taskData,
      id: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.tasks.unshift(newTask);
    this.persist();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<KanbanTask>): KanbanTask | null {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.persist();
    return this.data.tasks[idx];
  }

  public deleteTask(id: string): boolean {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    this.data.tasks.splice(idx, 1);
    this.persist();
    return true;
  }

  // --- Financial Transactions & Stats ---
  public getTransactions(): FinancialTransaction[] {
    return this.data.transactions;
  }

  public createTransaction(txData: Omit<FinancialTransaction, 'id' | 'createdAt'>): FinancialTransaction {
    const newTx: FinancialTransaction = {
      ...txData,
      id: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.data.transactions.unshift(newTx);
    this.persist();
    return newTx;
  }

  public getFinancialStats(): FinancialStats {
    const todayStr = new Date().toISOString().split('T')[0];

    const revenues = this.data.transactions.filter(t => t.type === 'Receita' && t.status === 'Pago');
    const expenses = this.data.transactions.filter(t => t.type === 'Despesa' && t.status === 'Pago');
    const pending = this.data.transactions.filter(t => t.type === 'Receita' && t.status === 'Pendente');

    const totalRevenueMonth = revenues.reduce((acc, t) => acc + t.amount, 0);
    const totalRevenueToday = revenues
      .filter(t => t.date === todayStr)
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpensesMonth = expenses.reduce((acc, t) => acc + t.amount, 0);
    const totalPendingFolios = pending.reduce((acc, t) => acc + t.amount, 0);
    const netIncomeMonth = totalRevenueMonth - totalExpensesMonth;

    // By Category
    const categoryMap: Record<string, { amount: number; count: number }> = {};
    revenues.forEach(t => {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { amount: 0, count: 0 };
      }
      categoryMap[t.category].amount += t.amount;
      categoryMap[t.category].count += 1;
    });

    const byCategory = Object.keys(categoryMap).map(cat => ({
      category: cat,
      amount: categoryMap[cat].amount,
      count: categoryMap[cat].count
    }));

    // By Payment Method
    const methodMap: Record<string, number> = {};
    revenues.forEach(t => {
      methodMap[t.paymentMethod] = (methodMap[t.paymentMethod] || 0) + t.amount;
    });

    const byPaymentMethod = Object.keys(methodMap).map(method => ({
      method,
      amount: methodMap[method],
      percentage: totalRevenueMonth > 0 ? Math.round((methodMap[method] / totalRevenueMonth) * 100) : 0
    }));

    // Last 7 days chart
    const dailyRevenueLast7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
      const dayAmount = revenues
        .filter(t => t.date === dateKey)
        .reduce((acc, t) => acc + t.amount, 0);

      dailyRevenueLast7Days.push({
        date: dateKey,
        label: dayLabel,
        amount: dayAmount
      });
    }

    return {
      totalRevenueMonth,
      totalRevenueToday,
      totalPendingFolios,
      totalExpensesMonth,
      netIncomeMonth,
      byCategory,
      byPaymentMethod,
      dailyRevenueLast7Days
    };
  }

  // -------------------------------------------------------------
  // Integrated Real-Time Inventory & Sub-Stock Control
  // -------------------------------------------------------------
  public getInventoryItems(sector?: string, lowStockOnly?: boolean): InventoryItem[] {
    let items = this.data.inventoryItems || [];
    if (sector && sector !== 'ALL') {
      items = items.filter(i => i.sector === sector);
    }
    if (lowStockOnly) {
      items = items.filter(i => i.currentStock <= i.minStock);
    }
    return items;
  }

  public getInventoryItemById(id: string): InventoryItem | undefined {
    return (this.data.inventoryItems || []).find(i => i.id === id);
  }

  public createInventoryItem(data: Omit<InventoryItem, 'id' | 'updatedAt'>): InventoryItem {
    if (!this.data.inventoryItems) this.data.inventoryItems = [];
    const id = `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newItem: InventoryItem = {
      ...data,
      id,
      currentStock: Number(data.currentStock) || 0,
      minStock: Number(data.minStock) || 0,
      costPrice: Number(data.costPrice) || 0,
      sellingPrice: data.sellingPrice !== undefined ? Number(data.sellingPrice) : undefined,
      updatedAt: new Date().toISOString()
    };

    this.data.inventoryItems.push(newItem);

    // Record initial stock entry movement if currentStock > 0
    if (newItem.currentStock > 0) {
      const initMov: StockMovement = {
        id: `mov_${Date.now()}`,
        timestamp: new Date().toISOString(),
        itemId: newItem.id,
        itemName: newItem.name,
        sector: newItem.sector,
        type: 'Ajuste_Inventario',
        quantity: newItem.currentStock,
        previousStock: 0,
        newStock: newItem.currentStock,
        unitCost: newItem.costPrice,
        totalCost: Number((newItem.costPrice * newItem.currentStock).toFixed(2)),
        originLocation: 'Cadastro Inicial',
        destinationLocation: newItem.sector,
        operator: 'Almoxarifado Central',
        notes: 'Cadastro inicial de item no catálogo de inventário'
      };
      if (!this.data.stockMovements) this.data.stockMovements = [];
      this.data.stockMovements.unshift(initMov);
    }

    this.persist();
    return newItem;
  }

  public updateInventoryItem(id: string, updates: Partial<InventoryItem>): InventoryItem | null {
    if (!this.data.inventoryItems) return null;
    const idx = this.data.inventoryItems.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const existing = this.data.inventoryItems[idx];
    const prevStock = existing.currentStock;

    this.data.inventoryItems[idx] = {
      ...existing,
      ...updates,
      currentStock: updates.currentStock !== undefined ? Number(updates.currentStock) : existing.currentStock,
      minStock: updates.minStock !== undefined ? Number(updates.minStock) : existing.minStock,
      costPrice: updates.costPrice !== undefined ? Number(updates.costPrice) : existing.costPrice,
      sellingPrice: updates.sellingPrice !== undefined ? Number(updates.sellingPrice) : existing.sellingPrice,
      updatedAt: new Date().toISOString()
    };

    // If stock changed directly via item edit, record an inventory adjustment
    if (updates.currentStock !== undefined && Number(updates.currentStock) !== prevStock) {
      const diff = Number(updates.currentStock) - prevStock;
      const adjustMov: StockMovement = {
        id: `mov_${Date.now()}`,
        timestamp: new Date().toISOString(),
        itemId: existing.id,
        itemName: existing.name,
        sector: existing.sector,
        type: 'Ajuste_Inventario',
        quantity: Math.abs(diff),
        previousStock: prevStock,
        newStock: Number(updates.currentStock),
        unitCost: existing.costPrice,
        totalCost: Number((existing.costPrice * Math.abs(diff)).toFixed(2)),
        originLocation: 'Ajuste Manual de Balanço',
        destinationLocation: existing.sector,
        operator: 'Gestão de Estoque',
        notes: `Ajuste manual de saldo de ${prevStock} para ${updates.currentStock}`
      };
      if (!this.data.stockMovements) this.data.stockMovements = [];
      this.data.stockMovements.unshift(adjustMov);
    }

    this.persist();
    return this.data.inventoryItems[idx];
  }

  public deleteInventoryItem(id: string): boolean {
    if (!this.data.inventoryItems) return false;
    const idx = this.data.inventoryItems.findIndex(i => i.id === id);
    if (idx === -1) return false;
    this.data.inventoryItems.splice(idx, 1);
    this.persist();
    return true;
  }

  public registerStockMovement(data: {
    itemId: string;
    type: StockMovementType;
    quantity: number;
    unitCost?: number;
    originLocation?: string;
    destinationLocation?: string;
    relatedRoomNumber?: string;
    relatedReservationId?: string;
    operator?: string;
    documentNumber?: string;
    notes?: string;
  }): { item: InventoryItem; movement: StockMovement } {
    if (!this.data.inventoryItems) this.data.inventoryItems = [];
    if (!this.data.stockMovements) this.data.stockMovements = [];

    const item = this.data.inventoryItems.find(i => i.id === data.itemId);
    if (!item) throw new Error('Item de estoque não encontrado.');

    const qty = Math.max(0, Number(data.quantity) || 0);
    const prevStock = item.currentStock;
    let newStock = prevStock;

    switch (data.type) {
      case 'Entrada_Compra':
        newStock = prevStock + qty;
        // Optionally update item cost price if provided
        if (data.unitCost !== undefined && data.unitCost > 0) {
          item.costPrice = Number(data.unitCost);
        }
        break;
      case 'Saida_Consumo_Quarto':
      case 'Saida_Venda_A_B':
      case 'Saida_Uso_Interno':
      case 'Perda_Avaria':
        newStock = Math.max(0, prevStock - qty);
        break;
      case 'Transferencia':
        // Transferencia between physical locations or departments
        newStock = Math.max(0, prevStock - qty);
        break;
      case 'Ajuste_Inventario':
        // Direct set or difference
        newStock = qty;
        break;
      default:
        newStock = prevStock + qty;
    }

    item.currentStock = newStock;
    item.updatedAt = new Date().toISOString();

    const unitCost = data.unitCost !== undefined ? Number(data.unitCost) : item.costPrice;
    const totalCost = Number((unitCost * (data.type === 'Ajuste_Inventario' ? Math.abs(newStock - prevStock) : qty)).toFixed(2));

    const movement: StockMovement = {
      id: `mov_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      itemId: item.id,
      itemName: item.name,
      sector: item.sector,
      type: data.type,
      quantity: data.type === 'Ajuste_Inventario' ? Math.abs(newStock - prevStock) : qty,
      previousStock: prevStock,
      newStock,
      unitCost,
      totalCost,
      originLocation: data.originLocation || item.sector,
      destinationLocation: data.destinationLocation,
      relatedRoomNumber: data.relatedRoomNumber,
      relatedReservationId: data.relatedReservationId,
      operator: data.operator || 'Operador Almoxarifado',
      documentNumber: data.documentNumber,
      notes: data.notes
    };

    this.data.stockMovements.unshift(movement);

    // If stock reached critical point, create automatic task for Procurement/Governança
    if (newStock <= item.minStock) {
      const existingTask = this.data.tasks.find(
        t => t.title.includes(`Repor Estoque: ${item.name}`) && t.status !== 'Concluido'
      );
      if (!existingTask) {
        this.createTask({
          title: `Repor Estoque: ${item.name} (${item.sku})`,
          description: `Item atingiu estoque crítico (${newStock} ${item.unit} restantes, mínimo é ${item.minStock} ${item.unit}). Providenciar pedido de reposição junto ao fornecedor ${item.supplier || 'padrão'}.`,
          sector: item.sector === 'Frigobar' || item.sector === 'Governanca_Enxoval' ? 'Governanca' : item.sector === 'Alimentos_Bebidas' ? 'Cozinha' : 'Manutencao',
          priority: newStock === 0 ? 'Urgente' : 'Alta',
          status: 'A_Fazer',
          relatedType: 'Geral',
          relatedId: item.id
        });
      }
    }

    this.persist();
    return { item, movement };
  }

  public getStockMovements(filters?: { itemId?: string; sector?: string; type?: string; limit?: number }): StockMovement[] {
    let movements = this.data.stockMovements || [];
    if (filters?.itemId) {
      movements = movements.filter(m => m.itemId === filters.itemId);
    }
    if (filters?.sector && filters.sector !== 'ALL') {
      movements = movements.filter(m => m.sector === filters.sector);
    }
    if (filters?.type && filters.type !== 'ALL') {
      movements = movements.filter(m => m.type === filters.type);
    }
    if (filters?.limit) {
      movements = movements.slice(0, filters.limit);
    }
    return movements;
  }

  public getInventoryStats(): InventoryStats {
    const items = this.data.inventoryItems || [];
    const movements = this.data.stockMovements || [];

    const todayStr = new Date().toISOString().split('T')[0];
    const movementsToday = movements.filter(m => m.timestamp.startsWith(todayStr)).length;

    let totalValuation = 0;
    let criticalStockCount = 0;
    let replenishmentSuggestedCount = 0;

    const sectorMap: Record<string, { count: number; valuation: number }> = {
      Almoxarifado: { count: 0, valuation: 0 },
      Frigobar: { count: 0, valuation: 0 },
      Alimentos_Bebidas: { count: 0, valuation: 0 },
      Governanca_Enxoval: { count: 0, valuation: 0 },
      Manutencao: { count: 0, valuation: 0 }
    };

    items.forEach(item => {
      const val = item.currentStock * item.costPrice;
      totalValuation += val;

      if (item.currentStock <= item.minStock) {
        criticalStockCount++;
      }
      if (item.currentStock < (item.minStock * 1.5)) {
        replenishmentSuggestedCount++;
      }

      if (sectorMap[item.sector]) {
        sectorMap[item.sector].count += 1;
        sectorMap[item.sector].valuation += val;
      }
    });

    const bySector = Object.keys(sectorMap).map(sec => ({
      sector: sec as any,
      count: sectorMap[sec].count,
      valuation: Number(sectorMap[sec].valuation.toFixed(2))
    }));

    return {
      totalItems: items.length,
      totalValuation: Number(totalValuation.toFixed(2)),
      criticalStockCount,
      replenishmentSuggestedCount,
      movementsToday,
      bySector
    };
  }

  public generateReplenishmentOrders(itemIds?: string[]): { tasksCreated: number; estimatedCost: number } {
    const items = (this.data.inventoryItems || []).filter(item => {
      if (itemIds && itemIds.length > 0) return itemIds.includes(item.id);
      return item.currentStock <= item.minStock;
    });

    let estimatedCost = 0;
    items.forEach(item => {
      const qtyToBuy = Math.max(1, (item.minStock * 2) - item.currentStock);
      const cost = qtyToBuy * item.costPrice;
      estimatedCost += cost;

      this.createTask({
        title: `Compra Programada: ${qtyToBuy} ${item.unit} de ${item.name}`,
        description: `Ordem de compra automática disparada pelo Ponto de Pedido. Fornecedor: ${item.supplier || 'A cotar'}. Custo estimado: R$ ${cost.toFixed(2)}.`,
        sector: 'Governanca',
        priority: 'Alta',
        status: 'A_Fazer',
        relatedType: 'Geral',
        relatedId: item.id
      });
    });

    this.persist();
    return {
      tasksCreated: items.length,
      estimatedCost: Number(estimatedCost.toFixed(2))
    };
  }

  // --- Staff Users & Access Control (RBAC) ---
  public getUsers(): StaffUser[] {
    return this.data.users || defaultStaffUsers;
  }

  public getUserById(id: string): StaffUser | undefined {
    return (this.data.users || []).find(u => u.id === id);
  }

  public getUserByEmail(email: string): StaffUser | undefined {
    return (this.data.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(userData: Omit<StaffUser, 'id' | 'createdAt' | 'updatedAt'>): StaffUser {
    const existing = this.getUserByEmail(userData.email);
    if (existing) {
      throw new Error(`Já existe um usuário cadastrado com o e-mail: ${userData.email}`);
    }

    const newUser: StaffUser = {
      ...userData,
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!this.data.users) this.data.users = [];
    this.data.users.push(newUser);
    this.persist();

    // Sincronizar com Supabase se conectado
    if (this.supabase && this.supabaseConnected) {
      try {
        this.supabase
          .from('staff_users')
          .insert([
            {
              id: newUser.id,
              email: newUser.email,
              full_name: newUser.fullName,
              role: newUser.role,
              sector: newUser.sector,
              status: newUser.status,
              phone: newUser.phone || null,
              avatar_url: newUser.avatarUrl || null,
              permissions: newUser.permissions,
              supabase_auth_id: newUser.supabaseAuthId || null,
              created_at: newUser.createdAt,
              updated_at: newUser.updatedAt
            }
          ])
          .then(
            ({ error }: any) => {
              if (error) console.error('[Supabase] Erro ao sincronizar usuário:', error.message);
            },
            (err: any) => console.error('[Supabase] Falha ao enviar usuário:', err)
          );
      } catch (err) {
        console.error('[Supabase] Erro inesperado ao inserir usuário:', err);
      }
    }

    return newUser;
  }

  public updateUser(id: string, updates: Partial<StaffUser>): StaffUser {
    const index = (this.data.users || []).findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error(`Usuário com ID ${id} não encontrado.`);
    }

    const updated: StaffUser = {
      ...this.data.users[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.data.users[index] = updated;
    this.persist();

    // Sincronizar com Supabase
    if (this.supabase && this.supabaseConnected) {
      try {
        this.supabase
          .from('staff_users')
          .update({
            full_name: updated.fullName,
            role: updated.role,
            sector: updated.sector,
            status: updated.status,
            phone: updated.phone || null,
            avatar_url: updated.avatarUrl || null,
            permissions: updated.permissions,
            supabase_auth_id: updated.supabaseAuthId || null,
            last_login_at: updated.lastLoginAt || null,
            updated_at: updated.updatedAt
          })
          .eq('id', updated.id)
          .then(
            ({ error }: any) => {
              if (error) console.error('[Supabase] Erro ao atualizar usuário:', error.message);
            },
            (err: any) => console.error('[Supabase] Falha ao atualizar usuário:', err)
          );
      } catch (err) {
        console.error('[Supabase] Erro ao atualizar usuário:', err);
      }
    }

    return updated;
  }

  public deleteUser(id: string): boolean {
    const index = (this.data.users || []).findIndex(u => u.id === id);
    if (index === -1) return false;

    // Não permitir excluir o único administrador
    const user = this.data.users[index];
    if (user.role === 'admin') {
      const adminCount = this.data.users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        throw new Error('Não é possível excluir o único Administrador do sistema.');
      }
    }

    this.data.users.splice(index, 1);
    this.persist();

    if (this.supabase && this.supabaseConnected) {
      try {
        this.supabase
          .from('staff_users')
          .delete()
          .eq('id', id)
          .then(
            ({ error }: any) => {
              if (error) console.error('[Supabase] Erro ao deletar usuário:', error.message);
            },
            (err: any) => console.error('[Supabase] Falha ao deletar usuário:', err)
          );
      } catch (err) {
        console.error('[Supabase] Erro ao deletar usuário:', err);
      }
    }

    return true;
  }
}

export const dbManager = new DatabaseManager();
