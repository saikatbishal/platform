# features/

One folder per thing the user does, not per technical layer. A feature owns its
components, hooks, and queries, and exports only what other features need.

- **map/** — the hand-drawn India map. The centrepiece; most of the polish
  budget lives here. Renders routes, stations, filled states. No data fetching:
  it takes journeys as props so it stays testable and fast.
- **journeys/** — add, edit, list. The fifteen-second logging flow. If adding a
  journey ever takes longer than that, treat it as a v1-severity bug.
- **stats/** — kilometres, stations, states, longest. Derived from journeys,
  never stored. Cream numerals, tabular figures.
- **railpass/** — the shareable card, rendered to canvas and downloadable.
- **trips/** — named groups of journeys ("Himachal trip"): the list, the lens
  on the map, the picker, the add form's field. Only the name and note are
  stored; everything a trip adds up to is derived. Storage and sync live in
  `journeys/useJourneys.ts`, because the two share one write queue. Spec:
  `docs/features/trips/prd.md`.

Cross-feature code goes in `src/lib` (pure functions) or `src/components`
(presentational, no feature knowledge).
