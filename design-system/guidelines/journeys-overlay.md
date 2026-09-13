# Journeys overlay — build brief

The screen that lists logged journeys, one per card, paged. Full-bleed on a
phone, a centred square modal from `sm` up.

Reference mock: `Journeys Overlay` artifact (both views, interactive pager).

---

## Files

- New: `src/components/JourneysSheet.tsx` — the overlay and its pager state.
- New: `src/components/JourneyCard.tsx` — one journey's content.
- Edit: `src/App.tsx` — add `journeys` to the existing sheet union, and a
  "Journeys" button in the bottom-left chrome column beside Milestones and
  Passport card.

Follow the repo's own conventions: styling written at the call site the way
`AddJourneyForm` and `Milestones` do it, tokens from `src/styles/`, no new
dependencies, no icon library, no component library.

## Layout — this one deviates from the app's overlay rule, deliberately

Every other overlay is a bottom sheet on a phone. This one is not.

- **Below `sm`: full screen.** `inset: 0`, `border-radius: 0`, no scrim —
  nothing behind it is actionable while it is open, and a scrim would only
  shrink the note. The header clears the status bar; the footer honours
  `env(safe-area-inset-bottom)`.
- **From `sm` up: centred and square.** `max-width: 452px`,
  `aspect-ratio: 1 / 1`, `max-height: 100%`. Scrim is `--ground` at 60% with a
  2px blur, as in the existing sheets. A click on the scrim closes; Escape
  closes at both widths.
- The header (title + close) and the footer are fixed. Only the body between
  them scrolls — a long note must never push the header out of view.

`components/core/Sheet` cannot express this today: it is styled with inline
style objects and so has no media query. Either give it a
`variant="full-on-mobile"` backed by a real CSS class, or write this overlay's
shell at its own call site.

## Content, top to bottom

1. **Header.** "Journeys", Archivo 800 at `--text-lg`, and a close button.
   Reuse the existing 12×12 inline cross (`stroke-width 1.6`, round caps) from
   the sign-in board — do not draw a new one. 44px tap target, `aria-label`
   "Take the board down and look at the map".
2. Hairline `--line` rule.
3. **Pager.** One dot per journey, 6px `--line-strong`, the current one a 22px
   `--accent` bar at `--radius-hair`. 44px tap targets. `role="tablist"`, each
   dot `aria-label` "Journey n of N". Right-aligned mono count `01 / 12` at
   `--text-label`. Swipe left/right pages on touch; arrow keys page when the
   tablist has focus.
4. **Route.** `Yeshwantpur → Chennai Central`, Archivo 800 at `--text-xl`,
   arrow in `--accent`, wrapping to two lines.
5. **Station codes** beneath it: mono, `--text-label`, `--tracking-code`,
   `--ink-faint`.
6. **Meta line.** Mono tabular — `10 Sept 2026 · 291 km`, the km in `--cream`
   (it sits above the 20px floor; `--cream` must not be used smaller).
7. **Sub-line** at `--text-xs`, `--ink-faint`: train number and name, then
   `· as the crow flies`. Distances are great-circle and undercount; say so
   rather than hide it.
8. **No drawn route:** a `NOT DRAWN` chip — `--accent` at 10% fill, 40%
   border, uppercase `--text-label` — and omit the km entirely. The journey
   still appears; it is never dropped from the list.
9. Hairline rule, then the **note** in `--ink` at `--text-base`, max ~52ch.
10. **Footer** above a hairline: Edit (outline), Show on map (primary —
    accent fill, `--board-ink` label, `flex: 1`), Remove (quiet, label turns
    `--vermillion` on hover — the only destructive tint in the system).

## State

- **Empty:** "No journeys logged yet." plus the existing "+ Log a journey"
  button. No filler encouragement.
- **Show on map** closes the overlay and pans/zooms the map to that journey's
  route.
- **Remove** confirms inline in the footer (never `confirm()`), and pages to
  the next journey after deleting.

## Rules this must not break

- `--accent` is a fill, never a text colour on a light ground; `--cream` is
  large numerals only; no neutral grey — use `--steel`; no emoji.
- Motion is 150ms colour changes only, plus the pager bar's width. Honour
  `prefers-reduced-motion`.
- Nothing tappable goes below 44px.
