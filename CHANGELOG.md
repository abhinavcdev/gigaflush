# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Servers tab: idle dev servers.** A patch-panel map of every dev server on
  localhost (Node, Bun, Deno, Python, Ruby, PHP) shows which are connected and
  which are idle. Only idle ones are suggested: nothing connected, near-zero
  CPU, and orphaned by a closed terminal or agent or running 6+ hours. Stop one
  or all; each is re-verified by PID and start time and asked to exit like
  Ctrl+C. macOS and Linux (needs `lsof`); Windows to follow.
- **Reclaimable breakdown bar.** A segmented bar under the total shows the
  split by ecosystem; its legend filters the list.
- **Mac-native feel.** Popover vibrancy behind the panel on macOS, a
  segmented Files | Servers control, spring physics for readouts, presses and
  view changes, and a popover-style entrance when opened from the tray.
  Cmd/Ctrl+1 and 2 switch views.

### Changed

- **Renamed to Gigaflush.** The app now cleans up seven ecosystems, not just
  `node_modules`, so the name follows. New app icon, tray icon, and bundle
  identifier (`com.gigaflush.desktop`); saved preferences from NodeMinus
  (last folder, cleanup types) start fresh. Release assets are now named
  `Gigaflush-*`.
- **Licence is now GPL-3.0-or-later** (previously MIT; releases up to 0.1.1
  remain MIT). The Gigaflush name and logo are not covered by the licence.
- Signed macOS and Windows builds are sold through Polar; Linux builds stay
  free on GitHub Releases. The release workflow builds a universal macOS
  `.dmg`, signs and notarizes it and signs the Windows installer when
  credentials are configured, and keeps paid installers off the public release.
- Landing page rebuilt with Astro: a desktop stage with the live panel,
  scroll-driven "how it works", an interactive ecosystem explorer, pricing,
  and Privacy, Terms, and Support pages. Hero rebuilt as a framed split
  layout with a live dithered landscape and a tray panel you can toggle and
  fling; Geist type; spring physics throughout (motion). Adds a blog (nine
  MDX posts with interactive React components), seven `/clean/*` guides,
  `/mac`, `/windows`, `/linux` pages, a sitemap, RSS, structured data and
  `llms.txt`.
- Landing page redesign: Apple-style typography (SF Pro on Apple devices,
  Inter elsewhere), system blue, pill buttons and calmer motion. Layout is a
  single framed column with full-bleed hairlines crossing its edges, "+"
  marks at the intersections, and hatched rails in the side gutters. The
  hero fits the first screen.
- Blog posts each open with an interactive isometric figure drawn with the
  Anatomy kit (a beam balance, a gantry picker, a platform scale, tanks with
  sight gauges and more), each driven by the same model as its readout; post
  cards use static themed renders of the same drawings. The landing page's
  Reclaim step shows the space by folder type, and the three small feature
  cards are live visuals.

### Added

- Theme switcher in the panel titlebar: System (default), Light, or Dark.
- Update notice: the panel checks GitHub for a newer release at most twice a
  day and links to the Polar library (macOS/Windows) or GitHub (Linux).
- Version, licence, source, and support links at the bottom of the
  "How it works" sheet.
- Cleanup motion: a sweep on the folder being removed, a "Removed" confirmation
  before its row collapses, a readout that counts down live, and a completion
  check. All of it is disabled under reduced motion.

## [0.1.1] — 2026-07-13

### Fixed

- macOS builds are now ad-hoc signed during bundling. The v0.1.0 build had no
  signature at all, which macOS's Gatekeeper reports as **"NodeMinus" is
  damaged and can't be opened** on Apple Silicon rather than the usual
  unidentified-developer warning — that message is specific to arm64 binaries
  with no valid code signature at all, and isn't fixable by the user. Ad-hoc
  signing satisfies macOS's hard requirement that all arm64 executables carry
  a valid signature, so the app now opens normally via right-click → Open.
  Anyone who downloaded the v0.1.0 macOS build should grab v0.1.1 instead.

## [0.1.0] — 2026-07-12

Initial release.

### Added

- Menu-bar / system-tray panel for scanning a folder tree and discovering every
  `node_modules` directory beneath it, with live results as the scan runs.
- Reclaimable-size readout, per-project sizes, and a sortable results list
  (largest first).
- Single-project and bulk purge, both gated behind a confirmation dialog that
  lists the exact paths and total size before deleting anything.
- Native folder picker for choosing a scan target, with the last-used folder
  remembered across launches.
- First-run onboarding walkthrough (scan → review → purge), reachable again
  any time from the help button.
- Quick Scan from the tray's right-click menu.
- A hard safety guard in the Rust backend: the delete command refuses to
  remove any path that isn't literally a directory named `node_modules`,
  regardless of what the frontend sends.
- Parallel directory walker that skips `.git`, common system directories, and
  nested `node_modules` duplicates.
- Landing page with platform auto-detection for direct downloads.
- Release pipeline: tagging a version builds macOS (Apple Silicon + Intel),
  Windows, and Linux bundles and publishes them to a GitHub Release, with a
  stable-named copy of each installer plus a checksum file attached so the
  landing page's download links never change between versions.

### Known limitations

- macOS builds are not yet code-signed or notarized; first launch requires
  right-click → Open.
- No auto-update mechanism yet — check GitHub Releases for new versions.
