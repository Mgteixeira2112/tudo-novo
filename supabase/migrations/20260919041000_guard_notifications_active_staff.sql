-- Revogacao operacional: identidade autenticada sem staff ativo nao deve ler
-- notificacoes antigas nem alterar seus recibos/preferencias.
-- Preserva as regras originais de propriedade (user_id = auth.uid()) e destinatario.
-- Nao modifica dados, funcoes, grants ou politicas de outros modulos.

ALTER POLICY notification_recipients_select_own
ON public.notification_recipients
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
);

ALTER POLICY notification_recipients_update_own
ON public.notification_recipients
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
);

ALTER POLICY operational_notifications_select_recipient
ON public.operational_notifications
USING (
  EXISTS (
    SELECT 1 FROM public.notification_recipients nr
    WHERE nr.notification_id = operational_notifications.id AND nr.user_id = auth.uid()
  )
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
);

ALTER POLICY user_notification_preferences_insert_own
ON public.user_notification_preferences
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
);

ALTER POLICY user_notification_preferences_select_own
ON public.user_notification_preferences
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
);

ALTER POLICY user_notification_preferences_update_own
ON public.user_notification_preferences
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.staff_users s WHERE s.id = auth.uid() AND s.active = true)
);
