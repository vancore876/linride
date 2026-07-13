-- Record completed business deliveries in driver history without mixing them with passenger points.

alter table public.driver_earnings
  add column if not exists business_delivery_id uuid references public.business_delivery_requests(id) on delete set null;

create unique index if not exists idx_driver_earnings_business_delivery_unique
on public.driver_earnings (business_delivery_id)
where business_delivery_id is not null;

create or replace function public.record_business_delivery_earning()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered'
     and old.status is distinct from 'delivered'
     and new.accepted_driver_id is not null then
    insert into public.driver_earnings (
      driver_id, business_delivery_id, amount_jmd, earning_type
    ) values (
      new.accepted_driver_id, new.id, coalesce(new.delivery_offer_jmd, 0), 'business_delivery'
    )
    on conflict (business_delivery_id) where business_delivery_id is not null do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists record_business_delivery_earning_after_update on public.business_delivery_requests;
create trigger record_business_delivery_earning_after_update
after update on public.business_delivery_requests
for each row execute function public.record_business_delivery_earning();
