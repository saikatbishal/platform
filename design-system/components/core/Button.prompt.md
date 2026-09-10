The app's button. Labels are always uppercase `--text-label` with `--tracking-label`.

```jsx
<Button variant="primary" type="submit">Log journey</Button>
<Button>Milestones</Button>
<Button variant="quiet">+ Add departure &amp; arrival times</Button>
```

One `primary` per sheet — the accent means "you have travelled this", so spending it on a second button dilutes it. `outline` is the default and the weight every persistent control on the map sits at. Hover on outline lifts the fill to `--surface-2` and turns the label `--accent`; there is no separate press state.
