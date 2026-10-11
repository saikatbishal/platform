# Brand marks

Two SVG sources, and the PNGs generated from them. Nothing here is drawn by
hand twice — edit the SVG, re-run the command, commit the PNGs.

| Source | Generates | Used by |
| --- | --- | --- |
| `icon.svg` | `public/pwa-192.png`, `public/pwa-512.png`, `public/pwa-maskable-512.png`, `public/apple-touch-icon.png` | the web app manifest in `vite.config.ts`, iOS home screen |
| `og.svg` | `public/og.png` | `og:image` / `twitter:image` in `index.html` |

`public/favicon.svg` is the same mark redrawn at 32px, by hand, because a
downscale of the 512 loses the white enamel border.

The mark is the station board hung from its bracket — the same object the
sign-in placard is. Its colours are the `--board*` tokens from
`src/styles/tokens.css`, which deliberately do not change with the theme, plus
one red dot at `#DC3A31`. That is the roundel vermillion as sampled in
`docs/04-palette.md`, not the screen token `--vermillion` (`#E85C50`): the
screen value is lightened to clear 5:1 on the coach navy, and a mark that is
never text on a background does not need that lift.

## Regenerating

Needs `sharp`, which is not a project dependency — run it in a scratch
directory rather than adding it here:

```sh
npx -y sharp-cli -i docs/brand/icon.svg -o public/pwa-512.png resize 512 512
npx -y sharp-cli -i docs/brand/icon.svg -o public/pwa-192.png resize 192 192
npx -y sharp-cli -i docs/brand/icon.svg -o public/apple-touch-icon.png resize 180 180
npx -y sharp-cli -i docs/brand/og.svg   -o public/og.png
```

The maskable icon is the mark inset to 62% on the same navy ground, so Android's
circle crop never clips the board. `sharp-cli` cannot compose it; the script
that made it is in the session log — redraw it as `icon.svg` scaled to 316px
centred on a 512px `#0A1C33` square.

The og card sets type in whatever sans the renderer finds. It was generated on a
box with DejaVu Sans and a Devanagari fallback; check the output before
committing if you regenerate somewhere else.
