Every modal in the app is this: Log a journey, Milestones, Passport card.

```jsx
<Sheet title="Log a journey" onClose={close}>
  <AddJourneyForm />
</Sheet>
```

The title is `--text-label` uppercase in `--ink-faint`, not a heading-scale line — the sheet's content is the subject, the title is a tab. Close is a `Button variant="outline"` inside the content, not an X in the corner.
