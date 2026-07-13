-- Restrict business deliveries to owner creation, assigned-driver progress RPCs, and admin management.

alter table public.business_accounts
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists touch_business_accounts_updated_at on public.business_accounts;
create trigger touch_business_accounts_updated_at
before update on public.business_accounts
for each row execute function public.touch_updated_at();

drop policy if exists "business_deliveries_owner_admin_eligible_driver" on public.business_delivery_requests;
drop policy if exists "business_deliveries_participants_read" on public.business_delivery_requests;
create policy "business_deliveries_participants_read"
on public.business_delivery_requests for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1 from public.business_accounts business
    where business.id = business_id and business.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.drivers driver
    where driver.user_id = auth.uid()
      and (
        driver.id = accepted_driver_id
        or (status = 'searching' and public.can_driver_receive_requests(driver.id))
      )
  )
);

drop policy if exists "business_deliveries_owner_insert" on public.business_delivery_requests;
create policy "business_deliveries_owner_insert"
on public.business_delivery_requests for insert to authenticated
with check (
  status = 'searching'
  and accepted_driver_id is null
  and exists (
    select 1 from public.business_accounts business
    where business.id = business_id
      and business.owner_id = auth.uid()
      and business.status = 'approved'
  )
);

drop policy if exists "business_deliveries_admin_update" on public.business_delivery_requests;
create policy "business_deliveries_admin_update"
on public.business_delivery_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists idx_business_deliveries_assigned_status
on public.business_delivery_requests (accepted_driver_id, status, created_at desc);
