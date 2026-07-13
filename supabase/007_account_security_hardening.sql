-- Prevent account owners from self-approving roles, driver documents, or weekly payments.

drop policy if exists "profiles_owner_or_admin" on public.profiles;
drop policy if exists "profiles_select_owner_or_admin" on public.profiles;
create policy "profiles_select_owner_or_admin"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_owner_non_admin" on public.profiles;
create policy "profiles_insert_owner_non_admin"
on public.profiles for insert
with check (id = auth.uid() and role <> 'admin');

drop policy if exists "profiles_update_owner_or_admin" on public.profiles;
create policy "profiles_update_owner_or_admin"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then return new; end if;
  if tg_op = 'INSERT' and new.role = 'admin' and not public.is_admin() then
    raise exception 'Admin accounts must be promoted by an existing admin';
  end if;
  if tg_op = 'UPDATE' and new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only an admin can change account roles';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role_fields on public.profiles;
create trigger protect_profile_role_fields
before insert or update on public.profiles
for each row execute function public.protect_profile_role();

create or replace function public.protect_driver_approval_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then return new; end if;
  if public.is_admin() then return new; end if;

  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.status := 'pending';
    new.documents_status := 'missing';
    new.documents_rejection_reason := null;
    new.documents_approved_at := null;
    new.documents_approved_by := null;
    new.approved_at := null;
    new.is_courier_approved := false;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.status is distinct from old.status
     or (
       new.documents_status is distinct from old.documents_status
       and not (new.documents_status = 'pending' and old.documents_status in ('missing', 'rejected'))
     )
     or new.documents_rejection_reason is distinct from old.documents_rejection_reason
     or new.documents_approved_at is distinct from old.documents_approved_at
     or new.documents_approved_by is distinct from old.documents_approved_by
     or new.approved_at is distinct from old.approved_at
     or new.is_courier_approved is distinct from old.is_courier_approved then
    raise exception 'Only an admin can change driver approval fields';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_driver_approval_fields on public.drivers;
create trigger protect_driver_approval_fields
before insert or update on public.drivers
for each row execute function public.protect_driver_approval_fields();

drop policy if exists "driver_documents_owner_or_admin" on public.driver_documents;
drop policy if exists "driver_documents_select_owner_or_admin" on public.driver_documents;
create policy "driver_documents_select_owner_or_admin"
on public.driver_documents for select
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_documents_insert_owner" on public.driver_documents;
create policy "driver_documents_insert_owner"
on public.driver_documents for insert
with check (
  status = 'pending'
  and exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_documents_admin_update" on public.driver_documents;
create policy "driver_documents_admin_update"
on public.driver_documents for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "driver_payments_owner_or_admin" on public.driver_subscription_payments;
drop policy if exists "driver_payments_select_owner_or_admin" on public.driver_subscription_payments;
create policy "driver_payments_select_owner_or_admin"
on public.driver_subscription_payments for select
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_payments_insert_owner" on public.driver_subscription_payments;
create policy "driver_payments_insert_owner"
on public.driver_subscription_payments for insert
with check (
  status = 'pending'
  and amount_jmd = 2000
  and exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_payments_admin_update" on public.driver_subscription_payments;
create policy "driver_payments_admin_update"
on public.driver_subscription_payments for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "driver_subscriptions_select_owner_or_admin" on public.driver_subscriptions;
create policy "driver_subscriptions_select_owner_or_admin"
on public.driver_subscriptions for select
using (
  public.is_admin()
  or exists (select 1 from public.drivers d where d.id = driver_id and d.user_id = auth.uid())
);

drop policy if exists "driver_subscriptions_admin_write" on public.driver_subscriptions;
create policy "driver_subscriptions_admin_write"
on public.driver_subscriptions for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "business_accounts_owner_or_admin" on public.business_accounts;
drop policy if exists "business_accounts_select_owner_or_admin" on public.business_accounts;
create policy "business_accounts_select_owner_or_admin"
on public.business_accounts for select
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists "business_accounts_insert_owner" on public.business_accounts;
create policy "business_accounts_insert_owner"
on public.business_accounts for insert
with check (owner_id = auth.uid() and status = 'pending');

drop policy if exists "business_accounts_admin_update" on public.business_accounts;
create policy "business_accounts_admin_update"
on public.business_accounts for update
using (public.is_admin())
with check (public.is_admin());
