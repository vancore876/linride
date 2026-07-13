-- Participant-only trip chat, WebRTC signaling, and browser push subscriptions.

create table if not exists public.trip_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.trip_call_signals (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null,
  trip_id uuid not null references public.trips(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer','answer','ice','decline','hangup')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint trip_call_signals_payload_size check (octet_length(payload::text) <= 32768)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_notification_events (
  event_key text primary key,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_trip_messages_trip_created
on public.trip_messages (trip_id, created_at);

create index if not exists idx_trip_call_signals_trip_created
on public.trip_call_signals (trip_id, created_at);

create index if not exists idx_trip_call_signals_recipient_created
on public.trip_call_signals (recipient_id, created_at);

create index if not exists idx_trip_call_signals_call
on public.trip_call_signals (call_id, created_at);

create index if not exists idx_push_subscriptions_user
on public.push_subscriptions (user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'trip_call_signals_payload_size'
  ) then
    alter table public.trip_call_signals
      add constraint trip_call_signals_payload_size check (octet_length(payload::text) <= 32768);
  end if;
end $$;

create or replace function public.is_trip_participant(p_trip_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.trips trip
    join public.drivers driver on driver.id = trip.driver_id
    where trip.id = p_trip_id
      and (trip.rider_id = p_user_id or driver.user_id = p_user_id)
      and (p_user_id = auth.uid() or public.is_admin())
  );
$$;

create or replace function public.trip_other_participant(p_trip_id uuid, p_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when trip.rider_id = p_user_id then driver.user_id
    when driver.user_id = p_user_id then trip.rider_id
    else null
  end
  from public.trips trip
  join public.drivers driver on driver.id = trip.driver_id
  where trip.id = p_trip_id
    and (p_user_id = auth.uid() or public.is_admin());
$$;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to enable phone alerts'; end if;
  if nullif(trim(p_endpoint), '') is null
     or nullif(trim(p_p256dh), '') is null
     or nullif(trim(p_auth), '') is null then
    raise exception 'Invalid phone notification subscription';
  end if;
  if char_length(p_endpoint) > 4096 or char_length(p_p256dh) > 1024 or char_length(p_auth) > 1024 then
    raise exception 'Phone notification subscription is too large';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), trim(p_endpoint), trim(p_p256dh), trim(p_auth), left(p_user_agent, 500))
  on conflict (endpoint) do update
  set user_id = auth.uid(),
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.push_subscriptions
  where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.is_trip_participant(uuid, uuid) from public;
revoke all on function public.trip_other_participant(uuid, uuid) from public;
revoke all on function public.register_push_subscription(text, text, text, text) from public;
revoke all on function public.unregister_push_subscription(text) from public;
grant execute on function public.is_trip_participant(uuid, uuid) to authenticated;
grant execute on function public.trip_other_participant(uuid, uuid) to authenticated;
grant execute on function public.register_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.unregister_push_subscription(text) to authenticated;

alter table public.trip_messages enable row level security;
alter table public.trip_call_signals enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_notification_events enable row level security;

grant select, insert on public.trip_messages to authenticated;
grant select, insert on public.trip_call_signals to authenticated;
grant select, delete on public.push_subscriptions to authenticated;

drop policy if exists "trip_messages_participants_read" on public.trip_messages;
create policy "trip_messages_participants_read"
on public.trip_messages for select to authenticated
using (public.is_trip_participant(trip_id, auth.uid()));

drop policy if exists "trip_messages_participants_insert" on public.trip_messages;
create policy "trip_messages_participants_insert"
on public.trip_messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and public.is_trip_participant(trip_id, auth.uid())
  and exists (
    select 1 from public.trips trip
    where trip.id = trip_id
      and trip.status in ('accepted','driver_arriving','arrived','in_progress')
  )
);

drop policy if exists "trip_call_signals_participants_read" on public.trip_call_signals;
create policy "trip_call_signals_participants_read"
on public.trip_call_signals for select to authenticated
using (public.is_trip_participant(trip_id, auth.uid()));

drop policy if exists "trip_call_signals_participants_insert" on public.trip_call_signals;
create policy "trip_call_signals_participants_insert"
on public.trip_call_signals for insert to authenticated
with check (
  sender_id = auth.uid()
  and recipient_id = public.trip_other_participant(trip_id, auth.uid())
  and exists (
    select 1 from public.trips trip
    where trip.id = trip_id
      and trip.status in ('accepted','driver_arriving','arrived','in_progress')
  )
);

drop policy if exists "push_subscriptions_owner_read" on public.push_subscriptions;
create policy "push_subscriptions_owner_read"
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

drop policy if exists "push_subscriptions_owner_delete" on public.push_subscriptions;
create policy "push_subscriptions_owner_delete"
on public.push_subscriptions for delete to authenticated
using (user_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_messages'
  ) then
    alter publication supabase_realtime add table public.trip_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trip_call_signals'
  ) then
    alter publication supabase_realtime add table public.trip_call_signals;
  end if;
end $$;
