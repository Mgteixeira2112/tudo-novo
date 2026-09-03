import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { KanbanTask, KitchenOrder, MenuItem } from '../src/types.ts';

function getClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === 'production') throw new Error('Supabase é obrigatório em produção.');
    return null;
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function menuFromRow(row: any): MenuItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price || 0),
    description: row.description || '',
    prepTimeMinutes: Number(row.prep_time_minutes || 0),
    available: row.available !== false
  } as MenuItem;
}

function orderFromRow(row: any): KitchenOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    roomId: row.room_id || '',
    roomNumber: row.room_number,
    reservationId: row.reservation_id || '',
    guestName: row.guest_name || '',
    items: Array.isArray(row.items) ? row.items : [],
    totalAmount: Number(row.total_amount || 0),
    deliveryFee: Number(row.delivery_fee || 0),
    destination: row.destination,
    deliverySector: row.delivery_sector,
    status: row.status,
    specialInstructions: row.special_instructions || '',
    createdAt: row.created_at,
    completedAt: row.completed_at || undefined
  } as KitchenOrder;
}

function orderToRow(order: KitchenOrder) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    room_id: order.roomId || null,
    room_number: order.roomNumber,
    reservation_id: order.reservationId || null,
    guest_name: order.guestName || null,
    items: order.items || [],
    total_amount: Number(order.totalAmount || 0),
    delivery_fee: Number(order.deliveryFee || 0),
    destination: order.destination,
    delivery_sector: order.deliverySector,
    status: order.status,
    special_instructions: order.specialInstructions || null,
    created_at: order.createdAt || new Date().toISOString(),
    completed_at: order.completedAt || null
  };
}

function taskFromRow(row: any): KanbanTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    sector: row.sector,
    status: row.status,
    priority: row.priority,
    roomNumber: row.room_number || undefined,
    guestName: row.guest_name || undefined,
    assignedTo: row.assigned_to || undefined,
    relatedType: row.related_type || undefined,
    relatedId: row.related_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } as KanbanTask;
}

function taskToRow(task: KanbanTask) {
  return {
    id: task.id,
    title: task.title,
    description: task.description || null,
    sector: task.sector,
    status: task.status,
    priority: task.priority,
    room_number: task.roomNumber || null,
    guest_name: task.guestName || null,
    assigned_to: task.assignedTo || null,
    related_type: task.relatedType || null,
    related_id: task.relatedId || null,
    created_at: task.createdAt || new Date().toISOString(),
    updated_at: task.updatedAt || new Date().toISOString()
  };
}

export async function getMenuItemsCloud(): Promise<MenuItem[] | null> {
  const client = getClient(); if (!client) return null;
  const { data, error } = await client.from('menu_items').select('*').order('category').order('name');
  if (error) throw error;
  return (data || []).map(menuFromRow);
}

export async function getOrdersCloud(): Promise<KitchenOrder[] | null> {
  const client = getClient(); if (!client) return null;
  const { data, error } = await client.from('kitchen_orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(orderFromRow);
}

export async function upsertOrderCloud(order: KitchenOrder): Promise<KitchenOrder | null> {
  const client = getClient(); if (!client) return null;
  const { data, error } = await client.from('kitchen_orders').upsert(orderToRow(order), { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return orderFromRow(data);
}

export async function deleteOrderCloud(id: string): Promise<void> {
  const client = getClient(); if (!client) return;
  const { error } = await client.from('kitchen_orders').delete().eq('id', id);
  if (error) throw error;
}

export async function getTasksCloud(sector?: string): Promise<KanbanTask[] | null> {
  const client = getClient(); if (!client) return null;
  let query = client.from('kanban_tasks').select('*').order('created_at', { ascending: false });
  if (sector) query = query.eq('sector', sector);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(taskFromRow);
}

export async function upsertTaskCloud(task: KanbanTask): Promise<KanbanTask | null> {
  const client = getClient(); if (!client) return null;
  const { data, error } = await client.from('kanban_tasks').upsert(taskToRow(task), { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return taskFromRow(data);
}

export async function syncTasksCloud(tasks: KanbanTask[]): Promise<void> {
  const client = getClient(); if (!client || !tasks.length) return;
  const { error } = await client.from('kanban_tasks').upsert(tasks.map(taskToRow), { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteTaskCloud(id: string): Promise<void> {
  const client = getClient(); if (!client) return;
  const { error } = await client.from('kanban_tasks').delete().eq('id', id);
  if (error) throw error;
}
