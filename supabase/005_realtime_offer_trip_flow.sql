create unique index if not exists idx_driver_locations_driver_unique
on public.driver_locations (driver_id);

drop policy if exists "trips_related_users_or_admin" on public.trips;
create policy "trips_related_users_or_admin"
on public.trips
for all
using (
  public.is_admin()
  or rider_id = auth.uid()
  or exists (
    select 1
    from public.drivers d
    where d.id = driver_id
      and d.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or rider_id = auth.uid()
  or exists (
    select 1
    from public.drivers d
    where d.id = driver_id
      and d.user_id = auth.uid()
  )
);

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
  select *
  into v_offer
  from public.driver_offers
  where id = p_offer_id
    and status = 'pending'
  for update;

  if v_offer.id is null then
    raise exception 'Offer not found';
  end if;

  select *
  into v_request
  from public.ride_requests
  where id = v_offer.ride_request_id
  for update;

  if v_request.id is null or v_request.rider_id <> auth.uid() then
    raise exception 'Offer not available';
  end if;

  if v_request.status not in ('pending', 'countered') then
    raise exception 'Request already accepted by another driver';
  end if;

  v_agreed_fare := coalesce(v_offer.fare_jmd, v_request.offered_fare_jmd);

  update public.driver_offers
  set status = case when id = v_offer.id then 'accepted' else 'rejected' end
  where ride_request_id = v_offer.ride_request_id
    and status = 'pending';

  update public.ride_requests
  set status = 'accepted',
      offered_fare_jmd = v_agreed_fare
  where id = v_offer.ride_request_id;

  insert into public.trips (
    ride_request_id,
    rider_id,
    driver_id,
    agreed_fare_jmd,
    trip_pin,
    status
  )
  values (
    v_offer.ride_request_id,
    v_request.rider_id,
    v_offer.driver_id,
    v_agreed_fare,
    public.generate_trip_pin(),
    'accepted'
  )
  returning * into v_trip;

  return query
  select
    v_trip.id,
    v_trip.ride_request_id,
    v_trip.rider_id,
    v_trip.driver_id,
    v_trip.agreed_fare_jmd,
    v_trip.trip_pin,
    v_trip.pin_verified,
    v_trip.status,
    v_trip.created_at;
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
  select t.trip_pin = p_entered_pin
  into v_matches
  from public.trips t
  where t.id = p_trip_id
    and (
      t.rider_id = auth.uid()
      or exists (
        select 1
        from public.drivers d
        where d.id = t.driver_id
          and d.user_id = auth.uid()
      )
      or public.is_admin()
    );

  if coalesce(v_matches, false) then
    update public.trips
    set pin_verified = true,
        status = 'in_progress',
        started_at = coalesce(started_at, now())
    where id = p_trip_id;
    return true;
  end if;

  return false;
end;
$$;
