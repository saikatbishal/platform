Backdrop for the sign-in card and any other surface where a `StationBoard` is the hero. Put it inside a `position: relative` container.

```jsx
<section style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface)' }}>
  <PlatformCanopy />
  <div style={{ position: 'relative', padding: '36px 20px 20px' }}>…</div>
</section>
```

It occupies only the top of the card. An earlier version drew the whole platform and all of it landed behind body copy, where it had to be scrimmed until invisible — drawing less made it visible.
