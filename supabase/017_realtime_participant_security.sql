-- Align participant visibility with the final lifecycle and close older broad write policies.

create or replace function public.can_view_ride_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.drivers viewer
      join public.ride_requests request on request.rider_id = p_profile_id
      where viewer.user_id = auth.uid()
        and request.status in ('pending','requested','offered','countered','accepted')
        and public.can_driver_receive_requests(viewer.id)
    )
    or exists (
      select 1
      from public.drivers offered_driver
      join public.driver_offers offer on offer.driver_id = offered_driver.id
      join public.ride_requests request on request.id = offer.ride_request_id
      where offered_driver.user_id = p_profile_id
        and request.rider_id = auth.uid()
    )
    or exists (
      select 1
      from public.trips trip
      join public.drivers trip_driver on trip_driver.id = trip.driver_id
      where (
        (trip.rider_id = auth.uid() and trip_driver.user_id = p_profile_id)
        or (trip_driver.user_id = auth.uid() and trip.rider_id = p_profile_id)
      )
      and trip.status in ('accepted','driver_arriving','arrived','in_progress','completed','cancelled')
    );
$$;

drop policy if exists "drivers_offer_visible_to_rider" on public.drivers;
create policy "drivers_offer_visible_to_rider"
on public.drivers for select to authenticated
using (
  exists (
    select 1
    from public.driver_offers offer
    join public.ride_requests request on request.id = offer.ride_request_id
    where offer.driver_id = drivers.id and request.rider_id = auth.uid()
  )
  or exists (
    select 1 from public.trips trip
    where trip.driver_id = drivers.id
      and trip.rider_id = auth.uid()
      and trip.status in ('accepted','driver_arriving','arrived','in_progress','completed','cancelled')
  )
);

drop policy if exists "authenticated_read_available_driver_locations" on public.driver_locations;
create policy "authenticated_read_available_driver_locations"
on public.driver_locations for select to authenticated
using (
  (
    is_online = true
    and is_available = true
    and lat between -90 and 90
    and lng between -180 and 180
    and updated_at > now() - interval '5 minutes'
  )
  or exists (
    select 1 from public.trips trip
    where trip.driver_id = driver_locations.driver_id
      and trip.rider_id = auth.uid()
      and trip.status in ('accepted','driver_arriving','arrived','in_progress')
  )
);

create or replace function public.set_driver_location(
  p_driver_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_heading numeric default null,
  p_speed numeric default null,
  p_accuracy numeric default null,
  p_is_online boolean default true,
  p_is_available boolean default true
)
returns public.driver_locations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_location public.driver_locations;
begin
  if not exists (
    select 1 from public.drivers driver
    where driver.id = p_driver_id and driver.user_id = auth.uid()
  ) and not public.is_admin() then
    raise exception 'You cannot update this driver location';
  end if;
  if p_is_online and not public.is_admin() and not public.can_driver_receive_requests(p_driver_id) then
    raise exception 'Only approved drivers with approved documents and an active pass can go online';
  end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90
     or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid driver coordinates';
  end if;

  insert into public.driver_locations (
    driver_id, lat, lng, heading, speed, accuracy, is_online, is_available, updated_at
  ) values (
    p_driver_id, p_latitude, p_longitude, p_heading, p_speed, p_accuracy,
    p_is_online, p_is_available, now()
  )
  on conflict (driver_id) do update
  set lat = excluded.lat,
      lng = excluded.lng,
      heading = excluded.heading,
      speed = excluded.speed,
      accuracy = excluded.accuracy,
      is_online = excluded.is_online,
      is_available = excluded.is_available,
      updated_at = now()
  returning * into v_location;
  return v_location;
end;
$$;

drop policy if exists "driver_request_ignores_owner" on public.driver_request_ignores;
create policy "driver_request_ignores_owner"
on public.driver_request_ignores for all to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.drivers driver where driver.id = driver_id and driver.user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.drivers driver where driver.id = driver_id and driver.user_id = auth.uid())
);

drop policy if exists "driver_earnings_owner_read" on public.driver_earnings;
create policy "driver_earnings_owner_read"
on public.driver_earnings for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.drivers driver where driver.id = driver_id and driver.user_id = auth.uid())
);
drop policy if exists "driver_earnings_admin_write" on public.driver_earnings;
create policy "driver_earnings_admin_write"
on public.driver_earnings for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "driver_offers_driver_rider_admin" on public.driver_offers;
drop policy if exists "driver_offers_participants_read" on public.driver_offers;
create policy "driver_offers_participants_read"
on public.driver_offers for select to authenticated
using (
  public.is_admin()
  or exists (select 1 from public.drivers driver where driver.id = driver_id and driver.user_id = auth.uid())
  or exists (select 1 from public.ride_requests request where request.id = ride_request_id and request.rider_id = auth.uid())
);
drop policy if exists "driver_offers_driver_insert" on public.driver_offers;
create policy "driver_offers_driver_insert"
on public.driver_offers for insert to authenticated
with check (
  status = 'pending'
  and (fare_jmd is null or fare_jmd > 0)
  and exists (
    select 1 from public.drivers driver
    where driver.id = driver_id
      and driver.user_id = auth.uid()
      and public.can_driver_receive_requests(driver.id)
  )
);
drop policy if exists "driver_offers_admin_update" on public.driver_offers;
create policy "driver_offers_admin_update"
on public.driver_offers for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create unique index if not exists idx_active_trip_per_driver
on public.trips (driver_id)
where status in ('requested','offered','accepted','driver_arriving','arrived','in_progress');
create unique index if not exists idx_active_trip_per_rider
on public.trips (rider_id)
where status in ('requested','offered','accepted','driver_arriving','arrived','in_progress');

create or replace function public.accept_driver_offer(p_offer_id uuid)
returns table (
  id uuid,
  ride_request_id uuid,
  rider_id uuid,
  driver_id uuid,
  agreed_fare_jmd integer,
  trip_pin text,
  pin_verified boolean,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.driver_offers%rowtype;
  v_request public.ride_requests%rowtype;
  v_trip public.trips%rowtype;
  v_agreed_fare integer;
begin
  select * into v_offer
  from public.driver_offers
  where driver_offers.id = p_offer_id and driver_offers.status = 'pending'
  for update;
  if v_offer.id is null then raise exception 'Offer not found'; end if;

  select * into v_request
  from public.ride_requests
  where ride_requests.id = v_offer.ride_request_id
  for update;
  if v_request.id is null or v_request.rider_id <> auth.uid() then raise exception 'Offer not available'; end if;
  if v_request.status not in ('pending','requested','offered','countered') then raise exception 'Request already accepted by another driver'; end if;
  if not public.can_driver_receive_requests(v_offer.driver_id) then raise exception 'The selected driver is no longer available'; end if;
  if exists (
    select 1 from public.trips trip
    where (trip.driver_id = v_offer.driver_id or trip.rider_id = v_request.rider_id)
      and trip.status in ('requested','offered','accepted','driver_arriving','arrived','in_progress')
  ) then raise exception 'Passenger or driver already has an active trip'; end if;

  v_agreed_fare := coalesce(v_offer.fare_jmd, v_request.offered_fare_jmd);
  update public.driver_offers
  set status = case when driver_offers.id = v_offer.id then 'accepted' else 'rejected' end
  where driver_offers.ride_request_id = v_offer.ride_request_id and driver_offers.status = 'pending';
  update public.ride_requests
  set status = 'accepted', offered_fare_jmd = v_agreed_fare, selected_driver_id = v_offer.driver_id
  where ride_requests.id = v_offer.ride_request_id;

  insert into public.trips (ride_request_id, rider_id, driver_id, agreed_fare_jmd, trip_pin, status)
  values (v_offer.ride_request_id, v_request.rider_id, v_offer.driver_id, v_agreed_fare, public.generate_trip_pin(), 'accepted')
  returning * into v_trip;

  return query select v_trip.id, v_trip.ride_request_id, v_trip.rider_id, v_trip.driver_id,
    v_trip.agreed_fare_jmd, v_trip.trip_pin, v_trip.pin_verified, v_trip.status, v_trip.created_at;
end;
$$;

create or replace function public.validate_report_participant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rider_id uuid;
  v_driver_user_id uuid;
  v_business_owner_id uuid;
begin
  if auth.uid() is distinct from new.reporter_id and not public.is_admin() then raise exception 'Access denied'; end if;
  if new.trip_id is not null then
    select trip.rider_id, driver.user_id
    into v_rider_id, v_driver_user_id
    from public.trips trip join public.drivers driver on driver.id = trip.driver_id
    where trip.id = new.trip_id;
    if new.reporter_id = v_rider_id then
      new.reported_user_id := v_driver_user_id;
    elsif new.reporter_id = v_driver_user_id then
      new.reported_user_id := v_rider_id;
    elsif not public.is_admin() then
      raise exception 'Only trip participants can report this trip';
    end if;
  elsif new.business_delivery_id is not null then
    select business.owner_id, driver.user_id
    into v_business_owner_id, v_driver_user_id
    from public.business_delivery_requests delivery
    join public.business_accounts business on business.id = delivery.business_id
    left join public.drivers driver on driver.id = delivery.accepted_driver_id
    where delivery.id = new.business_delivery_id;
    if new.reporter_id = v_business_owner_id then
      new.reported_user_id := v_driver_user_id;
    elsif new.reporter_id = v_driver_user_id then
      new.reported_user_id := v_business_owner_id;
    elsif not public.is_admin() then
      raise exception 'Only delivery participants can report this delivery';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_report_participant_before_write on public.reports;
create trigger validate_report_participant_before_write
before insert or update on public.reports
for each row execute function public.validate_report_participant();
