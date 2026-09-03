import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { KitchenOrder, StaffUser } from '../types.ts';

let clientInstance: SupabaseClient | null = null;
let currentUrl: string | null = null;
let currentKey: string | null = null;

/**
 * Initializes or returns the singleton Supabase client
 */
export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  const targetUrl = url || (import.meta as any).env?.VITE_SUPABASE_URL;
  const targetKey = anonKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

  if (!targetUrl || !targetKey || !targetUrl.startsWith('http')) {
    return null;
  }

  if (clientInstance && currentUrl === targetUrl && currentKey === targetKey) {
    return clientInstance;
  }

  try {
    clientInstance = createClient(targetUrl, targetKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    currentUrl = targetUrl;
    currentKey = targetKey;
    return clientInstance;
  } catch (err) {
    console.error('[Supabase Client] Falha na inicialização:', err);
    return null;
  }
}

/**
 * Supabase Auth: Sign In with Email & Password
 */
export async function supabaseSignIn(
  email: string,
  password?: string,
  config?: { url?: string; anonKey?: string }
) {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) {
    return { data: null, error: new Error('Supabase Client não configurado.') };
  }

  if (!password) {
    return { data: null, error: new Error('Senha é obrigatória.') };
  }

  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Supabase Auth: Sign Up new staff user
 */
export async function supabaseSignUp(
  email: string,
  password?: string,
  metadata?: Record<string, any>,
  config?: { url?: string; anonKey?: string }
) {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) {
    return { data: null, error: new Error('Supabase Client não configurado.') };
  }

  if (!password) {
    return { data: null, error: new Error('Senha é obrigatória para criar usuário.') };
  }

  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || {}
    }
  });
}

/**
 * Supabase Auth: Sign Out
 */
export async function supabaseSignOut(config?: { url?: string; anonKey?: string }) {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) return { error: null };
  return supabase.auth.signOut();
}

/**
 * Supabase Auth: Get current active session user
 */
export async function getSupabaseAuthUser(config?: { url?: string; anonKey?: string }) {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

/**
 * Subscribes to Realtime updates on the 'staff_users' table in Supabase
 */
export function subscribeToStaffUsersRealtime(
  onChanged: (user: Partial<StaffUser>, eventType: string) => void,
  config?: { url?: string; anonKey?: string }
): (() => void) | null {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) return null;

  const channelId = `realtime-staff-users-${Date.now()}`;
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_users'
        },
        (payload) => {
          console.log('[Supabase Realtime] Atualização de equipe detectada:', payload);
          const raw = payload.new || payload.old;
          if (raw) {
            onChanged(raw as any, payload.eventType);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    console.error('[Supabase Realtime] Erro ao subscrever staff_users:', err);
    return null;
  }
}

/**
 * Subscribes to Realtime INSERT events on the 'kitchen_orders' table in Supabase
 */
export function subscribeToKitchenOrdersRealtime(
  onNewOrder: (order: KitchenOrder, source: 'supabase_realtime') => void,
  config?: { url?: string; anonKey?: string }
): (() => void) | null {
  const supabase = getSupabaseClient(config?.url, config?.anonKey);
  if (!supabase) {
    return null;
  }

  const channelId = `realtime-room-service-${Date.now()}`;
  let channel: RealtimeChannel | null = null;

  try {
    channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kitchen_orders'
        },
        (payload) => {
          console.log('[Supabase Realtime] Novo pedido recebido da tabela kitchen_orders:', payload);
          const raw = payload.new;
          if (!raw) return;

          // Normalize Supabase snake_case columns to KitchenOrder camelCase
          const order: KitchenOrder = {
            id: raw.id || `ord_${Date.now()}`,
            orderNumber: raw.order_number || raw.orderNumber || 'ORD-NOVO',
            roomId: raw.room_id || raw.roomId || '',
            roomNumber: raw.room_number || raw.roomNumber || 'Quarto',
            reservationId: raw.reservation_id || raw.reservationId || '',
            guestName: raw.guest_name || raw.guestName || 'Hóspede',
            items: typeof raw.items === 'string' ? JSON.parse(raw.items) : (raw.items || []),
            totalAmount: Number(raw.total_amount ?? raw.totalAmount ?? 0),
            deliveryFee: Number(raw.delivery_fee ?? raw.deliveryFee ?? 0),
            destination: raw.destination || 'Quarto',
            deliverySector: raw.delivery_sector || raw.deliverySector || 'Room Service',
            status: raw.status || 'Recebido',
            specialInstructions: raw.special_instructions || raw.specialInstructions || '',
            createdAt: raw.created_at || raw.createdAt || new Date().toISOString()
          };

          onNewOrder(order, 'supabase_realtime');
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.warn('[Supabase Realtime] Erro no canal de pedidos:', err);
        } else {
          console.log(`[Supabase Realtime] Canal de Room Service status: ${status}`);
        }
      });

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  } catch (err) {
    console.error('[Supabase Realtime] Erro ao subscrever canal:', err);
    return null;
  }
}

/**
 * Emits a polite, elegant 2-tone hotel service bell chime using Web Audio API
 */
export function playRoomServiceChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // First tone: 659.25 Hz (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.55);

    // Second tone: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.14);
    gain2.gain.setValueAtTime(0, now + 0.14);
    gain2.gain.linearRampToValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.85);
  } catch {
    // Silently ignore if blocked by browser policy
  }
}
