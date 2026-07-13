-- Keep an explicit heartbeat timestamp for live driver location records.

alter table public.driver_locations
  add column if not exists last_seen_at timestamptz not null default now();

update public.driver_locations
set last_seen_at = coalesce(updated_at, now());

create or replace function public.touch_driver_location_seen_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.last_seen_at = now();
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_driver_location_seen_at_before_write on public.driver_locations;
create trigger touch_driver_location_seen_at_before_write
before insert or update on public.driver_locations
for each row execute function public.touch_driver_location_seen_at();

create index if not exists idx_driver_locations_online_seen
on public.driver_locations (is_online, last_seen_at desc);
