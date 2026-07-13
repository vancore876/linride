create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('rider','driver','business','admin')),
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('pending','approved','rejected','suspended')) default 'pending',
  documents_status text not null check (documents_status in ('missing','pending','approved','rejected')) default 'missing',
  documents_rejection_reason text,
  documents_submitted_at timestamptz,
  documents_approved_at timestamptz,
  documents_approved_by uuid references public.profiles(id),
  vehicle_type text,
  vehicle_make text,
  vehicle_model text,
  vehicle_color text,
  plate_number text,
  license_url text,
  vehicle_photo_url text,
  document_url text,
  is_courier_approved boolean not null default false,
  is_local_driver boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.driver_documents (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  document_type text,
  file_url text,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  rejection_reason text,
  uploaded_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table if not exists public.driver_subscriptions (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  amount_jmd integer not null default 2000,
  status text not null check (status in ('inactive','pending','active','expired','rejected')) default 'inactive',
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id)
);

create table if not exists public.driver_subscription_payments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  amount_jmd integer not null default 2000,
  method text,
  reference_number text,
  proof_url text,
  note text,
  status text not null check (status in ('pending','approved','rejected')) default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id)
);

create table if not exists public.driver_locations (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete cascade,
  lat numeric,
  lng numeric,
  heading numeric,
  is_online boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.local_places (
  id uuid primary key default gen_random_uuid(),
  name text,
  zone text,
  lat numeric,
  lng numeric,
  place_type text,
  is_popular boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.fare_zones (
  id uuid primary key default gen_random_uuid(),
  zone_name text,
  min_fare_jmd integer,
  max_fare_jmd integer,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  pickup_name text,
  pickup_lat numeric,
  pickup_lng numeric,
  destination_name text,
  destination_lat numeric,
  destination_lng numeric,
  offered_fare_jmd integer,
  suggested_min_jmd integer,
  suggested_max_jmd integer,
  service_type text check (service_type in ('ride','shared_ride','errand','courier','town_to_town')),
  vehicle_type text,
  payment_method text,
  boost_tags text[],
  boost_total_jmd integer not null default 0,
  is_shared boolean not null default false,
  status text not null check (status in ('pending','accepted','countered','cancelled','completed')) default 'pending',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.driver_request_ignores (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  ignored_fare_jmd integer not null,
  created_at timestamptz not null default now(),
  unique (ride_request_id, driver_id, ignored_fare_jmd)
);

create table if not exists public.driver_offers (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id) on delete cascade,
  driver_id uuid not null references public.drivers(id) on delete cascade,
  offer_type text not null check (offer_type in ('accept','counter')),
  fare_jmd integer,
  status text not null check (status in ('pending','accepted','rejected','withdrawn')) default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  ride_request_id uuid not null references public.ride_requests(id),
  rider_id uuid not null references public.profiles(id),
  driver_id uuid not null references public.drivers(id),
  agreed_fare_jmd integer,
  trip_pin text,
  pin_verified boolean not null default false,
  status text not null check (status in ('accepted','arriving','in_progress','completed','cancelled')) default 'accepted',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.scheduled_rides (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id),
  pickup_name text,
  destination_name text,
  pickup_lat numeric,
  pickup_lng numeric,
  destination_lat numeric,
  destination_lng numeric,
  days_of_week text[],
  ride_time time,
  offered_fare_jmd integer,
  is_shared boolean not null default false,
  status text not null check (status in ('active','paused','cancelled')) default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.shared_ride_groups (
  id uuid primary key default gen_random_uuid(),
  corridor_name text,
  pickup_zone text,
  destination_zone text,
  ride_time timestamptz,
  status text not null check (status in ('open','matched','completed','cancelled')) default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.shared_ride_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.shared_ride_groups(id) on delete cascade,
  rider_id uuid not null references public.profiles(id),
  ride_request_id uuid references public.ride_requests(id),
  created_at timestamptz not null default now()
);

create table if not exists public.errand_requests (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id),
  pickup_name text,
  dropoff_name text,
  item_description text,
  estimated_item_cost_jmd integer,
  delivery_offer_jmd integer,
  payment_method text,
  notes text,
  photo_url text,
  status text not null check (status in ('pending','accepted','picked_up','delivered','cancelled')) default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.business_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  business_name text,
  business_type text,
  phone text,
  address text,
  status text not null check (status in ('pending','approved','rejected','suspended')) default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists public.business_delivery_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_accounts(id),
  pickup_business_name text,
  pickup_address text,
  customer_name text,
  customer_phone text,
  dropoff_address text,
  package_details text,
  delivery_offer_jmd integer,
  cash_collection_required boolean not null default false,
  cash_collection_amount_jmd integer,
  notes text,
  status text not null check (status in ('pending','searching','accepted','picking_up','delivered','cancelled')) default 'pending',
  accepted_driver_id uuid references public.drivers(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz
);

create table if not exists public.driver_earnings (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id),
  trip_id uuid references public.trips(id),
  amount_jmd integer,
  earning_type text check (earning_type in ('ride','errand','business_delivery','courier')),
  earned_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  reported_user_id uuid references public.profiles(id),
  trip_id uuid references public.trips(id),
  reason text,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  category text,
  message text,
  status text not null check (status in ('open','in_progress','resolved','closed')) default 'open',
  created_at timestamptz not null default now()
);

create or replace function public.has_active_driver_subscription(p_driver_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.driver_subscriptions ds
    where ds.driver_id = p_driver_id
      and ds.status = 'active'
      and ds.expires_at > now()
  );
$$;

create or replace function public.can_driver_accept_request(p_driver_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.drivers d
    where d.id = p_driver_id
      and d.status = 'approved'
      and d.documents_status = 'approved'
      and public.has_active_driver_subscription(p_driver_id)
  );
$$;

create or replace function public.can_driver_receive_requests(p_driver_id uuid)
returns boolean
language sql
stable
as $$
  select public.can_driver_accept_request(p_driver_id);
$$;

create or replace function public.can_driver_receive_rides(p_driver_id uuid)
returns boolean
language sql
stable
as $$
  select public.can_driver_accept_request(p_driver_id);
$$;

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

create or replace function public.generate_trip_pin()
returns text
language sql
volatile
as $$
  select lpad((floor(random() * 10000))::int::text, 4, '0');
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
  select trip_pin = p_entered_pin into v_matches
  from public.trips
  where id = p_trip_id;

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

create or replace function public.prevent_driver_location_without_pass()
returns trigger
language plpgsql
as $$
begin
  if new.is_online = true and public.can_driver_accept_request(new.driver_id) = false then
    raise exception 'Driver must be approved and have an active weekly subscription to go online';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists enforce_driver_location_pass on public.driver_locations;

create trigger enforce_driver_location_pass
before insert or update on public.driver_locations
for each row execute function public.prevent_driver_location_without_pass();

create or replace function public.prevent_driver_offer_without_pass()
returns trigger
language plpgsql
as $$
begin
  if public.can_driver_accept_request(new.driver_id) = false then
    raise exception 'Driver must have an active weekly subscription to accept or counter ride requests';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_driver_offer_pass on public.driver_offers;

create trigger enforce_driver_offer_pass
before insert or update on public.driver_offers
for each row execute function public.prevent_driver_offer_without_pass();

create or replace function public.touch_ride_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_ride_request_updated_at on public.ride_requests;

create trigger set_ride_request_updated_at
before update on public.ride_requests
for each row execute function public.touch_ride_request_updated_at();

create index if not exists idx_driver_request_ignores_lookup
on public.driver_request_ignores (driver_id, ride_request_id, ignored_fare_jmd);

create unique index if not exists idx_local_places_name_unique
on public.local_places (name);

create unique index if not exists idx_fare_zones_zone_name_unique
on public.fare_zones (zone_name);

insert into public.fare_zones (zone_name, min_fare_jmd, max_fare_jmd, notes)
values
  ('Linstead Town', 500, 800, 'Short town hops and local pickup points.'),
  ('Bog Walk', 1000, 1800, 'Bog Walk corridor estimate.'),
  ('Ewarton', 1300, 1800, 'North west community route.'),
  ('Treadways', 1000, 1700, 'Treadways and nearby district routes.'),
  ('Cheesefield', 1000, 1700, 'Cheesefield and nearby district routes.'),
  ('Spanish Town', 1500, 2500, 'Town to town corridor.'),
  ('Kingston / Half-Way Tree', 3000, 4500, 'Kingston commute corridor.'),
  ('Deep district / custom quote', 1800, 6000, 'Drivers may counter based on road and timing.')
on conflict (zone_name) do update
set min_fare_jmd = excluded.min_fare_jmd,
    max_fare_jmd = excluded.max_fare_jmd,
    notes = excluded.notes;

insert into public.local_places (name, zone, lat, lng, place_type, is_popular)
values
  ('Barry Main Rd', 'Linstead Town', 18.1374, -77.0295, 'road', true),
  ('KFC Linstead', 'Linstead Town', 18.1361, -77.0304, 'food', true),
  ('Linstead Market', 'Linstead Town', 18.1379, -77.0317, 'market', true),
  ('Linstead Hospital', 'Linstead Town', 18.1418, -77.0355, 'health', true),
  ('Linstead Police Station', 'Linstead Town', 18.1348, -77.0288, 'safety', true),
  ('Juici Patties Linstead', 'Linstead Town', 18.1368, -77.0307, 'food', true),
  ('Linstead Bus Park', 'Linstead Town', 18.1372, -77.0323, 'transport', true),
  ('Bog Walk', 'Bog Walk', 18.1024, -77.0051, 'community', true),
  ('Ewarton', 'Ewarton', 18.1835, -77.0858, 'community', true),
  ('Treadways', 'Treadways', 18.1543, -77.0548, 'community', true),
  ('Cheesefield', 'Cheesefield', 18.1194, -77.0494, 'community', true),
  ('Spanish Town', 'Spanish Town', 17.9959, -76.9551, 'town', true),
  ('Half-Way Tree', 'Kingston / Half-Way Tree', 18.0106, -76.7962, 'city', true)
on conflict (name) do update
set zone = excluded.zone,
    lat = excluded.lat,
    lng = excluded.lng,
    place_type = excluded.place_type,
    is_popular = excluded.is_popular;

do $$
begin
  alter publication supabase_realtime add table public.ride_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.driver_offers;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.trips;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.driver_locations;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.support_tickets;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.business_delivery_requests;
exception when duplicate_object then null;
end $$;
