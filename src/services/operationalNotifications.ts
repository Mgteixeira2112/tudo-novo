import { getSupabaseClient } from './supabase.ts';

export type OperationalNotificationPriority = 'info' | 'attention' | 'critical';

export interface CreateOperationalNotificationInput {
  type: string;
  priority: OperationalNotificationPriority;
  title: string;
  message: string;
  sector?: string;
  responsibleUserId?: string;
  sourceType: string;
  sourceId: string;
}

export interface CreateOperationalNotificationResult {
  notification: {
    id: string;
    type: string;
    priority: OperationalNotificationPriority;
    title: string;
    message: string;
    sector?: string | null;
    responsible_user_id?: string | null;
    source_type: string;
    source_id: string;
    created_at: string;
  };
  recipientCount: number;
}

export async function createOperationalNotification(
  input: CreateOperationalNotificationInput
): Promise<CreateOperationalNotificationResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.rpc('create_operational_notification', {
    p_type: input.type,
    p_priority: input.priority,
    p_title: input.title,
    p_message: input.message,
    p_sector: input.sector || null,
    p_responsible_user_id: input.responsibleUserId || null,
    p_source_type: input.sourceType,
    p_source_id: input.sourceId
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível criar o alerta operacional.');
  }

  return data as CreateOperationalNotificationResult;
}
