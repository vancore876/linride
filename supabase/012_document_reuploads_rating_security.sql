-- Keep driver re-uploads reviewable and make trip ratings tamper resistant.

alter table public.driver_documents
  add column if not exists is_current boolean not null default true;

with ranked_documents as (
  select id,
         row_number() over (
           partition by driver_id, document_type
           order by uploaded_at desc, id desc
         ) as position
  from public.driver_documents
  where is_current = true
)
update public.driver_documents document
set is_current = false
from ranked_documents ranked
where document.id = ranked.id and ranked.position > 1;

create unique index if not exists idx_driver_documents_current_type_unique
on public.driver_documents (driver_id, document_type)
where is_current = true;

create or replace function public.register_driver_document(
  p_driver_id uuid,
  p_document_type text,
  p_storage_path text
)
returns public.driver_documents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.driver_documents%rowtype;
begin
  if p_document_type not in ('driver_photo','driver_license','vehicle_photo','vehicle_documents','insurance') then
    raise exception 'Choose a valid driver document';
  end if;
  if not exists (select 1 from public.drivers where id = p_driver_id and user_id = auth.uid()) then
    raise exception 'You cannot upload for this driver';
  end if;

  update public.driver_documents
  set is_current = false
  where driver_id = p_driver_id
    and document_type = p_document_type
    and is_current = true;

  insert into public.driver_documents (
    driver_id, document_type, file_url, status, is_current
  ) values (
    p_driver_id, p_document_type, p_storage_path, 'pending', true
  ) returning * into v_document;

  update public.drivers
  set documents_status = 'pending',
      documents_submitted_at = now(),
      documents_rejection_reason = null
  where id = p_driver_id;

  return v_document;
end;
$$;

revoke all on function public.register_driver_document(uuid, text, text) from public;
grant execute on function public.register_driver_document(uuid, text, text) to authenticated;

create or replace function public.validate_trip_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trips%rowtype;
  v_driver_user_id uuid;
begin
  if new.trip_id is null then
    return new;
  end if;

  select * into v_trip from public.trips where id = new.trip_id;
  if v_trip.id is null or v_trip.status <> 'completed' then
    raise exception 'Ratings are available after a completed trip';
  end if;

  select user_id into v_driver_user_id
  from public.drivers
  where id = v_trip.driver_id;

  if auth.uid() is distinct from new.reviewer_id and not public.is_admin() then
    raise exception 'You can only submit your own rating';
  end if;

  if new.reviewer_id = v_trip.rider_id then
    new.reviewed_user_id := v_driver_user_id;
  elsif new.reviewer_id = v_driver_user_id then
    new.reviewed_user_id := v_trip.rider_id;
  else
    raise exception 'Only trip participants can submit a rating';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_trip_rating_before_write on public.ratings;
create trigger validate_trip_rating_before_write
before insert or update on public.ratings
for each row execute function public.validate_trip_rating();
