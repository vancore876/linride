-- Include counter-offering drivers in the business owner's public profile visibility.

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
        and request.status in ('pending','requested','offered','countered','accepted')
        and public.can_driver_receive_requests(viewer.id)
    )
    or exists (
      select 1
      from public.drivers offered_driver
      join public.driver_offers offer on offer.driver_id = offered_driver.id
      join public.ride_requests request on request.id = offer.ride_request_id
      where offered_driver.user_id = p_profile_id and request.rider_id = auth.uid()
    )
    or exists (
      select 1
      from public.trips trip
      join public.drivers trip_driver on trip_driver.id = trip.driver_id
      where (
        (trip.rider_id = auth.uid() and trip_driver.user_id = p_profile_id)
        or (trip_driver.user_id = auth.uid() and trip.rider_id = p_profile_id)
      )
      and trip.status in ('accepted','driver_arriving','arrived','in_progress','completed','cancelled')
    )
    or exists (
      select 1
      from public.business_delivery_requests delivery
      join public.business_accounts business on business.id = delivery.business_id
      join public.drivers driver on driver.id = delivery.accepted_driver_id
      where business.owner_id = auth.uid() and driver.user_id = p_profile_id
    )
    or exists (
      select 1
      from public.business_delivery_offers offer
      join public.business_delivery_requests delivery on delivery.id = offer.delivery_id
      join public.business_accounts business on business.id = delivery.business_id
      join public.drivers driver on driver.id = offer.driver_id
      where business.owner_id = auth.uid() and driver.user_id = p_profile_id
    );
$$;

drop policy if exists "drivers_business_delivery_visible" on public.drivers;
create policy "drivers_business_delivery_visible"
on public.drivers for select to authenticated
using (
  exists (
    select 1
    from public.business_delivery_requests delivery
    join public.business_accounts business on business.id = delivery.business_id
    where delivery.accepted_driver_id = drivers.id and business.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.business_delivery_offers offer
    join public.business_delivery_requests delivery on delivery.id = offer.delivery_id
    join public.business_accounts business on business.id = delivery.business_id
    where offer.driver_id = drivers.id and business.owner_id = auth.uid()
  )
);
