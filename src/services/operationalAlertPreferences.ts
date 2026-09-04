import { getSupabaseClient } from './supabase.ts';

export async function loadOperationalAlertsMuted(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase
    .from('user_notification_preferences')
    .select('alerts_muted')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.alerts_muted);
}

export async function setOperationalAlertsMuted(userId: string, muted: boolean): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { error } = await supabase
    .from('user_notification_preferences')
    .upsert(
      {
        user_id: userId,
        alerts_muted: muted,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    );

  if (error) throw error;
}
