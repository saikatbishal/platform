# Platform — design system

**Platform** is a personal record of every train journey its author has taken
across India, drawn as a hand-built map of India that fills in as they travel.
A mobile-first browser app, installable to the home screen, entirely behind a
Google sign-in. One user: the author.

Three sentences from the repository README are load-bearing, and they define
the product more sharply than any feature list: it is **not** a booking app,
**not** a live-tracking app, **not** a social network.

The stated point of the project is front-end craft — "it exists to be visibly,
on inspection, better made than a competent engineer would produce from the
same brief." That shows up everywhere in this system: the palette is sampled
off photographs of real paint rather than designed, the map refuses to be a
tiled map library, and the type scale escapes its own ratio below 15px because
a scale you have to keep escaping is not a scale.

## Sources

Everything here was read from one public repository:

- **https://github.com/saikatbishal/platform** (branch `main`) — the app,
  its `src/styles/` token files, the design docs under `docs/`, and the brand
  marks under `public/` and `docs/brand/`.

The reader is encouraged to explore that repository directly: `docs/04-palette.md`
carries the full contrast table and the sampling notes, `docs/00-decisions.md`
records every stack choice and its reason, and `CLAUDE.md` at the repo root is a
short, blunt list of the rules this system is built to keep. `github.md` in this
project records the sync state.

No Figma file, slide deck, or marketing site was provided. The two images the
user uploaded (`uploads/apple-touch-icon.png`, `uploads/og.png`) are the same
files as `public/apple-touch-icon.png` and `public/og.png` in the repository.

---

## Content fundamentals

The voice is **plain, specific, and slightly unwilling to flatter you.** The
repository states the rule directly: never write empty states, error messages
or button labels as filler — "write them as a person would speak, specific to
what happened and what to do next."

**Person.** Second person, sparingly. "Your rail life, on one map." "Log a
journey in fifteen seconds and watch India fill in." The product never says
*I*, and it never says *we* — there is no company here.

**Casing.** Sentence case for anything that is a sentence. Uppercase for
labels only, and only at `--text-label` with `--tracking-label` — `KILOMETRES`,
`LOG A JOURNEY`, `NOT DRAWN`. Never uppercase a full sentence, never title-case
a heading.

**Numbers are honest and specific.** `4,182 km — past 1,000`, not
"Milestone unlocked!". Locked milestones state what is true right now —
`4 of 5 states` — rather than encouraging you. Distances are great-circle, so
they undercount, and the UI says "as the crow flies" instead of hiding it.

**Failure is information the user is owed.** A journey the map cannot route is
not dropped: it gets a `Not drawn` cell in the totals and a hollow endpoint on
the map, because a journey contributing 0 km to a figure labelled
"Kilometres" makes that figure wrong, not incomplete.

**Explain the data's limits rather than erroring.** No through train in the
timetable is not an error — it produces: *"No through train in the timetable.
The route will be drawn as the shortest path instead."*

**No emoji, anywhere.** The only non-alphanumeric glyphs in the interface are
a `✓` and a `·` on milestone rows, a `▾`/`▸` on the collapsible stat row, an
`≈` on the sea-pause button, and a `–` en-dash separator. They are UI marks,
not decoration.

**Indic scripts are content, not ornament.** The station board carries its name
in Devanagari, Latin and the state language, in that order, because that is the
order on a real board.

| Not this | This |
| --- | --- |
| No trains found. | No through train in the timetable. The route will be drawn as the shortest path instead. |
| Enter a note… | Overnight, top bunk. |
| Sign in to continue | Your rail life, on one map. |
| Achievement unlocked! 🎉 | 4,182 km — past 1,000 |
| Close | Take the board down and look at the map *(as an aria-label)* |

---

## Visual foundations

### The origin

The palette was sampled from five reference photographs of Indian Railways
rolling stock and signage on 28 August 2026. Every colour is a measured value
off a real painted surface: the lower panel of coach 00296 is `#0D2242`, the
Alwar Junction sign is `#EAB143`, the stencilled numerals are `#EECB9A`. The
ground is not a designed dark — it is the paint.

**Dark is the primary theme.** Light is not an inversion: the ground becomes
the whitewashed platform stripe, and both loud accents change value, because a
yellow bright enough to glow on navy is invisible on paper. Which theme is
active is decided by the **time of day**, not the OS and not a switch — dark
from 18:00, light from 06:00, stamped before first paint so a load after dusk
never flashes the day palette.

### The four traps

1. **`--accent` (#EAB143) is a fill, not a text colour.** On white it is 2.0:1.
   Navy on that yellow is 7.8:1 — the station-board pattern. In light mode the
   token splits: `--accent` darkens to a readable bronze, `--accent-fill` keeps
   the true yellow for fills only.
2. **`--vermillion` is not a second accent.** Errors and one "you are here"
   marker. The moment two things are red, neither is urgent.
3. **`--cream` is for large numerals only** — `--text-xl` (24px) and up. Muddy
   below about 20px.
4. **Never use a neutral grey.** Every neutral here is warm — ballast at H33,
   steel at H27. A `#808080` reads as a bug. Use `--steel`.

A fifth rule, specific to the board: `--board`, `--board-ink`, `--board-edge`
and `--board-frame` are declared **once** at `:root` and are identical in both
themes. An Alwar Junction board is the same yellow at noon and at 2 a.m. Those
four are paint, not palette.

### Type

Four families, three roles. **Archivo** (400/600/800) for Latin display and
interface — a squarish grotesque, chosen because the signage is squarish and a
humanist face fights it. **IBM Plex Mono** (400/600) for every figure and
station code, tabular by construction so a counting number cannot jitter.
**IBM Plex Sans Devanagari** and **Noto Sans Bengali** (400) for the board's
other two scripts. Both text stacks list the script faces after Archivo rather
than switching stack per element — a browser resolves a stack per character.

The scale is 15px base, ×1.25 upward, stepping by a pixel or two below the base
because at 11–15px a 1.25 ratio jumps straight past the sizes UI chrome needs.
Line-height falls as size rises: 1.6 at 15px, 1.05 at 37px. `--text-label`
(11px) is the bottom step and nothing goes below it; it survives at that size
only because it is uppercase and tracked at 0.14em. Station codes get 0.2em,
because a code is read as letters rather than as a word. One fluid step exists,
`--text-board`, for the board's name line — a painted object should fill its
board at any width.

### Space, radius, borders

A 4px scale, used lightly: 8px is the default gap between stacked controls,
12px a control's horizontal padding, 20px a sheet's. Radii are near-square
because this is a signage system: **2px** for the nameplate, the board and the
board chip; **4px** for buttons, inputs, cards and list rows; **8px** for the
one sheet; a circle for the avatar and nothing else. Radii nest concentrically
— outer 2px, border 1px, inner 1px — so an inner corner is never sitting inside
a fatter curve.

Everything is separated by a **hairline** `--line`, 1px. The one 2px border in
the system is the board's white enamel, and it is a ring *inside* the yellow
rather than a border on it, because on a real board the yellow runs past the
white on all four sides.

### Shadow, transparency, blur

Two shadows. `--shadow-board` is `0 2px 0 0 rgba(18,40,63,0.35)` — a hard
offset with **no blur**, a painted object standing proud of its bracket.
`--shadow-sheet` is a conventional soft drop, used only by the modal and the
account popover. **Cards have no shadow at all**; a hairline does the
separating.

Transparency appears in exactly three places: the corner nameplate sits on
`--surface` at 90% with a 4px backdrop blur so the map reads underneath; the
sheet scrim is `--ground` at 60% with a 2px blur; and the achieved-milestone
row tints with `--accent` at 10% behind a 40% border. There are no glass
panels and no gradient fills anywhere except one — the canopy's radial lamp
glow, and the linear scrim beneath it that protects body copy.

### Imagery and illustration

There is **no photography**. The brand's only illustration is vector and
theme-aware: the platform canopy with two lit sodium lamps behind the sign-in
board, and the steel bracket the board hangs from. The reasoning is recorded in
the source — a photograph behind live type at a quarter opacity "contributes
nothing but weight and a JPEG's dark-area banding", and it would be the one
raster in an app whose whole argument is that the map is hand-drawn.

The map itself is the brand's largest surface: sea, land, and routes over a
field of 8,696 station dots drawn on canvas at 0.6 alpha. The field is
deliberately texture rather than subject. The travelled route is **true black**
read through a soft `--ink` halo — a dark line cut into a field of light, the
way a wet rail looks at night — rather than a light line on a dark field.

### Motion

Short and flat. Almost every transition in the app is a 150ms colour change on
`background-color`, `border-color` or `color`. Two exceptions: the board chip
lifts 1px on hover, and the sea moves — wave glyphs sway sideways over 10s,
specks drift on a different diagonal over 12s, each on its own negative-delay
phase, with an `≈` button that pauses all of it (an autoplaying loop longer
than 5s needs an explicit stop). A `prefers-reduced-motion` block collapses
every animation and transition to 0.01ms.

### Interaction states

**Hover** lifts the fill one step (`--surface` → `--surface-2`) and turns the
label `--accent`. On the account chip it turns the border `--accent`; on sign
out it turns the label `--vermillion` — the only destructive tint in the
system. **There is no distinct press state**: no shrink, no darkening. Focus is
a 2px `--accent` outline at 2px offset, except on inputs, where focus moves the
border itself to `--accent` and no ring is added on top. **Disabled** is opacity
0.4 on a primary button, 0.5–0.6 elsewhere; colours never change.

### Layout

Full-bleed map, chrome floating over it. The nameplate pins top-left, the
account chip top-right, and one bottom-left column stacks (in `column-reverse`,
so it grows upward) the totals strip, the log button and the secondary buttons.
The sign-in board is bottom-anchored on a phone for thumb reach and moves to
the top-right corner from `sm` up. Overlays are full-width bottom sheets on a
phone and centred modals from `sm` up. Nothing tappable is below 44px, and the
root honours `env(safe-area-inset-*)` — a mobile-first app that ignores safe
areas reads as a website pretending to be an app.

---

## Iconography

**There is almost none, and that is the finding, not a gap.** The source
repository contains no icon library, no icon font, no SVG sprite, and no
dependency on Lucide, Heroicons or anything comparable — consistent with
`docs/00-decisions.md`, which lists a component library among the things
deliberately rejected.

What exists instead:

- **Three inline SVGs, each drawn for one job.** A 12×12 close cross on the
  sign-in board (`stroke-width 1.6`, round caps). The `BoardBracket` rail and
  hangers. The `PlatformCanopy` roof, posts and lamps. All three are in
  `components/brand/`.
- **Google's "G"**, reproduced unaltered in its four official colours because
  their brand rules require it. It is the only multicoloured mark in the
  product, and it is deliberately the only thing on a neutral surface.
- **Unicode characters used as icons**: `✓` and `·` for milestone state,
  `▾`/`▸` for the collapsible stat row, `≈` for the sea-pause toggle,
  `+` prefixing "Log a journey" and "Add departure & arrival times". These are
  set in the running text face at running-text size, not styled as glyphs.
- **No emoji.**

**Guidance for new work:** do not introduce an icon set. If a control needs
identifying, give it an uppercase `--text-label`. If a mark is genuinely
required, draw it inline at the size it will be used, in `currentColor`, with a
1.6px stroke and round caps to match the close cross.

### Brand marks in `assets/`

`favicon.svg`, `icon.svg` (the source `docs/brand/icon.svg`), `og.svg` and its
rendered `og.png` (1200×630 — the station board hung under a lit canopy),
`apple-touch-icon.png`, `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`.
All copied verbatim from the repository; none were drawn or reconstructed here.

---

## Index

### Root

| File | What it is |
| --- | --- |
| `styles.css` | The entry point consumers link. `@import` lines only. |
| `readme.md` | This file. |
| `SKILL.md` | Agent-Skills front matter, for use in Claude Code. |
| `github.md` | Source repository, last sync, and the screen map. |
| `thumbnail.html` | The system's homepage tile. |

### `tokens/`

`fonts.css` (the four families + the metric-matched Archivo fallback) ·
`colors.css` (both themes, the board paint, the map semantics) ·
`typography.css` (families, the 15px scale, tracking, weights) ·
`space.css` (spacing, radius, borders, the two shadows, motion, tap target) ·
`base.css` (element defaults and the `.tabular` utility).

### `components/`

| Directory | Components |
| --- | --- |
| `brand/` | **StationBoard**, **BoardBracket**, **PlatformCanopy** |
| `core/` | **Button**, **BoardChip**, **VersionBadge**, **Sheet** |
| `forms/` | **TextField**, **SelectField**, **FieldLabel**, **FieldNote**, **StationPicker** |
| `data/` | **StatBar**, **MilestoneList** |
| `auth/` | **SignInButton**, **UserMenu** |

Each directory carries a `.card.html` specimen; each component a `.d.ts` props
contract and a `.prompt.md` with a usage example.

**Intentional additions.** The source has no generic primitives — it writes
button and input styling inline at each call site. Four components here
generalise a pattern that repeats verbatim in the source rather than inventing
one: **Button** (the three treatments used across `App.tsx`, `AddJourneyForm`,
`Milestones` and `PassportCard`), **Sheet** (the overlay wrapper repeated three
times in `App.tsx`), **TextField`/`SelectField`/`FieldLabel`/`FieldNote**
(the field markup repeated five times in `AddJourneyForm`), and **StatBar**
(the totals strip). **VersionBadge** and **BoardChip** are lifted from single
call sites in `App.tsx` because both are identity objects. Nothing else was
added: there is no Toast, Avatar, Tabs, Tooltip or Dialog here, because the
source defines none.

### `guidelines/`

Twenty specimen cards, grouped **Colors** (grounds, ink, accent, signature,
board paint, map surfaces, route semantics, light theme), **Type** (display,
body, labels, figures, three scripts), **Spacing** (scale, radius, shadow,
touch targets) and **Brand** (marks, share card, voice).

### `ui_kits/platform-app/`

The app's single surface, recreated and interactive: sign in, dismiss and
re-raise the board, log a journey, watch the totals and milestones change, open
the passport card. `README.md` in that directory lists exactly what it does and
does not reproduce — most importantly that the real map's Survey-of-India
geometry is generated at build time and is not in the repository, so this kit
substitutes public-domain Natural Earth geometry and twenty stations.

### `templates/app-screen/`

`AppScreen.dc.html` — the product's screen shell (full-bleed canvas, nameplate,
account chip, the bottom-left chrome column) as a starting file for a new
design, with the totals editable as tweaks.

### Substitutions to be aware of

- **Fonts.** The app self-hosts Archivo, IBM Plex Mono, IBM Plex Sans
  Devanagari and Noto Sans Bengali via `@fontsource` npm packages. Those
  binaries are not in the repository, so `tokens/fonts.css` loads the same four
  families from Google Fonts instead. Same families and weights, different
  delivery.
- **Map geometry.** Natural Earth stands in for the Survey-of-India district
  file. Natural Earth stops India at 35.50°N; the official boundary is 37.08°N,
  which is precisely why the real app refuses it.
