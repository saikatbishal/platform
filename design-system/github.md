repo: saikatbishal/platform
branch: main
path: (whole repo)

## Last sync

date: 2026-09-10T04:53:49Z

### Updated in this project

- Imported the colour, type and layout tokens from `src/styles/` into `tokens/`.
- Copied the brand marks and share card from `public/` and `docs/brand/`.
- Rebuilt the app's UI primitives as fifteen framework-free React components.
- Recreated the app's single surface as the `platform-app` UI kit.

## Screen map

| Project file | Built from |
| --- | --- |
| `tokens/colors.css` | `src/styles/tokens.css`, `docs/04-palette.md` |
| `tokens/typography.css` | `src/styles/index.css` (`@theme inline`) |
| `tokens/fonts.css` | `src/styles/fonts.css` |
| `tokens/base.css` | `src/styles/index.css` (`@layer base`) |
| `components/brand/` | `src/components/StationBoard.tsx`, `PlatformCanopy.tsx` |
| `components/core/` | `src/App.tsx` (header, buttons, sheets, board chip) |
| `components/forms/` | `src/features/journeys/AddJourneyForm.tsx` |
| `components/data/` | `src/App.tsx` (totals), `src/features/stats/Milestones.tsx` |
| `components/auth/` | `src/features/auth/SignInButton.tsx`, `UserMenu.tsx` |
| `ui_kits/platform-app/` | `src/App.tsx`, `src/features/map/IndiaMap.tsx`, `src/features/passport/PassportCard.tsx` |
| `assets/` | `public/*.png`, `public/favicon.svg`, `docs/brand/*.svg` |
