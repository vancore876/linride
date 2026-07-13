-- Required profile photos, Google Form verification state, and ride participant visibility.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do update set public = excluded.public;

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

create or replace function public.can_view_ride_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_profile_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.drivers viewer
      join public.ride_requests request on request.rider_id = p_profile_id
      where viewer.user_id = auth.uid()
        and request.status in ('pending', 'countered', 'accepted')
        and public.can_driver_receive_requests(viewer.id)
    )
    or exists (
      select 1
      from public.drivers offered_driver
      join public.driver_offers offer on offer.driver_id = offered_driver.id
      join public.ride_requests request on request.id = offer.ride_request_id
      where offered_driver.user_id = p_profile_id
        and request.rider_id = auth.uid()
    )
    or exists (
      select 1
      from public.drivers trip_driver
      join public.trips trip on trip.driver_id = trip_driver.id
      where trip_driver.user_id = p_profile_id
        and trip.rider_id = auth.uid()
        and trip.status in ('accepted', 'arriving', 'in_progress')
    );
$$;

drop policy if exists "profiles_ride_participants_read" on public.profiles;
create policy "profiles_ride_participants_read"
on public.profiles for select to authenticated
using (public.can_view_ride_profile(id));

drop policy if exists "drivers_offer_visible_to_rider" on public.drivers;
create policy "drivers_offer_visible_to_rider"
on public.drivers for select to authenticated
using (
  exists (
    select 1
    from public.driver_offers offer
    join public.ride_requests request on request.id = offer.ride_request_id
    where offer.driver_id = drivers.id
      and request.rider_id = auth.uid()
  )
  or exists (
    select 1
    from public.trips trip
    where trip.driver_id = drivers.id
      and trip.rider_id = auth.uid()
      and trip.status in ('accepted', 'arriving', 'in_progress')
  )
);

create or replace function public.can_driver_accept_request(p_driver_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = d.user_id
    where d.id = p_driver_id
      and d.status = 'approved'
      and d.documents_status = 'approved'
      and nullif(trim(p.avatar_url), '') is not null
      and public.has_active_driver_subscription(p_driver_id)
  );
$$;

create or replace function public.prevent_ride_request_without_photo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = new.rider_id
      and nullif(trim(p.avatar_url), '') is not null
  ) then
    raise exception 'Add a profile picture before requesting a driver';
  end if;
  return new;
end;
$$;

drop trigger if exists require_rider_profile_photo on public.ride_requests;
create trigger require_rider_profile_photo
before insert on public.ride_requests
for each row execute function public.prevent_ride_request_without_photo();
