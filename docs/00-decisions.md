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
