import { getSupabaseClient } from './supabase.ts';

export interface PublicKdsOperationalAlert {
  id: string;
  type: string;
  priority: 'info' | 'attention' | 'critical';
  title: string;
  message: string;
  sector: string | null;
  source_type: string;
  source_id: string;
  created_at: string;
}

export async function getPublicKdsOperationalAlerts(token: string): Promise<PublicKdsOperationalAlert[]> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('get_kds_operational_alerts', { p_token: token });
  if (error) throw new Error(error.message || 'Não foi possível carregar os alertas do KDS.');
  return Array.isArray(data) ? (data as PublicKdsOperationalAlert[]) : [];
}
