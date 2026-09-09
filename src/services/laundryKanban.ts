import { TaskStatus } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface LaundryBatchItem {
  id: string;
  batchId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface LaundryBatch {
  id: string;
  taskId: string;
  roomNumber: string;
  status: TaskStatus;
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  returnedAt?: string;
  notes?: string;
  items: LaundryBatchItem[];
}

export interface LaundryRoomPosition {
  id: string;
  itemId: string;
  itemName: string;
  unit: string;
  roomNumber: string;
  quantity: number;
}

export interface CreateLaundryBatchInput {
  roomNumber: string;
  items: Array<{ inventoryItemId: string; quantity: number }>;
  notes?: string;
}

export async function loadLaundryKanban(): Promise<{
  batches: LaundryBatch[];
  roomPositions: LaundryRoomPosition[];
}> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const [batchesRes, batchItemsRes, tasksRes, positionsRes, inventoryRes] = await Promise.all([
    supabase.from('laundry_batches').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('laundry_batch_items').select('*'),
    supabase.from('kanban_tasks').select('*').eq('sector', 'Lavanderia').order('created_at', { ascending: false }).limit(100),
    supabase.from('linen_positions').select('*').eq('location_type', 'Quarto').gt('quantity', 0),
    supabase.from('inventory_items').select('id,name,unit').eq('category', 'Enxoval & Rouparia')
  ]);

  for (const result of [batchesRes, batchItemsRes, tasksRes, positionsRes, inventoryRes]) {
    if (result.error) throw result.error;
  }

  const taskById = new Map((tasksRes.data || []).map((row: any) => [row.id, row]));
  const itemsByBatch = new Map<string, LaundryBatchItem[]>();
  (batchItemsRes.data || []).forEach((row: any) => {
    const item: LaundryBatchItem = {
      id: row.id,
      batchId: row.batch_id,
      itemId: row.item_id,
      itemName: row.item_name,
      quantity: Number(row.quantity),
      unit: row.unit
    };
    itemsByBatch.set(row.batch_id, [...(itemsByBatch.get(row.batch_id) || []), item]);
  });

  const batches: LaundryBatch[] = (batchesRes.data || []).map((row: any) => {
    const task: any = taskById.get(row.task_id);
    return {
      id: row.id,
      taskId: row.task_id,
      roomNumber: row.room_number,
      status: (task?.status || 'A_Fazer') as TaskStatus,
      title: task?.title || `Quarto ${row.room_number} — Lote de Lavanderia`,
      description: task?.description || '',
      createdBy: row.created_by,
      createdAt: row.created_at,
      startedAt: row.started_at || undefined,
      readyAt: row.ready_at || undefined,
      returnedAt: row.returned_at || undefined,
      notes: row.notes || undefined,
      items: itemsByBatch.get(row.id) || []
    };
  });

  const inventoryById = new Map((inventoryRes.data || []).map((row: any) => [row.id, row]));
  const roomPositions: LaundryRoomPosition[] = (positionsRes.data || []).map((row: any) => {
    const item: any = inventoryById.get(row.item_id);
    return {
      id: row.id,
      itemId: row.item_id,
      itemName: item?.name || row.item_id,
      unit: item?.unit || 'un',
      roomNumber: row.room_number,
      quantity: Number(row.quantity)
    };
  });

  return { batches, roomPositions };
}

export async function createLaundryBatch(input: CreateLaundryBatchInput): Promise<any> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const items = input.items
    .map(item => ({ inventoryItemId: item.inventoryItemId, quantity: Number(item.quantity) }))
    .filter(item => item.inventoryItemId && Number.isFinite(item.quantity) && item.quantity > 0);

  if (!input.roomNumber.trim()) throw new Error('Informe o quarto de origem.');
  if (items.length === 0) throw new Error('Informe pelo menos um item do lote.');

  const { data, error } = await supabase.rpc('create_laundry_batch_atomic', {
    p_room_number: input.roomNumber.trim(),
    p_items: items,
    p_notes: input.notes?.trim() || null
  });

  if (error) throw error;
  return data;
}

export async function advanceLaundryBatch(batchId: string): Promise<any> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('advance_laundry_batch_atomic', { p_batch_id: batchId });
  if (error) throw error;
  return data;
}

export async function returnLaundryBatch(batchId: string): Promise<any> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.rpc('return_laundry_batch_atomic', { p_batch_id: batchId });
  if (error) throw error;
  return data;
}
