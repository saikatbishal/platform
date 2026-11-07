---
tags: [project, rail-passport, roadmap]
date: 2026-08-30
status: living-document
---
# Platform — The Full Roadmap

> **One-line purpose:** every piece of work the app could absorb, phase by phase, backend to frontend to devops to ideas — with the UI/UX work weighted heaviest, because that is the whole bet.

**Companions:** [[02 - Six Week Plan]] (the calendar) · [[03 - Rail Passport - Project Spec]] (the scope contract) · [[04 - Rail Passport - Palette]] (the colours) · [[UI Craft - The Polish Pass]] (how to judge the result)

The six-week plan says *when*. This document says *what, exactly* — so that when you sit down for an evening you pick from a list instead of deciding what the work is.

**The one rule carried over:** design before code, ship before polish, polish before adding. Phases 1–3 are v1. Phases 4–6 make it real. Everything in Phase 8 waits until something is shipped.

---

## Where it already stands (done, verified) — refreshed 2026-10-11

*Checked against the code on this date. Earlier entries said "not built" for
several things that have since shipped; each checkbox below now carries a dated
note where its status changed.*

- Scaffold: Vite 8 (Rolldown) + React 19 + TS 7 + Tailwind 4, builds clean. JS on first paint ~110 kB gzipped (app + React); supabase-js (~54 kB) is its own file, loaded after the map (`getSupabase()` in `src/lib/supabase.ts`)
- Data: 8,696 stations, every one with a state derived from its coordinates; land neighbours drawn so border stations stop floating in the sea
- Map: hand-drawn SVG+Canvas India, pan/pinch/momentum at 60 fps, level-of-detail, label collision, districts at zoom ≥ 4, the sea. Routes **draw themselves in** on load (oldest first, ≤ 1.2 s), states fill as lines enter them, stat tiles count in step (`drawIn.ts`, `useDrawIn.ts`). Fly-to a journey exists. Phone zoom buttons removed in favour of pinch
- Routing: journeys follow the rail network (Dijkstra in-browser), prefer a train's exact stop list, and a `RouteFailure` is surfaced honestly ("Not drawn" in the totals, hollow endpoints)
- Type: Archivo / IBM Plex Mono / IBM Plex Sans Devanagari / Noto Sans Bengali self-hosted, a real scale, nothing shifts on font swap
- Identity: station-board component, badge fixed, PWA icons + favicon family. The palette follows the clock (dark 18:00–06:00)
- **Anonymous-first** (decision 11): the map, logging, milestones and the rail pass all work signed out; signing in is what stops journeys living in one browser
- Auth: Google sign-in **live** — `.env` points at a real Supabase project; the `journeys` table exists with every column the client uses (checked over REST 2026-10-11). Demo mode remains for unconfigured builds
- Journeys: add form with ranked station search and train autocomplete; stored per user in localStorage, or in Supabase when signed in. Sign-in hands device journeys over to the account, uploading only what the server confirms. Unsent saves sit in a pending log and resend on reconnect; a banner says when the account couldn't be read or journeys aren't up yet
- Feedback: toasts (top on phones, bottom-right from `sm`) for add/delete with **Undo**, a failed delete (with Try again), and account rows this build can't read (`src/components/Toaster.tsx`)
- Journey detail: tap a route → tooltip → journey sheet (card per journey on that route, Show on map, delete). Quick find (`/`) searches the log by station, train, date and note
- Rewards: four stat tiles (km, stations, states, longest), milestones, and the shareable **rail pass** (decision 13, formerly "passport card")
- Hosting: Vercel, at platform.saikatbishal.com and saikatbishal.com/platform/ (one build, `base: './'`); service worker precaches the app shell
- **Not built**: station tap / station card, the "you are here" pulse, first-open framing to your journeys, a dedicated journey log / accessible list view, swap-direction, recent stations, same-station validation, zero-journeys onboarding, the AI ticket parse, data export, an error boundary
- Known debts: map has no keyboard navigation; `@tanstack/react-query` is installed and its provider mounted but nothing uses it (decision 8 is unimplemented — `useJourneys` is hand-rolled); no `CHANGELOG.md` despite CLAUDE.md asking for one

---

## Phase 1 — The design pass *(this is the current phase — nothing below it starts first)*

The app currently wears the operating system's clothes. This phase gives it its own.

**Type**

1. [X] Load the chosen faces: **Archivo** (interface + display), **IBM Plex Mono** (figures, station codes), **IBM Plex Sans Devanagari** (the bilingual board). Self-host via `@fontsource` packages rather than a Google Fonts `<link>` — one less external request, and the font files get cached by the service worker like everything else.
2. [X] Fill the three empty slots in `index.css` (`--font-display`, `--font-body`, `--font-mono`). That is the single highest-leverage change available anywhere in this list.
3. [X] Set `size-adjust` on the fallback stack so nothing jumps when the webfont arrives. *(Explained simply: the browser shows a system font for a moment before your font finishes downloading. If the two fonts take up different amounts of space, every line of text shifts when the swap happens. `size-adjust` stretches the temporary font to occupy the same space, so the swap is invisible.)*
4. [X] Define the type scale as tokens: one ratio, five or six sizes, line-height varying with size (tight for display, 1.5+ for body). Kill the 9.6px label.

**The two Figma screens (from the plan, still owed)**
5. [ ] The Map screen — desktop and 390px. Decide what chrome exists, where stats live on mobile, what the first-open view is.
6. [ ] Add a Journey — the fifteen-second flow, drawn before it is built.
7. [ ] Twenty reference screenshots first: map UIs, transit design, collection UIs, passport/stamp aesthetics. Mobbin for patterns, Typewolf for type.

**Identity**
8. [x] Fix the badge: ink on surface, hairline border, inner radius = outer − border. The yellow goes back to the route only.
9. [x] The station-board component (yellow field, navy text, Devanagari above Latin) — build it once, use it for station headers and the passport card. It is the app's logo without designing a logo. *(Built. The sign-in board it first stood on was removed with decision 11; the component lives on in `src/components/StationBoard.tsx` and heads the rail pass. Not yet a station header — there is no station card.)*
10. [x] App icon + PWA icons (192/512/maskable) drawn from the board or the route mark — currently placeholder names in the manifest with no files behind them.
11. [x] Favicon already exists; make the icon family match it.

**Palette application**
12. [x] Widen the lightness gap between `--land` and `--land-visited`, and add a border cue, so the unlocked-state reward survives greyscale and sunlight.
13. [x] Decide the identity question below in **Colour combinations** — and wire the choice as tokens only, so changing your mind later is a one-file edit. *(ICF Night, as tokens in `tokens.css`.)*

---

## Phase 2 — The map experience *(the centrepiece — most UI/UX hours live here)*

**Feel**

1. [ ] Zoom about the pinch midpoint is done; add **double-tap-and-drag zoom** (one-handed zoom, the Google Maps gesture) — thumb up = out, down = in. *(Plain double-tap-to-zoom exists (`usePanZoom.ts`); the one-handed drag gesture doesn't.)*
2. [ ] Clamp momentum so a hard fling never strands the user in empty sea. Ease the clamp (rubber-band at the edge, then settle) instead of a hard stop. *(2026-10-11: half done. The fling can no longer strand you — `clamp()` keeps 35% of the country on screen — but it is a hard stop: velocity zeroes at the edge, no rubber-band.)*
3. [ ] `fly-to` animation: given a target point and zoom, animate x/y/k along an eased path with a slight zoom-out-then-in arc (the "parabolic" camera move every good map app uses — it keeps context during the jump). *(2026-10-11: half done. `flyToBounds` animates x/y/k on a cubic ease-out and "Show on map" uses it; there is no zoom-out-then-in arc.)*
4. [ ] **First-open framing:** on a phone, fit to the user's journeys' bounding box rather than the whole country — this also fixes the half-empty-screen finding. Whole-country stays one "Fit" tap away. *(Still open: `fitToViewport()` fits the whole country.)*
5. [x] `prefers-reduced-motion`: fly-to becomes a fade-cut; route draw-in becomes instant with a fade. *(2026-10-11: done. Fly-to and draw-in both check the media query and skip straight to the end state; the global rule in `index.css` covers the rest.)*

**Layers and detail**
6. [x] Wire the lazy district fetch at zoom ≥ 4 (the hook exists; the fetch isn't connected yet).
7. [ ] Station tap → **hit-testing**: nearest station within 24 screen px of the tap, biased toward visited ones. Not built — no tap handler on the station field at all yet.
8. [ ] Station card on tap: the station-board component as header, code, zone, state, "times passed through", journeys touching it. Depends on 7.
9. [x] Route tap → journey card: date, train, distance "via N stops", note. *(2026-10-11: done. Tap a route → `RouteTooltip` → `JourneysSheet`, one `JourneyCard` per journey on that route, with Show on map and delete.)*
10. [ ] A **text list view** of journeys as the map's accessible twin — also the fallback for screen readers, and honestly useful on its own. *(2026-10-11: partly covered. Quick find with an empty query lists the log newest-first and opens each journey's card, but it is a search sheet, not a list view.)*
11. [ ] Label tuning: visited-station labels should outrank city labels at state zoom and below (your places beat generic places). *(2026-10-11: not built — `labels.ts` has no notion of visited.)*
12. [ ] Zoom-level polish from the spike: rail stroke widths per tier are in, but re-tune once real type is loaded — labels change the visual weight of everything around them. Unverified since type landed.

**Delight (cheap, high-return)**
13. [x] Route **draw-in** on first load: stagger by journey date, ~1.2s total, stations lighting up as the line reaches them. This is the shareable moment; budget real time on the easing. *(2026-10-11: done — `drawIn.ts` / `useDrawIn.ts`; 700 ms per line, ≤ 120 ms stagger, lands by 1.2 s. Checked by `scripts/check-draw-in.ts`.)*
14. [ ] The "you are here" vermillion dot gets a slow 3s breathing pulse — the only permanently animated thing on screen. Not built.
15. [x] A state fills the moment its first journey is logged — animate the fill with a 400ms ease, not a pop. *(2026-10-11: done — 400 ms ease-out, `--land` to `--land-visited` mixed in OKLab, triggered as the first line enters the state.)*

---

## Phase 3 — Logging a journey *(fifteen seconds or it is a bug)*

1. [X] **Two station fields** with instant search over the in-memory list: match on name *and* code (you know it as HWH before Howrah), rank prefix-matches first, then contains.
2. [x] **Recents and frequents** above the keyboard before typing — most journeys reuse four stations. Zero-typing logging is the target for repeat routes. *(2026-10-11: done — as chips under the empty field rather than a list on focus, because focus throws the phone keyboard up over the list. Four of your stations, weighted by use with a six-month half-life (`suggestStations.ts`, checked by `scripts/check-suggest.ts`). Once From is picked, To offers your routes from there, both directions, so a repeat journey is two taps. Derived from the log; nothing stored. No chips at zero journeys.)*
3. [X] Date defaults to today *(yesterday-in-one-tap not confirmed).*
4. [X] Train number optional, free text, but **autocomplete from the timetable graph**: given from+to, offer the trains that actually run that hop. Picking one upgrades the route from "plausible" to "exact" — surface that ("via the 12839's stops"). *(`useTrainsBetween.ts`, and the map already draws the exact/inferred distinction.)*
5. [x] Swap direction button (↕) — return journeys are half of all journeys. *(2026-10-11: done — "Swap ↕" in the To field's label row, shown once either station is picked; the train resets, because a train number belongs to one direction.)*
6. [X] On save: **no success modal.** Sheet closes, the map draws the new route.
7. [x] **Optimistic add with undo**: the journey appears instantly; a quiet toast offers "Undo" for 5s. *(2026-10-11: done. "Added HWH · PURI, 12 Sept 2026." with Undo; the toast lingers 10 s and pauses under the pointer or focus rather than 5 s, so nobody races it. Server writes per journey are serialised, so an Undo can't overtake its own save.)*
8. [x] Validation copy in your own voice: "These are the same station" beats "Invalid input". *(2026-10-11: done. The other field's station used to vanish from the results in silence — and when it was the only match, the list didn't open at all. It now stays where it ranked, as a row that can't be picked: "Already your From station. A journey needs two different stations." Arrow keys and Enter pass over it; screen readers hear it as unavailable, with the reason.)*
9. [ ] Empty state (zero journeys) is the onboarding: a muted map, one sentence, one button — "Log your first journey". Not built — at zero journeys the `+` button's label changes to "Add your first journey", and nothing else.
10. [ ] Edit and delete: swipe or long-press on the journey list entry; delete gets undo, not a confirm dialog. *(2026-10-11: delete half done — from the journey card, with an Undo toast, but the card still asks to confirm first. Edit is not built.)*

---

## Phase 4 — Backend *(Supabase — small on purpose)*

**Status as of 2026-10-11: live.** `.env` points at a real project, the app runs in live mode, and signed-in journeys read and write the `journeys` table (`journeyStorageSupabase.ts`). Items 1–3 are done; 4 was superseded; 5 was dropped by decision 11; 6–8 are open.

1. **Done.** Create the Supabase project; paste `supabase/schema.sql` (journeys table, derived stats view, row-level security). *(The table answers over REST with all twelve columns the client uses — checked 2026-10-11.)*
2. **Done.** **Google sign-in only.** Configure the OAuth app, add the redirect URL, done — no password reset flow to build, ever. *(`docs/09-auth-go-live.md` is the procedure.)*
3. **Done.** *Row-level security, explained simply:* normally your frontend asks the database "give me journeys where user = me", and a bug in that query could leak someone else's rows. RLS moves the rule into the database itself — a policy that says "a request may only ever see rows whose `user_id` matches the logged-in user". After that, even a buggy or malicious query physically cannot return another person's journeys. The database is the bouncer, not your code.
4. **Superseded.** Wire TanStack Query: `useJourneys()` (cached list), `useAddJourney()` (optimistic mutation writing `distance_km` from the routing graph at save time). *(What shipped instead is a hand-rolled `useJourneys` with a write-ahead pending log, per-journey ordered writes and an honest sync banner. TanStack is installed and its provider mounted but unused — either decision 8 gets amended, or the package goes.)*
5. **Dropped.** Auth state in the UI: signed-out shows the map with sample journeys greyed and a single sign-in button — the app demos itself before asking for anything. *(Decision 11 made the app anonymous-first: signed out, you log your own journeys; sample data was deleted.)*
6. **The one AI feature** — an Edge Function that turns a pasted ticket/PNR text into `{from, to, date, train}`. *(Explained simply: an Edge Function is a tiny piece of server code Supabase runs for you on demand — you write one file, they host it. It exists here for exactly one reason: the AI key must live on a server, because anything shipped in the browser bundle is readable by anyone who opens devtools. The browser sends the pasted text to your function; the function holds the key, calls the model, validates the reply with zod, and returns clean fields.)*
7. Rate-limit that function per user (a counter in the DB) so a leaked URL can't run up your bill.
8. Export-my-data: a button that downloads journeys as JSON/CSV straight from the client. One user or not, it is your data and it makes the "not a walled garden" point.

---

## Phase 5 — Rewards and the passport *(where the book you're reading gets applied)*

**Status as of 2026-10-11:** tiles count in step with the draw-in and animate on change; milestones and the shareable card (now the **rail pass**, decision 13) are shipped. Item 7, the journey log, is still open.

1. [ ] Stat tiles: equal-width (fixes the reflow finding), cream tabular numerals, counts animate on change (300ms, eased, `tabular-nums` so nothing jitters). *(2026-10-11: two of three. Cream tabular numerals and animated counts are done (`StatNumber.tsx`); tiles are still content-width, not equal-width.)*
2. [ ] **States unlocked** — the headline reward. Fill animation on unlock plus a one-line toast naming the state. Cap honesty: "9 of 29 reachable states" (7 have no stations in the data — say so in an info note rather than pretending 36 is reachable).
3. [X] Milestones with honest thresholds: 1,000 km, 10 stations, 5 states, one journey over 24h. Locked ones visible, no confetti. *(Shipped with a journey's own logged departure/arrival times, not "both coasts"/"highest station" — those two were never computable from the data the client has; a duration milestone needed the person who was on the train to say what actually happened, since the timetable wouldn't have told the truth either.)*
4. [ ] Milestone unlock moment: quiet, not confetti — the station-board component stamps in with a small tick sound (see Phase 8, sound is opt-in). *(Unlocking is currently silent/instant, no stamp-in moment yet.)*
5. [X] **The passport card** *(now the rail pass, `features/railpass/`)*: canvas-rendered image — mini-map with your routes, the big three numbers, the station-board aesthetic, date. Rendered at 2× for crispness. *(Download works; `navigator.share` is offered only where feature-detected to actually work. Verified in both themes.)*

6. Year-in-review variant of the card in December (cheap once the card exists).
7. A "journey log" screen: reverse-chronological list, each entry a small board-style row — this doubles as the accessible list view from Phase 2.

---

## Phase 6 — DevOps and quality *(kept deliberately light)*

*Status as of 2026-10-11: 1–4 done, 5 done another way, 7 partly, 6/8/9 open.*

1. **Done.** **Vercel**: connect the repo, set the two `VITE_` env vars, deploy. Every push to `main` ships; every PR gets a **preview URL**. *(Explained simply: a preview deploy is a full copy of your site built from a branch, on its own temporary URL — you check the change on a real phone before merging, instead of after.)*
2. **Done.** Real domain. A project meant to be shared should not live at `something.vercel.app`. *(platform.saikatbishal.com, and saikatbishal.com/platform/ through the portfolio's proxy.)*
3. **Done — built on Vercel:** `npm run build` runs `npm run assets` first, and the generated files stay gitignored. `npm run assets` output: commit the *generated* files to the repo after all (they're 1.1 MB and deterministic) **or** run the script in Vercel's build step. Pick one; document it in the README. Building on Vercel keeps the repo clean; committing makes clones work offline. Either is defensible.
4. **Done.** **Service worker** (already configured via the PWA plugin): stations.json cached hard, app shell precached. *(Explained simply: a service worker is a small script the browser keeps even after the tab closes. It sits between your app and the network and can answer requests from its own cache — which is what makes the app open instantly on a train with no signal, showing your map from the last time it loaded.)*
5. Offline behaviour beyond caching: queue journey saves made offline and sync when back (TanStack Query's `onlineManager` + a persisted mutation queue). Trains are the one place your users predictably have no signal — this is on-subject, not gold-plating. *(Done another way, 2026-10-11: no TanStack — every signed-in save is written to a per-user pending log before the request, re-sent on load, on Retry and on the browser's `online` event, and cleared only when the server confirms. `docs/12-journey-sync.md`.)*
6. Performance budget in writing: Lighthouse ≥ 95, first paint < 1s, zero layout shift, 60fps pan on a mid-range Android. Re-measure after every phase, not at the end.
7. Vitest for the pure functions only: `distance.ts`, `projection.ts`, `route.ts` (shortest path on a toy graph), the stations pipeline's filters. No component tests in v1. *(Partly, 2026-10-11: no Vitest, but `scripts/check-draw-in.ts`, `check-merge.ts` and `check-search.ts` run plain-Node assertions over the pure functions that broke in practice. `route.ts` and `projection.ts` have none.)*
8. Error boundary + a human error screen ("The map hit a problem — reload usually fixes it") instead of a white page. Console is the error tracker; no Sentry (per `00-decisions.md`).
9. A `CHANGELOG.md` you actually update — it becomes the case-study's raw material.

---

## Phase 7 — The Polish Pass *(week 6 — no new features, run the protocols)*

Run [[UI Craft - The Polish Pass]] end to end: squint, greyscale, flip, 400% zoom, computed styles, 10× slow-mo, hostile content, real phone outdoors, cold open, annotate-before-fixing. Fix in severity order. Re-score the 9 dimensions; the delta from 19/45 is the week's output. Then: case study, 30-second capture, post it, send Vidit the link.

---

## Phase 8 — Ideas: good-to-haves, in rough value order *(nothing here before v1 ships)*

**Language (the one you asked about)**

1. A Hindi/English toggle is *very* on-brand — station boards are bilingual by law. Do it in two tiers. Tier 1 (cheap, v1.1): the station-board component always shows both scripts, and station names get Hindi via a lookup file — no framework. Tier 2 (real i18n): UI strings move to a `en.json`/`hi.json` pair behind a tiny `t('logJourney')` helper. *(Explained simply: internationalisation frameworks mostly solve problems you don't have — plurals in twelve languages, right-to-left layouts. For two languages and ~40 strings, a JSON file per language and a function that picks from it is the whole system.)* Numbers stay Indian-format (`1,00,000`) via `toLocaleString('en-IN')` — which you're already doing.
2. Hindi station names data: the raw source doesn't carry them; an open list exists in IR's public station master. Treat as a data-pipeline task, not a UI task.

**Map ideas**
3. Zoom-to-journey from the log list (tap an entry → fly-to its bounding box).
4. "Replay my year": plays all routes drawing in chronological order — passport-card companion, extremely shareable.
5. Railfan layer toggle: zones coloured, division boundaries, junction emphasis — the audience that will actually find this app.
6. Terrain hint at deep zoom: a subtle elevation tint (free DEM tiles exist, but this may violate the no-tiles principle — prototype before committing).
7. Night-run styling: journeys logged on overnight trains render with a slightly different treatment (dashed glow) — data you already have from the date field.

**Product ideas**
8. Paste-a-ticket AI parse (built in Phase 4) surfaced as the *primary* add flow once trust is earned; manual stays one tap away.
9. Sound + haptics, **off by default**: a soft station-bell tick on unlock, `navigator.vibrate(10)` on save. Sound in UIs is trespassing unless invited.
10. Journey notes → "one line per trip" journal view; your Vellore notes are the seed. No photos in v1.x (storage, moderation, layout — a big feature in a trench coat).
11. Streak-free by design: no daily-use mechanics, ever. The honest reward is the map. (Write this down so future-you doesn't add one.)
12. Shared family map, friends, leaderboards: still **no** — the moment it's comparative the reward changes meaning. Revisit only if someone actually asks.
13. GPX/GeoJSON export of routes — costs an afternoon, delights exactly the railfan audience.
14. Wrapped-style yearly recap page (December), built from the passport card + replay.

**Platform/native (post-web only)**
15. Home-screen widget and share-sheet target need a native wrapper (Capacitor). Only if daily use proves out.

---

## Colour combinations for the map

Three complete, contrast-checked combinations. The rule: **pick one as the identity** — the others can become unlockable themes later (a milestone reward that costs nothing and is deeply on-brand: "unlock the Rajdhani livery at 5,000 km").

### A. ICF Night *(current — the committed identity)*

The blue ICF coach at night; signage glows against it.

| Role              | Hex                       | Note                                    |
| ----------------- | ------------------------- | --------------------------------------- |
| Ground            | `#0A1C33`               | coach navy, deepened                    |
| Land / visited    | `#0C2140` / `#143355` | widen this gap in Phase 1               |
| Route (travelled) | `#EAB143`               | station-board yellow — 8.9:1 on ground |
| Numerals          | `#EECB9A`               | stencil cream — 11.1:1                 |
| You-are-here      | `#E85C50`               | the only red on screen                  |
| Station field     | `#7E93A6`               | drawn at 0.6 alpha                      |

### B. Rajdhani *(dark alternative — the premium livery)*

The maroon LHB Rajdhani coach with its gold band. Warmer, more formal, feels like first class.

| Role              | Hex                       | Contrast                                               |
| ----------------- | ------------------------- | ------------------------------------------------------ |
| Ground            | `#221014`               | deep maroon-black                                      |
| Land / visited    | `#301820` / `#43222E` |                                                        |
| Route (travelled) | `#E2B13C`               | gold band — 9.2:1 on ground, 8.3:1 on land            |
| Numerals / ink    | `#F0DFC8` / `#F2E9E4` | 14.0:1 / 15.2:1                                        |
| You-are-here      | `#E85C50`               | unchanged — semantic red stays constant across themes |
| Station field     | `#A89A8E`               | 6.0:1 on land                                          |

### C. Vande Bharat *(light alternative — the modern livery)*

White-and-saffron of the newest trains. A light theme with real identity instead of an inverted dark one.

| Role                     | Hex                       | Contrast                                          |
| ------------------------ | ------------------------- | ------------------------------------------------- |
| Ground                   | `#F2F4F6`               | cool white                                        |
| Land / visited           | `#E3E8ED` / `#F4E3CE` | visited warms toward saffron                      |
| Route (travelled)        | `#C2590B`               | saffron, darkened to pass — 3.6:1 stroke on land |
| Accent text              | `#A64A08`               | 5.3:1 on ground                                   |
| Route fill / big moments | `#E8720C`               | full saffron as a FILL with navy text only        |
| Ink                      | `#12283F`               | the ICF navy doing duty as ink — 13.6:1          |
| You-are-here             | `#B4302A`               |                                                   |

Two implementation notes. First, only the tokens change between these — the code never mentions a hex, so a theme is a ~15-line block in `tokens.css`. Second, the vermillion "you are here" stays the same family in all three, because semantic colour should survive re-theming; if the meaning-colours change with the mood-colours, users have to relearn the map per theme.

---

## How to use this document

Each evening session: open the current phase, pick the top unchecked item, do only it. When an idea arrives mid-work, it goes into Phase 8 — never into the current phase. The list is exhaustive precisely so that nothing new deserves to jump the queue.
