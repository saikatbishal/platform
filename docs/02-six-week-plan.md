---
tags:
  - plan
  - career
date: 2026-08-27
horizon: 2026-08-28 → 2026-10-12
budget: 9 hrs/week (7 project + 2 growth)
---
# The Next Six Weeks — 28 Aug to 12 Oct 2026

Total budget: about 9 hours a week for six and a half weeks. That's roughly **59 hours**.
Split: **~46 hours on the project** (4 in week 0, then 7 a week), **~13 hours on reading and product sense.**
The work-habit items (scope notes, PRD flags) cost no extra time — they happen inside
hours I'm already being paid for.

Fifty-nine hours is not a lot. That's the reason the project spec has a brutal v1 cut.
Every hour spent on a feature nobody asked for is an hour not spent on the polish that
is the entire point of the exercise.

> **The one rule:** design before code, ship before polish, polish before adding.

---

## Every week, without exception

- [ ] **One product teardown** — five questions, fifteen minutes, written in Obsidian under `2 - Random Thoughts`
- [ ] **One scope note** — on the biggest ticket of the week, posted in the ticket, author tagged
- [ ] **One surprise logged** — a single line: what caught me out this week
- [ ] **Read ~40 pages** of the book Vidit sends
- [ ] **Friday, 10 minutes** — did I hit my project hours? If not, what took them?

---

## Week 0 — This weekend (28–31 Aug) · 4 hrs · *Prove the data before designing anything*

The whole project depends on the rail dataset being usable. Find out now, not in week 3.

- [X] Download `stations.json` from the DataMeet repo (1.8 MB, 8,990 stations, public domain). Confirm it parses and that Howrah, New Jalpaiguri, and Katpadi (for Vellore) are all in it with sane coordinates
- [ ] Plot all points on a blank canvas with no styling at all. If the outline of India appears, the data is good and the project is real
- [ ] **Clean the station file.** 293 stations have no coordinates and ~150 are junk rows (codes like `XX-BECE`). Filter both out — leaves 8,470 usable
- [ ] **Derive the missing states.** 51% of stations have no `state` value, including Howrah, Sealdah and New Jalpaiguri. Point-in-polygon against an India state-boundary GeoJSON, once, as a build step. Ship a cleaned file. This rescues the "states unlocked" feature before it's built
- [ ] Skim `schedules.json` (82 MB) — check that the trains I actually take exist in it
- [ ] Create the repo. Vite + React + TypeScript + Tailwind. Nothing else yet
- [ ] Write the one-sentence pitch at the top of the README and don't change it for six weeks

**Done when:** a shape recognisable as India is on my screen, drawn from real data — and every
station in my cleaned file has a state.

> If the data turns out to be unusable, stop here and pick a different idea.
> Better to lose four hours than three weeks.

---

## Week 1 — 1–7 Sep · 7 hrs · *Design. No application code.*

Hardest discipline of the whole plan, and the one that decides whether the result looks
top 0.1% or looks like everything else. If I start coding this week, I will end up
designing in CSS, and designing in CSS produces average interfaces.

- [ ] **Collect references first (1.5 hrs).** Twenty screenshots into a Figma board. Not "nice websites" — specifically: map interfaces, collection/completion UIs, transit design, passport and stamp aesthetics. Mobbin and Dribbble are already in my notes; use them
- [ ] **Pick the visual direction (0.5 hr).** One sentence I can hold myself to. My starting instinct: *the view from a night train window* — deep ink background, warm amber for what I've travelled, everything else quiet
- [ ] **Build the type and colour scale (1 hr).** One typeface, one accent, five greys, a real spacing scale. Decide it once here so I never argue with myself in code
- [ ] **Design exactly two screens (3.5 hrs), desktop and mobile:** the Map, and Add a Journey
- [ ] **Name it.** Working title is Rail Passport. Alternatives: *Sleeper*, *Platform*, *Kilometre*

**Done when:** two screens exist in Figma that I'd be happy for someone to see, and I
haven't opened the editor.

---

## Week 2 — 8–14 Sep · 7 hrs · *The map, with fake data*

- [ ] Render the map of India — SVG paths from station coordinates, no map library, no tiles (2 hrs)
- [ ] Hard-code three of my own real journeys as fake data. Make the routes draw themselves in on load, station nodes light up as they're reached (2.5 hrs)
- [ ] Pan and zoom that feels right on a phone. Momentum, sensible bounds, no jank (1.5 hrs)
- [ ] Station search that filters 8,470 entries with no perceptible lag (1 hr)

**Done when:** I can pinch-zoom into West Bengal on my phone and see my own line to
Vellore drawn across the country, and it's smooth.

> **Trap to avoid:** reaching for Mapbox or Leaflet. A tiled world map will make this look
> like every other map app. Drawing India myself from the coordinates is what makes it
> look like nothing else, and it's less work than it sounds.

---

## Week 3 — 15–21 Sep · 7 hrs · *Make it real and put it online*

This is the ship week. Not the finished week — the *live and being used* week.

- [ ] Supabase project: tables, row-level security so my data is mine (1.5 hrs)
- [ ] Google sign-in only. No email, no password, no reset flow (1 hr)
- [ ] Add-a-journey form actually saves. From station, to station, date, train, notes (2 hrs)
- [ ] Load real journeys onto the map (1 hr)
- [ ] Deploy to Vercel with a real domain (0.5 hr)
- [ ] **Backfill every train journey I can remember.** This is not testing — this is being the first user (1 hr)

**Done when:** it's on a URL, and my own travel history is in it.

---

## Week 4 — 22–28 Sep · 7 hrs · *The reason to come back*

Now the collection layer. This is where the product sense shows, and where the book
should be paying off.

- [ ] Stat tiles: kilometres travelled, stations collected, states unlocked, longest single journey (2 hrs)
- [ ] States fill in on the map as they're unlocked — the strongest single reward in the design. Works because week 0 derived the missing states (1.5 hrs)
- [ ] Milestones with honest thresholds — 1,000 km, 10 stations, 5 states. Real achievements, not participation trophies (1.5 hrs)
- [ ] **Polish pass one (2 hrs).** Every loading state, every empty state, every error message. Write the copy myself; do not let AI write the empty states — that's exactly where generic output shows

**Done when:** adding a journey feels satisfying rather than administrative.

---

## Week 5 — 29 Sep – 5 Oct · 7 hrs · *Mobile, sharing, and one small piece of AI*

- [ ] Full mobile pass. Thumb-reachable, safe areas, one-handed. Test on my actual phone, not the browser's device emulator (2 hrs)
- [ ] The shareable passport card — a single image summarising my rail life, worth posting (2 hrs)
- [ ] Paste a messy ticket or PNR text, get a structured journey back. One AI call, one job, done well. Nothing more (2 hrs)
- [ ] Accessibility sweep: keyboard navigation, focus rings, contrast, `prefers-reduced-motion` honoured (1 hr)

**Done when:** I'd send someone the link from my phone without apologising for anything.

---

## Week 6 — 6–12 Oct · 7 hrs · *The last ten percent, and telling people*

The week that separates good from top 0.1%. No new features. None.

- [ ] **Polish pass two (3 hrs).** Sit with it for an hour and write down every single thing that feels slightly off. Then fix them in order. Timing, easing, optical alignment, one-pixel problems, the transition that's 80 ms too slow
- [ ] Performance: Lighthouse above 95, no layout shift, first paint under a second (1 hr)
- [ ] Write the case study (1.5 hrs) — the problem, the three decisions I'd defend, the one I got wrong and changed. Not a feature list. This document is what makes the project readable by someone who won't click the link
- [ ] Record a 30-second screen capture of the single best interaction (0.5 hr)
- [ ] Post it. Twitter, with credit to design references. Send the link to Vidit (1 hr)

**Done when:** it's public, and the case study explains *why* rather than *what*.

---

## Running alongside — the work and reading track

**In the first two weeks (highest return, lowest effort):**

- [ ] Flag two genuinely unclear PRD terms in Notion, using the template, author tagged
- [ ] Build the shared glossary page in Notion from the six Plain-English files already in my vault
- [ ] Ask Vidit for the book link and for two or three specific Lenny's episodes
- [ ] Ask Vidit whether my PRD flags were the right ones — feedback on the feedback

**Across all six weeks:**

- [ ] Finish the book. About 40 pages a week is enough
- [ ] Six product teardowns written, one a week
- [ ] One unasked-for PRD drafted for a Rifa feature and shown to Vidit
- [ ] Six surprises logged, and reviewed together at the end

---

## How I'll know this worked

Not "did I finish the app." Four honest tests:

1. **Did I use it?** After a real journey, did I open it because I wanted to?
2. **Did someone unprompted say it looked good?** Craft is externally verifiable or it isn't real.
3. **Did the PRD flags change anything?** Did a document get clearer because I spoke up?
4. **Can I defend three decisions?** Three choices in the project I can explain, with the trade-off I accepted — not "I used Supabase because it was easy", but why this and not that, and what it cost.

If three of those four are true on 12 October, this was a good six weeks — even if the
app still has rough edges.
