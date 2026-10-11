# Quick find — decision record

**Status: decided 27 September 2026, built 28 September.** See `prd.md` for
the spec. The answers to the four open questions are recorded at the bottom.
One of them, the empty query, differs from the original proposal.

## The problem

A past journey can be reached one way: tap its exact line on the map. That
opens `JourneysSheet`, scoped to that route (`App.tsx`, `routeTarget`). It
works only if you already know where the journey is drawn, and on a phone the
line is a few pixels wide and often lies under other routes. "What was that
train to Guwahati last winter?" has no answer unless you remember where
Guwahati is on the map and can hit the line.

Logging a journey takes fifteen seconds. Finding one again takes a good memory
of geography and a steady thumb. The fix is a second way into the journeys
that you already use: by name, not by position.

## What already exists and what changed

- `design-system/guidelines/journeys-overlay.md` (the original build brief)
  asked for a **"Journeys" button in the bottom-left chrome** that opens every
  journey. The implementation shipped the sheet but not the button. A comment
  in `JourneysSheet.tsx` says "there is no browse-everything entry point".
  `docs/` gives no reason for this, so it looks like a scope cut, not a
  decision. This record would reverse it.
- `JourneysSheet` + `JourneyCard` already render one journey, with Show on map
  and Remove. Quick find should **end** in that sheet, not build a second
  journey view.
- The add-journey form already has state-aware station search. Quick find
  should match stations the same way, so "Kerala" finds a Kochi journey.

## Options for the entry point

| | Option | Verdict |
|---|---|---|
| A | **Persistent search bar**, top of screen | Rejected |
| B | **Hamburger menu**, search inside | Rejected |
| C | **Find button** next to `+`, opens a full-screen search | **Proposed** |
| D | **"Find a journey" pill**, bottom centre | Fallback if C tests badly |

**A: persistent bar.** This is the Google Maps pattern, and it is the most
discoverable option. It is also the thing that would make this look like every
other map app, which `CLAUDE.md` names as the main visual risk. On a phone it
takes the top strip that the nameplate and the account chip already use. It
covers the map, which is the product, at all times, to serve a task you do
occasionally. And it sits at the top, the hardest place to reach with one
thumb.

**B: hamburger.** Rejected for the reason in the brief: the primary use case
must not be hidden. A hamburger also brings in a navigation concept the app
doesn't have. There is one screen, and every other action is already a visible
button. Nothing else would go in the menu, so it would be a drawer with one
item.

**C: Find button, proposed.**

- **Phone:** a square button **stacked directly above `+`** in the
  bottom-right corner. That corner is the best thumb position on the screen,
  which is why `+` sits there (see the comment on `addJourney`). Log and find
  are the two things you do in this app, so they sit together. It is the same
  size as `+` but uses the secondary treatment: `--surface` fill, hairline
  border, `--ink-soft` glyph. The yellow `--board` fill stays on the one
  primary action. The glyph is an inline magnifier drawn at the size it is
  used, 1.6px stroke, round caps, `currentColor`, following the design system's
  rule for a mark that is truly needed. It is not taken from an icon library.
- **Desktop:** the same button in the bottom-left stack next to `+`, plus a
  `/` keyboard shortcut (the convention GitHub, YouTube and Slack use), shown
  as a hint inside the input.
- **Hidden at zero journeys.** There is nothing to find. This matches how
  Milestones and Rail pass are gated on `mine > 0`.

**D: bottom-centre pill.** More obvious than an icon, because it has words on
it. But at 320px it has about 170px between "Stats ▸" and `+`. A third item on
the bottom edge also makes that edge a toolbar, which the app has avoided so
far. Keep it as the fallback if the magnifier isn't found in use.

## What the button opens

A **full-screen sheet on a phone** and a centred modal from `sm` up, the same
shape as `JourneysSheet`, since it replaces it in the flow.

- **Input at the top, focused on open.** The keyboard covers the bottom half,
  so results read top-down from the input. The input is the one place the
  thumb-reach argument gives way, because the keyboard is already under your
  thumb.
- **With an empty query it shows the five most recent journeys** under a
  `RECENT` label. The one you want is often one you just took, so you don't
  have to type. Anything older is found by typing. This is a search screen,
  not a full list of the log. Once you type, every match is shown, not just
  five.
- **Each row:** `From → To`, the date, and the km in mono. The part of the row
  that matched the query is marked, so you can see why a row matched.
- **Tapping a row opens `JourneysSheet` on that journey.** Show on map and
  Remove come with it.

## Matching

Local and synchronous: the journeys are already in memory, so no index and no
dependency. Fields, in rank order:

1. Station name and code, from or to (`NDLS`, "Howrah")
2. State of either end, derived the way the add-journey form does it
3. Train number
4. Note text
5. Date: year (`2025`) or month name (`dec`, `December`)

This is prefix and substring matching, not fuzzy. A personal log is small
enough that a wrong fuzzy match costs more than it helps.

**A journey the map could not draw still appears.** Its row gets the
`NOT DRAWN` chip and no km. It is never filtered out; see "never silently drop
a journey".

## Empty and error strings

- No journeys match: *"Nothing between those stations, or in your notes. Try
  a state or a year."* Specific about where it looked.
- The station data is still loading: search journeys by code and note only,
  and say so, rather than show a spinner.

## Deliberately out of scope

- Searching stations you haven't travelled through (that is the add form's
  job).
- Filters, sorting controls, saved searches. A small log doesn't need them.
- Map-side filtering (dimming routes that don't match). It's tempting, and
  it's a separate feature. See open question 2.

## Answers, 27 September 2026

1. **Entry point: C.** A magnifier stacked above `+` on a phone, in the
   bottom-left stack on desktop, with a `/` shortcut. D stays the fallback.
2. **Result tap: open the journey card** (`JourneysSheet`). Flying the map to
   the route with a strip of results to step through was considered and
   deferred.
3. **Empty query: the five most recent**, not the full log. This differs from
   the proposal. The "browse everything" screen the original brief asked for
   is still not built. Search is the only way into older journeys.
4. **Match fields: all five.** Stations and codes, states, train number,
   notes, dates.
