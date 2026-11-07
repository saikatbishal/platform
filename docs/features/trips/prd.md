# Trips — PRD

**29 October 2026.** Built on `feat/trip`. The brainstorm is
`docs/13-feature-ideas.md` §2; this is what was built from it and where it
departs. Decisions marked *(author)* were made by the author in the build
conversation.

## 1. Problem

A journey is logged as it happens, one leg at a time. A holiday is four of
them — Chennai to Howrah, Howrah to Delhi, a week in Himachal by road, Delhi
to Sealdah, Howrah to Chennai — and nothing ties them together. People share
and remember holidays, not legs.

## 2. What a trip is

A name the person gives a set of journeys. One journey is in at most one trip
(`Journey.tripId`, nullable). Only `name`, `note` and `createdAt` are stored;
dates, kilometres, states and the journey count are derived from the
journeys, every time.

The name is never checked against the map: a Himachal trip by rail stops in
Delhi, and that is fine.

## 3. Departures from the brainstorm

| Brainstorm | Built | Why |
| --- | --- | --- |
| No empty trips; a trip is made by its first journey | **Empty trips are allowed** and are a designed state *(author)* | Trips are made before the travel as often as after: "Himachal trip" exists the day it is planned and the legs log into it as they happen, or it is made at the end from legs already logged |
| A trip whose last journey is deleted is deleted | The trip stays, empty | Follows from the above |
| "A few days" for chaining and the preselect | **14 days** *(author)* | A week at the far end of a trip has to fit |
| Chain on exact station codes | Stations within **25 km** are one place | Arrive at Howrah, leave from Sealdah; arrive at New Delhi, leave from Nizamuddin |
| Per-trip rail pass | **Not in this pass** *(author)* | — |
| Quick find for trips | **In** *(author)* | Trip names match first, grouped above journeys; journey rows name their trip |

## 4. Ways in

- **Trips** button in the bottom chrome, beside Milestones and Rail pass —
  shown once there is a journey *or* a trip. A dot on it means a suggestion is
  waiting.
- **New trip** asks for a name (and an optional note). That is all.
- **Add form → Part of a trip** (optional, below the date). Untouched, it
  starts on the trip the evidence points to and says why underneath:
  inside a trip's dates; carrying on from its last leg (within 14 days and
  leaving from the same place); the leg before its first (arriving where it
  began); or an empty trip made within 14 days of this date. "New trip…"
  names one inline. `src/features/trips/trips.ts`, `defaultTripFor`.
- **A trip's panel → Log a journey into it** opens the add form with the trip
  chosen; **Add journeys already logged** opens a picker over the whole log —
  journeys in no trip first, then ones in another trip, which say which trip
  they would leave.
- **A journey's card → Part of a trip** moves it in, out, or into a new trip.
- **Suggestion**: chains of journeys in no trip, each leaving from where the
  last arrived, within 14 days — a side trip is skipped rather than allowed to
  cut the chain short. Offered at the top of the Trips list with a name field;
  never applied. "Not a trip" is remembered on the device until the chain
  grows a leg.

## 5. On the map

Opening a trip is a **lens**: its routes stay as they are, every other route
drops to `--route-idle`, the other ends dim, and the map frames the trip once.
No colour per trip. The panel sits at the bottom of a phone and the
bottom-right from `sm` up, with no scrim, because the map is the point.
Totals, milestones and the main map count every journey regardless of trips.

## 6. Storage and sync

- **Local**: `platform.trips.v1.<userId|anon>`. `tripId` is optional on read;
  journeys stored before trips read as in no trip, no migration.
- **Supabase**: `trips` table and `journeys.trip_id`, in `supabase/schema.sql`.
  The foreign key is composite `(trip_id, user_id)` so a journey can only point
  at its own person's trip, and `on delete set null (trip_id)` (Postgres 15+)
  so deleting a trip never deletes travel.
- **Write-ahead logs**, beside the journeys' pending log, each holding the
  latest intent per id: trips to upsert, trip ids to delete, and saved
  journeys whose trip changed. Cleared only on the server's word.
- **One write queue** for every server write. A journey logged into a trip
  made a moment earlier must not reach the server first, or the foreign key
  refuses it. Sync sends trips, then journeys, then trip changes, then deletes.
- A journey's trip change is its **own update call**. The save is an upsert
  that ignores existing rows — right for a retried insert, and it would
  silently keep the old trip.
- **Sign-in merge**: signed-out trips move over by id, never matched by name.
  A journey on both sides where only the signed-out copy is in a trip: the
  account copy adopts it (`mergeJourneys`, checked in `scripts/check-merge.ts`).
- **A failed send says so.** A trip save, a move into or out of a trip, or a
  trip delete that the server refuses raises a message naming it, saying it is
  kept on the device, with **Try again**. "Send now" (and Try again) report
  what the whole run could not send — journeys included, since it is one
  button. Runs that start on their own (load, back online) stay quiet and
  leave the banner to say what is unsent, or a tunnel would raise a message at
  every reconnect. All of these share one message id, so they replace rather
  than stack, and the message is taken down once a later run confirms
  everything.
- Until the migration is run, journeys in no trip save exactly as before
  (`trip_id` is only sent when set); one in a trip stays pending and is
  re-sent; the trips list says it could not be read.

## 7. Checks

- `node scripts/check-trips.ts` — the preselect, the suggestion, ordering,
  same-place, quick find, the author's Himachal example.
- `node scripts/check-merge.ts` — the adopt rule, through `mergeJourneys` and
  `planSync`.

## 8. Not done

- Per-trip rail pass.
- Nested trips; a journey in two trips.
- Planned trips with stored future dates (the schema refuses future
  journeys; an empty trip with a name covers "I'm going to Himachal").
- Two devices editing the same trip at once: last write wins per field set.
