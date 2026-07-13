insert into storage.buckets (id, name, public)
values
  ('driver-documents', 'driver-documents', true),
  ('driver-payment-proofs', 'driver-payment-proofs', true)
on conflict (id) do update
set public = excluded.public;

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_documents enable row level security;
alter table public.driver_subscriptions enable row level security;
alter table public.driver_subscription_payments enable row level security;
alter table public.driver_locations enable row level security;
alter table public.ride_requests enable row level security;
alter table public.driver_request_ignores enable row level security;
alter table public.driver_offers enable row level security;
alter table public.trips enable row level security;
alter table public.scheduled_rides enable row level security;
alter table public.errand_requests enable row level security;
alter table public.business_accounts enable row level security;
alter table public.business_delivery_requests enable row level security;
alter table public.driver_earnings enable row level security;
alter table public.reports enable row level security;
alter table public.support_tickets enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "profiles_owner_or_admin" on public.profiles;
create policy "profiles_owner_or_admin"
on public.profiles
for all
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "drivers_owner_or_admin" on public.drivers;
create policy "drivers_owner_or_admin"
on public.drivers
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "driver_documents_owner_or_admin" on public.driver_documents;
create policy "driver_documents_owner_or_admin"
on public.driver_documents
for all
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_payments_owner_or_admin" on public.driver_subscription_payments;
create policy "driver_payments_owner_or_admin"
on public.driver_subscription_payments
for all
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_locations_owner_or_admin" on public.driver_locations;
create policy "driver_locations_owner_or_admin"
on public.driver_locations
for all
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "riders_manage_own_requests" on public.ride_requests;
create policy "riders_manage_own_requests"
on public.ride_requests
for all
using (rider_id = auth.uid() or public.is_admin())
with check (rider_id = auth.uid() or public.is_admin());

drop policy if exists "eligible_drivers_read_pending_requests" on public.ride_requests;
create policy "eligible_drivers_read_pending_requests"
on public.ride_requests
for select
using (
  status = 'pending'
  and exists (
    select 1
    from public.drivers d
    where d.user_id = auth.uid()
      and public.can_driver_receive_requests(d.id)
  )
);

drop policy if exists "driver_offers_driver_rider_admin" on public.driver_offers;
create policy "driver_offers_driver_rider_admin"
on public.driver_offers
for all
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
  or exists (select 1 from public.ride_requests r where r.id = ride_request_id and r.rider_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid() and public.can_driver_receive_requests(d.id))
);

drop policy if exists "business_accounts_owner_or_admin" on public.business_accounts;
create policy "business_accounts_owner_or_admin"
on public.business_accounts
for all
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "business_deliveries_owner_admin_eligible_driver" on public.business_delivery_requests;
create policy "business_deliveries_owner_admin_eligible_driver"
on public.business_delivery_requests
for all
using (
  public.is_admin()
  or exists (select 1 from public.business_accounts b where b.id = business_id and b.owner_id = auth.uid())
  or exists (select 1 from public.drivers d where d.user_id = auth.uid() and public.can_driver_receive_requests(d.id))
)
with check (
  public.is_admin()
  or exists (select 1 from public.business_accounts b where b.id = business_id and b.owner_id = auth.uid())
  or exists (select 1 from public.drivers d where d.user_id = auth.uid() and public.can_driver_receive_requests(d.id))
);

drop policy if exists "support_owner_or_admin" on public.support_tickets;
create policy "support_owner_or_admin"
on public.support_tickets
for all
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "driver_document_uploads" on storage.objects;
create policy "driver_document_uploads"
on storage.objects
for all
using (
  bucket_id in ('driver-documents', 'driver-payment-proofs')
  and (auth.role() = 'authenticated' or public.is_admin())
)
with check (
  bucket_id in ('driver-documents', 'driver-payment-proofs')
  and (auth.role() = 'authenticated' or public.is_admin())
);
