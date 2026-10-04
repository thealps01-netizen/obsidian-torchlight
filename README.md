# Torchlight

A dark, gold-trimmed Obsidian theme with a parchment light mode: soot-brown surfaces, gold headings and links,
Merriweather for reading and Alegreya for headings.

![Torchlight](screenshot.png)

- **Dark:** soot and gold leaf.
- **Light:** parchment and bronze ink.
- **Readable:** text and muted text at least 7:1 against the page in both modes, faint text at least 4.5:1 (WCAG).
- **Fonts:** embedded (no internet needed), Latin and Latin Extended.
- **Your accent colour:** the gold is Obsidian's accent. Settings → Appearance → Accent color recolours headings,
  links, icons and borders together.
- **Your fonts:** Settings → Appearance → Text font / Interface font replace Merriweather.
- **Icons:** Obsidian's own icons (ribbon, file explorer, tabs) take the gold, brighter on hover.
- **Read-aloud boxes:** quote callouts (`> [!quote]`) turn gold.
- **Tables:** figures line up in columns.
- **Phones and tablets:** the same soot and parchment (Obsidian's mobile dark mode would otherwise turn the page
  black).

Requires Obsidian 1.13.4 or newer: from 1.13.4 callout colours are full CSS colours, which the theme uses.

## Install

From Obsidian: Settings → Appearance → Themes → Manage → search **Torchlight** → Install and use.

By hand (before it is listed, or offline):

1. Copy `theme.css` and `manifest.json` from the [latest release](../../releases/latest) into
   `<your vault>/.obsidian/themes/Torchlight/`.
2. Settings → Appearance → Themes → choose **Torchlight**.

Settings → Appearance → Base color scheme picks **Dark** or **Light**. To change back: Themes → **Default**.

## Options

With the [Style Settings](https://github.com/mgmeyers/obsidian-style-settings) plugin, Settings → Style Settings →
Torchlight:

| Option | What it does |
|---|---|
| Headings in the text font | Headings use the body font instead of Alegreya. |
| No small capitals | The title and the first two heading levels in normal letters. |
| No heading rules | No thin line under the title and the first two heading levels. |
| Plain icons | The app's icons in the muted text colour instead of gold. |

Without the plugin the theme looks the same; the options are all off by default.

## Development

`src/theme.css` is the source. `npm run build` inlines the fonts and writes `theme.css` (the file Obsidian reads;
never edit it by hand). `npm test` checks it against Obsidian's theme guidelines and the promises above: no
`!important`, no remote loading, embedded fonts with their licences, both colour modes, the gold following the
accent, the contrast ratios, the Style Settings block, and the manifest and screenshot. Node 20 or newer, no
dependencies.

CI runs `npm test` on every push and pull request. To release, set the version in `manifest.json` and
`package.json`, then push a tag with the same version (e.g. `0.3.0`, no `v`): the release workflow runs the checks
and publishes `theme.css` and `manifest.json`.

## License

The theme's code is MIT (see `LICENSE`). The fonts are under the SIL Open Font License 1.1 (see `fonts/FONTS.md`):
[Merriweather](https://github.com/EbenSorkin/Merriweather4) by The Merriweather Project Authors and
[Alegreya](https://github.com/huertatipografica/Alegreya) by Juan Pablo del Peral / Huerta Tipográfica.
