-- Platform — database schema
-- Paste into the Supabase SQL editor, or: supabase db push
--
-- Stations do NOT live here. They ship with the app as a static JSON file
-- (public/data/stations.json, 0.78 MB) so search has no network round-trip
-- and feels instant. Only what belongs to a user is in the database.

create table if not exists journeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  from_code     text not null,          -- 'HWH'
  to_code       text not null,          -- 'KPD'
  travelled_on  date not null,          -- a journey is a day, not a timestamp

  -- Free text on purpose. The schedule dataset is several years old, so a
  -- strict foreign key or dropdown would reject real trains.
  train_number  text,
  note          text,

  -- Great-circle km, computed on write. Undercounts because track curves;
  -- the UI labels it "as the crow flies" rather than hiding the approximation.
  distance_km   numeric(8,2),

  -- Departure and arrival times (HH:MM format), optional and independent.
  -- Real arrival time, not from schedule — captures delays.
  departure_time text,
  arrival_time   text,
  -- 0 = arrived same day, 1 = next day, etc. Meaningless without arrival_time.
  arrival_day_offset integer default 0,

  created_at    timestamptz not null default now(),

  constraint different_stations check (from_code <> to_code),
  constraint not_in_the_future  check (travelled_on <= current_date)
);

create index if not exists journeys_user_date_idx
  on journeys (user_id, travelled_on desc);

-- Row-level security, not application-side filtering. The database refuses to
-- hand over another user's journeys even if a query in the frontend is wrong,
-- which is what stops a UI bug becoming a data leak.
alter table journeys enable row level security;

drop policy if exists "own journeys only" on journeys;
create policy "own journeys only" on journeys
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Stats are DERIVED, never stored. A stored counter is a thing that can
-- silently go wrong, and at fewer than a thousand rows per user there is
-- nothing to gain by risking it.
create or replace view journey_stats
with (security_invoker = true) as
select
  user_id,
  count(*)                                  as journey_count,
  coalesce(sum(distance_km), 0)::numeric    as total_km,
  coalesce(max(distance_km), 0)::numeric    as longest_km,
  min(travelled_on)                         as first_journey,
  max(travelled_on)                         as latest_journey
from journeys
group by user_id;

-- Stations seen and states unlocked are computed in the client, because the
-- station -> state mapping lives in the shipped JSON file rather than here.
