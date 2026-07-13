-- Apply configurable scheduled, first-trip, rating, and withdrawal point rules.

create unique index if not exists idx_points_trip_bonus_reason_unique
on public.points_transactions (related_trip_id, user_id, transaction_type, reason)
where related_trip_id is not null and transaction_type = 'bonus';

create or replace function public.award_points_after_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_type text;
  v_scheduled_time timestamptz;
  v_rule_key text;
  v_points integer;
  v_first_bonus integer;
  v_inserted integer;
  v_completed_count integer;
begin
  if new.status <> 'completed' or old.status = 'completed' then return new; end if;

  select service_type, scheduled_time
  into v_service_type, v_scheduled_time
  from public.ride_requests
  where id = new.ride_request_id;

  v_rule_key := case
    when v_scheduled_time is not null then 'completedScheduledRide'
    when v_service_type in ('errand','shopping_pickup') then 'completedErrand'
    when v_service_type in ('courier','delivery','business_delivery') then 'completedDelivery'
    else 'completedRide'
  end;

  select coalesce((value ->> v_rule_key)::integer, 10),
         coalesce((value ->> 'firstCompletedTripBonus')::integer, 0)
  into v_points, v_first_bonus
  from public.platform_settings
  where key = 'points_rules';
  v_points := coalesce(v_points, 10);
  v_first_bonus := coalesce(v_first_bonus, 0);

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

  select count(*) into v_completed_count
  from public.trips
  where rider_id = new.rider_id and status = 'completed';

  if v_completed_count = 1 and v_first_bonus > 0 then
    insert into public.points_transactions (
      user_id, amount, transaction_type, reason, related_request_id, related_trip_id, status
    ) values (
      new.rider_id, v_first_bonus, 'bonus', 'First completed trip bonus', new.ride_request_id, new.id, 'available'
    ) on conflict do nothing;
    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      update public.points_wallets
      set available_points = available_points + v_first_bonus,
          lifetime_earned_points = lifetime_earned_points + v_first_bonus
      where user_id = new.rider_id;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.award_rating_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider_id uuid;
  v_bonus integer;
  v_inserted integer;
begin
  if new.trip_id is null then return new; end if;
  select rider_id into v_rider_id from public.trips where id = new.trip_id and status = 'completed';
  if v_rider_id is null or new.reviewer_id <> v_rider_id then return new; end if;

  select coalesce((value ->> 'ratingBonus')::integer, 0)
  into v_bonus from public.platform_settings where key = 'points_rules';
  v_bonus := coalesce(v_bonus, 0);
  if v_bonus <= 0 then return new; end if;

  insert into public.points_wallets (user_id) values (v_rider_id)
  on conflict (user_id) do nothing;
  insert into public.points_transactions (
    user_id, amount, transaction_type, reason, related_trip_id, status
  ) values (
    v_rider_id, v_bonus, 'bonus', 'Rating bonus', new.trip_id, 'available'
  ) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 1 then
    update public.points_wallets
    set available_points = available_points + v_bonus,
        lifetime_earned_points = lifetime_earned_points + v_bonus
    where user_id = v_rider_id;
  end if;
  return new;
end;
$$;

drop trigger if exists award_rating_bonus_after_insert on public.ratings;
create trigger award_rating_bonus_after_insert
after insert on public.ratings
for each row execute function public.award_rating_bonus();

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
  v_minimum integer;
begin
  select coalesce((value ->> 'minimumWithdrawalPoints')::integer, 1000)
  into v_minimum from public.platform_settings where key = 'points_rules';
  v_minimum := coalesce(v_minimum, 1000);
  if p_points < v_minimum then raise exception 'Minimum withdrawal is % points', v_minimum; end if;
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
