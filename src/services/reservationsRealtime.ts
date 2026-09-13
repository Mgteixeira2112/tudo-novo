import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.ts';

/**
 * Observa alterações em public.reservations e avisa a camada de UI para
 * recarregar a projeção operacional. Não persiste estado local.
 */
export function subscribeToReservationsRealtime(
  onChanged: (eventType: 'INSERT' | 'UPDATE' | 'DELETE') => void,
  config?: { url?: string; anonKey?: string }
): (() => void) | null {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) return null;

  const channelId = `realtime-reservations-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        payload => {
          const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
          console.log('[Supabase Realtime] Alteração em reservations detectada:', eventType, payload);
          onChanged(eventType);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Supabase Realtime] Erro no canal de reservas:', err);
        } else {
          console.log(`[Supabase Realtime] Canal de reservas status: ${status}`);
        }
      });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  } catch (err) {
    console.error('[Supabase Realtime] Erro ao subscrever reservations:', err);
    return null;
  }
}
