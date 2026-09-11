import { getSupabaseClient } from './supabase.ts';

export type KitchenOrderChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Mantém as telas operacionais de Cozinha/Room Service sincronizadas com
 * qualquer alteração em kitchen_orders, inclusive pedidos criados em outra
 * estação e mudanças de status feitas por outro usuário.
 */
export function subscribeToKitchenOrdersChangesRealtime(
  onChanged: (eventType: KitchenOrderChangeEvent) => void
): (() => void) | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const channel = supabase
    .channel(`realtime-kitchen-orders-ui-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'kitchen_orders'
      },
      payload => {
        const eventType = payload.eventType as KitchenOrderChangeEvent;
        if (eventType === 'INSERT' || eventType === 'UPDATE' || eventType === 'DELETE') {
          onChanged(eventType);
        }
      }
    )
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`[Kitchen Orders Realtime] Canal indisponível: ${status}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}
