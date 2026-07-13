# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] — Unreleased

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
  Windows, and Linux bundles, publishes a GitHub Release, and mirrors
  stable-named artifacts plus checksums to Cloudflare R2.

### Known limitations

- macOS builds are not yet code-signed or notarized; first launch requires
  right-click → Open.
- No auto-update mechanism yet — check GitHub Releases for new versions.
