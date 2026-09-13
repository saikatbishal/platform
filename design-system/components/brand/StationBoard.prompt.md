The station name board — use it wherever the product needs to identify itself or a station: the sign-in card, a station detail header, the shareable passport card.

```jsx
<StationBoard devanagari="प्लेटफ़ॉर्म" latin="Platform" regional="প্ল্যাটফর্ম" code="PF" zone="EST 2026" />
```

Line order is load-bearing: Devanagari, Latin, state language. Reversing it is the giveaway that nobody looked at a real board. The paint does **not** follow the page theme — `--board*` tokens are declared once at `:root` and are the same in light and dark. Navy on that yellow measures 7.8:1. `size="sm"` drops the Latin line to `--text-lg` for header and list use.
