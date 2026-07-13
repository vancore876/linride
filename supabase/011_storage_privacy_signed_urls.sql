-- Make driver verification, payment proof, and trip proof files private.
-- New uploads store object paths; the app creates short-lived signed URLs for authorized previews.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('driver-documents', 'driver-documents', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('driver-payment-proofs', 'driver-payment-proofs', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('trip-proof-photos', 'trip-proof-photos', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "driver_document_uploads" on storage.objects;
drop policy if exists "driver_documents_owner_read" on storage.objects;
create policy "driver_documents_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'driver-documents'
  and (
    public.is_admin()
    or exists (
      select 1 from public.drivers d
      where d.id::text = (storage.foldername(name))[1]
        and d.user_id = auth.uid()
    )
  )
);

drop policy if exists "driver_documents_owner_insert" on storage.objects;
create policy "driver_documents_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-documents'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
);

drop policy if exists "driver_documents_owner_update" on storage.objects;
create policy "driver_documents_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-documents'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'driver-documents'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
);

drop policy if exists "driver_documents_owner_delete" on storage.objects;
create policy "driver_documents_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-documents'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
);

drop policy if exists "driver_payment_proofs_owner_read" on storage.objects;
create policy "driver_payment_proofs_owner_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'driver-payment-proofs'
  and (
    public.is_admin()
    or exists (
      select 1 from public.drivers d
      where d.id::text = (storage.foldername(name))[1]
        and d.user_id = auth.uid()
    )
  )
);

drop policy if exists "driver_payment_proofs_owner_insert" on storage.objects;
create policy "driver_payment_proofs_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'driver-payment-proofs'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
);

drop policy if exists "driver_payment_proofs_owner_update" on storage.objects;
create policy "driver_payment_proofs_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'driver-payment-proofs'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'driver-payment-proofs'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
);

drop policy if exists "driver_payment_proofs_owner_delete" on storage.objects;
create policy "driver_payment_proofs_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'driver-payment-proofs'
  and exists (
    select 1 from public.drivers d
    where d.id::text = (storage.foldername(name))[1]
      and d.user_id = auth.uid()
  )
);

drop policy if exists "trip_proof_participant_read" on storage.objects;
create policy "trip_proof_participant_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'trip-proof-photos'
  and (
    public.is_admin()
    or exists (
      select 1 from public.trips t
      left join public.drivers d on d.id = t.driver_id
      where t.id::text = (storage.foldername(name))[1]
        and (t.rider_id = auth.uid() or d.user_id = auth.uid())
    )
    or exists (
      select 1 from public.business_delivery_requests delivery
      join public.business_accounts business on business.id = delivery.business_id
      left join public.drivers driver on driver.id = delivery.accepted_driver_id
      where ('business-' || delivery.id::text) = (storage.foldername(name))[1]
        and (business.owner_id = auth.uid() or driver.user_id = auth.uid())
    )
  )
);

drop policy if exists "trip_proof_driver_insert" on storage.objects;
create policy "trip_proof_driver_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trip-proof-photos'
  and (
    exists (
      select 1 from public.trips t
      join public.drivers d on d.id = t.driver_id
      where t.id::text = (storage.foldername(name))[1]
        and d.user_id = auth.uid()
    )
    or exists (
      select 1 from public.business_delivery_requests delivery
      join public.drivers driver on driver.id = delivery.accepted_driver_id
      where ('business-' || delivery.id::text) = (storage.foldername(name))[1]
        and driver.user_id = auth.uid()
    )
  )
);

drop policy if exists "trip_proof_uploader_delete" on storage.objects;
create policy "trip_proof_uploader_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trip-proof-photos'
  and owner_id = auth.uid()::text
);
