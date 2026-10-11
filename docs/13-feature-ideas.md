---
tags: [project, rail-passport, feature-ideas, product-sense]
date: 2026-10-05
status: brainstorm — nothing here is decided
---

# Platform — Feature Ideas: Admin Panel, Trips and Insights

> **One-line purpose:** think three features through to the data model before any code exists — where the writes go, what breaks, what the UI asks of the user — so that whichever one gets built is built once.

**Companions:** [[00 - Decisions]] (where anything here becomes a commitment) · [[05 - Data Pipeline]] (what the admin panel has to write into) · [[11 - Market Research]] (§8, the "jobs nobody serves" test) · [[03 - Rail Passport - Project Spec]] (the scope contract)

---

## How to read this

All three ideas are brainstorms. Each section ends with a **recommendation**, but a
recommendation here is an opinion with reasons, not a decision. Moving one into
`00-decisions.md` is a separate, deliberate step.

The first two were also run against the market-research rule — *look for jobs nobody is
serving, not features everybody has* — and the honest result is mixed:

- **Trips are table stakes.** viaduct filters "by year or specific trips";
  TrainLookout filters "by year, trip". Building them does not differentiate
  Platform. The argument for doing them anyway is cost: a trip is a data-model
  change, and data-model changes get more expensive with every journey stored.
- **The admin panel serves no user directly.** It serves the data, which is the
  moat. Its best feature, below, is turning what users already type into the
  "A train that isn't listed…" field into new trains for everyone.

---

# 1. The admin panel

## 1.1 The actual problem: there is no write path

Train data is not in a database. It is static JSON, produced at build time:

```
datameet CSVs  →  scripts/build-*.ts  →  public/maps/{trainstops,traintimes,station-trains}/…
                   (npm run assets)        public/data/stations.json
                                           ↓
                                    vite build → Vercel → service-worker precache
```

Three properties of that pipeline decide everything below:

1. **It is generated, not stored.** `public/maps/` and `stations.json` are
   gitignored and rebuilt by `npm run assets`. Hand-editing a shard is pointless;
   the next build overwrites it.
2. **A train lives in at least three places.** Its stop list
   (`trainstops/`), its times (`traintimes/`), and an entry in the
   station→train reverse index for *every station it stops at*
   (`station-trains/`, 26 shards). A 30-stop train touches up to 26 files. Any
   design that patches shards one at a time will eventually patch two of three.
3. **The rail graph is derived from timetables.** A new train on new track adds
   edges to the graph routing uses. So adding a train is not only "a new entry
   in a list" — it can change how *other people's* journeys route.

So the question is not "how does the form save". It is: **where does the new
train live so that the next build includes it, and nothing has to patch shards
by hand.**

## 1.2 Three places the write could go

### Option A — commit an override file, rebuild

The admin form writes to `data/overrides/trains.json` in the repo (via an Edge
Function calling the GitHub API, or a GitHub Action — see C). The build scripts
read datameet first, then layer overrides on top, then emit shards exactly as
today. Vercel rebuilds; the service worker picks up new hashes.

- **For:** data stays versioned, diffable, reversible with `git revert`. Static
  stays static — zero runtime cost, offline still works. A datameet refresh
  cannot wipe an addition, because additions never touch the upstream files.
- **Against:** minutes of latency, not seconds. A GitHub token has to live
  somewhere server-side. Every admin edit is a deploy.

### Option B — overlay table, merged at runtime

A `train_overrides` table in Supabase. The client fetches it on load and merges
it into the static shards in memory.

- **For:** instant.
- **Against:** this is where property 2 bites. The client has to patch the
  reverse index for every station on the new train, keep the merge logic in
  three lookups correct forever, and invalidate caches. The graph (property 3)
  would have to be rebuilt in the browser. And there are now two sources of
  truth for "what trains exist", which is the bug factory this project has
  spent most of its effort avoiding.

### Option C — Supabase as the inbox, git as the record *(recommended)*

The admin form writes to a Supabase table — `train_submissions` — guarded by
RLS. A GitHub Action (this repo already runs two, with secrets) reads approved
rows, commits them to `data/overrides/trains.json`, and the push triggers a
normal Vercel build.

```
admin form ──insert──▶ train_submissions (Supabase, RLS: admins only)
                              │  status: draft → approved
                              ▼
               GitHub Action (dispatch or nightly)
                              │  writes data/overrides/trains.json, commits
                              ▼
               Vercel build → npm run assets merges overrides → new shards
```

Why this one: the write is instant and safe (a database row behind RLS), the
publish is boring and reversible (a commit), and the build stays the only thing
that ever produces shards. It reuses everything that already exists — Supabase
auth, RLS, Actions, repository secrets — and adds no new runtime code to the app
users load.

**Things the build step must do with overrides:**

- Override wins over datameet on the same train number, **and logs a warning
  when it does** — a collision means upstream caught up, and the override may
  now be stale.
- Fail the build, not warn, on any stop code missing from `stations.json`.
- Re-derive the rail graph after overrides are merged, never before.

## 1.3 What a "new train" form has to capture

| Field | Why | Validation |
| --- | --- | --- |
| Train number | Identity; how users search | Unique, or explicitly marked as overriding upstream |
| Name | Display | Non-empty |
| Stops, in order | Route and reverse index | Every code exists in `stations.json` |
| Arrival / departure per stop | `traintimes`, the scheduled-times offer | Monotonic once day offset is applied |
| Day offset per stop | Overnight trains | Never decreases along the route |
| Running days | Future "does this run on that date" | At least one day |
| Source / note | Where the admin got it — a press release, IRCTC | Free text, required |

Two checks worth building in from day one:

- **Route preview.** Draw the stop list on the real map inside the form. A
  wrongly-ordered stop is obvious as a zigzag and invisible as a table row.
- **Connectivity warning.** If two consecutive stops have no edge in the current
  graph, say so. Not a block — the train may genuinely run new track — but the
  admin should know they are changing the graph.

## 1.4 Hidden, and actually protected

The requirement is: visible only to specific emails, no link anywhere in the UI,
reachable only by typing the address.

That is a fine **UX** decision and **no security at all**, and the reason is
specific to this project: **the repository is public.** The admin route, the
admin component and every endpoint it calls are readable on GitHub by anyone.
An unlinked URL keeps casual users out; it keeps nobody determined out.

So the real protection has to live where the browser cannot reach it:

1. **An `admins` table, not a hard-coded list.** `admins(email text primary key)`,
   and a `is_admin()` SQL function that checks `auth.jwt() ->> 'email'` against
   it. Never a `VITE_` variable — those ship to every browser (CLAUDE.md, hard
   rule).
2. **RLS on every admin table** using `is_admin()`. If the client-side check is
   bypassed — and in a public repo, assume it is — the database still refuses.
3. **The Edge Function / Action checks again.** Anything that can commit to the
   repo verifies the caller, independently of the UI.
4. **Client-side check is UX only.** The admin screen checks the signed-in email
   and renders "Not found" for everyone else — the same response as a real 404,
   so the route does not advertise that it exists.

**Where the screen lives.** Two reasonable options:

- A **separate Vite entry**, `admin.html`. Admin code never enters the main
  bundle users download — smaller app, nothing admin-shaped in it.
  *Recommended.*
- A hash route, `/platform/#/admin`. No router and no server rewrite needed —
  useful because the app is proxied from the portfolio's Vercel project, where
  adding rewrites is a change to a different repo.

Either way: `noindex`, and no service-worker precache for the admin page.

## 1.5 What else the admin panel could do

Ranked by how much each one improves the data everybody uses.

**Worth building first:**

1. **The "unlisted train" inbox.** Users already type trains that are not in the
   timetable into the `CUSTOM` field. Aggregate those — *train number, count,
   most common station pair* — into a queue. One click turns a frequently-typed
   unlisted train into a pre-filled `train_submissions` draft. This is the admin
   panel's best idea: users find the gaps, the admin closes them, and every
   later user benefits.
2. **The routing-failure inbox.** Every journey that fails to draw already
   produces a typed `RouteFailure` — `unknown-station`, `no-path`, `undrawable`.
   Aggregated across users, that is a ranked list of exactly where the data is
   broken.
3. **Station corrections.** Fix a name, fix coordinates, add a station. There is
   a known, unfixed case for this already: the five coastal stations — Vasco,
   Dabolim, Sankval, Okha, Kathana — that plot off the landmass. Same
   override-file pattern: `data/overrides/stations.json`.

**Worth building when there are users:**

4. **Train lifecycle.** Mark a train discontinued, renumbered or renamed. Indian
   Railways renumbers trains; an old journey on an old number must still
   resolve.
5. **Invites.** The storage-cost research concluded the app may need to be
   invite-only. Issue, revoke and count invites here.
6. **Health.** Supabase storage against the free-tier quota, journey count per
   day, last successful run of `keep-supabase-awake` and `backup-database`.
   One screen that answers "is everything fine" without opening three
   dashboards.

**Only if the features they serve exist:**

7. Moderation of share pages (decision 15) and photos.
8. Feature flags.

**Always:** an **audit log** — who changed what, when, from what to what. For an
admin panel whose writes end in commits this is partly free (git history), but
the Supabase side needs its own `admin_events` table.

**Privacy rule for 1 and 2:** the inboxes show aggregates only — counts and
station pairs — through a `security definer` view. An admin never sees which
user typed which train. Being able to see everyone's journeys is not a feature
this panel should have.

## 1.6 Recommendation

Option C, a separate `admin.html` entry, `is_admin()` + RLS as the real lock,
and the **unlisted-train inbox as the first screen** rather than the blank
new-train form — because it starts the admin with real demand instead of a
guess. Then station corrections, which fixes a known bug.

Open questions:

- Does the build already have a clean place to merge overrides, or does each of
  the five `build-*.ts` scripts need to learn about them separately? (Read
  [[05 - Data Pipeline]] first; the answer decides the size of this.)
- Where do the raw datameet inputs live during a CI build — fetched, or cached
  in `scripts/.cache/`? An Action-triggered rebuild needs them.
- Should approval be a second step even with one admin? (Probably yes: draft →
  preview on the map → approve. The preview is where errors get caught.)

---

# 2. Trips

A trip is a named group of journeys: *Meghalaya, Dec 2025* holds the four trains
that got you there and back.

## 2.1 A subtlety the example already contains

Meghalaya has almost no railway — for most of its length the network stops at
Guwahati, in Assam. So a "Meghalaya trip" logged by rail will usually contain
**zero journeys in Meghalaya.** The trip is named for where the person went;
the journeys are the rail legs that got them close.

That decides a UI rule: **never derive a trip's name, or check it, against the
states its journeys cross.** The name is the user's, and it describes their
holiday, not the line on the map.

## 2.2 Data model

Three shapes considered:

| Shape | What it means | Verdict |
| --- | --- | --- |
| `Journey.tripId` (nullable) | A journey belongs to at most one trip | **Recommended** |
| Join table `trip_journeys` | A journey can be in several trips | Overkill. "Northeast 2026" containing "Meghalaya" is a nested trip, not a shared journey — and nobody has asked for it |
| Free-form tags | Trips are just labels | Loses everything a trip has that a tag does not: a note, a cover, a share card |

```ts
interface Trip {
  id: string            // uuid, minted client-side like journey ids
  name: string          // the user's words — "Meghalaya", "Ma's checkup"
  note: string | null
  createdAt: string
}

interface Journey {
  // …existing fields…
  tripId: string | null // new; null = not part of any trip
}
```

**Deliberately not stored on `Trip`:** start date, end date, kilometres, states,
station count. All derived from its journeys. A stored copy of a derived number
is a number that will one day disagree with the journeys it summarises — the
same reasoning as `uncounted` not being folded into totals.

### Storage, local

- `tripId` is **optional on read**, exactly like `departureTime` was:
  `isJourney()` accepts `undefined`, `read()` fills in `null`. Every journey
  already stored keeps working with no migration.
- Trips get their own key: `platform.trips.v1.<userId|anon>`, mirroring
  `keyFor()`.
- A `tripId` pointing at a trip that no longer exists reads as `null`, not as an
  error — the same "stored JSON is not trusted input" rule `isJourney` follows.

### Storage, Supabase

```sql
create table trips (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  note text,
  created_at timestamptz not null default now()
);

alter table journeys
  add column trip_id uuid references trips(id) on delete set null;
```

`on delete set null` is the important line. **Deleting a trip must never delete
travel.** The journeys become unsorted; the map does not change.

### The sign-in merge (decision 11) gets harder

`mergeJourneys` currently compares journeys and nothing else. With trips:

- **Anonymous trips move over as-is.** Ids are UUIDs, so they do not collide, and
  the anonymous journeys' `tripId`s still point at them.
- **Do not merge trips by name.** "Meghalaya" on this phone and "Meghalaya" on the
  account may be 2024 and 2026. Keep both; the user can merge them.
- **The new edge case:** a journey that exists on both sides, where the server
  copy wins (as it does today) but only the local copy was in a trip. Rule
  worth adopting: *if the server copy has no trip and the local one does, the
  server copy adopts it.* Adding to `scripts/check-merge.ts` before shipping —
  this is precisely the kind of merge bug that eats data silently.

## 2.3 How a journey gets into a trip

The fifteen-second promise is the constraint. A trip must never be a required
field.

- **In the add-journey form:** an optional *Part of a trip* field below Train,
  using the same listbox as `TrainField`. Options: *None*, recent trips, *New
  trip…*.
- **A smart default, not a blank.** If the last journey was logged in the past
  few days and is in a trip, preselect that trip. Most people log a trip leg by
  leg; the second leg should cost zero taps.
- **Retroactively, by suggestion.** Journeys that chain — this one's *to* is the
  next one's *from* — within a few days of each other are almost certainly one
  trip. Offer it, never apply it: *"These four journeys look like one trip.
  Group them?"* The chain is a much stronger signal than dates alone, and it
  also catches the return leg.
- **No empty trips.** A trip is created by its first journey, not on its own.
  An empty trip is a name with nothing on the map, which is a state the UI would
  then have to design for.

## 2.4 How a trip shows up on the UI

**On the map — a lens, not a colour.** Selecting a trip leaves its routes as
they are and drops every other route to `--route-idle`, then flies to the trip's
bounds (`flyToBounds` already exists). Not a colour per trip: the palette has one
route colour on purpose, and twelve trips in twelve colours is a map of noise.

This fits the route work just done: routes are now drawn as merged paths, so a
trip lens is two merged paths — *in this trip* and *everything else* — not a
return to one path per journey.

**A trips list.** A sheet listing trips, newest first, each with derived numbers:
dates, kilometres, journey count, states touched. Plus one row for *Unsorted* —
the journeys in no trip — so nothing is ever unreachable.

**Inside a journey.** The tooltip and the journeys sheet show the trip name as a
small label. Tapping it opens the trip lens.

**A Rail pass per trip.** *Meghalaya, Dec 2025 — 2,140 km, 4 trains, 3 states.*
Probably the most shareable artifact the app could make: people share holidays,
not lifetime totals. The existing `RailPass` renderer takes journeys and stats;
a trip is just a filtered set of both.

**Unchanged:** milestones, totals and the main map count every journey regardless
of trip. A trip is a way of looking at travel, never a container that hides it.

## 2.5 Search

There is no search today, and no "browse everything" entry point — App.tsx says
so explicitly; journeys are reached only through a route's tooltip. Trips create
the first real reason to add one, so it is worth deciding what search is *for*
before building it.

**Scale decides the implementation.** One person's journeys are tens to low
hundreds of rows. A plain in-memory filter on every keystroke is instant; an
index, a library or a server query would all be overbuilt.

**What should match, and how it ranks** — borrowing the tier idea from
`searchStations.ts`:

1. **Trip names** — *"megh"* → the Meghalaya trip.
2. **Endpoint stations, by name or code** — *"GHY"*, *"guwahati"*.
3. **Train number or name** — *"12345"*, *"saraighat"*.
4. **Stations passed through** — *"Malda"* finds the Howrah–Guwahati journey
   that never stopped there by name but ran through it. Possible because routing
   already produces each route's stop list for the map.
5. **Dates** — *"dec 2025"*, *"2024"*.
6. **Notes** — *"ma met me"*.

**Results are grouped, not interleaved:** trips first, then journeys. A journey
result carries its trip as context. A trip result shows its derived numbers so
two trips with similar names can be told apart.

**Selecting a result** reuses what exists: a trip opens the trip lens; a journey
opens the journeys sheet on that route and flies to it.

## 2.6 Edge cases

| Case | Behaviour |
| --- | --- |
| Rename a trip | Just a name change; journeys keep their `tripId` |
| Delete a trip | Journeys stay, become unsorted. Confirm, and say so |
| Move a journey to another trip | Change `tripId`; one journey, one trip |
| Two trips overlap in dates | Allowed. Dates are derived, not a constraint |
| Trip's last journey deleted | Trip becomes empty — delete it too, consistent with "no empty trips" |
| Anonymous user creates trips | Same as journeys: local, then merged on sign-in |
| Shared Rail pass of a trip | Shows the trip's name — the user's words. Worth a preview before sharing |

## 2.7 Recommendation

Build the data model first, alone: `tripId`, the `trips` key, the Supabase
migration, and the merge rule with its test. It is invisible and cheap now, and
it gets more expensive with every journey stored without it.

Then the add-journey field with the smart default, then the trip lens on the map.
Search and per-trip Rail pass after that, once there is a trips list worth
searching.

Open questions:

- Should nested trips exist? ("Northeast 2026" containing "Meghalaya".) Proposed
  answer: no, until someone asks.
- How many days apart can two chained journeys be before the suggestion stops
  offering them as one trip? Needs real data — the interviews in
  [[11 - Market Research]] §7 are a good place to ask.
- Does a trip ever need a stored date range — for a trip that is planned but not
  yet travelled? That is the future-tickets idea from decision 15, and it is the
  one case where derived dates do not work.

---

# 3. Insights — a page about how you travel

The stat tiles answer *how much*: kilometres, stations, states, longest. This
page answers *how*. Which stations keep turning up, how long you go between
trains, how long you stay when you get there, which corridor is yours. All of it
comes from journeys already logged. Nobody has to log anything new for it.

## 3.1 Why a page, and not more tiles

- **The tiles sit on the map, and every tile costs map.** Four is already the
  most a 390px phone holds (the `Demo` pill was pushed off-screen once a fourth
  tile landed). A fifth number is a worse map.
- **Insights are sentences, not numbers.** *"You've passed Malda Town six times
  and never got off"* has no tile shape. Sentences need room.
- **Most of them need a body of travel to mean anything.** A median gap between
  two journeys is one gap. A page can show what is ready and leave out what is
  not. A tile is either there or it isn't.
- **It is raw material for things already on the roadmap:** the December
  year-in-review card (roadmap Phase 8 #14), the per-trip Rail pass (§2.4), and
  the map's text-equivalent view (spec §9, accessibility).

## 3.2 Rules every insight follows

1. **Derived, never stored.** Same rule as the totals. An insight is a function
   of journeys + routes + stations, recomputed on open.
2. **A sentence first, a chart only when a sentence can't do it.** Voice rules
   apply (`design-system/readme.md`): *"Howrah is home: 14 of 23 journeys start
   or end there"*, not *"Top station: HWH (61%)"*.
3. **Shown only when it means something.** Every insight has a minimum, listed
   in §3.3. Below it, it does not appear. A "seasons" line built from three
   journeys is a coincidence presented as a pattern.
4. **Say what it is based on, whenever a field is optional.** Times are optional
   on a journey, so anything built from them says so: *"from the 12 of 23
   journeys you logged times for."* Same for zones, which only 4,269 of 8,696
   stations have (49%).
5. **Scheduled is not actual.** The form offers the timetable's times. Where a
   time came from the timetable and the user didn't change it, an insight built on
   it says "scheduled". The over-24h milestone already draws this line, for the
   same reason.
6. **No comparisons, no guilt.** Nothing against other users, and no *"38 days
   since your last train"*. A live count-up of days off the rails is a streak
   counter in disguise, and the spec rules those out (§3; roadmap Phase 8 #11).
   A *historical* gap is a fact about your travel. A *running* one is pressure
   to buy a ticket.
7. **Every insight points back at the map.** Tapping one closes the page and
   puts the map on the journeys or stations behind it. The map is the product.
   This page is a way into it, not a replacement for it.

## 3.3 What could go on it

About twenty candidates, more than should ship. §3.6 proposes a first cut.

### Stations — the names you collect

| Insight | Example | From | Shows when |
| --- | --- | --- | --- |
| **Home station** | *Howrah is home: 14 of 23 journeys start or end there.* | Endpoint frequency | ≥ 5 journeys, top station on ≥ 30% of them |
| **Passed, never stopped** | *You've passed Malda Town 6 times and never got off.* | Route stops minus endpoints | A station passed ≥ 3 times, never an endpoint |
| **Most-passed station** | *Kharagpur Jn: on 9 of your journeys.* | Route stops | ≥ 5 journeys |
| **Compass extremes** | *Furthest north: Jammu Tawi. Furthest south: Kanniyakumari.* Four pins on the map | Station coordinates | 1 journey. Always true, and it changes as you travel |
| **Junctions** | *You've rolled through 41 junctions.* | Name ends in `Jn` (395 in the data) | ≥ 10 junctions |
| **"Road" stations** | *You've got off at 2 "Road" stations, Indian Railways for "the town is somewhere else".* | Name contains `Road` (308) | ≥ 1 endpoint. Playful tier |
| **Longest and shortest name** | *Longest name you've stood at: Chhatrapati Shivaji Maharaj Terminus.* | Endpoint names | ≥ 5 endpoints. Playful tier |
| **Zones** | *8 of 17 zones.* | `zone` field | **Blocked:** 51% of stations have no zone. Needs a pipeline fix first (§3.6) |

### Time — gaps and rhythm

| Insight | Example | From | Shows when |
| --- | --- | --- | --- |
| **Longest gap** | *Your longest time off the rails: 427 days, March 2024 to May 2025.* | Sorted `travelledOn` | ≥ 3 journeys |
| **Typical gap** | *You take a train about every 5 weeks.* | Median gap | ≥ 6 journeys |
| **How long you stay** | *You usually stay 9 days in Vellore.* | A→B paired with the next B→A | ≥ 2 round trips to one place |
| **Seasons** | *December is your month: 7 of 23 journeys.* | Month of `travelledOn` | ≥ 12 journeys over ≥ 12 months, top month ≥ 2× its fair share |
| **Day of the week** | *You leave on Fridays.* | Weekday of `travelledOn` | ≥ 10 journeys, top day ≥ 2× its fair share |
| **Nights on a train** | *14 nights slept on a train.* | `arrivalDayOffset ≥ 1` | ≥ 1 overnight journey with an arrival logged |
| **Hours aboard** | *61 hours on trains, from the 12 journeys you logged times for.* | Departure + arrival + day offset | ≥ 3 journeys with both times |
| **Night owl** | *9 of your 12 departures were after 8 pm.* | `departureTime` | ≥ 6 journeys with times, ≥ 2/3 in one band |

### Routes and trains — habits

| Insight | Example | From | Shows when |
| --- | --- | --- | --- |
| **Your corridor** | *Howrah ⇄ Katpadi, 6 times.* (Both directions count as one.) | Unordered endpoint pairs | A pair travelled ≥ 3 times |
| **Favourite train** | *The 12839 Howrah–Chennai Mail, 5 times.* | `trainNumber` + `maps/trainnames.json` | A train taken ≥ 3 times |
| **New ground** | *3,605 km travelled, 2,410 of it on track you'd never been on before.* | Distinct graph edges across routes vs total km | ≥ 2 journeys sharing any track |
| **Round trips** | *Most of your journeys come back: 9 round trips.* | Paired A→B / B→A | ≥ 2 round trips |
| **Speed** | *Your trains average 54 km/h, door to door.* | km ÷ hours, where both known | ≥ 3 timed journeys. Maybe: true, but not obviously interesting |

**New ground** is the strongest idea in the list, and it is particular to this
app. Other trackers can count kilometres. Only one that routes over the real
network can tell the 4,000 km you travelled from the 1,500 km of different track
it covered. Routes already carry their stop lists, and `railgraph.json` already
holds the edge weights.

### Deliberately not on it

- **Days since your last journey.** Rule 6.
- **How you compare with other users.** Percentiles, ranks, "top 5% of
  travellers". The spec excludes comparison (§4), for the reason it gives.
- **CO₂ saved versus flying.** It needs an emissions model this project doesn't
  have, and gives a confident number nobody can check.
- **Predictions.** *"You'll probably travel in December."* That turns a record
  into a forecast, and this is a record.
- **An A–Z of station initials.** A collection mechanic with nothing behind it.

## 3.4 The page itself

**Entry.** From the stat tiles: they already summarise travel, so "more about
this" belongs there. On a phone the expanded stats list gets a last row,
*Insights ▸*. On desktop the tile row itself is the door. It sits under the same
`mine > 0` gate as Milestones and Rail pass, so a person with no journeys never
opens an empty page.

**Form: a full-screen sheet over the map, not a separate route.**

- The map stays mounted underneath. Tapping an insight closes the sheet and the
  map is *already there* to lens and fly to (rule 7). A separate route would
  unmount the map and load it all again on the way back.
- `react-router` is in `00-decisions.md` but is not used anywhere in `src/` yet.
  A real `/platform/insights` URL would also need a rewrite in the portfolio's
  Vercel project, the same constraint §1.4 hit with the admin page. A `#insights`
  hash gives the back button and a link you can send yourself, with neither
  problem.
- It matches what is there already: Rail pass and the journeys sheet are both
  sheets over the map.

**Layout.** Three sections in the order of §3.3: *Stations*, *Time*, *Routes*.
Each section is a short list of sentences, not a dashboard. One lead figure per
section can be set large in `--cream`. Palette trap 3: cream is for large
numerals only, so any numbers inside sentences are ink. Tabular figures, as on
the tiles.

**Early on.** With two journeys most insights are below their minimum. The page
shows the few that are ready, plus one line about the rest. That line is the
author's to write (CLAUDE.md, on empty states). The open question is whether it
names what is missing (§3.6).

**Motion.** None beyond the system's 150ms. This is a page for reading. The
draw-in already happens on the map.

## 3.5 How it would be built

1. **`features/stats/insights.ts`, pure.** `(journeys, routes, data) → Insight[]`,
   each with an id, its sentence, the journey ids or station codes behind it (for
   the map lens), and whether it has met its minimum. A
   `scripts/check-insights.ts` over fixed journeys, in the same style as
   `check-search.ts` and `check-draw-in.ts`. The minimums in §3.3 become test
   cases.
2. **The page, Stations and Time sections.** Everything they need already exists.
3. **New ground.** Needs a distinct-edge pass over routes and the graph's edge
   weights.
4. **The map lens on tap.** This is the same mechanism as the trip lens (§2.4):
   "these routes, everything else idle". Build it once, for both.

## 3.6 Recommendation and open questions

**Recommendation:** a first cut of about nine, chosen because each says
something the tiles can't and none needs a data fix:

> home station · passed, never stopped · compass extremes · longest gap · how
> long you stay · nights on a train · your corridor · favourite train · new ground

And none of it before 12 October. Week 6 of the plan is "no new features. None."

**To decide, together:**

- **Which nine?** The list above is a proposal. The "playful tier" (Road
  stations, name lengths) is the cheapest to build and the most likely to be
  screenshotted. It is also the most likely to wear thin.
- **Hidden or locked?** Milestones show locked ones *"so there's something to
  aim at"*. Should insights do the same (*"Travel through a year to see your
  seasons"*)? That turns a page of facts into a list of tasks, which is close to
  what rule 6 rules out.
- **Zones.** Derive the missing 51% in the pipeline, the way states were derived
  (from the nearest station that has a zone? from division boundaries, if a
  source exists?), or leave zones off the page entirely?
- **Scheduled times.** Do they count towards *hours aboard* and *night owl*, or
  only times the user confirmed?
- **All time, or per year?** A year filter turns this page into the December
  recap for free. It also halves every sample size below the minimums.
- **Market check.** Section 2 found trips are table stakes. Do viaduct and
  TrainLookout already have a stats page, and what is on it? Not checked yet.
  `11-market-research.md` §8 is the place to look before building.

---

# 4. If only one gets built

**Trips.** It is the one users will see, the one with a share artifact, and the
one whose cost rises the longer it waits. The admin panel becomes worth building
when there are enough users that the unlisted-train inbox has something in it —
which is also roughly when there are enough users for the data to be worth
protecting this carefully.

**Insights** doesn't change that order, but it is the cheapest of the three. It
needs no schema, no migration and no new storage: only a pure function over data
that already exists. So it never gets more expensive by waiting, which is
exactly why it doesn't need to go first. Trips does.
