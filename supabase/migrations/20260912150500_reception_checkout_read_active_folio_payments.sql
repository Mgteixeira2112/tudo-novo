-- Reception checkout needs to subtract payments already posted to the active stay.
-- Keep general finance access restricted: staff with manage_checkinout may only
-- read financial rows tied to reservations that are currently in CheckIn.

drop policy if exists finance_checkout_read_staff on public.financial_transactions;

create policy finance_checkout_read_staff
on public.financial_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.staff_users s
    where s.id = auth.uid()
      and s.active = true
      and (
        s.role = 'admin'
        or coalesce(s.permissions, '[]'::jsonb) ? 'manage_checkinout'
      )
  )
  and exists (
    select 1
    from public.reservations r
    where r.id = financial_transactions.reservation_id
      and r.status = 'CheckIn'
  )
);
