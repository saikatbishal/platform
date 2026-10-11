---
tags: [ui, design, craft, checklist]
date: 2026-08-30
status: in-progress
---

# UI Craft - The Polish Pass

> **One-line purpose:** how to inspect a UI objectively instead of asking "does this look nice" — the looking protocols, the question bank, and what they found in Platform v0.1.

**Repo copy.** The published page version carries the evidence images and live type
specimens; see HANDOVER.md for its link. Companions here: `docs/03-project-spec.md`,
`docs/04-palette.md`.

---

## The premise

Taste is not a thing you have. It is a **checklist you run until it becomes reflex**.
Nobody looks at a screen and simply *sees* that the tracking is 0.01em loose. They run
through a list, and after two years the list has gone underground.

So the work is: learn the list, run it deliberately, and let it sink.

---

## Part one — how to look

These come first because they are the force multiplier. Without a method you are asking
"does this look nice", which has no answer. With one you are asking "what does this test
say", which does.

| # | Protocol | What it catches |
| --- | --- | --- |
| 01 | **Squint** — blur heavily, or take your glasses off | Hierarchy. Whatever is still visible *is* your hierarchy, intended or not |
| 02 | **Greyscale** — drain the colour | Anything relying on hue to do a job lightness should do. Free colour-blind and sunlight test |
| 03 | **Flip it upside down** | Composition and balance, with meaning removed so you stop forgiving it |
| 04 | **Zoom to 400%** at 2× dpr, nearest-neighbour | Half-pixel seams, nested radius mismatches, broken optical alignment |
| 05 | **Read computed styles, not source** | Silent font fallbacks, values off the scale, `transition: all` |
| 06 | **Slow motion 10×** | Easing, duration, stagger. You *feel* wrong at full speed; you *see* it at a tenth |
| 07 | **Hostile content** — longest name, zero items, 999→1,000 | Layout that only works with the data you built it with |
| 08 | **Real phone, standing up, one thumb** | Reach, touch targets, sunlight, safe areas |
| 09 | **Come back cold** after a day | Your own first three seconds. You get one per build |
| 10 | **Annotate before you fix** | Everything. Separating diagnosis from repair is the whole technique |

**Protocol 10 is the one to internalise.** Screenshot, circle every single thing that feels
off without fixing anything, exhaust the screen, *then* repair hardest-first. Fix as you go
and you stop at the first easy win and call the pass done.

---

## Part two — the question bank

Ordered by how much each group changes the result. Nobody notices your easing curve if the
spacing is wrong.

### Hierarchy — makes every other fix pointless if wrong
- If I could keep only three visible things, are these the three?
- Does each level of importance differ by at least **two** attributes? (size alone is weak)
- Is there exactly one primary action per screen?
- What is the quietest thing, and should it be quieter still? *(Polish is usually turning down, not up)*
- Does the eye have a path, or does it bounce?

### Spacing and rhythm — the biggest amateur tell
- Is every gap on the scale? *(a stray 13px is the fingerprint of nudging until it looked right)*
- Is there more space **between** groups than **inside** them?
- Does a label sit closer to what it labels than to the previous item?
- Is the spacing optical or mathematical? *(a play triangle centred by bounding box looks left-heavy)*
- Do outer margins scale with the viewport?
- Does anything align that only *nearly* aligns? **Near-alignment is worse than none.**
- Is white space distributed, or pooled in one dead zone?

### Typography
- Does my type scale have a ratio, or arbitrary sizes?
- Does line-height change with size? *(display 1.0–1.15, body 1.5–1.65)*
- Is running text 45–75 characters?
- Large text tracked tighter, small caps tracked looser?
- Do numbers that change use **tabular figures**?
- More than two families or four weights?
- Do headings break sensibly? *(`text-wrap: balance`)*
- Real typographic characters — curly quotes, true minus −, en-dashes, non-breaking space in `427 km`?
- What does it look like **before** the webfont loads? *(`size-adjust` on the fallback)*

### Colour
- Can I justify every colour on screen?
- Is the accent rare enough to still mean something?
- Are my greys biased toward a hue? *(pure `#808080` reads as unconsidered)*
- Does it survive greyscale?
- Is dark mode designed, or inverted?
- Are secondary and disabled text distinguishable **from each other**?
- Is semantic colour separate from the brand accent?

### Depth and edges
- Is there one light source?
- Do higher elements have larger blur **and** more offset **and** lower opacity?
- Are shadows tinted with the surface hue rather than pure black?
- Am I mixing borders, shadows and fills to do the same job?
- Does inner radius = outer radius − border width?
- Do 1px borders survive at 2× and 3×?

### Motion
- Does anything animate linearly? *(nothing in the physical world does)*
- Is duration proportional to distance?
- Do exits run faster than entrances?
- Am I animating layout, or only `transform` and `opacity`?
- Can a gesture interrupt an animation mid-flight?
- Does it still make sense with `prefers-reduced-motion`?

### States — where generic output shows
- Have I designed empty, loading, error, partial and offline? *(most builds design one of five)*
- Does the empty state say **why** it is empty and offer one action?
- Is the loading state shaped like the content?
- Does every control have all six states? *(default, hover, focus-visible, active, disabled, loading)*
- Does the UI respond before the network does?
- What happens on a double tap?

### Words
- Does every control say what will happen? *("Log journey" → "Journey logged", never "Submit")*
- Does every error say what broke **and** what to do?
- Am I naming things the way a user would, or leaking my data model?
- Would I say this sentence out loud?

### The last two percent
Focus ring designed not default · selection colour set · cursor matches what will happen ·
44px touch target even when the icon is smaller · `scrollbar-gutter: stable` ·
`-webkit-tap-highlight-color` off · autofill background overridden · `aspect-ratio` on images ·
`overscroll-behavior: contain` · `env(safe-area-inset-*)` respected.

---

## Part three — what the pass found in Platform v0.1

Ten protocols, one morning, on the build as it stands.

**Critical**
1. **The accent is spent on a version badge.** The squint test shows the loudest object on
   screen is `PLATFORM v0.1`. The travelled route — the whole point of the product — is
   quieter than the chrome. Everything else is cosmetic next to this.
2. **The main reward is invisible in greyscale.** Filled states differ by hue and saturation
   but barely by lightness. Colour-blind users and anyone outdoors do not get the reward.
3. **No typeface is loaded.** Everything resolves to `system-ui`. Highest-leverage single fix.

**Medium**
4. Stat tiles are 115.8 / 97.1 / 80.0 px — sized by content, so dividers jump when a number
   gains a digit.
5. Touch targets are 40×40 against a 44px floor.
6. Half the phone screen is empty at 390px.

**Low**
7. Nested radius mismatch on the badge — outer 4px, border 2px, inner 0.
8. Labels at 9.6px (off the scale), two different tracking values for the same role,
   `transition: all`.
9. Chrome insets fixed at 12px — right for mobile, cramped on desktop.

**Score: 19 / 45.** Correct and normal for a working skeleton that has never had a design
pass. The gap is almost entirely in Part One, not in code.

---

## Part six — resources, by return on time

**Start here (a weekend)**
- **Refactoring UI** — Wathan & Schoger. Written for developers, almost entirely specific
  rules with before/after. If you read one thing, read this.
- **Web Interface Guidelines** — Rauno Freiberg / Vercel, free. The closest thing to Part Two
  written by someone who does it for a living.

**Reading, in the order that helps**
- **Practical Typography** — Butterick, free online. Start with typography-in-ten-minutes.
- **Don't Make Me Think** — Krug. One evening.
- **The Design of Everyday Things** — Norman. *After* Refactoring UI, not before.
- **Thinking with Type** — Lupton.
- **Shape Up** — Basecamp, free. Not a design book — a **scoping** book, and therefore the
  most directly useful thing here for the gap Vidit actually named.
- **Hooked** — Eyal. Vidit's recommendation.

**People**
- **Emil Kowalski** (emilkowal.ski, animations.dev) — best writing anywhere on interface
  animation. His course is the one paid course worth it for this goal.
- **Josh Comeau** — long careful interactive articles on CSS and interaction.
- **Nielsen Norman Group** — dry, and the only source backed by real research.

**Looking at things (15 min/week)**
- **Mobbin** — real shipped app screens, searchable by pattern. Most useful reference site
  for a developer learning UI.
- **The products themselves** — Linear, Stripe, Raycast, Things, Arc. Study shipped software.
- **Typewolf** — font pairings in the wild.
- **Laws of UX** — the psychology principles, one page each.

> **Avoid Dribbble and most design YouTube.** Dribbble rewards screenshots that would not
> survive real data, real states or real text lengths. Design YouTube is mostly people
> narrating Figma — the medium is poorly suited to a craft that lives in details you cannot
> see at 1080p. Emil's course is the exception, because motion is the one thing video shows
> better than text.

---

## Part seven — choosing type

**Six checks before you fall in love**

1. Large x-height? *(legible small, which is most of a UI)*
2. Open apertures? *(do c, s, e close into blobs at 12px?)*
3. Can you tell **I l 1** and **O 0** apart? *(critical — station codes are HWH, NDLS, BCT)*
4. Tabular figures? *(the kilometre counter changes)*
5. Real weight range? *(at least 400/500/600/700)*
6. Does it cover Devanagari? *(the station board is bilingual)*

**What I would use for Platform** — two families, three roles. The rule is *contrast, or one
superfamily, never two similar sans*.

| Role | Face | Why |
| --- | --- | --- |
| Interface and display | **Archivo** | A signage grotesque for an app about signage. Huge weight and width range |
| Figures and station codes | **IBM Plex Mono** | Unmistakable figures; mono makes data feel like data |
| The bilingual board | **IBM Plex Sans Devanagari** | Metrically matched to Plex — Hindi and Latin sit together instead of clashing |

Whatever you pick, set `size-adjust` on the fallback so the page does not jump when the
webfont arrives. A type decision that ships with a layout shift has undone half its benefit.

---

## Building the eye

- **Copy one screen exactly**, from the screenshot alone, until they overlay perfectly. You
  will discover that "clean" is forty precise decisions. More useful than a month of reading.
- **Keep a folder of things that feel wrong** with one line each on why. Within a month the
  same eight problems recur — those eight are your missing vocabulary.
- **Twenty minutes per element, maximum.** Past that you are fiddling, not designing.
- **Change one variable at a time.** Simultaneous changes teach you nothing.
- **Ask "compared to what?"** Keep the old screenshot open beside the new one. You will often
  find you made it worse.

> The top 0.1% is not a different skill from the top 10%. It is **the same checklist, run
> more times, on smaller things, by someone who has stopped being able to not see them.**
