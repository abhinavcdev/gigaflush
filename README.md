<div align="center">
  <a href="https://gigaflush.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="brand/app-icon.svg" />
      <img src="brand/app-icon-light.svg" width="96" height="96" alt="Gigaflush" />
    </picture>
  </a>
  <h1>Gigaflush</h1>
  <p>Clean up <code>node_modules</code>, Rust <code>target</code>, Flutter <code>build</code>, Gradle and Python caches across every project.<br />Review what goes. Make room to build.</p>
  <p><a href="https://gigaflush.com/#download"><b>Download free</b></a> · macOS · Windows · Linux</p>

  ![License](https://img.shields.io/github/license/abhinavcdev/gigaflush)
  ![Release](https://img.shields.io/github/actions/workflow/status/abhinavcdev/gigaflush/release.yml?label=release)
  ![Platforms](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue)
</div>

---

Gigaflush is a small menu-bar / system-tray utility for reclaiming space from
project dependencies, build output, and tool caches. Scan a workspace, filter the
results, and review exact paths and rebuild instructions before permanent removal.
The interface follows your system's light or dark appearance, or a theme you pin
from the titlebar.

### Supported cleanup

| Project | Recognized folders | Required project marker |
|---|---|---|
| Node.js | `node_modules` | `package.json` |
| Flutter / Dart | `build`, `.dart_tool` | `pubspec.yaml` |
| Rust | `target` | `Cargo.toml` |
| Python | `.pytest_cache`, `.mypy_cache`, `.ruff_cache` | `pyproject.toml`, `setup.py`, or `requirements.txt` |
| Swift | `.build` | `Package.swift` |
| Gradle | `.gradle` (project-local) | `build.gradle[.kts]` or `settings.gradle[.kts]` |
| Maven | `target` | `pom.xml` |

Choose cleanup types before scanning. Each folder is listed separately; nothing
is preselected. Generic `dist`/`build` folders, virtual environments, global caches,
SDKs, source directories, and lockfiles are not cleanup targets. Recognition uses
standard directory conventions plus a sibling project marker; it cannot determine
whether you have manually saved valuable files inside a generated directory.

Cleanup is permanent, not a move to Trash. Stop builds and dev servers first.
Locally edited dependencies and anything manually stored in generated directories
will be removed. Reinstallation may need network access; rebuilding takes time.
Sizes are logical file-size estimates, not guaranteed physical disk savings.
Symlink targets and paths through symlink ancestors are refused at deletion time.
Inaccessible directories are skipped during scanning. Checks run again immediately
before removal, but path-based deletion is not an atomic filesystem snapshot; do
not move or replace project directories during cleanup.

## Download

Gigaflush is free on every platform. Grab the latest build from
[gigaflush.com](https://gigaflush.com/#download) or directly:

| Platform | Download |
|----------|----------|
| macOS 11+ (Apple Silicon + Intel) | [`Gigaflush-macos-universal.dmg`](https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-macos-universal.dmg) |
| Windows 10/11 (x64) | [`setup.exe`](https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-windows-x64-setup.exe) · [`.msi`](https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-windows-x64.msi) |
| Linux (x86_64) | [`.AppImage`](https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-linux-x86_64.AppImage) · [`.deb`](https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-linux-amd64.deb) · [`.rpm`](https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-linux-x86_64.rpm) |

Every release ships a `SHA256SUMS.txt`. The builds are not code-signed, so the
OS asks once on first launch:

- **macOS:** open the app, then System Settings → Privacy & Security →
  **Open Anyway**. Or: `xattr -dr com.apple.quarantine /Applications/Gigaflush.app`
- **Windows:** on the SmartScreen prompt, click **More info → Run anyway**.
- **Linux:** `chmod +x Gigaflush-linux-x86_64.AppImage` and run it.

If Gigaflush saves you some space, please star this repo.

## Features

- **Native-feeling panel** — macOS popover vibrancy, a Files | Servers segmented
  control, spring-driven motion, system/light/dark theme switcher, keyboard focus,
  and reduced-motion support.
- **Reclaimable breakdown** — a segmented bar shows where the space is (Node.js,
  Rust, Flutter, other); click a legend entry to filter the list.
- **Idle dev servers** — the Servers tab maps every dev server on localhost and
  suggests only the ones nothing is connected to that are orphaned or hours
  old. Stopping re-verifies PID and start time, then sends SIGTERM.
  macOS and Linux.
- **Live scanning** — parallel Rust traversal streams discoveries; batched UI
  updates preserve row identity and initially render at most 100 folders.
- **Review first** — explicit selection, full-path confirmation, project-specific
  rebuild guidance, and per-folder cleanup progress.
- **Backend checks** — cleanup revalidates project markers and allowed folder
  names and rejects symbolic-link paths and parent traversal.
- **Responsive cleanup** — disk deletion runs on a blocking worker, with a
  backend guard preventing overlapping scan and cleanup operations.
- **Menu-bar workflow** — click the tray icon to open; click elsewhere or press
  Escape to dismiss. Cmd/Ctrl+1 and 2 switch views, Cmd/Ctrl+F filters and
  Cmd/Ctrl+R rescans.
- **Remembered preferences** — last workspace and enabled cleanup types persist.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
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

UI smoke tests use a simulated Tauri bridge (no real folders are deleted):

```bash
npx playwright install chromium
npm run test:ui
```

Set `BROWSER_PATH` to use an existing Chrome/Chromium executable. The test starts
its own local server, exercises selection, filtering, confirmation, cleanup progress,
light/dark appearance, reduced motion, and a 2,000-result burst. Screenshots use
synthetic project data and are saved under `.impeccable/review/`.

## Project structure

```
├── src/                  # Frontend (vanilla HTML/CSS/JS, Tauri webview)
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── scanner.rs    # project artifact discovery + size calculation
│   │   ├── commands.rs   # Tauri commands: scan, delete, folder picker, servers
│   │   ├── ports.rs      # idle dev server detection and safe stop
│   │   └── lib.rs        # Tray icon, window, menu setup
│   └── capabilities/     # Tauri v2 permission scoping
├── brand/                # Logo sources (app icon, monochrome mark, OG image)
├── site/                 # Astro landing page (npm run site:dev / site:build)
└── .github/workflows/    # CI (tests, site build) and release (builds + GitHub Release)
```

## Releasing

Maintainers: see [RELEASING.md](RELEASING.md). In short, run **Actions → Release
→ Run workflow** with a version number. It bumps the version, tags it, builds
macOS, Windows and Linux, and publishes a GitHub Release with stable download
URLs that the website links to directly. No secrets required.

## Contributing

Issues and pull requests are welcome. If you're proposing a UI change, please
read [PRODUCT.md](PRODUCT.md) first — it describes the design principles and
anti-references this project holds itself to (compact, calm, no gamified
cleaner vibes).

## License

Gigaflush is free software, licensed under the
[GNU General Public License v3.0 or later](LICENSE). Versions up to and
including 0.1.1 were released under the MIT License, and those copies remain
under MIT.

The Gigaflush name and logo are not covered by the GPL. If you distribute a
modified build, please give it a different name and icon.
