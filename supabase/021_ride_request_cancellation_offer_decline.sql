-- Persist passenger cancellation and individual offer rejection before a trip exists.

alter table public.ride_requests
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text;

create or replace function public.cancel_ride_request(
  p_request_id uuid,
  p_reason text default null
)
returns public.ride_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.ride_requests%rowtype;
begin
  select * into v_request
  from public.ride_requests
  where id = p_request_id
  for update;

  if v_request.id is null then raise exception 'Ride request not found'; end if;
  if v_request.rider_id <> auth.uid() and not public.is_admin() then
    raise exception 'You cannot cancel this ride request';
  end if;
  if v_request.status not in ('pending','requested','offered','countered') then
    raise exception 'This ride request can no longer be cancelled';
  end if;

  update public.driver_offers
  set status = 'rejected'
  where ride_request_id = p_request_id and status = 'pending';

  update public.ride_requests
  set status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, now()),
      cancellation_reason = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

create or replace function public.decline_driver_offer(p_offer_id uuid)
returns public.driver_offers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.driver_offers%rowtype;
  v_rider_id uuid;
begin
  select offer.* into v_offer
  from public.driver_offers offer
  where offer.id = p_offer_id
  for update of offer;

  if v_offer.id is null then raise exception 'Driver offer not found'; end if;
  select rider_id into v_rider_id
  from public.ride_requests
  where id = v_offer.ride_request_id;
  if v_rider_id <> auth.uid() and not public.is_admin() then
    raise exception 'You cannot decline this driver offer';
  end if;
  if v_offer.status <> 'pending' then raise exception 'This driver offer is no longer available'; end if;

  update public.driver_offers
  set status = 'rejected'
  where id = p_offer_id
  returning * into v_offer;

  return v_offer;
end;
$$;

revoke all on function public.cancel_ride_request(uuid, text) from public;
revoke all on function public.decline_driver_offer(uuid) from public;
grant execute on function public.cancel_ride_request(uuid, text) to authenticated;
grant execute on function public.decline_driver_offer(uuid) to authenticated;
