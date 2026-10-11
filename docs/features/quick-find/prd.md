# Quick find — PRD

**27 September 2026.** Decisions and rejected alternatives are in
`decision.md` in this folder. This document is what gets built and how we
check it worked.

## 1. Problem

The only way to reach a past journey is to tap its line on the map. That
needs you to remember where the journey is drawn, and on a phone it needs a
precise tap on a line a few pixels wide that often lies under other routes.
Logging a journey takes fifteen seconds. Finding one again should not take
longer.

## 2. Goal

**Any logged journey can be opened in under five seconds, from a cold map,
without knowing where it is drawn.**

The five seconds break down as: one tap to open, about three characters typed,
one tap on the result. For a journey in the last five, typing is not needed.

Non-goals: browsing the whole log (the empty query shows five, see
`decision.md`, answer 3), filtering the map, searching stations you haven't
travelled through.

## 3. User stories

1. *"Which train did I take to Guwahati?"* Type `guw`, see the journey, and
   the train number is on the row.
2. *"Open last Sunday's trip and add a note."* Open find; it's in `RECENT`, so
   tap it without typing.
3. *"Everything I did in Kerala."* Type `kerala`. Every journey with an end in
   Kerala matches, including a station whose name doesn't contain the word.
4. *"The one where I was on the top bunk."* Type `top bunk`. The note matches.
5. *"All of 2025."* Type `2025`.
6. *"The one the map couldn't draw."* It still matches, labelled `NOT DRAWN`,
   and it opens.

## 4. The entry point

| | Phone (< `sm`) | `sm` and up |
|---|---|---|
| Where | Bottom-right, stacked directly above `+`, 8px gap | Bottom-left stack, beside `+` |
| Size | 40×40, the same as `+`, with a 44px hit area | Same |
| Treatment | `bg-surface`, `border-line`, glyph `text-ink-soft`; hover: `bg-surface-2`, glyph `text-accent` | Same |
| Glyph | Inline SVG magnifier, 16px, `stroke-width 1.6`, round caps, `currentColor` | Same |
| Label | `aria-label="Find a journey"`, `title` the same | Plus `title="Find a journey  /"` |
| Shortcut | none | `/` opens it, unless focus is in a text field |
| Shown when | `mine > 0` | Same |

`+` stays the only yellow thing in that corner. The two buttons share the
column so that "log" and "find" read as a pair, with log as the primary.

## 5. The search sheet

**Shell.** Full screen below `sm`, with no scrim and safe-area insets on all
sides. From `sm` up, a centred modal `max-w-[452px]` with the standard scrim
(`--ground` at 60%, 2px blur). This is the same shell as `JourneysSheet`, so
going from search to card doesn't jump in size on either device.

**Header.** A single row: the input fills the width, with a close button on
the right (the existing 12×12 cross, 44px target,
`aria-label="Close search and go back to the map"`). No title. The input's
placeholder does that job, and a title above an input adds a line and says
nothing.

**Input.**

- Placeholder: `Station, state, train, note or year`. It lists what can be
  searched, which is the most useful thing a placeholder can do.
- Focused on open. `enterkeyhint="search"`, `autocomplete="off"`,
  `autocapitalize="off"`, `spellcheck={false}`.
- `inputmode` is left at text, because codes and years are mixed with words.
- Focus style: the border turns `--accent`, with no ring, as on every input.
- Clearing the text (`×` inside the field, shown only when there is text)
  returns to `RECENT`.
- Desktop: a mono `/` hint sits at the right end of the empty field.

**Empty query.** A `RECENT` label (`text-label`, `tracking-label`,
`ink-faint`), then the five newest journeys by `travelledOn`, newest first.
With fewer than five journeys it shows however many exist.

**With a query.** A `n MATCHES` label (or `1 MATCH`), then every match in rank
order (§6). No limit, no paging. A personal log does not reach a length where
that matters.

**A row** (min-height 56px, the whole row one button, hairline between rows):

```
Yeshwantpur → Chennai Central                    12 Sept
YPR · MAS  ·  12658  ·  291 km
```

- Line 1: names in `text-ink`, `font-semibold`, `text-base`; the arrow in
  `text-accent`; the date right-aligned in mono `text-ink-faint`. The year is
  shown only if it isn't the current year.
- Line 2: mono, `text-label`, `tracking-code`, `text-ink-faint`: the codes,
  then the train number if there is one, then km. Km is **not** in `--cream`
  here, because it is below 20px (palette trap 3).
- **Matched text is marked**: `<mark>` styled `bg-accent/15 text-ink`, with no
  padding change. Only the first match per field is marked.
- **If the note matched**, a third line shows the note, clipped to one line
  around the match with ellipses, `text-xs text-ink-soft`. Without this the
  row would match for no visible reason.
- **If a state matched and the station name doesn't contain it**, the state
  appears on line 2 after the code, marked. This makes "why did `kerala` match
  Ernakulam" visible.
- **Not drawn:** the `NOT DRAWN` chip takes the km's place. The row is never
  hidden.
- Hover or keyboard-active: `bg-surface-2`.

**No results.** One line, in `text-ink-soft`:

> Nothing matches "{query}" in your stations, states, trains, notes or dates.

Then a second line, **only if the query looks like a station**:

> You haven't logged a journey through {Station name} yet.

with a `+ Log one from here` quiet button. It opens the add form with that
station prefilled as *from*. The no-results screen then offers the next
useful action, which the design system asks empty states to do.

**Keyboard (desktop).** `↑`/`↓` move the active row (`aria-activedescendant`),
`Enter` opens it, and `Escape` clears the query first, then closes. The list
is `role="listbox"` and each row `role="option"`.

**Tapping a result** calls the same `setRouteTarget` the map tap uses:
`JourneysSheet` opens with every journey on that route, paged to the one you
tapped. The search sheet **stays mounted underneath**. Closing the card goes
back to the results with the query and scroll position kept, not to the map.
"Show on map" closes both sheets.

## 6. Matching and rank

All of it runs in the browser, synchronously, over journeys already in memory.
There is no index and no dependency. The query is folded the way
`searchStations.ts` folds names (lowercase, punctuation to spaces). A
multi-word query is AND-ed: every term must match some field of the journey.

| Tier | Field | Example |
|---|---|---|
| 6 | Station code, exact | `ypr` |
| 5 | A word in a station name starts with the term | `chen` → Chennai Central |
| 4 | Train number, prefix | `126` |
| 3 | State, a word starts with the term | `kera` → Kerala |
| 2 | Date: 4-digit year, month name/abbreviation, or a day (day first, optional year) | `2025`, `sep`, `19 sept`, `19th september`, `19/09`, `19.09`, `sept 19th 2025` |
| 1 | Note, a word starts with the term | `bunk` |
| 0 | Anywhere in a name or note | `gar` → Raigarh |

A journey's score is the sum of each term's best tier. Ties are broken by
`travelledOn`, newest first. Station states come from `mapData.byCode`. If the
station data hasn't loaded yet, tiers 5, 3 and 0-on-names are skipped. The
label then reads `n MATCHES · stations still loading` rather than showing a
spinner.

Put the matcher in `src/features/journeys/searchJourneys.ts` as a pure
function, `(journeys, query, byCode) → ranked hits with match ranges`, so it
can be tested without React.

## 7. Files

- New: `src/features/journeys/searchJourneys.ts`, the matcher above.
- New: `src/features/journeys/FindJourneySheet.tsx`, the sheet. Styling is
  written at the call site, as in `AddJourneyForm`.
- Edit: `src/App.tsx`. Add a `findOpen` state, the button in both places (one
  element rendered twice, like `addJourney`), the `/` listener, and the
  search-stays-under-card order.
- Edit: `src/components/JourneysSheet.tsx`. Update the header comment ("there
  is no browse-everything entry point" is no longer the only way in) and give
  the sheet a `z` above the find sheet.
- No new dependency. No new token.

## 8. Accessibility and motion

- The sheet is `role="dialog"`, `aria-modal`, labelled by the input's
  `aria-label` "Find a journey". Focus returns to the magnifier on close.
- The result count is announced through an `aria-live="polite"` region, with
  a 300ms debounce so it isn't spoken on every keystroke.
- Motion: the sheet appears with no slide. Opening it for the keyboard is the
  transition. Row hover is the standard 150ms colour change.
  `prefers-reduced-motion` needs nothing extra.
- Every target is at least 44px.

## 9. Done when

- [ ] Each story in §3 works on a 360px phone and at 1280px.
- [ ] From a cold load at 30 journeys: magnifier, `guw`, tap takes under 5s,
      timed by hand three times.
- [ ] A `NOT DRAWN` journey is found by its station name and opens.
- [ ] Closing the card returns to the same results at the same scroll.
- [ ] `/` does nothing while the add form's station field has focus.
- [ ] Both themes are checked. The `<mark>` tint is readable on the light
      ground.
- [ ] At 320px, the magnifier, `+` and an expanded Stats list don't overlap.
- [x] Checks for `searchJourneys` cover each tier, AND-ing, a missing
      `byCode`, and a journey with no train number or note. The checks are in
      `scripts/check-search.ts`, a plain node script in the style of
      `check-merge.ts`, because the project has no test framework.

## 10. Risks

- **The magnifier isn't found.** It is an icon without words, in an app that
  otherwise labels its buttons. Watch for it in the author's own use for two
  weeks. If it's missed, move to option D, the labelled pill (`decision.md`).
- **Five recent is too few.** If older journeys turn out to be wanted without
  a search term, the full-log list the original brief asked for is one change
  to the empty state.
