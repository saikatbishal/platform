Goes inside a `Sheet title="Milestones"`.

```jsx
<MilestoneList milestones={[
  { id: 'km-1000', label: '1,000 km', detail: '4,182 km — past 1,000', achieved: true },
  { id: 'states-5', label: '5 states', detail: '4 of 5 states' },
]} />
```

`detail` states the current fact whether locked or not — "4 of 5 states", never "Keep going!". Achieved rows tint with `--accent` at 10%; the ✓ is the only place a tick mark appears in the system.
