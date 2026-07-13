-- Secure reference and legacy service tables that predate the main ride workflow.

alter table public.fare_zones enable row level security;
alter table public.local_places enable row level security;
alter table public.shared_ride_groups enable row level security;
alter table public.shared_ride_members enable row level security;
alter table public.scheduled_rides enable row level security;
alter table public.errand_requests enable row level security;

drop policy if exists "fare_zones_public_read" on public.fare_zones;
create policy "fare_zones_public_read" on public.fare_zones
for select to anon, authenticated using (true);
drop policy if exists "fare_zones_admin_write" on public.fare_zones;
create policy "fare_zones_admin_write" on public.fare_zones
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "local_places_public_read" on public.local_places;
create policy "local_places_public_read" on public.local_places
for select to anon, authenticated using (true);
drop policy if exists "local_places_admin_write" on public.local_places;
create policy "local_places_admin_write" on public.local_places
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "scheduled_rides_owner_admin" on public.scheduled_rides;
create policy "scheduled_rides_owner_admin" on public.scheduled_rides
for all to authenticated
using (rider_id = auth.uid() or public.is_admin())
with check (rider_id = auth.uid() or public.is_admin());

drop policy if exists "errands_owner_admin" on public.errand_requests;
create policy "errands_owner_admin" on public.errand_requests
for all to authenticated
using (rider_id = auth.uid() or public.is_admin())
with check (rider_id = auth.uid() or public.is_admin());
drop policy if exists "eligible_drivers_read_pending_errands" on public.errand_requests;
create policy "eligible_drivers_read_pending_errands" on public.errand_requests
for select to authenticated
using (
  status = 'pending'
  and exists (
    select 1 from public.drivers driver
    where driver.user_id = auth.uid() and public.can_driver_receive_requests(driver.id)
  )
);

drop policy if exists "shared_groups_participant_read" on public.shared_ride_groups;
create policy "shared_groups_participant_read" on public.shared_ride_groups
for select to authenticated
using (
  status = 'open'
  or public.is_admin()
  or exists (
    select 1 from public.shared_ride_members member
    where member.group_id = shared_ride_groups.id and member.rider_id = auth.uid()
  )
);
drop policy if exists "shared_groups_admin_write" on public.shared_ride_groups;
create policy "shared_groups_admin_write" on public.shared_ride_groups
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "shared_members_owner_admin" on public.shared_ride_members;
create policy "shared_members_owner_admin" on public.shared_ride_members
for all to authenticated
using (rider_id = auth.uid() or public.is_admin())
with check (rider_id = auth.uid() or public.is_admin());

create index if not exists idx_scheduled_rides_rider_status
on public.scheduled_rides (rider_id, status, created_at desc);
create index if not exists idx_errand_requests_status_created
on public.errand_requests (status, created_at desc);
create index if not exists idx_shared_ride_members_rider
on public.shared_ride_members (rider_id, created_at desc);
