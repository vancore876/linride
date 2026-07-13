-- Complete Lin Ride trip, delivery, proof, rating, report, and support workflows.
-- Additive and safe to run more than once.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

alter table public.trips
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists driver_arriving_at timestamptz,
  add column if not exists arrived_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id),
  add column if not exists cancellation_reason text;

update public.trips set status = 'driver_arriving' where status = 'arriving';

alter table public.trips drop constraint if exists trips_status_check;
alter table public.trips
  add constraint trips_status_check
  check (status in ('requested','offered','accepted','driver_arriving','arrived','in_progress','completed','cancelled'));

alter table public.ride_requests drop constraint if exists ride_requests_status_check;
alter table public.ride_requests
  add constraint ride_requests_status_check
  check (status in ('pending','requested','offered','accepted','countered','cancelled','completed'));

alter table public.business_delivery_requests
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists picked_up_at timestamptz,
  add column if not exists cancellation_reason text;

alter table public.business_delivery_requests drop constraint if exists business_delivery_requests_status_check;
alter table public.business_delivery_requests
  add constraint business_delivery_requests_status_check
  check (status in ('pending','searching','accepted','picking_up','picked_up','delivering','delivered','cancelled'));

alter table public.support_tickets
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reports
  add column if not exists report_type text not null default 'trip_issue',
  add column if not exists business_delivery_id uuid references public.business_delivery_requests(id) on delete set null,
  add column if not exists admin_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check
  check (status in ('open','in_progress','resolved','closed'));

alter table public.ratings
  add column if not exists badges text[] not null default '{}',
  add column if not exists updated_at timestamptz not null default now();

alter table public.driver_documents
  add column if not exists is_current boolean not null default true;

with ranked_documents as (
  select id,
         row_number() over (partition by driver_id, document_type order by uploaded_at desc, id desc) as position
  from public.driver_documents
  where is_current = true
)
update public.driver_documents document
set is_current = false
from ranked_documents ranked
where document.id = ranked.id and ranked.position > 1;

create unique index if not exists idx_ratings_trip_reviewer_unique
on public.ratings (trip_id, reviewer_id)
where trip_id is not null;

create unique index if not exists idx_driver_documents_current_type_unique
on public.driver_documents (driver_id, document_type)
where is_current = true;

create table if not exists public.trip_proof_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete cascade,
  business_delivery_id uuid references public.business_delivery_requests(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  proof_type text not null default 'handoff' check (proof_type in ('pickup','handoff','delivery','item','other')),
  note text,
  created_at timestamptz not null default now(),
  check (trip_id is not null or business_delivery_id is not null)
);

create table if not exists public.business_delivery_offers (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.business_delivery_requests(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  offer_type text not null check (offer_type in ('accept','counter')),
  fare_jmd integer check (fare_jmd is null or fare_jmd > 0),
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_delivery_ignores (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.business_delivery_requests(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  ignored_fare_jmd integer not null,
  created_at timestamptz not null default now(),
  unique (delivery_id, driver_id, ignored_fare_jmd)
);

create index if not exists idx_trips_rider_status on public.trips (rider_id, status, created_at desc);
create index if not exists idx_trips_driver_status on public.trips (driver_id, status, created_at desc);
create index if not exists idx_trip_proofs_trip on public.trip_proof_photos (trip_id, created_at desc);
create index if not exists idx_trip_proofs_delivery on public.trip_proof_photos (business_delivery_id, created_at desc);
create index if not exists idx_business_delivery_offers_delivery on public.business_delivery_offers (delivery_id, status, created_at desc);
create unique index if not exists idx_driver_earnings_trip_unique on public.driver_earnings (trip_id) where trip_id is not null;

drop trigger if exists touch_trips_updated_at on public.trips;
create trigger touch_trips_updated_at before update on public.trips
for each row execute function public.touch_updated_at();

drop trigger if exists touch_business_deliveries_updated_at on public.business_delivery_requests;
create trigger touch_business_deliveries_updated_at before update on public.business_delivery_requests
for each row execute function public.touch_updated_at();

drop trigger if exists touch_business_delivery_offers_updated_at on public.business_delivery_offers;
create trigger touch_business_delivery_offers_updated_at before update on public.business_delivery_offers
for each row execute function public.touch_updated_at();

drop trigger if exists touch_support_tickets_updated_at on public.support_tickets;
create trigger touch_support_tickets_updated_at before update on public.support_tickets
for each row execute function public.touch_updated_at();

drop trigger if exists touch_reports_updated_at on public.reports;
create trigger touch_reports_updated_at before update on public.reports
for each row execute function public.touch_updated_at();

drop trigger if exists touch_ratings_updated_at on public.ratings;
create trigger touch_ratings_updated_at before update on public.ratings
for each row execute function public.touch_updated_at();

create or replace function public.is_trip_participant(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips t
    left join public.drivers d on d.id = t.driver_id
    where t.id = p_trip_id
      and (t.rider_id = auth.uid() or d.user_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.register_driver_document(
  p_driver_id uuid,
  p_document_type text,
  p_storage_path text
)
returns public.driver_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.driver_documents%rowtype;
begin
  if p_document_type not in ('driver_photo','driver_license','vehicle_photo','vehicle_documents','insurance') then
    raise exception 'Choose a valid driver document';
  end if;
  if not exists (select 1 from public.drivers where id = p_driver_id and user_id = auth.uid()) then
    raise exception 'You cannot upload for this driver';
  end if;
  update public.driver_documents
  set is_current = false
  where driver_id = p_driver_id and document_type = p_document_type and is_current = true;
  insert into public.driver_documents (
    driver_id, document_type, file_url, status, is_current
  ) values (
    p_driver_id, p_document_type, p_storage_path, 'pending', true
  ) returning * into v_document;
  update public.drivers
  set documents_status = 'pending', documents_submitted_at = now(), documents_rejection_reason = null
  where id = p_driver_id;
  return v_document;
end;
$$;

create or replace function public.update_trip_status(
  p_trip_id uuid,
  p_status text,
  p_reason text default null
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_driver_user_id uuid;
  v_is_admin boolean := public.is_admin();
  v_is_driver boolean;
  v_is_rider boolean;
  v_service_type text;
begin
  select *
  into v_trip
  from public.trips
  where id = p_trip_id
  for update;

  if v_trip.id is null then raise exception 'Trip not found'; end if;
  select user_id into v_driver_user_id from public.drivers where id = v_trip.driver_id;

  v_is_driver := v_driver_user_id = auth.uid();
  v_is_rider := v_trip.rider_id = auth.uid();
  if not v_is_admin and not v_is_driver and not v_is_rider then
    raise exception 'You cannot update this trip';
  end if;

  if p_status not in ('driver_arriving','arrived','in_progress','completed','cancelled') then
    raise exception 'This trip status is not available';
  end if;

  if not v_is_admin then
    if v_is_rider and not v_is_driver then
      if p_status <> 'cancelled' or v_trip.status not in ('accepted','driver_arriving','arrived') then
        raise exception 'Passengers can only cancel before the trip starts';
      end if;
    elsif v_is_driver then
      if not (
        (v_trip.status = 'accepted' and p_status = 'driver_arriving')
        or (v_trip.status = 'driver_arriving' and p_status = 'arrived')
        or (v_trip.status = 'arrived' and p_status = 'in_progress')
        or (v_trip.status = 'in_progress' and p_status = 'completed')
        or (v_trip.status in ('accepted','driver_arriving','arrived','in_progress') and p_status = 'cancelled')
      ) then
        raise exception 'That trip update is not available yet';
      end if;
    end if;
  end if;

  if p_status = 'in_progress' and not v_trip.pin_verified then
    raise exception 'Trip PIN is incorrect';
  end if;
  if p_status = 'cancelled' and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Add a cancellation reason';
  end if;

  update public.trips
  set status = p_status,
      driver_arriving_at = case when p_status = 'driver_arriving' then coalesce(driver_arriving_at, now()) else driver_arriving_at end,
      arrived_at = case when p_status = 'arrived' then coalesce(arrived_at, now()) else arrived_at end,
      started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
      completed_at = case when p_status = 'completed' then coalesce(completed_at, now()) else completed_at end,
      cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
      cancelled_by = case when p_status = 'cancelled' then auth.uid() else cancelled_by end,
      cancellation_reason = case when p_status = 'cancelled' then trim(p_reason) else cancellation_reason end
  where id = p_trip_id
  returning * into v_trip;

  if p_status = 'completed' then
    update public.ride_requests set status = 'completed' where id = v_trip.ride_request_id;
    select service_type into v_service_type from public.ride_requests where id = v_trip.ride_request_id;
    insert into public.driver_earnings (driver_id, trip_id, amount_jmd, earning_type)
    values (
      v_trip.driver_id,
      v_trip.id,
      coalesce(v_trip.agreed_fare_jmd, 0),
      case
        when v_service_type in ('errand','shopping_pickup') then 'errand'
        when v_service_type in ('courier','delivery','business_delivery') then 'courier'
        else 'ride'
      end
    )
    on conflict (trip_id) where trip_id is not null do nothing;
  elsif p_status = 'cancelled' then
    update public.ride_requests set status = 'cancelled' where id = v_trip.ride_request_id;
  end if;

  return v_trip;
end;
$$;

create or replace function public.verify_trip_pin(p_trip_id uuid, p_entered_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_matches boolean;
begin
  select t.trip_pin = trim(p_entered_pin)
  into v_matches
  from public.trips t
  left join public.drivers d on d.id = t.driver_id
  where t.id = p_trip_id
    and (t.rider_id = auth.uid() or d.user_id = auth.uid() or public.is_admin());

  if coalesce(v_matches, false) then
    update public.trips set pin_verified = true where id = p_trip_id;
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.respond_to_business_delivery(
  p_delivery_id uuid,
  p_driver_id uuid,
  p_offer_type text,
  p_fare_jmd integer default null
)
returns public.business_delivery_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.business_delivery_offers%rowtype;
  v_updated integer;
begin
  if not exists (select 1 from public.drivers where id = p_driver_id and user_id = auth.uid()) then
    raise exception 'You cannot respond for this driver';
  end if;
  if not public.can_driver_receive_requests(p_driver_id) then
    raise exception 'Only approved drivers with an active pass can receive requests';
  end if;
  if p_offer_type not in ('accept','counter') then raise exception 'Choose accept or counter'; end if;
  if p_offer_type = 'counter' and coalesce(p_fare_jmd, 0) <= 0 then raise exception 'Enter your counter offer'; end if;

  insert into public.business_delivery_offers (delivery_id, driver_id, offer_type, fare_jmd)
  values (p_delivery_id, p_driver_id, p_offer_type, p_fare_jmd)
  returning * into v_offer;

  if p_offer_type = 'accept' then
    update public.business_delivery_requests
    set status = 'accepted', accepted_driver_id = p_driver_id, accepted_at = now()
    where id = p_delivery_id and status = 'searching';
    get diagnostics v_updated = row_count;
    if v_updated <> 1 then raise exception 'Request already accepted by another driver'; end if;

    update public.business_delivery_offers
    set status = case when id = v_offer.id then 'accepted' else 'rejected' end
    where delivery_id = p_delivery_id and status = 'pending';
    v_offer.status := 'accepted';
  end if;
  return v_offer;
end;
$$;

create or replace function public.update_business_delivery_progress(
  p_delivery_id uuid,
  p_status text,
  p_reason text default null
)
returns public.business_delivery_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.business_delivery_requests%rowtype;
  v_driver_user_id uuid;
  v_business_owner_id uuid;
  v_is_admin boolean := public.is_admin();
begin
  select *
  into v_delivery
  from public.business_delivery_requests
  where id = p_delivery_id
  for update;

  if v_delivery.id is null then raise exception 'Delivery not found'; end if;
  select owner_id into v_business_owner_id from public.business_accounts where id = v_delivery.business_id;
  select user_id into v_driver_user_id from public.drivers where id = v_delivery.accepted_driver_id;
  if not v_is_admin
     and auth.uid() is distinct from v_driver_user_id
     and auth.uid() is distinct from v_business_owner_id then
    raise exception 'You cannot update this delivery';
  end if;
  if p_status not in ('picking_up','picked_up','delivering','delivered','cancelled') then
    raise exception 'That delivery update is not available';
  end if;
  if not v_is_admin and auth.uid() = v_business_owner_id and p_status <> 'cancelled' then
    raise exception 'Only the assigned driver can update delivery progress';
  end if;
  if not v_is_admin and auth.uid() = v_driver_user_id and not (
    (v_delivery.status = 'accepted' and p_status = 'picking_up')
    or (v_delivery.status = 'picking_up' and p_status = 'picked_up')
    or (v_delivery.status = 'picked_up' and p_status = 'delivering')
    or (v_delivery.status = 'delivering' and p_status = 'delivered')
    or (v_delivery.status in ('accepted','picking_up','picked_up','delivering') and p_status = 'cancelled')
  ) then
    raise exception 'That delivery update is not available yet';
  end if;
  if p_status = 'cancelled' and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'Add a cancellation reason';
  end if;

  update public.business_delivery_requests
  set status = p_status,
      picked_up_at = case when p_status = 'picked_up' then coalesce(picked_up_at, now()) else picked_up_at end,
      delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      cancellation_reason = case when p_status = 'cancelled' then trim(p_reason) else cancellation_reason end
  where id = p_delivery_id
  returning * into v_delivery;
  return v_delivery;
end;
$$;

revoke all on function public.update_trip_status(uuid, text, text) from public;
revoke all on function public.register_driver_document(uuid, text, text) from public;
revoke all on function public.respond_to_business_delivery(uuid, uuid, text, integer) from public;
revoke all on function public.update_business_delivery_progress(uuid, text, text) from public;
grant execute on function public.update_trip_status(uuid, text, text) to authenticated;
grant execute on function public.register_driver_document(uuid, text, text) to authenticated;
grant execute on function public.respond_to_business_delivery(uuid, uuid, text, integer) to authenticated;
grant execute on function public.update_business_delivery_progress(uuid, text, text) to authenticated;

alter table public.trip_proof_photos enable row level security;
alter table public.business_delivery_offers enable row level security;
alter table public.business_delivery_ignores enable row level security;

drop policy if exists "trips_related_users_or_admin" on public.trips;
drop policy if exists "trips_participants_read" on public.trips;
create policy "trips_participants_read" on public.trips for select to authenticated
using (public.is_trip_participant(id));

drop policy if exists "trips_admin_write" on public.trips;
create policy "trips_admin_write" on public.trips for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "trip_proofs_participants_read" on public.trip_proof_photos;
create policy "trip_proofs_participants_read" on public.trip_proof_photos for select to authenticated
using (
  public.is_admin()
  or (trip_id is not null and public.is_trip_participant(trip_id))
  or exists (
    select 1 from public.business_delivery_requests delivery
    join public.business_accounts business on business.id = delivery.business_id
    left join public.drivers driver on driver.id = delivery.accepted_driver_id
    where delivery.id = business_delivery_id
      and (business.owner_id = auth.uid() or driver.user_id = auth.uid())
  )
);

drop policy if exists "trip_proofs_participants_insert" on public.trip_proof_photos;
create policy "trip_proofs_participants_insert" on public.trip_proof_photos for insert to authenticated
with check (
  uploader_id = auth.uid()
  and (
    (trip_id is not null and public.is_trip_participant(trip_id))
    or exists (
      select 1 from public.business_delivery_requests delivery
      join public.drivers driver on driver.id = delivery.accepted_driver_id
      where delivery.id = business_delivery_id and driver.user_id = auth.uid()
    )
  )
);

drop policy if exists "business_delivery_offers_participants" on public.business_delivery_offers;
create policy "business_delivery_offers_participants" on public.business_delivery_offers for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
  or exists (
    select 1 from public.business_delivery_requests delivery
    join public.business_accounts business on business.id = delivery.business_id
    where delivery.id = business_delivery_offers.delivery_id and business.owner_id = auth.uid()
  )
);

drop policy if exists "business_delivery_ignores_owner" on public.business_delivery_ignores;
create policy "business_delivery_ignores_owner" on public.business_delivery_ignores for all to authenticated
using (public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()))
with check (public.is_admin() or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid()));

drop policy if exists "support_owner_or_admin" on public.support_tickets;
drop policy if exists "support_owner_read" on public.support_tickets;
create policy "support_owner_read" on public.support_tickets for select to authenticated
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "support_owner_insert" on public.support_tickets;
create policy "support_owner_insert" on public.support_tickets for insert to authenticated
with check (user_id = auth.uid() and status = 'open' and admin_note is null);
drop policy if exists "support_admin_update" on public.support_tickets;
create policy "support_admin_update" on public.support_tickets for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reports_owner_or_admin" on public.reports;
drop policy if exists "reports_owner_read" on public.reports;
create policy "reports_owner_read" on public.reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "reports_owner_insert" on public.reports;
create policy "reports_owner_insert" on public.reports for insert to authenticated
with check (reporter_id = auth.uid() and status = 'open' and admin_note is null);
drop policy if exists "reports_admin_update" on public.reports;
create policy "reports_admin_update" on public.reports for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "ratings_related_users_or_admin" on public.ratings;
drop policy if exists "ratings_participants_read" on public.ratings;
create policy "ratings_participants_read" on public.ratings for select to authenticated
using (reviewer_id = auth.uid() or reviewed_user_id = auth.uid() or public.is_admin());
drop policy if exists "ratings_participant_insert" on public.ratings;
create policy "ratings_participant_insert" on public.ratings for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and trip_id is not null
  and public.is_trip_participant(trip_id)
  and exists (select 1 from public.trips t where t.id = trip_id and t.status = 'completed')
);

do $$
begin
  alter publication supabase_realtime add table public.trip_proof_photos;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.business_delivery_offers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.ratings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.reports;
exception when duplicate_object then null;
end $$;
