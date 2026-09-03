import { Reservation, Room } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

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

export async function loadKanbanTasksFromSupabase(sector?: string): Promise<KanbanTask[]> {
  const supabase = getSupabaseClient(); if (!supabase) return [];
  let q = supabase.from('kanban_tasks').select('*').order('created_at',{ascending:false}); if (sector) q=q.eq('sector',sector);
  const { data,error }=await q; if(error) throw error;
  return (data||[]).map((r:any)=>({id:r.id,title:r.title,description:r.description||'',sector:r.sector,status:r.status,priority:r.priority,roomNumber:r.room_number||undefined,guestName:r.guest_name||undefined,assignedTo:r.assigned_to||undefined,relatedType:r.related_type||undefined,relatedId:r.related_id||undefined,createdAt:r.created_at,updatedAt:r.updated_at})) as KanbanTask[];
}
