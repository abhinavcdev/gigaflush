# Gigaflush website

The landing page introduces a precise desktop utility. Its visual anchor is the working app, with real folder names and clearly labeled example projects. The website inherits the app's system typography and restrained controls.

Use warm off-white and charcoal surfaces, ink-colored headings and primary actions, and subtle neutral dividers. Blue identifies interactive application state and focus. Do not use gradient lettering, promotional announcement pills, pricing halos, or decorative glows. Keep the existing framed composition and hatched outer gutters; omit registration marks when there is no room outside the frame.

Use a compact sticky header, accessible mobile navigation, and system/light/dark appearance controls. Headings stand without redundant category labels. Keep section titles around 32–46px, with the hero larger. Controls use 8px corners and surfaces use 12px corners. Keep paths and commands in monospace.

Preserve the tray toggle, draggable app preview, scan/review/cleanup demonstrations, and reduced-motion behavior. Prefer short settling motion outside the app. Content remains visible if scroll observation fails. Price, platform, licensing, and download configuration remain authoritative in the existing content and config files.

Check desktop, tablet, and narrow mobile widths in light and dark appearances. Verify navigation, theme persistence, tray interactions, horizontal overflow, and the production build whenever shared layout rules change.

Blog figures are Anatomy drawings (`src/anatomy/`, kit vendored under MIT): one invented machine per post whose motion is the idea, built from a small model that also drives the readout. Each lives in `src/anatomy/figures/<name>.mjs` exporting `meta`, `figure()` (static SVG, rendered at build time) and `mount()` (live behaviour). Posts pick one with `figure:` in front matter; cards use the static `/figures/<name>-<theme>.svg` files. Figures follow the site theme through `src/anatomy/theme.css`, keep one lit part, stay still under reduced motion, and must pass Anatomy's line check (`scripts/lines.mjs`) with zero floating ends in both themes.

Feature cards show the behaviour they describe (a live visual), never an icon tile. Part-to-whole figures use a tall segmented bar with the validated categorical palette, not a ring.

## Idle servers ("ghosts")

- Violet (`--accent-2` on the site, `--ghost` in the app) means one thing only: an idle dev server that is safe to stop. Don't reuse it for series or decoration.
- Status beside it: green = connected, blue = running. Every state also has a text label (`live`, an uptime, `idle`), never colour alone.
- Ecosystem charts use the four validated categorical slots (blue, orange, green, amber) in fixed order by ecosystem, never by rank. Rarer ecosystems fold into "Other".
