-- Lin Ride mapping, route metadata, and throttled live driver location support.
-- Safe to run more than once.

alter table public.driver_locations
  add column if not exists speed numeric,
  add column if not exists accuracy numeric,
  add column if not exists is_available boolean not null default true;

create unique index if not exists idx_driver_locations_driver_unique
on public.driver_locations (driver_id);

create index if not exists idx_driver_locations_available_recent
on public.driver_locations (updated_at desc)
where is_online = true and is_available = true;

alter table public.driver_locations replica identity full;

alter table public.ride_requests
  add column if not exists pickup_place_id text,
  add column if not exists destination_place_id text,
  add column if not exists distance_meters bigint,
  add column if not exists estimated_duration_seconds integer,
  add column if not exists estimated_fare_jmd integer,
  add column if not exists route_geometry jsonb,
  add column if not exists pickup_landmark text,
  add column if not exists destination_landmark text,
  add column if not exists rider_location_note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ride_requests_distance_nonnegative'
  ) then
    alter table public.ride_requests
      add constraint ride_requests_distance_nonnegative
      check (distance_meters is null or distance_meters >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ride_requests_duration_nonnegative'
  ) then
    alter table public.ride_requests
      add constraint ride_requests_duration_nonnegative
      check (estimated_duration_seconds is null or estimated_duration_seconds >= 0) not valid;
  end if;
end $$;

drop policy if exists "authenticated_read_available_driver_locations" on public.driver_locations;
create policy "authenticated_read_available_driver_locations"
on public.driver_locations
for select
to authenticated
using (
  (
    is_online = true
    and is_available = true
    and lat between -90 and 90
    and lng between -180 and 180
    and updated_at > now() - interval '5 minutes'
  )
  or exists (
    select 1
    from public.trips t
    where t.driver_id = driver_locations.driver_id
      and t.rider_id = auth.uid()
      and t.status in ('accepted', 'arriving', 'in_progress')
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
    select 1
    from public.drivers d
    where d.id = p_driver_id and d.user_id = auth.uid()
  ) and not public.is_admin() then
    raise exception 'You cannot update this driver location';
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

revoke all on function public.set_driver_location(uuid, numeric, numeric, numeric, numeric, numeric, boolean, boolean) from public;
grant execute on function public.set_driver_location(uuid, numeric, numeric, numeric, numeric, numeric, boolean, boolean) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.driver_locations;
exception when duplicate_object then null;
end $$;
