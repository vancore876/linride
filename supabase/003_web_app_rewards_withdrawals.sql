create table if not exists public.customer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  preferred_service_area text,
  points_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  service_type text not null check (
    service_type in (
      'ride',
      'delivery',
      'errand',
      'shopping_pickup',
      'business_delivery',
      'school_run',
      'moving_help',
      'shared_ride',
      'urgent_pickup'
    )
  ),
  pickup_location text,
  dropoff_location text,
  pickup_lat numeric,
  pickup_lng numeric,
  dropoff_lat numeric,
  dropoff_lng numeric,
  landmark_notes text,
  customer_notes text,
  suggested_fare integer,
  status text not null check (
    status in ('draft','pending','offered','accepted','started','completed','cancelled','disputed')
  ) default 'pending',
  selected_driver_id uuid references public.drivers(id),
  scheduled_time timestamptz,
  call_when_nearby boolean not null default false,
  bad_road_note boolean not null default false,
  heavy_item boolean not null default false,
  fragile_item boolean not null default false,
  return_trip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ride_requests
  add column if not exists landmark_notes text,
  add column if not exists customer_notes text,
  add column if not exists selected_driver_id uuid references public.drivers(id),
  add column if not exists scheduled_time timestamptz,
  add column if not exists call_when_nearby boolean not null default false,
  add column if not exists bad_road_note boolean not null default false,
  add column if not exists heavy_item boolean not null default false,
  add column if not exists fragile_item boolean not null default false;

alter table public.ride_requests
  drop constraint if exists ride_requests_service_type_check;

alter table public.ride_requests
  add constraint ride_requests_service_type_check
  check (
    service_type in (
      'ride',
      'shared_ride',
      'errand',
      'courier',
      'town_to_town',
      'delivery',
      'shopping_pickup',
      'business_delivery',
      'school_run',
      'moving_help',
      'urgent_pickup'
    )
  );

alter table public.driver_offers
  add column if not exists offer_amount integer,
  add column if not exists message text;

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  pickup_location text,
  dropoff_location text,
  item_details text,
  amount_to_collect_jmd integer,
  delivery_fee_jmd integer,
  proof_photo_url text,
  proof_pin text,
  status text not null check (status in ('pending','accepted','picked_up','delivered','cancelled','disputed')) default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references public.trips(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_user_id uuid references public.profiles(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.points_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  available_points integer not null default 0 check (available_points >= 0),
  pending_points integer not null default 0 check (pending_points >= 0),
  frozen_points integer not null default 0 check (frozen_points >= 0),
  lifetime_earned_points integer not null default 0 check (lifetime_earned_points >= 0),
  lifetime_withdrawn_points integer not null default 0 check (lifetime_withdrawn_points >= 0),
  under_review boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  transaction_type text not null check (
    transaction_type in ('earned','bonus','withdrawal','adjustment','frozen','reversed')
  ),
  reason text not null,
  related_request_id uuid,
  status text not null check (status in ('pending','available','frozen','reversed')) default 'pending',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  account_holder_name text not null,
  bank_name text not null,
  branch_name text,
  account_number text not null,
  account_type text not null check (account_type in ('savings','chequing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  wallet_type text not null check (wallet_type in ('customer_points','driver_earnings','business_earnings')),
  amount integer not null check (amount > 0),
  bank_account_id uuid not null references public.bank_accounts(id),
  status text not null check (status in ('pending','approved','rejected','paid')) default 'pending',
  admin_note text,
  approved_by uuid references public.profiles(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  default_platform_fee_jmd integer not null default 0,
  extra_charge_options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  target_table text,
  target_id uuid,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  service_request_id uuid references public.service_requests(id) on delete set null,
  trip_id uuid references public.trips(id) on delete set null,
  reason text not null,
  details text,
  status text not null check (status in ('open','in_review','resolved','closed')) default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  notification_type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.platform_settings (key, value)
values
  ('points_rules', '{
    "completedRide": 10,
    "completedDelivery": 8,
    "completedErrand": 12,
    "completedScheduledRide": 15,
    "firstCompletedTripBonus": 50,
    "referralBonus": 100,
    "ratingBonus": 2,
    "minimumWithdrawalPoints": 1000,
    "pointsToJmdRate": 1
  }'::jsonb),
  ('withdrawal_settings', '{
    "allowedMethods": ["bank_transfer"],
    "minimumCustomerPoints": 1000,
    "minimumDriverEarningsJmd": 1000,
    "minimumBusinessEarningsJmd": 1000
  }'::jsonb)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

insert into public.service_areas (name, extra_charge_options)
values
  ('Linstead', '["rain","late_night","waiting_fee"]'::jsonb),
  ('Bog Walk', '["bad_road","far_district","return_trip"]'::jsonb),
  ('Ewarton', '["bad_road","far_district","return_trip"]'::jsonb),
  ('Treadways', '["bad_road","far_district","heavy_item"]'::jsonb),
  ('Cheesefield', '["bad_road","far_district","heavy_item"]'::jsonb),
  ('Spanish Town', '["long_distance","return_trip"]'::jsonb),
  ('Half-Way Tree', '["long_distance","return_trip","late_night"]'::jsonb)
on conflict (name) do update
set extra_charge_options = excluded.extra_charge_options,
    updated_at = now();

alter table public.customer_profiles enable row level security;
alter table public.service_requests enable row level security;
alter table public.deliveries enable row level security;
alter table public.ratings enable row level security;
alter table public.points_wallets enable row level security;
alter table public.points_transactions enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.service_areas enable row level security;
alter table public.platform_settings enable row level security;
alter table public.admin_actions enable row level security;
alter table public.disputes enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "customer_profiles_owner_or_admin" on public.customer_profiles;
create policy "customer_profiles_owner_or_admin"
on public.customer_profiles
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "service_requests_customer_driver_admin" on public.service_requests;
create policy "service_requests_customer_driver_admin"
on public.service_requests
for all
using (
  customer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.drivers d
    where d.user_id = auth.uid()
      and public.can_driver_receive_requests(d.id)
  )
)
with check (customer_id = auth.uid() or public.is_admin());

drop policy if exists "deliveries_related_users_or_admin" on public.deliveries;
create policy "deliveries_related_users_or_admin"
on public.deliveries
for all
using (
  public.is_admin()
  or customer_id = auth.uid()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
)
with check (
  public.is_admin()
  or customer_id = auth.uid()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "ratings_related_users_or_admin" on public.ratings;
create policy "ratings_related_users_or_admin"
on public.ratings
for all
using (reviewer_id = auth.uid() or reviewed_user_id = auth.uid() or public.is_admin())
with check (reviewer_id = auth.uid() or public.is_admin());

drop policy if exists "points_wallet_owner_or_admin" on public.points_wallets;
create policy "points_wallet_owner_or_admin"
on public.points_wallets
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "points_wallet_admin_writes" on public.points_wallets;
create policy "points_wallet_admin_writes"
on public.points_wallets
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "points_transactions_owner_or_admin" on public.points_transactions;
create policy "points_transactions_owner_or_admin"
on public.points_transactions
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "points_transactions_admin_writes" on public.points_transactions;
create policy "points_transactions_admin_writes"
on public.points_transactions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "bank_accounts_owner_or_admin" on public.bank_accounts;
create policy "bank_accounts_owner_or_admin"
on public.bank_accounts
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "withdrawal_requests_owner_or_admin" on public.withdrawal_requests;
create policy "withdrawal_requests_owner_or_admin"
on public.withdrawal_requests
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "service_areas_read_all_admin_write" on public.service_areas;
create policy "service_areas_read_all_admin_write"
on public.service_areas
for select
using (true);

drop policy if exists "service_areas_admin_write" on public.service_areas;
create policy "service_areas_admin_write"
on public.service_areas
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "platform_settings_read_all_admin_write" on public.platform_settings;
create policy "platform_settings_read_all_admin_write"
on public.platform_settings
for select
using (true);

drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write"
on public.platform_settings
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_actions_admin_only" on public.admin_actions;
create policy "admin_actions_admin_only"
on public.admin_actions
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "disputes_owner_or_admin" on public.disputes;
create policy "disputes_owner_or_admin"
on public.disputes
for all
using (reporter_id = auth.uid() or reported_user_id = auth.uid() or public.is_admin())
with check (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_owner_or_admin" on public.notifications;
create policy "notifications_owner_or_admin"
on public.notifications
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create index if not exists idx_service_requests_customer_status
on public.service_requests (customer_id, status, created_at desc);

create index if not exists idx_points_transactions_user_created
on public.points_transactions (user_id, created_at desc);

create index if not exists idx_withdrawal_requests_status
on public.withdrawal_requests (status, created_at desc);

create index if not exists idx_notifications_user_read
on public.notifications (user_id, read_at, created_at desc);
