-- Preserve country-area trip choices on each passenger request.

alter table public.ride_requests
  add column if not exists return_trip boolean not null default false,
  add column if not exists extra_stop boolean not null default false;

create index if not exists idx_ride_requests_scheduled_status
on public.ride_requests (scheduled_time, status)
where scheduled_time is not null;
