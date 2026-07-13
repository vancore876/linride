-- Let a business owner accept one driver counter offer atomically.

create or replace function public.accept_business_delivery_offer(p_offer_id uuid)
returns public.business_delivery_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_offer public.business_delivery_offers%rowtype;
  v_delivery public.business_delivery_requests%rowtype;
begin
  select * into v_offer
  from public.business_delivery_offers
  where id = p_offer_id and status = 'pending'
  for update;
  if v_offer.id is null or v_offer.offer_type <> 'counter' then raise exception 'Offer is no longer available'; end if;

  select * into v_delivery
  from public.business_delivery_requests
  where id = v_offer.delivery_id
  for update;
  if v_delivery.id is null or v_delivery.status <> 'searching' then raise exception 'Request already accepted by another driver'; end if;
  if not exists (
    select 1 from public.business_accounts business
    where business.id = v_delivery.business_id and business.owner_id = auth.uid()
  ) then raise exception 'Offer is not available to this business'; end if;
  if not public.can_driver_receive_requests(v_offer.driver_id) then raise exception 'The selected driver is no longer available'; end if;

  update public.business_delivery_offers
  set status = case when id = v_offer.id then 'accepted' else 'rejected' end
  where delivery_id = v_offer.delivery_id and status = 'pending';

  update public.business_delivery_requests
  set status = 'accepted',
      accepted_driver_id = v_offer.driver_id,
      delivery_offer_jmd = coalesce(v_offer.fare_jmd, delivery_offer_jmd),
      accepted_at = now()
  where id = v_delivery.id
  returning * into v_delivery;
  return v_delivery;
end;
$$;

revoke all on function public.accept_business_delivery_offer(uuid) from public;
grant execute on function public.accept_business_delivery_offer(uuid) to authenticated;
