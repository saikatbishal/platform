# Decisions

Every choice here, with the reason and what it cost. If you disagree with one
later, change it — but write down why, so the next you knows.

Recorded 28 August 2026. Versions checked against the npm registry the same day.

---

## 1. Browser app, not a native app

**Decided: a mobile-first web app, installable to the home screen.**

The logging moment is mobile — you're standing on a platform having just got
off a train. That argues for native. Three things argue louder for the browser:

**The deliverable is a URL.** The plan ends with posting the project publicly and
sending Vidit the link. An APK or a TestFlight build cannot be clicked from a
tweet. The shareable passport card only works if there's a page behind it.

**Every skill you have already transfers.** React, TypeScript, Tailwind, shadcn,
Motion — all web. Learning React Native inside the same six weeks in which the
front end has to reach top 0.1% is how the project dies. Two weeks of framework
friction is 4% of a 46-hour budget spent before the first pixel.

**The map is easier in SVG.** The hand-drawn India map is the centrepiece and the
single most important visual decision. In the browser it's SVG plus a projection
function. In React Native it's react-native-svg or Skia — more friction, and
none of it transferable.

Installed to the home screen via the PWA manifest, it launches full-screen with
no browser chrome. Most people can't tell.

**What this costs, honestly:**

- No reliable background location, so a journey can't be detected automatically.
- No home-screen widget.
- iOS web push works only once the app is installed, and is fiddly.
- No iOS share-sheet target, so you can't share a ticket *into* the app.

None of those are in v1 scope. If one becomes essential later, the same React
code can move to Expo with the map as the only real rewrite.

---

## 2. Vite, not Next.js

**Decided: Vite 8 + React 19 + TypeScript 7.**

Next.js earns its complexity when you need server rendering, SEO, or server-side
data fetching. This app is entirely behind a Google login, so no page needs to be
crawlable, and Supabase already is the backend, so API routes have nothing to do.
What's left of Next.js is a heavier mental model — App Router, server components,
the client/server boundary — for no gain.

Vite's rebuilds are near-instant, which matters more than anything else during
weeks 4 to 6, when the work is a hundred small polish passes.

**Cost:** if this ever needs a public marketing page or server-rendered share
previews, that's a second small project (or a static page) rather than a flag.

---

## 3. Tailwind 4, with the palette as CSS variables

**Decided: Tailwind 4.3 via `@tailwindcss/vite`, tokens in `src/styles/tokens.css`,
bridged into Tailwind's theme with `@theme inline`.**

The palette must exist in exactly one place. `tokens.css` holds the real values;
`index.css` maps them into Tailwind so `bg-ground`, `text-cream`,
`stroke-route-taken` all work. Change a colour in one file and both plain CSS and
every utility class follow — including the light theme, with no rebuild.

**Cost:** `@theme inline` is Tailwind-4-specific syntax. Fine, since v4 is stable.

---

## 4. shadcn/ui — added per component, never installed upfront

**Decided: copy in individual components as needed, don't add a dependency.**

shadcn is copy-in rather than a package, which is exactly why it suits this
project: any component that doesn't match the visual direction can be rewritten.
A component library you can't override will quietly drag the whole app toward
looking generic, and looking generic is the one failure mode that matters here.

Add them one at a time (`npx shadcn@latest add dialog`) when a screen actually
needs one. Nothing is in `package.json` for it today.

---

## 5. Motion for animation

**Decided: `motion` 13 (the package formerly published as framer-motion).**

The reward loop *is* animation — routes drawing in, states filling, numbers
moving. That deserves a real library with proper spring physics and layout
animations, not hand-written CSS transitions. It's the one dependency where the
project's quality depends directly on the tool.

---

## 6. The map is hand-drawn SVG. d3-geo does the maths only.

**Decided: `d3-geo` for projection, no map library, no tiles.**

This is the decision that makes the project look like nothing else. Mapbox or
Leaflet would be faster to build and would produce something that looks like
every other map app.

`d3-geo` is used purely for coordinate maths — no rendering, no DOM, a few
kilobytes. `src/lib/projection.ts` uses conic conformal with the Survey of India
standard parallels rather than Mercator, because India spans 8°N to 37°N and
Mercator visibly stretches the north.

**Cost:** you write the rendering yourself, and there's no free pan/zoom. Both
are budgeted in week 2, and they're where the craft shows.

---

## 7. Supabase, Google sign-in only, row-level security

**Decided: Supabase (Postgres + auth), one OAuth provider, RLS on.**

The 82 MB schedules file needs real Postgres, which rules out Firebase. Auth and
the database in one service means no separate backend to deploy for v1.

One provider, because every additional one is a password-reset flow, an email
deliverability problem, and a settings screen you didn't want to build.

Access control lives in the database (`supabase/schema.sql`), not in frontend
queries — so a bug in the UI cannot become a data leak. The anon key in `.env` is
*meant* to be public; RLS is what protects the data.

---

## 8. Server state is TanStack Query. There is no state library.

**Decided: `@tanstack/react-query` for journeys, React's own state for the rest.**

Almost all state here is server state — the journeys — and that's a caching
problem, not a state-management problem. What's left is a form and a couple of UI
toggles, which `useState` handles. Redux or Zustand would be ceremony around
nothing.

If genuine cross-tree client state appears later (a map viewport shared between
distant components), add Zustand then, for that one thing.

---

## 9. AI: one Edge Function, and the key never reaches the browser

**Decided: a single Supabase Edge Function that parses a pasted ticket into
structured fields. `zod` validates what comes back.**

Deliberately small. A project whose value is an AI wrapper has no front-end
story, and the front end is the entire point. Here AI removes typing from one
form — a garnish, and the case study should say so plainly.

**The rule that matters:** the model API key goes in the Edge Function's secrets
(`supabase secrets set ANTHROPIC_API_KEY=...`), never in a `VITE_` variable.
Anything prefixed `VITE_` is compiled into the JavaScript bundle and readable by
anyone. This is the same pattern as your Atelier project, where the key stays
server-side.

---

## 10. Everything else

| Thing | Choice | Why |
| --- | --- | --- |
| Routing | `react-router` 8 | Two or three routes. Nothing exotic needed. |
| Validation | `zod` 4 | Only where input is untrusted: the form, and the AI response. |
| Install | `vite-plugin-pwa` | Home-screen install is what makes a web app feel native. |
| Hosting | Vercel | Free, deploys on push, real domains. |
| Node | 22.18+ or 24 | The data script is TypeScript run directly by Node, no build step. |
| Tests | Vitest, later | Worth it for `distance.ts` and `projection.ts` — pure functions with real edge cases. Not before week 4; there's nothing stable to test yet. |
| Linting | none yet | Add Biome in week 4 if the codebase gets messy. Early linting is a way to feel productive without shipping. |

---

## 11. The app works before sign-in

**Decided: anyone can log journeys, see the map fill in, and earn milestones
and a rail pass without an account. Sign-in saves them; it does not unlock
them.** Reversed 17 September 2026, from "entirely behind a Google sign-in".

The old shape put a station-name board over the map with a Google button on it.
It was the loudest thing on the screen and it asked for a decision before
anyone had seen what they were deciding about. For a consumer product that is
the standard way to lose most of your visitors: the drop-off does not happen
after sign-up, it happens at the sight of it.

So the value comes first. Journeys logged without an account go to the `anon`
bucket that `journeyStorage.keyFor(null)` already described, and on first
sign-in they are merged into the account — see `mergeJourneys`, and
`scripts/check-merge.ts`, which exists because that function's bug does not
throw, it eats somebody's travel. The account's own copy wins every collision,
because a stale device must never overwrite the server.

Sign-in moves to a 44px Google mark in the top-right corner, and the labelled
button appears only in the save prompt, which states the count: *"3 journeys,
saved in this browser only. Sign in and they follow you to any device."* The
number is the argument.

Two smaller things fall out of the same reasoning. The primary action sits
**above** Milestones and Rail pass, not under them, because it is the only
thing on that screen a new visitor should feel any pull toward. And Milestones
and Rail pass gate on whether *you* have journeys, not on whether you are
signed in — at zero they stay hidden, because milestones would be counting
progress against somebody else's sample journeys and the pass would hand out a
card reading 0 km / 0 stations / 0 states, which looks broken rather than
empty.

**What this costs, honestly:**

- A merge path that has to be right the first time. Storage is no longer one
  keyed bucket per user; it is two buckets and a handover.
- `docs/09-auth-go-live.md` and the RLS model still assume every row has a
  user. Anonymous rows live only in `localStorage`, so someone who clears their
  browser loses them with no way to recover. The save prompt says so.
- Two people on one browser who never sign in share one bucket. Acceptable:
  that was already true, and signing in is what separates them.

---

## 12. Auto-logging arrives by email, not by camera

**Decided: ingest the IRCTC confirmation email. OCR of a photographed ticket is
third in line, behind the share page.** This reverses the "email ticket import"
entry in the README's *Not in v1* list.

OCR is the demo-friendly version; email is the one that works. An IRCTC
confirmation is highly structured text — PNR, train number, from, to, date,
class — across a handful of template variants. Parsing text beats parsing
pixels on accuracy, on cost, and on the amount of code. What made TripIt feel
magic was always the inbox, not the camera.

The shape: a per-user secret address (`<name>.<token>@log.<domain>`), inbound
mail caught by Cloudflare Email Workers or Resend, a Supabase Edge Function to
parse, deterministic patterns for the known templates and a model call only for
the ones that miss.

The secret address is the credential, not decoration. Inbound email is
unauthenticated and `From:` is trivially spoofable, so matching the sender
against a known user's address is not a control — the address itself has to be
unguessable.

**What this costs, honestly:**

- SMS is where most Indians actually receive the ticket, and SMS ingestion
  needs a shortcode registered under TRAI's DLT regime. Expensive, slow, and
  probably never.
- An inbound-mail provider is a new dependency with a free tier that can
  change, weighed against the alternative of not having the feature.
- Parsing somebody's mail is the most sensitive thing this app will do. The
  Edge Function sees ticket emails; that needs saying out loud in the UI before
  anyone is asked to forward one.

---

## 13. "Passport" becomes "rail pass"

**Decided: the shareable card is a rail pass. The directory is
`src/features/railpass/`, the component is `RailPass`, the download is
`platform-rail-pass.png`.**

"Passport" was borrowed from a different mode of travel, and it showed. But it
was doing real work — everyone understands a document that collects stamps —
so the replacement had to keep the collecting metaphor rather than just being
more accurate. "Route card" and "logbook" are both more railway-correct and
both colder.

Indian Railways sells the *Indrail Pass*, so "pass" is native rather than
borrowed, it keeps the sense of a document you carry that accrues travel, and
it is two syllables, which matters on a button.

**What this costs, honestly:** a rename across a directory, a component, a
filename and four docs, for a word. Worth it while there is one user; it would
not be worth it later.

---

## 14. The light theme gets designed first, and it goes cool

**Decided: light becomes the theme that receives design attention, and its
ground moves from warm cream to a pale blue-grey. Board yellow does not
change.**

The light theme reads as machine-made, and the reason is specific rather than
vague: a warm off-white ground plus an amber accent plus beige mid-tones is the
house palette of every AI-built app on the internet right now. It does not read
as designed, it reads as default. The fastest way out is not better warm — it
is not-warm.

The escape is already half-written into `tokens.css`. Board yellow is declared
there as *paint, not palette* — identical in both themes, because an Alwar
Junction board is the same yellow at noon and at 2 a.m. On cream it blends. On
a cool grey it is the most arresting thing on the page. The fixed anchor does
the work.

Dark stays as it is for now, which means bare `:root` still carries it while
light is the theme being designed — an inconsistency worth naming rather than
hiding.

**What this costs, honestly:**

- `tokens.css` derives every value from photographs of real paint. A cool
  ground is not in those photographs, so this is the first colour in the system
  that is chosen rather than sampled. `docs/04-palette.md` has to say so.
- Every contrast ratio in that file is re-measured, not adjusted by eye.
- The oxide-red accent is currently spoken for: `--oxide` means "planned, not
  yet travelled". Promoting it to accent needs that meaning moved somewhere.

---

## 15. A share page, not live tracking

**Decided: a journey can be shared as a page a parent can open without an
account, rendered from the scheduled timetable. No live train status.**

"Not a live-tracking app" stays load-bearing, and this does not break it. The
moment the product promises live status it is standing next to NTES and Where
Is My Train, who have real-time feeds it does not have and will not get.

But the emotionally valuable half needs no live data at all. Given a future
ticket, the train number and the date are enough: the `traintimes` shards
already in `public/maps/` carry the full scheduled stop list, so the page can
say *"Bishal is on 12302. Kanpur 21:14, Delhi 06:15 tomorrow"* from static data
that is already built and shipped.

Push notifications are deliberately not part of this. Web push is fine on
Android, but the person being notified would have to install the PWA, and that
is a large ask of somebody's mother. A link needs no install.

**What this costs, honestly:**

- A public page means a row readable without auth — the first hole in "RLS
  protects everything", and it needs its own deliberately narrow policy and an
  unguessable id.
- Scheduled times are wrong the moment a train is late, and the page will be
  read as truth. It has to say "scheduled" on its face, the way distances say
  "as the crow flies".
- Anyone holding the link sees where someone is travelling and when. That is
  the most sensitive thing the product would publish, and revoking a link has
  to exist before sharing one does.

---

## What I deliberately did not choose

Writing this down is the point — it's the scope discipline the plan asks for,
practised where the stakes are low.

- **No monorepo.** One app, one `package.json`.
- **No component library beyond copy-in shadcn.** See §4.
- **No i18n framework.** Station names come from the data. If Hindi labels are
  wanted on the station-board component, that's two fields, not a library.
- **No analytics.** One user.
- **No error-tracking service.** The console is enough at this size.
- **No Storybook.** Tempting, and it would eat a week.
- **No CI.** Vercel's build on push is the check that matters.
- **No Docker.** Nothing to containerise.

Each of these is a real tool that would be correct on a team project. On a
46-hour solo project they're all ways to look busy.

---

## Verified, not assumed — 28 August 2026

The whole scaffold was installed and built before being handed over, in a clean
environment. Results:

```
npm install     380 packages, 44s
npm run typecheck   clean (both tsconfigs)
npm run build       621ms → 67.8 kB gzipped JS, 3.2 kB gzipped CSS
                    PWA service worker generated, 7 precache entries
npm run data:build  8,470 stations, 0.78 MB, 31 states,
                    4,363 states derived from coordinates
```

Palette resolved correctly in both themes through the Tailwind `@theme inline`
bridge — dark ground `#0A1C33` / accent `#EAB143`, light ground `#F4F1EA` /
accent `#8A5A0F`. No console errors, no horizontal overflow at 390 px.

### Two things that broke, and the fixes

**TypeScript 7 removed `baseUrl`.** The usual `"baseUrl": "."` plus
`"paths": {"@/*": ["src/*"]}` is now a hard error (TS5102 and TS5090). Paths must
be relative: `"paths": {"@/*": ["./src/*"]}` and no `baseUrl` at all. Worth
knowing, because almost every tutorial and starter still has the old form.

**Node types needed splitting out.** `scripts/build-stations.ts` and
`vite.config.ts` use `process`, `Buffer` and `import.meta.dirname`, which need
`@types/node`. Adding `"node"` to the app's `types` array would work, but it also
puts Node globals in scope inside `src/` — so browser code could reference
`process.env` and typecheck fine, then fail at runtime. Two configs instead:
`tsconfig.json` for `src/` with browser types only, `tsconfig.node.json` for the
Node-side files. `npm run typecheck` runs both.

### One nicety

`npm run data:build` is plain `node scripts/build-stations.ts` — no flag, no
build step. Node runs the TypeScript directly by stripping the types. Requires
Node 22.18+; you're on 24.18.
