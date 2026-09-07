import { getSupabaseClient } from './supabase.ts';

export type KdsPreset = 'operations' | 'kitchen' | 'housekeeping' | 'maintenance' | 'frontdesk';

export interface KdsDisplayRecord {
  id: string;
  name: string;
  preset: KdsPreset;
  active: boolean;
  token: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PublicKdsDisplay {
  id: string;
  name: string;
  preset: KdsPreset;
  active: boolean;
  server_time: string;
}

function getClient() {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export async function listKdsDisplays(): Promise<KdsDisplayRecord[]> {
  const { data, error } = await getClient().rpc('list_kds_displays');
  if (error) throw new Error(error.message || 'Não foi possível carregar as telas KDS.');
  return (data || []) as KdsDisplayRecord[];
}

export async function createKdsDisplay(name: string, preset: KdsPreset): Promise<KdsDisplayRecord> {
  const { data, error } = await getClient().rpc('create_kds_display', {
    p_name: name,
    p_preset: preset
  });
  if (error) throw new Error(error.message || 'Não foi possível criar a tela KDS.');
  return data as KdsDisplayRecord;
}

export async function updateKdsDisplay(
  id: string,
  name: string,
  preset: KdsPreset,
  active: boolean
): Promise<KdsDisplayRecord> {
  const { data, error } = await getClient().rpc('update_kds_display', {
    p_id: id,
    p_name: name,
    p_preset: preset,
    p_active: active
  });
  if (error) throw new Error(error.message || 'Não foi possível atualizar a tela KDS.');
  return data as KdsDisplayRecord;
}

export async function rotateKdsDisplayToken(id: string): Promise<string> {
  const { data, error } = await getClient().rpc('rotate_kds_display_token', { p_id: id });
  if (error) throw new Error(error.message || 'Não foi possível regenerar o link KDS.');
  return String(data || '');
}

export async function getPublicKdsDisplay(token: string): Promise<PublicKdsDisplay | null> {
  const { data, error } = await getClient().rpc('get_kds_public', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar a tela KDS.');
  return (data || null) as PublicKdsDisplay | null;
}

export async function heartbeatKdsDisplay(token: string): Promise<boolean> {
  const { data, error } = await getClient().rpc('heartbeat_kds_display', { p_token: token });
  if (error) return false;
  return Boolean(data);
}

export function buildKdsDisplayUrl(token: string) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('kds', token);
  return url.toString();
}
