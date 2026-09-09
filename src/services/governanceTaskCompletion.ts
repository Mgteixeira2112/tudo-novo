import { KanbanTask } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface GovernanceMaterialConsumption {
  inventoryItemId: string;
  quantity: number;
}

function mapKanbanRow(row: any): KanbanTask {
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

export async function completeGovernanceTaskAtomic(
  taskId: string,
  materials: GovernanceMaterialConsumption[] = []
): Promise<KanbanTask> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const normalized = materials
    .map(item => ({
      inventoryItemId: item.inventoryItemId,
      quantity: Number(item.quantity)
    }))
    .filter(item => item.inventoryItemId && Number.isFinite(item.quantity) && item.quantity > 0);

  const { data, error } = await supabase.rpc('complete_governance_task_atomic', {
    p_task_id: taskId,
    p_materials: normalized,
    p_operator: null
  });

  if (error) throw error;
  return mapKanbanRow(data);
}
