import { SectorType, TaskPriority } from '../types.ts';
import { getSupabaseClient } from './supabase.ts';

export interface ArchivedTask {
  id: string;
  title: string;
  description: string;
  sector: SectorType;
  priority: TaskPriority;
  roomNumber?: string;
  guestName?: string;
  assignedTo?: string;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
  completedAt: string;
}

export async function loadArchivedTaskHistory(): Promise<ArchivedTask[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('kanban_tasks')
    .select('*')
    .eq('status', 'Concluido')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    sector: row.sector,
    priority: row.priority,
    roomNumber: row.room_number || undefined,
    guestName: row.guest_name || undefined,
    assignedTo: row.assigned_to || undefined,
    relatedType: row.related_type || undefined,
    relatedId: row.related_id || undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at
  })) as ArchivedTask[];
}
