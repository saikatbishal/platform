# Platform

A record of every train journey I've taken across India, drawn as a map that
fills in as I travel.

**Not** a booking app. **Not** a live-tracking app. **Not** a social network.
Those three sentences are load-bearing — see `docs/03-project-spec.md`.

The map, the journey log, milestones and the rail pass all work **without an
account**. Signing in is what stops them living in one browser. This reverses
an earlier decision that put everything behind a Google sign-in — the reasoning
is decision 11 in `docs/00-decisions.md`.

---

## Getting it running

Needs Node 22.18+ or 24 (the data script is TypeScript that Node runs directly,
with no build step).

```bash
npm install

# .env ships with mock YOUR_... values: the app runs in preview mode
# (sample journeys, sign-in disabled). Fill real Supabase values later
# by following docs/09-auth-go-live.md — no code changes needed.

npm run assets              # builds the map geometry + station data (~90s, needs network)
npm run dev                 # http://localhost:5173
```

`npm run assets` runs both generators and writes about 1.1 MB into
`public/maps/` and `public/data/` — 262 KB gzipped, every layer, all zoom levels.
Both are gitignored, so run it once after cloning.

- `npm run map:build` — India outline, 36 states, 760 districts, 454 rail lines, 214 cities
- `npm run data:build` — 8,696 stations, each with a state derived from its coordinate
- `npm run routes:build` — the rail routing graph, 70 KB gzipped, so journeys follow the track

The station script ends by printing six station codes as a sanity check; if any
says `MISSING`, stop and read `docs/05-data-pipeline.md`.

For the database, paste `supabase/schema.sql` into the Supabase SQL editor.

---

## Layout

```
platform/
├── HANDOVER.md            state file — start every fresh session here
├── CHANGELOG.md           one honest entry per working session
├── docs/                  00 decisions · 05 data · 06 map · 07 routing ·
│                          08 roadmap · 09 auth go-live · 10 UI inspection
├── scripts/
│   ├── build-map.ts       outline, states, districts, rail, cities
│   └── build-stations.ts  fetch, clean, derive state from coordinates
├── supabase/
│   └── schema.sql         one table, one view, row-level security
├── public/
│   ├── data/              generated station file lands here
│   └── maps/              generated geometry lands here
└── src/
    ├── styles/
    │   ├── tokens.css     the palette — single source of truth
    │   └── index.css      bridges tokens into Tailwind's theme
    ├── lib/               pure functions: distance, projection, supabase client
    ├── types/
    ├── components/        presentational, no feature knowledge
    └── features/          map · journeys · stats · railpass
```

---

## The stack, in one line each

| | | |
| --- | --- | --- |
| Vite 8 + React 19 + TypeScript 7 | build & UI | no SSR needed — the map is client-drawn and the data is static JSON |
| Tailwind 4 | styling | palette lives in `tokens.css`, bridged via `@theme inline` |
| Motion 13 | animation | the reward loop *is* animation, so it gets a real library |
| d3-geo | maths only | projection for the hand-drawn map. No tiles, no map library. |
| Supabase | database + auth | Postgres, Google sign-in only, row-level security. Signed-out journeys stay in `localStorage`. |
| TanStack Query | server state | journeys are a caching problem, not a state problem |
| vite-plugin-pwa | install | home-screen install is what makes a web app feel native |

Full reasoning, and the list of things deliberately *not* chosen, in
`docs/00-decisions.md`.

---

## Rules that will save rework

**Design before code, ship before polish, polish before adding.** Week 1 is Figma
only. `src/App.tsx` is deliberately almost empty for that reason — don't grow it.

**The palette has four traps.** Yellow is a fill, not a text colour. Vermillion is
not a second accent. Cream is for large numerals only. Never use a neutral grey.
All four, with the contrast numbers, in `docs/04-palette.md`.

**A journey is never a line between two dots.** Expand it into the stops the
train calls at, or the line cuts across the Bay of Bengal — measured at 75% over
water on the Vijayawada–Chennai leg. See `docs/07-routing.md`.

**Adding a journey must take under fifteen seconds.** Not an aspiration — a
v1-severity bug if it doesn't. At a minute, I stop logging in week two and the
product is dead however good it looks.

**Boundaries come from the Survey-of-India district file, never Natural Earth.**
Natural Earth stops India at 35.50°N; the official boundary is 37.08°N. Details
in `docs/06-map-architecture.md`.

**The LLM key never goes in a `VITE_` variable.** Anything prefixed `VITE_` is
compiled into the browser bundle. The key belongs in an Edge Function's secrets.

---

## Product decisions

Recorded 17 September 2026, after a round of outside critique. Full reasoning
and the honest cost of each one is in `docs/00-decisions.md` — that file is
canonical, this is the index.

| | Decided | Status |
| --- | --- | --- |
| 11 | **The app works before sign-in.** Log journeys, fill the map, earn milestones and a pass with no account; sign-in merges them into the account and stops them living in one browser. | Built |
| 12 | **Auto-logging arrives by email, not by camera.** Parse the IRCTC confirmation at a per-user secret address. OCR is third in line. | Planned |
| 13 | **"Passport" becomes "rail pass."** Railway-native, and it keeps the collecting metaphor that made "passport" legible. | Built |
| 14 | **The light theme gets designed first, and it goes cool.** Warm cream plus amber is the default look of every AI-built app; board yellow stays fixed and does the work against a pale blue-grey. | Next |
| 15 | **A share page, not live tracking.** A journey renders from the scheduled timetable already shipped in `public/maps/`, openable without an account. No live status, no push. | Planned |

Two of these reverse something written down earlier, which is the point of
writing things down: 11 reverses "entirely behind a Google sign-in", and 12
reverses the *email ticket import* line in the list below.

---

## Not in v1

Live train status · booking · multi-leg trips as one journey · friends,
following, leaderboards · photos · flights, buses, metros.

Any new idea goes in a v2 note and nowhere else. Scope creep is the most likely
way this project fails, and the list is the commitment against it.

Email ticket import was on this list and has been taken off it deliberately —
see decision 12. Live train status stays on it, and the share page in decision
15 is built from scheduled data precisely so it does not quietly become live
tracking.

---

## Data

Station, route and schedule data from [datameet/railways](https://github.com/datameet/railways)
(CC0). District polygons for the state lookup from
[udit-001/india-maps-data](https://github.com/udit-001/india-maps-data).
Distances are great-circle, so they undercount — the UI says "as the crow flies"
rather than hiding it.
