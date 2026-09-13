The From/To fields. Filtering happens outside the component — pass in `results` already narrowed.

```jsx
<StationPicker label="From" value={from} query={q} onQuery={setQ}
  results={search(q, 6)} onPick={setFrom} />
```

Codes are `.tabular` in `--accent` so they read as codes rather than words; the state sits right-aligned in `--ink-faint`. Never offer every station in India unfiltered — the reverse index exists so the list is short.
