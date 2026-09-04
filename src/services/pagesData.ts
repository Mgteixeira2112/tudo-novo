import { HotelSettings, KanbanTask, KitchenOrder, MenuItem, Reservation, Room } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';


export async function loadPublicSettingsFromSupabase(): Promise<HotelSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: row, error } = await supabase.rpc('get_public_hotel_settings');
  if (error) throw error;
  if (!row) throw new Error('Configurações públicas do hotel não encontradas.');

  return {
    hotelName: row.hotel_name,
    tagline: row.tagline || '',
    description: row.description || '',
    logoIcon: row.logo_icon || 'hotel',
    primaryColor: row.primary_color || 'emerald',
    currency: row.currency || 'R$',
    taxRatePercent: Number(row.tax_rate_percent || 0),
    checkInTime: row.check_in_time || '14:00',
    checkOutTime: row.check_out_time || '11:00',
    address: row.city_state ? `${row.address || ''} • ${row.city_state}` : (row.address || ''),
    phone: row.phone || '',
    email: row.email || '',
    bookingPolicies: row.booking_policies || '',
    roomTypes: Array.isArray(row.room_types) ? row.room_types : []
  } as HotelSettings;
}

export async function loadRoomsFromSupabase(): Promise<Room[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('number', { ascending: true });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    number: row.number,
    typeId: row.type_id,
    typeName: row.type_name,
    floor: Number(row.floor || 1),
    status: row.status,
    pricePerNight: Number(row.price_per_night || 0),
    capacity: Number(row.capacity || 1),
    currentReservationId: row.current_reservation_id || undefined,
    currentGuestName: row.current_guest_name || undefined,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    notes: row.notes || undefined
  })) as Room[];
}

export async function loadReservationsFromSupabase(): Promise<Reservation[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    code: row.code,
    guestId: row.guest_id || '',
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone || '',
    roomId: row.room_id || '',
    roomNumber: row.room_number || '',
    roomTypeName: row.room_type_name,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    nights: Number(row.nights || 0),
    adults: Number(row.adults || 0),
    children: Number(row.children || 0),
    pricePerNight: Number(row.price_per_night || 0),
    totalNightsAmount: Number(row.total_nights_amount || 0),
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    checkedInAt: row.checked_in_at || undefined,
    checkedOutAt: row.checked_out_at || undefined
  })) as Reservation[];
}

export async function createReservationAtomicInSupabase(data: {
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
}): Promise<Reservation> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: row, error } = await supabase.rpc('create_reservation_atomic', {
    p_guest_name: data.guestName,
    p_guest_email: data.guestEmail,
    p_guest_phone: data.guestPhone,
    p_room_type_id: data.roomTypeId,
    p_check_in_date: data.checkInDate,
    p_check_out_date: data.checkOutDate,
    p_adults: data.adults,
    p_children: data.children,
    p_payment_method: data.paymentMethod,
    p_notes: data.notes || null
  });

  if (error) {
    const message = String(error.message || 'Erro ao criar reserva.');
    if (message.includes('Não há quarto disponível')) {
      throw new Error('Não há quarto disponível para este tipo e período.');
    }
    throw error;
  }

  const r: any = row;
  return {
    id: r.id,
    code: r.code,
    guestId: r.guest_id || '',
    guestName: r.guest_name,
    guestEmail: r.guest_email,
    guestPhone: r.guest_phone || '',
    roomId: r.room_id || '',
    roomNumber: r.room_number || '',
    roomTypeName: r.room_type_name,
    checkInDate: r.check_in_date,
    checkOutDate: r.check_out_date,
    nights: Number(r.nights || 0),
    adults: Number(r.adults || 0),
    children: Number(r.children || 0),
    pricePerNight: Number(r.price_per_night || 0),
    totalNightsAmount: Number(r.total_nights_amount || 0),
    status: r.status,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    notes: r.notes || undefined,
    createdAt: r.created_at,
    checkedInAt: r.checked_in_at || undefined,
    checkedOutAt: r.checked_out_at || undefined
  } as Reservation;
}

export async function loadMenuItemsFromSupabase(): Promise<MenuItem[]> {
  const supabase = getSupabaseClient(); if (!supabase) return [];
  const { data, error } = await supabase.from('menu_items').select('*').eq('available', true).order('category').order('name');
  if (error) throw error;
  return (data || []).map((r:any) => ({ id:r.id,name:r.name,category:r.category,price:Number(r.price||0),description:r.description||'',prepTimeMinutes:Number(r.prep_time_minutes||0),available:r.available!==false })) as MenuItem[];
}

export async function loadKitchenOrdersFromSupabase(): Promise<KitchenOrder[]> {
  const supabase = getSupabaseClient(); if (!supabase) return [];
  const { data, error } = await supabase.from('kitchen_orders').select('*').order('created_at',{ascending:false});
  if (error) throw error;
  return (data || []).map((r:any)=>({id:r.id,orderNumber:r.order_number,roomId:r.room_id||'',roomNumber:r.room_number,reservationId:r.reservation_id||'',guestName:r.guest_name||'',items:Array.isArray(r.items)?r.items:[],totalAmount:Number(r.total_amount||0),deliveryFee:Number(r.delivery_fee||0),destination:r.destination,deliverySector:r.delivery_sector,status:r.status,specialInstructions:r.special_instructions||'',createdAt:r.created_at,completedAt:r.completed_at||undefined})) as KitchenOrder[];
}


function mapKitchenOrderRow(r:any): KitchenOrder {
  return {id:r.id,orderNumber:r.order_number,roomId:r.room_id||'',roomNumber:r.room_number,reservationId:r.reservation_id||'',guestName:r.guest_name||'',items:Array.isArray(r.items)?r.items:[],totalAmount:Number(r.total_amount||0),deliveryFee:Number(r.delivery_fee||0),destination:r.destination,deliverySector:r.delivery_sector,status:r.status,specialInstructions:r.special_instructions||'',createdAt:r.created_at,completedAt:r.completed_at||undefined} as KitchenOrder;
}

export async function createKitchenOrderInSupabase(input:{roomId:string;items:{menuItemId:string;quantity:number;notes?:string}[];destination:'Quarto'|'Restaurante'|'Piscina';deliverySector:'Cozinha'|'Room Service';specialInstructions?:string}):Promise<KitchenOrder>{
  const supabase=getSupabaseClient(); if(!supabase) throw new Error('Supabase não configurado.');
  const {data,error}=await supabase.rpc('create_kitchen_order_atomic',{
    p_room_id:input.roomId,
    p_items:input.items,
    p_destination:input.destination,
    p_delivery_sector:input.deliverySector,
    p_special_instructions:input.specialInstructions||null
  });
  if(error)throw error;
  return mapKitchenOrderRow(data);
}
export async function updateKitchenOrderStatusInSupabase(id:string,status:KitchenOrder['status']):Promise<KitchenOrder>{
  const supabase=getSupabaseClient(); if(!supabase) throw new Error('Supabase não configurado.');
  const payload:any={status}; if(status==='Entregue'||status==='Cancelado')payload.completed_at=new Date().toISOString();
  const {data,error}=await supabase.from('kitchen_orders').update(payload).eq('id',id).select('*').single(); if(error) throw error;
  return mapKitchenOrderRow(data);
}

export async function loadKanbanTasksFromSupabase(sector?: string): Promise<KanbanTask[]> {
  const supabase = getSupabaseClient(); if (!supabase) return [];
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let q = supabase
    .from('kanban_tasks')
    .select('*')
    .or(`status.neq.Concluido,completed_at.gt.${cutoff}`)
    .order('created_at',{ascending:false});
  if (sector) q=q.eq('sector',sector);
  const { data,error }=await q; if(error) throw error;
  return (data||[]).map((r:any)=>({id:r.id,title:r.title,description:r.description||'',sector:r.sector,status:r.status,priority:r.priority,roomNumber:r.room_number||undefined,guestName:r.guest_name||undefined,assignedTo:r.assigned_to||undefined,relatedType:r.related_type||undefined,relatedId:r.related_id||undefined,createdAt:r.created_at,updatedAt:r.updated_at})) as KanbanTask[];
}


function mapKanbanRow(r: any): KanbanTask {
  return {
    id: r.id, title: r.title, description: r.description || '', sector: r.sector,
    status: r.status, priority: r.priority, roomNumber: r.room_number || undefined,
    guestName: r.guest_name || undefined, assignedTo: r.assigned_to || undefined,
    relatedType: r.related_type || undefined, relatedId: r.related_id || undefined,
    createdAt: r.created_at, updatedAt: r.updated_at
  } as KanbanTask;
}

function kanbanPayload(task: Partial<KanbanTask>) {
  const payload: Record<string, any> = {};
  const map: Record<string, string> = {
    title: 'title', description: 'description', sector: 'sector', status: 'status', priority: 'priority',
    roomNumber: 'room_number', guestName: 'guest_name', assignedTo: 'assigned_to',
    relatedType: 'related_type', relatedId: 'related_id'
  };
  for (const [key, column] of Object.entries(map)) {
    if (Object.prototype.hasOwnProperty.call(task, key)) payload[column] = (task as any)[key] ?? null;
  }
  return payload;
}

export async function createKanbanTaskInSupabase(task: Omit<KanbanTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<KanbanTask> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const now = new Date().toISOString();
  const row = {
    id: `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    ...kanbanPayload(task),
    created_at: now, updated_at: now
  };
  const { data, error } = await supabase.from('kanban_tasks').insert(row).select('*').single();
  if (error) throw error;
  return mapKanbanRow(data);
}

export async function updateKanbanTaskInSupabase(id: string, updates: Partial<KanbanTask>): Promise<KanbanTask> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const payload = { ...kanbanPayload(updates), updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('kanban_tasks').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return mapKanbanRow(data);
}

export async function deleteKanbanTaskInSupabase(id: string): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase.from('kanban_tasks').delete().eq('id', id);
  if (error) throw error;
  return { success: true };
}