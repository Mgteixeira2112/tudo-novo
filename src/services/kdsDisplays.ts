import { getSupabaseClient } from './supabase.ts';

export type KdsPreset = 'operations' | 'kitchen' | 'housekeeping' | 'maintenance' | 'frontdesk';

export interface KdsDisplayRecord {
  id: string;
  name: string;
  preset: KdsPreset;
  active: boolean;
  token: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicKdsDisplay {
  id: string;
  name: string;
  preset: KdsPreset;
  active: boolean;
  server_time: string;
}

export interface PublicKdsKitchenOrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}

export interface PublicKdsKitchenOrder {
  id: string;
  order_number: string;
  room_number: string;
  guest_name: string;
  items: PublicKdsKitchenOrderItem[];
  destination: 'Quarto' | 'Restaurante' | 'Piscina';
  delivery_sector: 'Cozinha' | 'Room Service';
  status: 'Recebido' | 'Em Preparo' | 'Pronto';
  special_instructions?: string | null;
  created_at: string;
}

export interface PublicKdsHousekeepingRoom {
  id: string;
  number: string;
  floor: number;
  type_name: string;
  notes?: string | null;
  status: 'Limpeza';
}

export interface PublicKdsMaintenanceRoom {
  id: string;
  number: string;
  floor: number;
  type_name: string;
  notes?: string | null;
  status: 'Manutencao';
}

export interface PublicKdsFrontdeskRoom {
  id: string;
  number: string;
  floor: number;
  type_name: string;
  status: string;
  current_guest_name?: string | null;
}

export interface PublicKdsFrontdeskReservation {
  id: string;
  code?: string | null;
  guest_name: string;
  room_number?: string | null;
  room_type_name?: string | null;
  check_in_date?: string | null;
  check_out_date?: string | null;
  status: string;
}

export interface PublicKdsFrontdeskOverview {
  server_date: string;
  rooms: PublicKdsFrontdeskRoom[];
  arrivals: PublicKdsFrontdeskReservation[];
  departures: PublicKdsFrontdeskReservation[];
}

export interface PublicKdsOperationsReservation {
  id: string;
  guest_name: string;
  room_number?: string | null;
  status: string;
}

export interface PublicKdsOperationsKitchenOrder {
  id: string;
  order_number: string;
  room_number?: string | null;
  status: 'Recebido' | 'Em Preparo' | 'Pronto';
  created_at: string;
}

export interface PublicKdsOperationsRoomRef {
  id: string;
  number: string;
  floor: number;
}

export interface PublicKdsOperationsOverview {
  server_date: string;
  room_status: {
    total: number;
    available: number;
    occupied: number;
    cleaning: number;
    maintenance: number;
    blocked: number;
  };
  arrivals: PublicKdsOperationsReservation[];
  departures: PublicKdsOperationsReservation[];
  kitchen_orders: PublicKdsOperationsKitchenOrder[];
  housekeeping_rooms: PublicKdsOperationsRoomRef[];
  maintenance_rooms: PublicKdsOperationsRoomRef[];
}

function getClient() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export async function listKdsDisplays(): Promise<KdsDisplayRecord[]> {
  const { data, error } = await getClient().rpc('list_kds_displays');
  if (error) throw new Error(error.message || 'Não foi possível carregar as telas KDS.');
  return (data || []) as KdsDisplayRecord[];
}

export async function createKdsDisplay(name: string, preset: KdsPreset): Promise<KdsDisplayRecord> {
  const { data, error } = await getClient().rpc('create_kds_display', {
    p_name: name,
    p_preset: preset
  });
  if (error) throw new Error(error.message || 'Não foi possível criar a tela KDS.');
  return data as KdsDisplayRecord;
}

export async function updateKdsDisplay(
  id: string,
  name: string,
  preset: KdsPreset,
  active: boolean
): Promise<KdsDisplayRecord> {
  const { data, error } = await getClient().rpc('update_kds_display', {
    p_id: id,
    p_name: name,
    p_preset: preset,
    p_active: active
  });
  if (error) throw new Error(error.message || 'Não foi possível atualizar a tela KDS.');
  return data as KdsDisplayRecord;
}

export async function rotateKdsDisplayToken(id: string): Promise<string> {
  const { data, error } = await getClient().rpc('rotate_kds_display_token', { p_id: id });
  if (error) throw new Error(error.message || 'Não foi possível regenerar o link KDS.');
  return String(data || '');
}

export async function getPublicKdsDisplay(token: string): Promise<PublicKdsDisplay | null> {
  const { data, error } = await getClient().rpc('get_kds_public', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar a tela KDS.');
  return (data || null) as PublicKdsDisplay | null;
}

export async function getPublicKdsKitchenOrders(token: string): Promise<PublicKdsKitchenOrder[]> {
  const { data, error } = await getClient().rpc('get_kds_kitchen_orders', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar os pedidos do KDS.');
  return Array.isArray(data) ? (data as PublicKdsKitchenOrder[]) : [];
}

export async function getPublicKdsHousekeepingRooms(token: string): Promise<PublicKdsHousekeepingRoom[]> {
  const { data, error } = await getClient().rpc('get_kds_housekeeping_rooms', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar os quartos em limpeza.');
  return Array.isArray(data) ? (data as PublicKdsHousekeepingRoom[]) : [];
}

export async function getPublicKdsMaintenanceRooms(token: string): Promise<PublicKdsMaintenanceRoom[]> {
  const { data, error } = await getClient().rpc('get_kds_maintenance_rooms', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar os quartos em manutenção.');
  return Array.isArray(data) ? (data as PublicKdsMaintenanceRoom[]) : [];
}

export async function getPublicKdsFrontdeskOverview(token: string): Promise<PublicKdsFrontdeskOverview> {
  const { data, error } = await getClient().rpc('get_kds_frontdesk_overview', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar a visão da recepção.');
  const overview = (data || {}) as Partial<PublicKdsFrontdeskOverview>;
  return {
    server_date: String(overview.server_date || ''),
    rooms: Array.isArray(overview.rooms) ? overview.rooms : [],
    arrivals: Array.isArray(overview.arrivals) ? overview.arrivals : [],
    departures: Array.isArray(overview.departures) ? overview.departures : []
  };
}

export async function getPublicKdsOperationsOverview(token: string): Promise<PublicKdsOperationsOverview> {
  const { data, error } = await getClient().rpc('get_kds_operations_overview', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar a visão operacional geral.');
  const overview = (data || {}) as Partial<PublicKdsOperationsOverview>;
  const status = overview.room_status || {} as PublicKdsOperationsOverview['room_status'];
  return {
    server_date: String(overview.server_date || ''),
    room_status: {
      total: Number(status.total || 0),
      available: Number(status.available || 0),
      occupied: Number(status.occupied || 0),
      cleaning: Number(status.cleaning || 0),
      maintenance: Number(status.maintenance || 0),
      blocked: Number(status.blocked || 0)
    },
    arrivals: Array.isArray(overview.arrivals) ? overview.arrivals : [],
    departures: Array.isArray(overview.departures) ? overview.departures : [],
    kitchen_orders: Array.isArray(overview.kitchen_orders) ? overview.kitchen_orders : [],
    housekeeping_rooms: Array.isArray(overview.housekeeping_rooms) ? overview.housekeeping_rooms : [],
    maintenance_rooms: Array.isArray(overview.maintenance_rooms) ? overview.maintenance_rooms : []
  };
}

export async function validateKdsDisplayToken(token: string): Promise<boolean> {
  const { data, error } = await getClient().rpc('validate_kds_display_token', { p_token: token });
  if (error) return false;
  return Boolean(data);
}

export async function heartbeatKdsDisplay(token: string): Promise<boolean> {
  const { data, error } = await getClient().rpc('heartbeat_kds_display', { p_token: token });
  if (error) return false;
  return Boolean(data);
}

export function buildKdsDisplayUrl(token: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('kds', token);
  return url.toString();
}
