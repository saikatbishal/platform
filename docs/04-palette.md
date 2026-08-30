---
tags:
  - project
  - rail-passport
  - design
date: 2026-08-28
status: v1
---

# Rail Passport — Colour Palette v1

Sampled from five reference photographs, not invented. Indian Railways already has a palette;
the job was to read it off the paint.

**Live reference page:** the palette artifact (swatches, contrast table, applied preview)
**Files:** `tokens.css`, `tailwind.colors.js`

---

## The one real decision

The references are **daylight** — saturated, high-contrast, midday. The spec's visual direction
was *the view from a night train window*, which is dark. These look like opposites but aren't,
because the deepest colour in the photographs is already dark enough to be a background.

The lower panel of coach 00296 measures **#0D2242** — a navy at 26% brightness, 80% saturation.
So the ground isn't a designed dark; it's the actual paint on the actual coach. The station-board
yellow and the logo vermillion then sit on it as accents, which is exactly how they look at a
station after dark: signage glowing against a dark train.

**The palette is dark-first, and every colour in it is a real object.**

---

## What the photographs contain

| Colour | Hex | H / S / V | Sampled from |
| --- | --- | --- | --- |
| Coach navy | `#0D2242` | H216 S80% V26% | Lower panel of coach 00296 — 102,000 px |
| Coach band blue | `#153754` | H208 S74% V33% | The lighter stripe below the numerals — 16,800 px |
| Station board yellow | `#EAB143` | H40 S71% V92% | The Alwar Junction sign — 21,852 px |
| Stencil cream | `#EECB9A` | H35 S35% V93% | The painted numerals "00296" |
| IR vermillion | `#DC3A31` | H3 S78% V86% | The Indian Railways roundel — 30% of that image |
| Platform oxide | `#4A2016` | H12 S70% V29% | The painted platform edge — 27,200 px |
| Sky panel | `#98C5C8` | H184 S24% V78% | Upper panel of the first coach |
| Ballast grey | `#807568` | H33 S19% V50% | The track bed |
| Rail steel | `#A3988F` | H27 S12% V64% | Polished running surface |
| Rust frame | `#9B705F` | H17 S39% V61% | Window surround on 00296 |

Two observations that shaped everything else:

**Every neutral in these photographs is warm.** Ballast at H33, steel at H27. A pure grey would
look wrong beside them, so the greys are biased toward the amber.

**The blues are unusually saturated for dark colours** — 74–80%. That's what stops the ground
reading as generic dark-mode navy.

---

## Dark tokens (primary)

| Token | Hex | Role | Contrast on ground |
| --- | --- | --- | --- |
| `ground` | `#0A1C33` | Page background | — |
| `surface` | `#0D2242` | Cards, panels, sheets | — |
| `surface-2` | `#153754` | Hover, raised | — |
| `line` | `#1F4568` | Dividers, card borders | — |
| `line-strong` | `#2E5C82` | Input borders | — |
| `ink` | `#E9F0F6` | Body text | **14.9 AAA** |
| `ink-soft` | `#A2B7C9` | Secondary text | **8.3 AAA** |
| `ink-faint` | `#7791A8` | Labels, metadata | 5.2 AA |
| `accent` | `#EAB143` | Travelled route, active nav, primary buttons | **8.9 AAA** |
| `accent-wash` | `#332818` | Callout backgrounds | fill |
| `accent-dim` | `#8A6420` | Inactive route strokes | stroke |
| `cream` | `#EECB9A` | Large numerals only | **11.1 AAA** |
| `vermillion` | `#E85C50` | Errors, "you are here" | 5.0 AA |
| `oxide` | `#C87352` | Planned, not yet travelled | 4.9 AA |
| `steel` | `#A3988F` | Unvisited stations, disabled | 6.1 AA |

## Light tokens

Not an inversion. The ground becomes the whitewashed platform stripe, and both loud accents
change value, because a yellow bright enough to glow on navy is invisible on paper.

| Token | Hex | Role | Contrast on ground |
| --- | --- | --- | --- |
| `ground` | `#F4F1EA` | Warm off-white, amber-biased | — |
| `surface` | `#FCFAF6` | Cards sit lighter than ground | — |
| `surface-2` | `#EAE5DA` | Hover, table headers | — |
| `line` | `#D8D1C3` | Dividers | — |
| `line-strong` | `#B9B0A0` | Input borders | — |
| `ink` | `#12283F` | Body text — the coach navy as ink | **13.3 AAA** |
| `ink-soft` | `#3F5A73` | Secondary text | 6.4 AA |
| `ink-faint` | `#6B8299` | Labels only — fails AA for body, intentionally | 3.5 UI |
| `accent` | `#8A5A0F` | Links, accent text | 5.2 AA |
| `accent-wash` | `#F5E7CC` | Callout backgrounds | 11.9 with ink |
| `accent-fill` | `#EAB143` | The true board yellow — fill only, navy text on top | 7.8 with ink |
| `cream` | `#8A6420` | Large numerals (bronze) | 4.7 AA |
| `vermillion` | `#B4302A` | Errors | 5.5 AA |
| `oxide` | `#6B3524` | Planned routes | **8.6 AAA** |
| `steel` | `#6E645A` | Unvisited, disabled | 5.1 AA |

`accent-fill` exists only in light mode — in dark mode `accent` already *is* the full-strength
yellow, so a separate fill token would be the same value twice. That asymmetry is deliberate.

---

## Four rules

**1. Yellow is a fill, not a text colour.** `#EAB143` on white measures **2.0:1** — unreadable.
Navy on that same yellow measures **7.8:1**, which is how every station board in the country is
built. Use it as a background with navy on top, or as text on navy. Never as text on light.

**2. Vermillion is not a second accent.** It's the most attention-grabbing colour here and only
reaches 5.0:1 on the dark ground — fine for a label, wrong for paragraphs. Errors and the single
"you are here" marker only. The moment two things are red, neither is urgent.

**3. Cream is for numerals only.** Warm and slightly low-contrast against navy compared with the
cool white — lovely at 32px, muddy at 14px. Big numbers get cream; ordinary text stays
`#E9F0F6`. This mirrors the coach: numbers stencilled in cream, nothing else.

**4. Never use a neutral grey.** Drop a `#808080` anywhere in this palette and it reads as a bug,
because it's the only colour on screen with no relationship to the rest. Use `steel`.

---

## Map surfaces

Added once the map was real. Land is not a card, so it does not borrow
`--surface`: cards sit *above* the page, land *is* the page — and in light mode
a card-white landmass has no edge against the ground at all.

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `land` | `#0C2140` | `#EDE8DD` | The country |
| `land-visited` | `#143355` | `#F2DFB8` | A state you have travelled through |
| `dot` | `#7E93A6` | `#8C8375` | The 8,696-station field, drawn on canvas at 0.6 alpha |

The field is deliberately texture rather than subject. At full strength it
competes with the routes, which are the thing the page is actually about.

## Map semantics

Derived tokens, so intent lives in one place rather than being re-decided per component:

```
--route-taken:   var(--accent)      /* travelled, with a soft halo behind it */
--route-planned: var(--oxide)       /* dashed */
--route-idle:    var(--line)        /* the rest of the network, structural */
--station-seen:  var(--cream)
--station-new:   var(--steel)
--you-are-here:  var(--vermillion)  /* exactly one on screen */
```

Six colours, each with one job. If a seventh becomes necessary, something in the design is
carrying too much.

---

## Build early: the station board component

The station board is the most recognisable object in Indian rail, and it's just a yellow
rectangle with a white border and two lines of type — Devanagari above, Latin below, station
code and zone beneath. Build it once and reuse it for station detail headers and for the
shareable passport card. It's free identity.

---

## Still to decide

- **Typeface.** The palette doesn't settle this. The signage suggests a squarish grotesque for
  display; the numerals want a mono or tabular face. Decide in week 1 with the two screens.
- **The halo.** The travelled route reads best with a wide, very low-opacity stroke of `accent`
  behind a narrow solid one. Exact opacity needs tuning against the real map density.
- **Whether the sky-blue `#98C5C8` earns a slot.** It's in the references but has no job yet.
  Leave it out until something needs it rather than finding it a role.
