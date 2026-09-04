import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.ts';

/**
 * Observa qualquer alteração em public.rooms e avisa a aplicação para
 * recarregar a projeção operacional. Não altera dados e não duplica estado.
 */
export function subscribeToRoomsRealtime(
  onChanged: (eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  config?: { url?: string; anonKey?: string }
): (() => void) | null {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) return null;

  const channelId = `realtime-rooms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        payload => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          console.log('[Supabase Realtime] Alteração em rooms detectada:', eventType, payload);
          onChanged(eventType);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Supabase Realtime] Erro no canal de quartos:', err);
        } else {
          console.log(`[Supabase Realtime] Canal de quartos status: ${status}`);
        }
      });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Supabase Realtime] Erro ao subscrever rooms:', err);
    return null;
  }
}
