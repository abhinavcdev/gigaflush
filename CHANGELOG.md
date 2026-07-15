# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
