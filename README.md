# Platform

A record of every train journey I've taken across India, drawn as a map that
fills in as I travel.

**Not** a booking app. **Not** a live-tracking app. **Not** a social network.
Those three sentences are load-bearing — see `docs/03-project-spec.md`.

---

## Getting it running

Needs Node 22.18+ or 24 (the data script is TypeScript that Node runs directly,
with no build step).

```bash
npm install

cp .env.example .env        # then fill in the two Supabase values

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
├── docs/                  read 00-decisions.md before adding anything
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
    └── features/          map · journeys · stats · passport
```

---

## The stack, in one line each

| | | |
| --- | --- | --- |
| Vite 8 + React 19 + TypeScript 7 | build & UI | no SSR needed — it's all behind a login |
| Tailwind 4 | styling | palette lives in `tokens.css`, bridged via `@theme inline` |
| Motion 13 | animation | the reward loop *is* animation, so it gets a real library |
| d3-geo | maths only | projection for the hand-drawn map. No tiles, no map library. |
| Supabase | database + auth | Postgres, Google sign-in only, row-level security |
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

## Not in v1

Live train status · booking · email ticket import · multi-leg trips as one
journey · friends, following, leaderboards · photos · flights, buses, metros.

Any new idea goes in a v2 note and nowhere else. Scope creep is the most likely
way this project fails, and the list is the commitment against it.

---

## Data

Station, route and schedule data from [datameet/railways](https://github.com/datameet/railways)
(CC0). District polygons for the state lookup from
[udit-001/india-maps-data](https://github.com/udit-001/india-maps-data).
Distances are great-circle, so they undercount — the UI says "as the crow flies"
rather than hiding it.
