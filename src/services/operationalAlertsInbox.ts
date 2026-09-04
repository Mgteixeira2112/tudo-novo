import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.ts';

export interface OperationalAlertInboxItem {
  deliveryId: string;
  readAt: string | null;
  deliveredAt: string;
  notificationId: string;
  type: string;
  priority: 'info' | 'attention' | 'critical';
  title: string;
  message: string;
  sector: string | null;
  sourceType: string;
  sourceId: string;
  createdAt: string;
}

export async function loadOperationalAlertsInbox(limit = 20): Promise<OperationalAlertInboxItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('notification_recipients')
    .select(`
      id,
      read_at,
      created_at,
      notification:operational_notifications!inner(
        id,
        type,
        priority,
        title,
        message,
        sector,
        source_type,
        source_id,
        created_at
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    deliveryId: row.id,
    readAt: row.read_at,
    deliveredAt: row.created_at,
    notificationId: row.notification.id,
    type: row.notification.type,
    priority: row.notification.priority,
    title: row.notification.title,
    message: row.notification.message,
    sector: row.notification.sector,
    sourceType: row.notification.source_type,
    sourceId: row.notification.source_id,
    createdAt: row.notification.created_at
  }));
}

export async function markOperationalAlertRead(deliveryId: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('notification_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('id', deliveryId);
  if (error) throw error;
}

export async function markAllOperationalAlertsRead(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  const { error } = await supabase
    .from('notification_recipients')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

export function subscribeToOperationalAlertsInbox(
  userId: string,
  onChanged: () => void
): (() => void) | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  let channel: RealtimeChannel | null = null;
  try {
    channel = supabase
      .channel(`operational-alerts-${userId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_recipients',
          filter: `user_id=eq.${userId}`
        },
        () => onChanged()
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  } catch (error) {
    console.error('[Operational Alerts] Falha ao assinar Realtime:', error);
    return null;
  }
}
