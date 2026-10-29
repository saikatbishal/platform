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
  -- A day of slack, not a bug. `current_date` is the server's date, and the
  -- server runs in UTC: from 00:00 to 05:30 IST it is still yesterday there,
  -- so a bare `<= current_date` rejected every journey logged for "today" in
  -- that window. The form's own `max` enforces the real bound in the user's
  -- timezone; this is only the backstop against dates that are plainly wrong.
  constraint not_in_the_future  check (travelled_on <= current_date + 1)
);

-- `create table if not exists` leaves an existing table's constraints alone,
-- so a database created before the change above needs it applied here too.
alter table journeys drop constraint if exists not_in_the_future;
alter table journeys add  constraint not_in_the_future check (travelled_on <= current_date + 1);

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

-- ── Trips ──────────────────────────────────────────────────────────────────
-- docs/features/trips/prd.md. Run this block before deploying a build that
-- has trips: until `journeys.trip_id` exists, a journey saved into a trip is
-- refused (it stays pending on the device and is re-sent — nothing is lost),
-- and the trips list cannot be read.
--
-- Only what the person typed is stored. Dates, kilometres and states are
-- derived from the journeys, like every other figure here. A trip with no
-- journeys is allowed: trips are made before the travel as often as after.

create table if not exists trips (
  id          uuid primary key,              -- minted on the device, like journey ids
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  note        text,
  created_at  timestamptz not null default now(),
  -- The target of the composite foreign key below.
  unique (id, user_id)
);

alter table trips enable row level security;

drop policy if exists "own trips only" on trips;
create policy "own trips only" on trips
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table journeys add column if not exists trip_id uuid;

-- Composite, so a journey can only ever point at a trip of the same person:
-- row-level security stops reading someone else's trip, and this stops
-- writing into one. `on delete set null (trip_id)` (Postgres 15+) is the line
-- that matters most — deleting a trip clears trip_id and nothing else, so the
-- journeys stay, unsorted, and the map does not change. A plain `set null`
-- would try to null user_id too and fail the not-null.
alter table journeys drop constraint if exists journeys_trip_fk;
alter table journeys add constraint journeys_trip_fk
  foreign key (trip_id, user_id) references trips (id, user_id)
  on delete set null (trip_id);

create index if not exists journeys_trip_idx
  on journeys (trip_id) where trip_id is not null;
