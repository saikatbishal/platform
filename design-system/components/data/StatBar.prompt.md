Bottom-left of the map, over the full-bleed canvas.

```jsx
<StatBar stats={[
  { label: 'Kilometres', value: '4,182' },
  { label: 'Stations', value: '21' },
  { label: 'States', value: '7' },
  { label: 'Not drawn', value: '1', tone: 'warn' },
]} />
```

Values are `.tabular` so a counting number cannot jitter. Figures use `--cream` and must stay at `--text-xl` or larger — cream goes muddy below about 20px, which is the whole reason the label sits underneath in `--ink-faint` instead of sharing the size.
