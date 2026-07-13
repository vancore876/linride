-- Remove circular driver visibility checks from Storage RLS and support profile-photo cleanup.

create or replace function public.can_view_driver_as_participant(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.driver_offers offer
      join public.ride_requests request on request.id = offer.ride_request_id
      where offer.driver_id = p_driver_id
        and request.rider_id = auth.uid()
    )
    or exists (
      select 1
      from public.trips trip
      where trip.driver_id = p_driver_id
        and trip.rider_id = auth.uid()
        and trip.status in ('accepted','driver_arriving','arrived','in_progress','completed','cancelled')
    )
    or exists (
      select 1
      from public.business_delivery_requests delivery
      join public.business_accounts business on business.id = delivery.business_id
      where delivery.accepted_driver_id = p_driver_id
        and business.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_delivery_offers offer
      join public.business_delivery_requests delivery on delivery.id = offer.delivery_id
      join public.business_accounts business on business.id = delivery.business_id
      where offer.driver_id = p_driver_id
        and business.owner_id = auth.uid()
    );
$$;

revoke all on function public.can_view_driver_as_participant(uuid) from public;
grant execute on function public.can_view_driver_as_participant(uuid) to authenticated;

drop policy if exists "drivers_offer_visible_to_rider" on public.drivers;
drop policy if exists "drivers_business_delivery_visible" on public.drivers;
drop policy if exists "drivers_participant_read" on public.drivers;
create policy "drivers_participant_read"
on public.drivers for select to authenticated
using (public.can_view_driver_as_participant(id));

create or replace function public.is_driver_storage_owner(p_driver_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.drivers driver
    where driver.id::text = p_driver_id
      and driver.user_id = auth.uid()
  );
$$;

create or replace function public.can_read_driver_storage(p_driver_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() or exists (
    select 1
    from public.drivers driver
    where driver.id::text = p_driver_id
      and driver.user_id = auth.uid()
  );
$$;

create or replace function public.can_read_trip_proof_storage(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.trips trip
      left join public.drivers driver on driver.id = trip.driver_id
      where trip.id::text = p_folder
        and (trip.rider_id = auth.uid() or driver.user_id = auth.uid())
    )
    or exists (
      select 1
      from public.business_delivery_requests delivery
      join public.business_accounts business on business.id = delivery.business_id
      left join public.drivers driver on driver.id = delivery.accepted_driver_id
      where 'business-' || delivery.id::text = p_folder
        and (business.owner_id = auth.uid() or driver.user_id = auth.uid())
    );
$$;

create or replace function public.can_upload_trip_proof_storage(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1
      from public.trips trip
      join public.drivers driver on driver.id = trip.driver_id
      where trip.id::text = p_folder
        and driver.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.business_delivery_requests delivery
      join public.drivers driver on driver.id = delivery.accepted_driver_id
      where 'business-' || delivery.id::text = p_folder
        and driver.user_id = auth.uid()
    );
$$;

revoke all on function public.is_driver_storage_owner(text) from public;
revoke all on function public.can_read_driver_storage(text) from public;
revoke all on function public.can_read_trip_proof_storage(text) from public;
revoke all on function public.can_upload_trip_proof_storage(text) from public;
grant execute on function public.is_driver_storage_owner(text) to authenticated;
grant execute on function public.can_read_driver_storage(text) to authenticated;
grant execute on function public.can_read_trip_proof_storage(text) to authenticated;
grant execute on function public.can_upload_trip_proof_storage(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_photos_public_read" on storage.objects;
create policy "profile_photos_public_read"
on storage.objects for select
using (bucket_id = 'profile-photos');

drop policy if exists "profile_photos_owner_insert" on storage.objects;
create policy "profile_photos_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_photos_owner_update" on storage.objects;
create policy "profile_photos_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "profile_photos_owner_delete" on storage.objects;
create policy "profile_photos_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "driver_documents_owner_read" on storage.objects;
create policy "driver_documents_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'driver-documents'
  and public.can_read_driver_storage((storage.foldername(name))[1])
);

drop policy if exists "driver_documents_owner_insert" on storage.objects;
create policy "driver_documents_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-documents'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
);

drop policy if exists "driver_documents_owner_update" on storage.objects;
create policy "driver_documents_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-documents'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
)
with check (
  bucket_id = 'driver-documents'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
);

drop policy if exists "driver_documents_owner_delete" on storage.objects;
create policy "driver_documents_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-documents'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
);

drop policy if exists "driver_payment_proofs_owner_read" on storage.objects;
create policy "driver_payment_proofs_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'driver-payment-proofs'
  and public.can_read_driver_storage((storage.foldername(name))[1])
);

drop policy if exists "driver_payment_proofs_owner_insert" on storage.objects;
create policy "driver_payment_proofs_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-payment-proofs'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
);

drop policy if exists "driver_payment_proofs_owner_update" on storage.objects;
create policy "driver_payment_proofs_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-payment-proofs'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
)
with check (
  bucket_id = 'driver-payment-proofs'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
);

drop policy if exists "driver_payment_proofs_owner_delete" on storage.objects;
create policy "driver_payment_proofs_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-payment-proofs'
  and public.is_driver_storage_owner((storage.foldername(name))[1])
);

drop policy if exists "trip_proof_participant_read" on storage.objects;
create policy "trip_proof_participant_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'trip-proof-photos'
  and public.can_read_trip_proof_storage((storage.foldername(name))[1])
);

drop policy if exists "trip_proof_driver_insert" on storage.objects;
create policy "trip_proof_driver_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trip-proof-photos'
  and public.can_upload_trip_proof_storage((storage.foldername(name))[1])
);

drop policy if exists "trip_proof_uploader_delete" on storage.objects;
create policy "trip_proof_uploader_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trip-proof-photos'
  and owner_id = auth.uid()::text
);
