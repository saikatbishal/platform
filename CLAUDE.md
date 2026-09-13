# CLAUDE.md

Guidance for AI sessions working in this repository.

## What this is

`platform` — a personal record of train journeys across India, drawn as a
hand-built map of India that fills in as the user travels. A mobile-first browser
app, installable to the home screen. One user: the author.

The point of the project is **front-end craft**. It exists to be visibly, on
inspection, better made than a competent engineer would produce from the same
brief. Correctness matters, but so does whether an animation is 80 ms too slow.

## Read first

**`HANDOVER.md` is the session-to-session state file** — current build status,
known debts, next actions, and links to the published pages. Read it before
this list; update it (and `CHANGELOG.md`) at the end of any session that
changes state.

- `docs/00-decisions.md` — every stack choice and its reason. **Do not introduce a
  dependency or pattern that contradicts this without saying so explicitly.**
- `docs/03-project-spec.md` — scope, and the list of things deliberately excluded.
- `docs/04-palette.md` — the colour system and its four traps.

## Hard rules

**Never add a dependency without justifying it against `docs/00-decisions.md`.**
That file lists what was deliberately rejected — monorepo, state library,
Storybook, analytics, error tracking, CI, Docker, a component library. If a task
seems to need one, say so and wait rather than installing it.

**Never use a map library.** No Mapbox, Leaflet, MapLibre, react-simple-maps.
The map is hand-drawn SVG using `src/lib/projection.ts`. This is the single most
important visual decision in the project; a tiled map would make it look like
every other map app.

**Never put a secret in a `VITE_` variable.** Those are compiled into the browser
bundle. Model API keys belong in Supabase Edge Function secrets.

**Never design a feature without reading `design-system/readme.md` first.** It
is the brand's source of truth — palette and the four traps it sets, the type
scale and why it escapes its own ratio below 15px, spacing, radii, tap targets,
and the voice rules for every string a user reads. `design-system/guidelines/`
carries a page per topic and, sometimes, a build brief for a specific screen.

**But do not import from `design-system/components/`.** Those are specimens: a
`.d.ts` contract and a `.prompt.md` example per component, so you can see the
intended API and copy the markup. Production code in `src/` keeps writing its
styling at the call site, from `src/styles/` tokens, the way `AddJourneyForm`
and `Milestones` do. No component library, no icon library — that is the
project's standing decision and the design system agrees with it in writing.
`ui_kits/` and `templates/` are for prototypes and mocks, never for `src/`.

**Never hard-code a colour.** Use the tokens in `src/styles/tokens.css`, or the
Tailwind classes bridged from them (`bg-ground`, `text-cream`,
`stroke-route-taken`). A literal hex outside `tokens.css` is a bug, because it
will be wrong in one of the two themes.

**Never draw a journey as a two-point line.** Always expand it through the rail
network with `src/features/map/route.ts`. A straight line between distant
stations leaves the landmass — 75% over water on Vijayawada–Chennai — and
undercounts distance by about 10%. `docs/07-routing.md` has the measurements.

**Never silently drop a journey.** If a journey cannot be routed or drawn, the failure is data the UI owes the user, not a `return []`. `routeForJourney` returns a named `RouteFailure` for every way it can fail; carry it out and show it — a hollow endpoint, a note on the totals. A journey that contributes 0 km
to a figure labelled "Kilometres" makes that figure wrong, not incomplete.
Note there are two distinct null paths: a station absent from the graph, and
two stations in different connected components. Checking `adjacency.has()`
alone catches only the first.

**Never write an unlayered CSS rule.** `@import 'tailwindcss'` declares the
order — theme, base, components, utilities — and an unlayered rule beats every
one of them regardless of specificity, silently. Tokens go in `theme`
(`tokens.css`, and nothing else belongs there); element defaults in `base`;
named multi-element behaviour in `components`; one-job classes are declared
with `@utility`, never as a bare class, because that is what files them in the
right layer and makes variants work. `@font-face` and `@keyframes` are outside
the cascade and stay unlayered. The full policy is commented at the top of
`src/styles/index.css`.

**Never set the same SVG property by both a class and a presentation
attribute.** A CSS rule beats a presentation attribute always — layers do not
enter into it, an attribute loses to every layer — so an element carrying
`strokeWidth={0.6}` and a `[stroke-width:…]` class is being decided by two
mechanisms at once. Attribute-only is fine and idiomatic; class-only is fine;
both on one element is a bug waiting for someone to edit the wrong one.

**Never use a neutral grey.** Every neutral in this palette is warm. `#808080`
anywhere will read as a bug. Use `steel`.

**Never write empty states, error messages, or button labels as filler.** These
are exactly where generic AI output shows, and they're graded. Write them as a
person would speak, specific to what happened and what to do next.

## Palette traps

1. `accent` (#EAB143) is a **fill**, not a text colour. On white it measures
   2.0:1. Navy on that yellow is 7.8:1 — the station-board pattern.
2. `vermillion` is not a second accent. Errors and one "you are here" marker only.
3. `cream` is for large numerals only — muddy below about 20 px.
4. Both themes are defined in `tokens.css`. A colour declared only inside a media
   query or `[data-theme]` block breaks the un-stamped system state.

## Data

`public/data/stations.json` is generated by `npm run data:build` and gitignored.
8,696 stations, 0.80 MB, every one with a state derived from its coordinates
(51% of the raw source has no state). `public/maps/railgraph.json` is the routing
graph, 70 KB gzipped. Details in `docs/05-data-pipeline.md` and
`docs/07-routing.md`. Don't hand-edit generated files; change the script.

## Style

- TypeScript strict, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. Don't loosen `tsconfig.json` to make an error go
  away — fix the type.
- Features own their components and queries (`src/features/*`). Pure functions go
  in `src/lib`. Presentational components with no feature knowledge go in
  `src/components`.
- Coordinates are `[lon, lat]` in GeoJSON order everywhere. This is easy to get
  backwards and produces a map of the Indian Ocean when you do.
- Stats are derived, never stored.

## Auth

Google sign-in is fully built (frontend + `supabase/auth.sql`) and runs in
**demo mode** until `.env` holds real values: `src/lib/supabase.ts` treats
anything containing `YOUR_` as unconfigured, and sign-in then opens a session
that lives in this browser alone (`features/auth/demoSession.ts`). That exists
so the signed-in half of the app is buildable before a backend is; it cannot
appear in a build with real env values.

Read auth through `useAuth()` from `features/auth/AuthProvider.tsx` — one
subscription for the tree. `useAuthState()` is the implementation; calling it
twice opens two Supabase listeners that can disagree.

`supabase` (the client) is `null` when unconfigured; guard any new usage, and
give the demo path a real implementation rather than an empty branch. The
switch-on procedure is `docs/09-auth-go-live.md`.

## Current phase

The map landed early, ahead of the Figma work the plan puts in week 1. That was
a deliberate call by the author, not a slip — but it means **the map's visual
design has not been through a design pass**. Treat what is there as a working
skeleton: correct data, correct architecture, unfinished craft. Before adding
screens around it, the two Figma screens in week 1 still need doing.

`src/features/map/` is the real implementation:

- `IndiaMap.tsx` — the three layers, in the only order that works
- `usePanZoom.ts` — the transform lives in a ref, never in React state; a drag
  produces a frame every 16 ms and re-rendering the tree that often drops frames
- `useMapData.ts` — fetches and projects every layer once
- `stationField.ts` — the 8,696 dots, on canvas
- `labels.ts` — collision, so "Delhi" and "New Delhi" stop overprinting
- `lod.ts` — what is drawn at each zoom, as a table rather than conditionals
- `route.ts` — journeys expanded into the stops the train calls at

`src/features/journeys/sampleJourneys.ts` is seed data until Supabase lands in
week 3. Real station codes on purpose — plausible fake data hides real problems.
