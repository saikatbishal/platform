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
- **passport/** — the shareable card, rendered to canvas and downloadable.

Cross-feature code goes in `src/lib` (pure functions) or `src/components`
(presentational, no feature knowledge).
