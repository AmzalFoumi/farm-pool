# Brand source files

The master copies of the FarmPool logo, as the designer delivered them (2026-10-14). Keep them
unchanged: when the logo changes, replace these files, then re-generate everything listed under
"Made from these".

| File | What it is |
| ---- | ---------- |
| `farmpool-wordmark-white.svg` | The wordmark (the name drawn as a logo) in white, no background. The welcome screen and the launch animation use these path data |
| `farmpool-wordmark-green.svg` | The same wordmark in the logo green `#50B05B`, for light backgrounds |
| `farmpool-logo.svg` / `.png` | White wordmark on a green box — the full lockup, for documents and slides |
| `farmpool-logo-animated.svg` | The wordmark drawing itself, stroke by stroke (CSS animation inside the SVG). React Native does not run that CSS, so its data is extracted into `src/components/app/wordmark-strokes.ts` and replayed by `AnimatedWordmark` |
| `launch-animation-reference.mp4` | The designer's launch animation. **A reference, not an app asset**: nothing `require()`s it, so it is never bundled. Superseded by the animated SVG above |

## Made from these

- `src/components/app/wordmark-strokes.ts` — extracted from the animated SVG; re-extract when it changes
- `src/components/app/icons.tsx` → `WordmarkIcon` (the white SVG's path, with `currentColor`)
- `assets/images/icon.png`, `android-icon-*.png`, `splash-icon.png`, `favicon.png` — rendered PNGs.
  The wordmark is wide (3987 × 1128) and icons are square, so the icons centre it on the logo green.
  A square mark from the designer would read better at home-screen size and should replace it.

The logo green is the `leaf-400` token in `src/styles/colors.css`.
