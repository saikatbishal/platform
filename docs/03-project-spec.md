---
tags:
  - project
  - rail-passport
date: 2026-08-27
status: spec
working-title: Rail Passport
---

# Rail Passport — Project Spec

**One sentence:** A record of every train journey I've taken across India, drawn as a
map that fills in as I travel.

**Not** a booking app. **Not** a live-tracking app. **Not** a social network.
Those three sentences are the most important part of this document.

---

## 1. The problem, honestly

I travel long distance by train. Some of those journeys matter — going to Vellore for a
checkup where my mother comes to meet me is not the same category of event as a commute,
and yet it leaves behind exactly the same trace: a PDF in my inbox and a PNR number I'll
never look at again.

IRCTC has my booking history. It is a table. It knows I bought a ticket; it has no idea
I went somewhere. The record of where I've actually been in this country exists only in
my memory, and memory is lossy.

That's the gap. It isn't a market opportunity and I'm not pretending it is. It's a small
personal frustration with a genuinely satisfying answer: if a journey leaves a permanent,
visible mark, then travelling accumulates into something instead of evaporating.

**Why this is a good project rather than just a nice idea:**

- **Nobody has built a beautiful Indian rail product.** The entire category — IRCTC,
  the aggregator apps, the live-status trackers — is functional and ugly. That means
  craft alone is differentiation here, which is exactly the bet Vidit told me to make.
- **The data is real, free, and public domain.** No scraping, no flaky third-party
  dependency in v1. Verified below.
- **The reward mechanic is honest.** I'm rewarding myself for having actually gone
  somewhere. There's no way to farm it, no fake points, no engagement loop that works
  against the user. That matters when I'm reading a book about dopamine loops — it's
  the difference between applying the ideas and being used by them.
- **It's small enough to finish.** In 45 hours I can do this properly. I could not do
  a booking app properly, and a half-finished booking app is worth nothing.

---

## 2. Who it's for

**Me, first.** That's the whole justification, and I should not dilute it.

If it turns out to be for anyone else, it's these people — and it's worth knowing they
exist, because it changes small decisions:

- **Students and workers who go home by train**, several times a year, the same route.
  For them the value is the accumulating record, and the fact that logging takes fifteen
  seconds.
- **Railfans.** India has a large, genuinely obsessive rail-enthusiast community that
  keeps track of routes, zones, and stations by hand. They are underserved by beautiful
  software and would care about details like zone codes being correct.
- **Families who travel together.** Later, maybe: a shared map. Not in v1.

The distinction that matters for design: the student wants logging to be *fast*. The
railfan wants it to be *accurate*. When those conflict, fast wins in v1, because I'm the
student.

---

## 3. The core loop

Four steps, and I want to be able to say why each one works.

**Trigger.** I get off a train. Ideally the app asks — a notification is too much for v1,
so v1 relies on habit: log it while I'm still on the platform.

**Action.** Log the journey in under fifteen seconds. Two station fields with good
search, a date, optionally a train number and a one-line note. Fifteen seconds is a hard
requirement, not an aspiration. If it takes a minute, I will stop doing it in week two,
and then the product is dead regardless of how it looks.

**Reward.** The map changes, visibly and immediately. A new line draws itself across the
country. Stations light up. A state fills in. A number goes up. This is the part that
has to feel good, and it's the part that most of the polish budget goes to.

**Investment.** Each journey makes the map more mine and more worth looking at. This is
the mechanic that makes collections work and it costs nothing to build — it's a
consequence of the data accumulating, not a feature. The map is worth more to me at
twenty journeys than at two, which means the effort I've already put in is the reason to
keep going.

**The one honest thing about this design:** the reward is real. I cannot make the map
fill in without going somewhere. Compare that to a streak counter, which rewards opening
an app. This is worth writing down because it's the sort of distinction the book will
teach me to spot, and I'd rather build the honest version.

---

## 4. Scope — the cut

### Must ship (v1)

- Google sign-in, and nothing else
- Add a journey: from, to, date, optional train number, optional one-line note
- The map of India, with my routes drawn on it
- Station search across all 8,696 usable stations
- Four stats: kilometres, stations, states, longest journey
- States filling in as they're unlocked
- Three or four milestones with honest thresholds
- A shareable passport card as an image
- Works properly on my phone

### Explicitly not in v1

Writing these down is the point of the exercise — this is the scope discipline Vidit said
was missing, practised somewhere the stakes are low.

- **Live train status.** Needs a paid, flaky API. Adds no value to a *record* of past travel.
- **Booking anything.** Not the product.
- **Automatic email ticket import.** Genuinely useful, genuinely a rabbit hole. v2.
- **Multi-leg journeys as one trip.** Log them as two. Fine.
- **Friends, following, leaderboards.** The moment this becomes comparative, the reward
  stops being about my own travel. Deliberate omission, not an oversight.
- **Photos.** Storage, moderation, layout, mobile upload. Big feature dressed as a small one.
- **Flights, buses, metros.** "Every kind of travel" is how this project dies.

### Maybe v2

Email ticket import · shared family map · zone and division completion for railfans ·
year-in-review card · offline support

---

## 5. Data — what I verified

I checked this before writing any of the rest, because if the data were bad the project
would be a different project.

**Source: the DataMeet `railways` repository.** Public domain (CC0), no key, no rate limit.

| File | Size | Contents | Where it lives |
| --- | --- | --- | --- |
| `stations.json` | 1.8 MB | 8,990 stations as GeoJSON points (8,696 usable — see below) | Ship it in the client |
| `trains.json` | 14.8 MB | Train routes as line geometry | Simplify, or skip in v1 |
| `schedules.json` | 82 MB | Every stop of every train | Postgres only, never the browser |

A real station record looks like this:

```json
{
  "geometry": { "type": "Point", "coordinates": [75.4516454, 27.2520587] },
  "properties": {
    "state": "Rajasthan", "code": "BDHL", "name": "Badhal",
    "zone": "NWR", "address": "Kishangarh Renwal, Rajasthan"
  }
}
```

Coordinates, state, zone, and code — everything the map and the stats need, in one file
small enough to load in the browser.

**What's wrong with the data — checked, not assumed.** I ran the numbers on the actual file
rather than trusting it, and found three problems that would have surfaced in week 4 instead:

| Problem | Scale | Fix |
| --- | --- | --- |
| No `state` value | **4,593 of 8,990 stations (51%)** | Derive state from coordinates by point-in-polygon against an India state-boundary GeoJSON. Do not trust the field. |
| No coordinates at all | 293 stations | Filter out at load. A station I can't place can't go on a map. |
| Junk rows — codes like `XX-BECE`, `YY-BPLC`, name identical to code | ~150 | Filter out: reject codes prefixed `XX-`/`YY-`/`ZZ-`, and any row whose name equals its code. |

After filtering for a real name and a coordinate inside India's bounding box:
**8,696 usable stations**, of which **4,385 still need their state derived.**

This matters more than it looks. "States unlocked" is the strongest reward in the whole design,
and half the source data can't tell me which state a station is in. Howrah, Sealdah, and New
Jalpaiguri — three stations I personally use most — all have `state: null`. If I'd built the
stat on that field, the feature would have quietly been wrong for half my own journeys.

So the state lookup is a **week 0 task, not a week 4 task**: load an India states boundary
file, do the point-in-polygon once as a build step, and ship a cleaned station file with the
state filled in. It's an hour of work now and a rescued feature later.

**The three consequences worth noting:**

1. **The 1.8 MB station file goes in the client.** Search across 8,990 entries with no
   network round-trip, so it feels instant. Gzipped it's a few hundred kilobytes.
2. **The 82 MB schedule file cannot go near the browser.** It gets loaded into Postgres
   once and queried. This is the honest reason the project needs a backend, and it's a
   better answer than "I wanted to learn Supabase."
3. **The data is several years old.** Station names, codes, and coordinates barely change,
   so the map is fine. Train numbers and names may be stale, which is why the train field
   is optional and free-text-tolerant rather than a strict dropdown. Worth stating openly
   in the case study — knowing your data's limits is more impressive than pretending it's perfect.

**Distance:** ~~great-circle between the two endpoints~~ — **superseded.** That
undercounted by about 10% and, worse, drew journeys straight across the Bay of
Bengal. Distance is now measured along the route the train actually takes,
summed hop by hop over the rail network, and lands within a few percent of real
rail distances. See `docs/07-routing.md`.

---

## 6. The screens

### The Map — the whole product

Everything else is a supporting screen. This one has to be good enough that someone
screenshots it.

- India drawn from the station coordinates themselves, not from a tiled map service.
  This is the single most important decision in the project. Mapbox or Leaflet would be
  faster to build and would make this look like every other map app. Drawing it myself
  makes it look like nothing else.
- My routes as glowing lines. Travelled states filled; the rest quiet.
- Routes draw themselves in on load, staggered, roughly 1.2 seconds total. Long enough
  to notice, short enough not to annoy on the fifth visit.
- Stats overlaid, not in a sidebar. The map should never be a panel next to the numbers.
- Tap a station: name, code, zone, how many times I've passed through.
- Pinch, pan, momentum. If this feels sticky, the product feels cheap regardless of everything else.

**Visual direction:** the view from a night train window. Deep ink background, warm amber
for what I've travelled, cool dim grey for what I haven't. One accent colour, used
sparingly enough that it means something.

### Add a Journey — fifteen seconds or it's broken

- Two station fields. Search matches on name *and* code, because I know it as HWH before
  I know it as Howrah.
- Recent and frequent stations at the top with no typing at all. Most of my journeys are
  the same four stations.
- Date defaults to today.
- Train number and note both optional, both skippable with a keyboard.
- On save: close, and let the map do the celebrating. No success modal. The reward is the
  map changing, and a dialog in front of it would hide the only good part.

### The Passport Card — the thing that gets shared

- One image: kilometres, stations, states, a miniature of my map, the date.
- Designed to look good in a tweet at small size, which means big numbers and high contrast.
- Rendered client-side to a canvas and downloadable.

### Milestones — small, honest, quiet

- A list, not a wall of badges. Locked ones visible so there's something to aim at.
- Thresholds that mean something: 1,000 km, 10 stations, 5 states, one journey over 24 hours.
- No badge for signing up. No badge for opening the app. Every badge requires having gone somewhere.

---

## 7. Data model

```sql
-- Stations come from the JSON file, not the database.
-- Only what's mine lives here.

create table journeys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  from_code     text not null,          -- 'HWH'
  to_code       text not null,          -- 'KPD'
  travelled_on  date not null,
  train_number  text,                   -- optional, free text: the dataset is dated
  note          text,                   -- one line
  distance_km   numeric,                -- computed on write, great-circle
  created_at    timestamptz default now()
);

alter table journeys enable row level security;
create policy "own journeys only" on journeys
  for all using (auth.uid() = user_id);

-- Stats are derived, never stored. Fewer than a thousand rows per user;
-- computing them live is cheaper than keeping them correct.
create view journey_stats as
select user_id,
       count(*)                                  as journey_count,
       coalesce(sum(distance_km), 0)             as total_km,
       max(distance_km)                          as longest_km
from journeys group by user_id;
```

Two decisions worth defending here. **Stats are derived, not stored** — a stored counter
is a thing that can be wrong, and at this data size there's no performance reason to risk
it. **Row-level security rather than filtering in application code** — the database
refuses to hand over someone else's journeys even if my query is wrong, which means a
frontend bug can't become a data leak.

---

## 8. Stack

| Layer | Choice | Why this one |
| --- | --- | --- |
| Framework | Vite + React + TypeScript | Fast rebuilds. No server rendering needed — this is an app behind a login, not a page for search engines. Next.js would add a mental model I don't need here. |
| Styling | Tailwind | Already know it, and it keeps the spacing scale honest. |
| Components | shadcn/ui | Copy-in, not a dependency, so I can rewrite anything that doesn't match the direction. Critical: a component library I can't override will drag the whole thing toward looking generic. |
| Animation | Motion for React | The reward loop is animation. This deserves a real library, not CSS transitions. |
| Map | Hand-rolled SVG / Canvas | The differentiator. See §6. |
| Backend | Supabase | Postgres, auth, and row-level security in one. The 82 MB schedule file needs real Postgres, which rules out Firebase. |
| Auth | Google only | One provider. No password reset flow to build, no email deliverability to debug. |
| Hosting | Vercel | Free, and pushes deploy themselves. |
| AI | One call, one job | Parse a pasted ticket into structured fields. That's all. |

**On AI's role:** deliberately small. A project whose value is an AI wrapper has no
frontend story, and the frontend is the point. Here AI removes typing from one form. It's
a garnish, and the case study should say so plainly — that's a more credible position than
claiming the AI is the innovation.

---

## 9. The polish checklist — what "top 0.1%" actually means

Vidit's brief was to make the front end top 0.1% quality. That's unmeasurable as stated,
so here is the version I can check off. This list is the difference between good and the
thing he's asking for, and week 6 exists entirely to work through it.

**Motion**
- [ ] Nothing animates linearly. Everything has real easing
- [ ] Entrances 200–300 ms, exits faster than entrances
- [ ] Staggered lists, roughly 40 ms apart
- [ ] Sustained 60 fps while panning the map on a mid-range phone
- [ ] `prefers-reduced-motion` fully respected, and the app still makes sense with motion off

**States — where generic output always shows**
- [ ] Every empty state written by me, in my own voice, with something to do in it
- [ ] Skeletons that match the shape of the real content, never a spinner
- [ ] Every error message says what happened and what to do next
- [ ] Every button has hover, focus, active, disabled, and loading
- [ ] Optimistic updates — the map changes before the network confirms

**Typography and space**
- [ ] A real type scale, not arbitrary pixel values
- [ ] One typeface, two or three weights
- [ ] Line length capped for reading
- [ ] Numbers tabular so stats don't shift as they change
- [ ] Optical alignment, not just mathematical

**Colour and theme**
- [ ] Dark mode designed on its own terms, not inverted
- [ ] Contrast passes AA everywhere, including the amber on ink
- [ ] Colour never the only way information is conveyed

**Mobile**
- [ ] Everything important within thumb reach
- [ ] Safe areas respected on a notched phone
- [ ] Touch targets 44 px or larger
- [ ] Tested on my actual phone, not the browser's emulator
- [ ] No horizontal scroll anywhere, ever

**Performance**
- [ ] Lighthouse above 95
- [ ] Zero cumulative layout shift
- [ ] First contentful paint under a second
- [ ] The station file lazy-loaded and cached

**Accessibility**
- [ ] Fully keyboard navigable, including the map
- [ ] Visible focus rings that suit the design rather than fighting it
- [ ] Screen-reader labels on everything interactive
- [ ] The map has a text-equivalent list view

---

## 10. Risks

| Risk | Likelihood | What I do about it |
| --- | --- | --- |
| Scope creep — email import, photos, friends | **High.** This is the one that kills it | The "not in v1" list in §4 is a commitment. Any new idea goes in a v2 note and nowhere else |
| Hand-drawn map turns out harder than expected | Medium | Time-boxed to week 2. If it isn't working by hour 4, fall back to a simplified GeoJSON of India and keep the styling |
| Data is stale or wrong in places | **Confirmed, not a risk** | Measured: 51% missing state, 293 missing coordinates, ~150 junk rows. Cleaning is a week 0 build step; state derived from coordinates. Limitation goes in the case study |
| I stop logging journeys | Medium | Fifteen-second logging is a hard requirement, not a nice-to-have. If it's slow, that's a bug at v1 severity |
| Polish eats all six weeks and nothing ships | Medium | Ship in week 3, deliberately unpolished. Polish is weeks 4–6 |
| Life gets busy | High | 7 hours a week is already conservative. A missed week means cutting features, not extending the deadline |

---

## 11. What I'll say about it

Worth writing now, because it decides which decisions I make and which I write down.

**The problem I chose and why.** A personal frustration, deliberately not a market
opportunity — and what I gained from that constraint: I'm the user, so I never had to
guess what mattered.

**The three decisions I'd defend.**
- Drawing the map by hand instead of using Mapbox. Slower to build, and the only reason
  it doesn't look like every other map app.
- Excluding social features. The reward had to stay about my own travel; the moment it's
  comparative, it's a different product with a different failure mode.
- Deriving stats instead of storing them. A stored counter is a thing that can silently
  go wrong, and at this scale there was nothing to gain by risking it.

**The thing I got wrong.** Reserved. There will be one, I'll find it around week 4, and
saying it out loud is worth more than the other three combined — it's the difference
between describing a project and demonstrating judgement.

**Where AI helped and where it didn't.** It wrote a lot of the boilerplate quickly. It
could not tell me the routes should draw in on load rather than appear, or that the
success modal had to go. That distinction is the whole argument for what I'm still for.

---

## Sources

- Station, route, and schedule data: [datameet/railways](https://github.com/datameet/railways) — CC0 public domain
- Alternative station datasets: [IamYVJ/Indian_Railway_Stations_JSON](https://github.com/IamYVJ/Indian_Railway_Stations_JSON), [vstflugel/indian-railway-dataset](https://github.com/vstflugel/indian-railway-dataset)
- Live status / PNR, if ever needed in v2: [indianrailapi.com](https://indianrailapi.com/api-collection) (account required, pricing not published)
