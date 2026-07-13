<div align="center">
  <img src="src-tauri/icons/128x128.png" width="72" height="72" alt="NodeMinus icon" />
  <h1>NodeMinus</h1>
  <p>Find every <code>node_modules</code> folder on your machine. Purge the ones you pick. Get your disk back.</p>

  ![License](https://img.shields.io/github/license/abhinavcdev/nodeminus)
  ![Release](https://img.shields.io/github/actions/workflow/status/abhinavcdev/nodeminus/release.yml?label=release)
  ![Platforms](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
</div>

---

NodeMinus is a small menu-bar / system-tray utility for developers who accumulate
`node_modules` directories across side projects, client work, and cloned repos.
It scans a folder tree, shows you every dependency directory it finds sorted by
reclaimable size, and lets you delete the ones you don't need right now —
nothing is touched that isn't literally named `node_modules`.

## Download

Grab the latest build for your platform from
**[GitHub Releases](https://github.com/abhinavcdev/nodeminus/releases/latest)**.

A standalone download page with OS auto-detection lives in [`site/`](site/) and
can be deployed separately — see [RELEASING.md](RELEASING.md).

| Platform | Package |
|----------|---------|
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Windows 10/11 (x64) | `.exe` installer |
| Linux (x86_64) | `.AppImage` or `.deb` |

Every release ships a `SHA256SUMS.txt` alongside the binaries — verify before you run
anything you didn't build yourself.

> macOS builds are not yet notarized. On first launch, right-click the app and
> choose **Open** to bypass Gatekeeper's unidentified-developer warning.

## Why

`node_modules` is the single biggest, most disposable consumer of disk space on a
developer's machine. It regenerates perfectly from `package.json` with one command,
yet most of us let dozens of copies pile up across old branches, forgotten
experiments, and half-finished side projects — quietly eating tens of gigabytes.
NodeMinus exists to make that space visible and safe to reclaim, without digging
through Finder or writing a shell one-liner you don't fully trust.

## Features

- **Live scanning** — projects stream into the results list the moment they're
  found, sorted by reclaimable size, instead of waiting for the whole walk to finish.
- **Guard-railed deletes** — the delete command refuses to touch anything that
  isn't literally a directory named `node_modules`, enforced in the Rust backend
  itself, not just the UI.
- **Menu-bar native** — lives in your tray, not your Dock. Click to open, click
  elsewhere (or press `Esc`) to dismiss.
- **Fast, parallel scanning** — a parallel directory walker skips `.git`, system
  folders, and nested `node_modules` duplicates so scanning a whole home directory
  stays quick.
- **First-run onboarding** — a short walkthrough on first launch, remembered
  across sessions, plus a persisted last-scanned folder.
- **Confirm before you commit** — purges (single project or bulk) always show
  the exact paths and reclaimable size before anything is deleted, with live
  per-item progress while it runs.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- Platform build dependencies for [Tauri v2](https://v2.tauri.app/start/prerequisites/)

### Run locally

```bash
npm install
npm run tauri:dev
```

### Build a release bundle

```bash
npm run tauri:build
```

Bundles are written to `src-tauri/target/release/bundle/`.

### Tests

The scanning and delete-safety logic is covered by the Rust test suite:

```bash
cd src-tauri
cargo test
```

## Project structure

```
├── src/                  # Frontend (vanilla HTML/CSS/JS, Tauri webview)
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── scanner.rs    # node_modules discovery + size calculation
│   │   ├── commands.rs   # Tauri commands: scan, delete, folder picker
│   │   └── lib.rs        # Tray icon, window, menu setup
│   └── capabilities/     # Tauri v2 permission scoping
├── site/                 # Landing page (static, deployed as a Cloudflare Worker)
└── .github/workflows/    # Release pipeline (GitHub Releases + Cloudflare R2)
```

## Releasing

Maintainers: see [RELEASING.md](RELEASING.md) for the full release process —
tagging a version builds all four platform targets, publishes a GitHub Release,
and mirrors direct-download artifacts to Cloudflare R2 for the landing page.

## Contributing

Issues and pull requests are welcome. If you're proposing a UI change, please
read [PRODUCT.md](PRODUCT.md) first — it describes the design principles and
anti-references this project holds itself to (compact, calm, no gamified
cleaner vibes).

## License

[MIT](LICENSE)
