# Ledger — PRD

**30 October 2026.** Built on `feat/ledger`, the first of the composite
interactions from the design critique of the Trips canvas. Decisions marked
*(author)* were made by the author in the build conversation.

## 1. Problem

On a phone the map carried seven floating controls: the account chip, Stats ▸,
Milestones, Rail pass, Trips, find and +. Four of them sat in the bottom-left
corner — the hardest place on the screen for a right thumb — and the four text
pills there were about 29px tall against the system's own 44px floor.

Three of those four were one topic. Milestones are thresholds measured against
the totals; the rail pass is a picture of the totals. Spreading them over three
buttons made the corner busier without making any of them easier to find.

## 2. What the ledger is

One control on the map and one sheet behind it.

- **On a phone** the control is the kilometres and an arrow — `4,182 KM ▸` —
  44px tall *(author)*. The figure counts up with the route draw-in, so the
  one number worth a glance is on the map, not one tap away. `--ink`, not
  `--cream`: at 13px cream is below where it reads (trap 3).
- **From `sm` up** the four tiles stay visible as they were, and the whole
  strip is the button *(author)*. Milestones and Rail pass leave the row at
  every width.
- **The sheet** reads top to bottom: the four totals (24px, `--cream`, a
  hairline grid), the not-drawn note if any journey could not be routed, then
  the milestones. Its footer's one action is **Make a rail pass**, which swaps
  the card into the same sheet with a way back *(author)* — the canvas is drawn
  only when asked for, not on every look at the totals.

## 3. Behaviour

- Hidden at zero journeys, at every width. Behind it would be every milestone
  locked and a pass reading 0 km. (Before this the strip showed zeros on a
  desktop at zero journeys; the Milestones and Rail pass buttons were already
  hidden.)
- Escape steps back one view at a time — pass → ledger → map — and the scrim
  closes it, as in `TripsSheet`. Closing returns focus to the control; coming
  back from the pass returns it to the footer button.
- **Not drawn** is said in full, in text, inside the sheet. It used to live in a
  `title` on the strip, which a phone never shows. On a phone the count also
  rides on the control itself (`4,182 KM · 2 NOT DRAWN ▸`), because the figure
  beside it leaves those journeys out.

## 4. Files

- `src/features/stats/LedgerSheet.tsx` — the sheet.
- `src/features/stats/tiles.ts` — `TILES` and the figure formatters, shared by
  the strip and the sheet so they cannot disagree.
- `src/features/stats/Milestones.tsx` — now just the list; the sheet owns the
  heading and the way out.
- `src/features/railpass/RailPass.tsx` — optional `onBack`.
- `src/App.tsx` — the control, one sheet in place of two.

## 5. Not done

- The rest of the critique's composite list: Trips folded into find, the inline
  new-trip field, the trip-scoped +.
- The Trips pill above the ledger is still ~29px tall; it goes away with the
  Trips/find merge, so it is not padded here.
- Primary buttons still use `bg-accent text-ground` (bronze in light). The
  `--accent-fill` fix is a theme change across every sheet, not this one.
