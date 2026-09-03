import { HotelSettings, KanbanTask, KitchenOrder, MenuItem, Reservation, Room } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';


export async function loadPublicSettingsFromSupabase(): Promise<HotelSettings> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data: row, error } = await supabase
    .from('hotel_settings')
    .select('hotel_name,tagline,description,logo_icon,primary_color,currency,tax_rate_percent,check_in_time,check_out_time,address,city_state,phone,email,booking_policies,room_types')
    .eq('id', 'hotel_1')
    .single();
  if (error) throw error;

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
  const {data:room,error:roomError}=await supabase.from('rooms').select('*').eq('id',input.roomId).single(); if(roomError) throw roomError;
  const ids=[...new Set(input.items.map(i=>i.menuItemId))];
  const {data:menu,error:menuError}=await supabase.from('menu_items').select('*').in('id',ids); if(menuError) throw menuError;
  const byId=new Map((menu||[]).map((m:any)=>[m.id,m]));
  const normalized=input.items.filter(i=>Number(i.quantity)>0).map(i=>{const m:any=byId.get(i.menuItemId);if(!m)throw new Error('Item de cardápio inválido.');return{menuItemId:m.id,name:m.name,price:Number(m.price||0),quantity:Number(i.quantity),notes:i.notes||''};});
  if(!normalized.length) throw new Error('Selecione ao menos um item.');
  const itemsTotal=normalized.reduce((sum:any,i:any)=>sum+i.price*i.quantity,0);
  const deliveryFee=input.destination==='Quarto'?15:0;
  let validReservationId:string|null=null;
  if(room.current_reservation_id){const{data:r}=await supabase.from('reservations').select('id').eq('id',room.current_reservation_id).maybeSingle();validReservationId=r?.id||null;}
  const now=new Date().toISOString();
  const id=`ord_${Date.now()}_${Math.floor(Math.random()*10000)}`;
  const row={id,order_number:`RS-${String(Date.now()).slice(-6)}`,room_id:room.id,room_number:room.number,reservation_id:validReservationId,guest_name:room.current_guest_name||null,items:normalized,total_amount:itemsTotal+deliveryFee,delivery_fee:deliveryFee,destination:input.destination,delivery_sector:input.deliverySector,status:'Recebido',special_instructions:input.specialInstructions||null,created_at:now,completed_at:null};
  const {data,error}=await supabase.from('kitchen_orders').insert(row).select('*').single(); if(error) throw error;
  const {error:finError}=await supabase.from('financial_transactions').insert({id:`tx_${Date.now()}_${Math.floor(Math.random()*1000)}`,type:'Receita',category:'Room Service',description:`Room Service ${row.order_number} - Quarto ${room.number}`,amount:row.total_amount,payment_method:'Faturado',status:'Pendente',reservation_id:validReservationId,room_number:room.number,guest_name:room.current_guest_name||null,date:now.slice(0,10),created_at:now});
  if(finError){await supabase.from('kitchen_orders').delete().eq('id',id);throw finError;}
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
  let q = supabase.from('kanban_tasks').select('*').order('created_at',{ascending:false}); if (sector) q=q.eq('sector',sector);
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
