-- Backend points, separate passenger/driver withdrawals, and auditable admin actions.
-- Additive and safe to run more than once.

alter table public.points_transactions
  add column if not exists related_trip_id uuid references public.trips(id) on delete set null;

alter table public.points_transactions drop constraint if exists points_transactions_transaction_type_check;
alter table public.points_transactions
  add constraint points_transactions_transaction_type_check
  check (transaction_type in (
    'earned','bonus','redeemed','adjusted','adjustment','withdrawal','withdrawal_requested',
    'withdrawal_approved','withdrawal_rejected','frozen','reversed'
  ));

alter table public.points_transactions drop constraint if exists points_transactions_status_check;
alter table public.points_transactions
  add constraint points_transactions_status_check
  check (status in ('pending','available','approved','completed','rejected','frozen','reversed'));

create unique index if not exists idx_points_trip_earned_unique
on public.points_transactions (related_trip_id, transaction_type)
where related_trip_id is not null and transaction_type = 'earned';

create table if not exists public.passenger_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points > 0),
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  branch text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_payout_wallets (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null unique references public.drivers(id) on delete cascade,
  available_jmd integer not null default 0 check (available_jmd >= 0),
  pending_jmd integer not null default 0 check (pending_jmd >= 0),
  lifetime_paid_jmd integer not null default 0 check (lifetime_paid_jmd >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  amount_jmd integer not null check (amount_jmd > 0),
  bank_name text not null,
  account_name text not null,
  account_number text not null,
  branch text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','paid')),
  admin_note text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action_type text not null,
  target_table text not null,
  target_id uuid,
  before_data jsonb,
  after_data jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_passenger_withdrawals_user on public.passenger_withdrawal_requests (user_id, created_at desc);
create index if not exists idx_passenger_withdrawals_status on public.passenger_withdrawal_requests (status, created_at desc);
create index if not exists idx_driver_withdrawals_driver on public.driver_withdrawal_requests (driver_id, created_at desc);
create index if not exists idx_driver_withdrawals_status on public.driver_withdrawal_requests (status, created_at desc);
create index if not exists idx_admin_audit_created on public.admin_audit_logs (created_at desc);

drop trigger if exists touch_passenger_withdrawals_updated_at on public.passenger_withdrawal_requests;
create trigger touch_passenger_withdrawals_updated_at before update on public.passenger_withdrawal_requests
for each row execute function public.touch_updated_at();
drop trigger if exists touch_driver_payout_wallets_updated_at on public.driver_payout_wallets;
create trigger touch_driver_payout_wallets_updated_at before update on public.driver_payout_wallets
for each row execute function public.touch_updated_at();
drop trigger if exists touch_driver_withdrawals_updated_at on public.driver_withdrawal_requests;
create trigger touch_driver_withdrawals_updated_at before update on public.driver_withdrawal_requests
for each row execute function public.touch_updated_at();

create or replace function public.record_admin_audit(
  p_action_type text,
  p_target_table text,
  p_target_id uuid default null,
  p_before_data jsonb default null,
  p_after_data jsonb default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then raise exception 'Access denied'; end if;
  insert into public.admin_audit_logs (
    admin_id, action_type, target_table, target_id, before_data, after_data, note
  ) values (
    auth.uid(), p_action_type, p_target_table, p_target_id, p_before_data, p_after_data, nullif(trim(coalesce(p_note, '')), '')
  ) returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.ensure_points_wallet(p_user_id uuid default auth.uid())
returns public.points_wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.points_wallets%rowtype;
begin
  if p_user_id is distinct from auth.uid() and not public.is_admin() then raise exception 'Access denied'; end if;
  insert into public.points_wallets (user_id) values (p_user_id)
  on conflict (user_id) do nothing;
  select * into v_wallet from public.points_wallets where user_id = p_user_id;
  return v_wallet;
end;
$$;

create or replace function public.request_passenger_points_withdrawal(
  p_points integer,
  p_bank_name text,
  p_account_name text,
  p_account_number text,
  p_branch text default null
)
returns public.passenger_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.points_wallets%rowtype;
  v_request public.passenger_withdrawal_requests%rowtype;
begin
  if p_points < 1000 then raise exception 'Minimum withdrawal is 1,000 points'; end if;
  if nullif(trim(p_bank_name), '') is null or nullif(trim(p_account_name), '') is null or nullif(trim(p_account_number), '') is null then
    raise exception 'Complete your bank details';
  end if;

  perform public.ensure_points_wallet(auth.uid());
  select * into v_wallet from public.points_wallets where user_id = auth.uid() for update;
  if v_wallet.under_review then raise exception 'Your points wallet is being reviewed'; end if;
  if v_wallet.available_points < p_points then raise exception 'You do not have enough available points'; end if;

  update public.points_wallets
  set available_points = available_points - p_points,
      frozen_points = frozen_points + p_points
  where id = v_wallet.id;

  insert into public.passenger_withdrawal_requests (
    user_id, points, bank_name, account_name, account_number, branch
  ) values (
    auth.uid(), p_points, trim(p_bank_name), trim(p_account_name), trim(p_account_number), nullif(trim(coalesce(p_branch, '')), '')
  ) returning * into v_request;

  insert into public.points_transactions (
    user_id, amount, transaction_type, reason, status
  ) values (
    auth.uid(), -p_points, 'withdrawal_requested', 'Bank withdrawal requested', 'pending'
  );
  return v_request;
end;
$$;

create or replace function public.review_passenger_withdrawal(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns public.passenger_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.passenger_withdrawal_requests%rowtype;
  v_before jsonb;
begin
  if not public.is_admin() then raise exception 'Access denied'; end if;
  if p_status not in ('approved','rejected','paid') then raise exception 'Choose approve, reject, or paid'; end if;
  select * into v_request from public.passenger_withdrawal_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'Withdrawal request not found'; end if;
  v_before := to_jsonb(v_request);

  if p_status = 'approved' and v_request.status <> 'pending' then raise exception 'Only pending requests can be approved'; end if;
  if p_status = 'rejected' and v_request.status not in ('pending','approved') then raise exception 'This request cannot be rejected'; end if;
  if p_status = 'paid' and v_request.status <> 'approved' then raise exception 'Approve this request before marking it paid'; end if;

  if p_status = 'rejected' then
    update public.points_wallets
    set available_points = available_points + v_request.points,
        frozen_points = greatest(0, frozen_points - v_request.points)
    where user_id = v_request.user_id;
    insert into public.points_transactions (user_id, amount, transaction_type, reason, status, created_by)
    values (v_request.user_id, v_request.points, 'withdrawal_rejected', 'Withdrawal rejected and points returned', 'rejected', auth.uid());
  elsif p_status = 'paid' then
    update public.points_wallets
    set frozen_points = greatest(0, frozen_points - v_request.points),
        lifetime_withdrawn_points = lifetime_withdrawn_points + v_request.points
    where user_id = v_request.user_id;
    insert into public.points_transactions (user_id, amount, transaction_type, reason, status, created_by)
    values (v_request.user_id, -v_request.points, 'withdrawal_approved', 'Bank withdrawal paid', 'completed', auth.uid());
  end if;

  update public.passenger_withdrawal_requests
  set status = p_status,
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      paid_at = case when p_status = 'paid' then now() else paid_at end
  where id = p_request_id
  returning * into v_request;

  perform public.record_admin_audit(
    'passenger_withdrawal_' || p_status, 'passenger_withdrawal_requests', p_request_id,
    v_before, to_jsonb(v_request), p_note
  );
  return v_request;
end;
$$;

create or replace function public.request_driver_withdrawal(
  p_driver_id uuid,
  p_amount_jmd integer,
  p_bank_name text,
  p_account_name text,
  p_account_number text,
  p_branch text default null
)
returns public.driver_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.driver_payout_wallets%rowtype;
  v_request public.driver_withdrawal_requests%rowtype;
begin
  if not exists (select 1 from public.drivers where id = p_driver_id and user_id = auth.uid()) then raise exception 'Access denied'; end if;
  if p_amount_jmd < 1000 then raise exception 'Minimum withdrawal is J$1,000'; end if;
  if nullif(trim(p_bank_name), '') is null or nullif(trim(p_account_name), '') is null or nullif(trim(p_account_number), '') is null then
    raise exception 'Complete your bank details';
  end if;

  insert into public.driver_payout_wallets (driver_id) values (p_driver_id)
  on conflict (driver_id) do nothing;
  select * into v_wallet from public.driver_payout_wallets where driver_id = p_driver_id for update;
  if v_wallet.available_jmd < p_amount_jmd then
    raise exception 'Only Lin Ride bonuses or platform-held payouts can be withdrawn here';
  end if;

  update public.driver_payout_wallets
  set available_jmd = available_jmd - p_amount_jmd,
      pending_jmd = pending_jmd + p_amount_jmd
  where id = v_wallet.id;

  insert into public.driver_withdrawal_requests (
    driver_id, amount_jmd, bank_name, account_name, account_number, branch
  ) values (
    p_driver_id, p_amount_jmd, trim(p_bank_name), trim(p_account_name), trim(p_account_number), nullif(trim(coalesce(p_branch, '')), '')
  ) returning * into v_request;
  return v_request;
end;
$$;

create or replace function public.review_driver_withdrawal(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns public.driver_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.driver_withdrawal_requests%rowtype;
  v_before jsonb;
begin
  if not public.is_admin() then raise exception 'Access denied'; end if;
  if p_status not in ('approved','rejected','paid') then raise exception 'Choose approve, reject, or paid'; end if;
  select * into v_request from public.driver_withdrawal_requests where id = p_request_id for update;
  if v_request.id is null then raise exception 'Withdrawal request not found'; end if;
  v_before := to_jsonb(v_request);

  if p_status = 'approved' and v_request.status <> 'pending' then raise exception 'Only pending requests can be approved'; end if;
  if p_status = 'rejected' and v_request.status not in ('pending','approved') then raise exception 'This request cannot be rejected'; end if;
  if p_status = 'paid' and v_request.status <> 'approved' then raise exception 'Approve this request before marking it paid'; end if;

  if p_status = 'rejected' then
    update public.driver_payout_wallets
    set available_jmd = available_jmd + v_request.amount_jmd,
        pending_jmd = greatest(0, pending_jmd - v_request.amount_jmd)
    where driver_id = v_request.driver_id;
  elsif p_status = 'paid' then
    update public.driver_payout_wallets
    set pending_jmd = greatest(0, pending_jmd - v_request.amount_jmd),
        lifetime_paid_jmd = lifetime_paid_jmd + v_request.amount_jmd
    where driver_id = v_request.driver_id;
  end if;

  update public.driver_withdrawal_requests
  set status = p_status,
      admin_note = nullif(trim(coalesce(p_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      paid_at = case when p_status = 'paid' then now() else paid_at end
  where id = p_request_id
  returning * into v_request;

  perform public.record_admin_audit(
    'driver_withdrawal_' || p_status, 'driver_withdrawal_requests', p_request_id,
    v_before, to_jsonb(v_request), p_note
  );
  return v_request;
end;
$$;

create or replace function public.award_points_after_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_type text;
  v_rule_key text;
  v_points integer;
  v_inserted integer;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;
  select service_type into v_service_type from public.ride_requests where id = new.ride_request_id;
  v_rule_key := case
    when v_service_type in ('errand','shopping_pickup') then 'completedErrand'
    when v_service_type in ('courier','delivery','business_delivery') then 'completedDelivery'
    else 'completedRide'
  end;
  select coalesce((value ->> v_rule_key)::integer, 10)
  into v_points from public.platform_settings where key = 'points_rules';
  v_points := coalesce(v_points, 10);

  insert into public.points_wallets (user_id) values (new.rider_id)
  on conflict (user_id) do nothing;
  insert into public.points_transactions (
    user_id, amount, transaction_type, reason, related_request_id, related_trip_id, status
  ) values (
    new.rider_id, v_points, 'earned', 'Completed Lin Ride service', new.ride_request_id, new.id, 'available'
  ) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.points_wallets
    set available_points = available_points + v_points,
        lifetime_earned_points = lifetime_earned_points + v_points
    where user_id = new.rider_id;
  end if;
  return new;
end;
$$;

drop trigger if exists award_points_on_trip_completion on public.trips;
create trigger award_points_on_trip_completion
after update of status on public.trips
for each row execute function public.award_points_after_trip();

create or replace function public.approve_driver_subscription_payment(p_payment_id uuid, p_admin_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.driver_subscription_payments%rowtype;
  v_base timestamptz;
begin
  if not public.is_admin() or p_admin_id is distinct from auth.uid() then raise exception 'Access denied'; end if;
  select * into v_payment from public.driver_subscription_payments
  where id = p_payment_id and status = 'pending' for update;
  if v_payment.id is null then raise exception 'Pending payment not found'; end if;

  select greatest(now(), coalesce(max(expires_at), now())) into v_base
  from public.driver_subscriptions
  where driver_id = v_payment.driver_id and status = 'active';

  update public.driver_subscription_payments
  set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  where id = p_payment_id;
  insert into public.driver_subscriptions (
    driver_id, amount_jmd, status, starts_at, expires_at, approved_at, approved_by
  ) values (
    v_payment.driver_id, 2000, 'active', now(), v_base + interval '7 days', now(), auth.uid()
  );
  perform public.record_admin_audit(
    'driver_pass_payment_approved', 'driver_subscription_payments', p_payment_id,
    to_jsonb(v_payment), jsonb_build_object('status','approved','expires_at',v_base + interval '7 days'), null
  );
end;
$$;

create or replace function public.reject_driver_subscription_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.driver_subscription_payments%rowtype;
begin
  if not public.is_admin() then raise exception 'Access denied'; end if;
  select * into v_payment from public.driver_subscription_payments
  where id = p_payment_id and status = 'pending' for update;
  if v_payment.id is null then raise exception 'Pending payment not found'; end if;
  update public.driver_subscription_payments
  set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), note = coalesce(nullif(trim(p_reason), ''), note)
  where id = p_payment_id;
  perform public.record_admin_audit(
    'driver_pass_payment_rejected', 'driver_subscription_payments', p_payment_id,
    to_jsonb(v_payment), jsonb_build_object('status','rejected'), p_reason
  );
end;
$$;

revoke all on function public.record_admin_audit(text, text, uuid, jsonb, jsonb, text) from public;
revoke all on function public.ensure_points_wallet(uuid) from public;
revoke all on function public.request_passenger_points_withdrawal(integer, text, text, text, text) from public;
revoke all on function public.review_passenger_withdrawal(uuid, text, text) from public;
revoke all on function public.request_driver_withdrawal(uuid, integer, text, text, text, text) from public;
revoke all on function public.review_driver_withdrawal(uuid, text, text) from public;
revoke all on function public.reject_driver_subscription_payment(uuid, text) from public;
revoke all on function public.approve_driver_subscription_payment(uuid, uuid) from public;
grant execute on function public.record_admin_audit(text, text, uuid, jsonb, jsonb, text) to authenticated;
grant execute on function public.ensure_points_wallet(uuid) to authenticated;
grant execute on function public.request_passenger_points_withdrawal(integer, text, text, text, text) to authenticated;
grant execute on function public.review_passenger_withdrawal(uuid, text, text) to authenticated;
grant execute on function public.request_driver_withdrawal(uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.review_driver_withdrawal(uuid, text, text) to authenticated;
grant execute on function public.reject_driver_subscription_payment(uuid, text) to authenticated;
grant execute on function public.approve_driver_subscription_payment(uuid, uuid) to authenticated;

alter table public.passenger_withdrawal_requests enable row level security;
alter table public.driver_payout_wallets enable row level security;
alter table public.driver_withdrawal_requests enable row level security;
alter table public.admin_audit_logs enable row level security;

drop policy if exists "passenger_withdrawals_owner_read" on public.passenger_withdrawal_requests;
create policy "passenger_withdrawals_owner_read" on public.passenger_withdrawal_requests for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "passenger_withdrawals_admin_write" on public.passenger_withdrawal_requests;
create policy "passenger_withdrawals_admin_write" on public.passenger_withdrawal_requests for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "driver_payout_wallet_owner_read" on public.driver_payout_wallets;
create policy "driver_payout_wallet_owner_read" on public.driver_payout_wallets for select to authenticated
using (public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()));
drop policy if exists "driver_payout_wallet_admin_write" on public.driver_payout_wallets;
create policy "driver_payout_wallet_admin_write" on public.driver_payout_wallets for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "driver_withdrawals_owner_read" on public.driver_withdrawal_requests;
create policy "driver_withdrawals_owner_read" on public.driver_withdrawal_requests for select to authenticated
using (public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()));
drop policy if exists "driver_withdrawals_admin_write" on public.driver_withdrawal_requests;
create policy "driver_withdrawals_admin_write" on public.driver_withdrawal_requests for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_audit_admin_read" on public.admin_audit_logs;
create policy "admin_audit_admin_read" on public.admin_audit_logs for select to authenticated
using (public.is_admin());

drop policy if exists "withdrawal_requests_owner_or_admin" on public.withdrawal_requests;
drop policy if exists "withdrawal_requests_owner_read" on public.withdrawal_requests;
create policy "withdrawal_requests_owner_read" on public.withdrawal_requests for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "withdrawal_requests_owner_insert" on public.withdrawal_requests;
create policy "withdrawal_requests_owner_insert" on public.withdrawal_requests for insert to authenticated
with check (user_id = auth.uid() and status = 'pending' and approved_by is null and paid_at is null);
drop policy if exists "withdrawal_requests_admin_update" on public.withdrawal_requests;
create policy "withdrawal_requests_admin_update" on public.withdrawal_requests for update to authenticated
using (public.is_admin()) with check (public.is_admin());

do $$ begin alter publication supabase_realtime add table public.points_wallets; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.points_transactions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.passenger_withdrawal_requests; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.driver_withdrawal_requests; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.admin_audit_logs; exception when duplicate_object then null; end $$;
