# Bundled fonts

`scripts/build.mjs` inlines these files into `theme.css` (Obsidian's theme guidelines want fonts embedded, not loaded
from the internet). Only the Latin and Latin Extended subsets are bundled (Turkish is in Latin Extended).

| File | Font | Licence | Source |
|---|---|---|---|
| `Merriweather-latin[-ext].woff2` | Merriweather (variable 300–900, roman), by The Merriweather Project Authors: body and interface | SIL Open Font License 1.1 (`OFL-Merriweather.txt`) | npm `@fontsource-variable/merriweather` 5.3.0, `files/merriweather-latin[-ext]-wght-normal.woff2` |
| `Merriweather-italic-latin[-ext].woff2` | Merriweather (variable 300–900, italic) | SIL Open Font License 1.1 (`OFL-Merriweather.txt`) | npm `@fontsource-variable/merriweather` 5.3.0, `files/merriweather-latin[-ext]-wght-italic.woff2` |
| `Alegreya-*.woff2` | Alegreya (variable 400–800, roman and italic), by Juan Pablo del Peral / Huerta Tipográfica: headings | SIL Open Font License 1.1 (`OFL-Alegreya.txt`) | Google Fonts, `fonts.googleapis.com/css2?family=Alegreya` |

The fonts are used unmodified; `Torchlight Merriweather` and `Torchlight Alegreya` are CSS family aliases inside the
theme, not renamed font files, as the OFL allows.
