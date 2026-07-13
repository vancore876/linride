alter table public.driver_subscriptions
  alter column amount_jmd set default 2000;

alter table public.driver_subscription_payments
  alter column amount_jmd set default 2000;

create or replace function public.approve_driver_subscription_payment(p_payment_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
begin
  select driver_id into v_driver_id
  from public.driver_subscription_payments
  where id = p_payment_id and status = 'pending'
  for update;

  if v_driver_id is null then
    raise exception 'Pending payment not found';
  end if;

  update public.driver_subscription_payments
  set status = 'approved',
      reviewed_at = now(),
      reviewed_by = p_admin_id
  where id = p_payment_id;

  insert into public.driver_subscriptions (
    driver_id,
    amount_jmd,
    status,
    starts_at,
    expires_at,
    approved_at,
    approved_by
  )
  values (
    v_driver_id,
    2000,
    'active',
    now(),
    now() + interval '7 days',
    now(),
    p_admin_id
  );
end;
$$;
