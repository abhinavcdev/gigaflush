# Releasing Gigaflush

Gigaflush is free and open source (GPL-3.0-or-later). Every platform's build is
published on GitHub Releases, and the website's download buttons link straight
to the latest one.

## Cutting a release

**From GitHub (recommended):** Actions → **Release** → **Run workflow**, enter
a version such as `0.2.0`, and run it. The workflow:

1. Bumps the version in `package.json`, `package-lock.json`,
   `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `Cargo.lock`,
   commits `release: v0.2.0` to the branch you ran it on, and tags `v0.2.0`.
2. Builds macOS (universal `.dmg`), Windows x64 (`setup.exe` and `.msi`) and
   Linux x86_64 (`.AppImage`, `.deb`, `.rpm`) in parallel.
3. Publishes the GitHub Release with every file under a stable name, a
   `SHA256SUMS.txt`, install notes, and auto-generated notes from merged PRs.

Add a CHANGELOG entry before you run it. If the branch is protected, allow
`github-actions[bot]` to push, or bump and tag by hand (below).

**From your terminal:** bump `version` in `package.json` and
`src-tauri/tauri.conf.json`, then:

```bash
git commit -am "release: v0.2.0"
git tag v0.2.0
git push && git push --tags
```

Pushing the tag starts the same build and publish jobs.

## Download links

The release job copies each build to a fixed name, so these URLs always
serve the newest version (the site uses them in
[site/src/config.ts](site/src/config.ts)):

| File | URL |
|---|---|
| macOS | `https://github.com/abhinavcdev/gigaflush/releases/latest/download/Gigaflush-macos-universal.dmg` |
| Windows | `.../latest/download/Gigaflush-windows-x64-setup.exe` (and `Gigaflush-windows-x64.msi`) |
| Linux | `.../latest/download/Gigaflush-linux-x86_64.AppImage`, `Gigaflush-linux-amd64.deb`, `Gigaflush-linux-x86_64.rpm` |
| Checksums | `.../latest/download/SHA256SUMS.txt` |

The app checks GitHub's latest release at most twice a day and shows an
"update available" banner that opens the site's download section.

## Code signing

The builds are not code-signed. The macOS app is ad-hoc signed
(`"signingIdentity": "-"` in `tauri.conf.json`), which Apple Silicon needs to
launch it at all; Gatekeeper still asks the user to approve it once. Windows
SmartScreen shows a "More info → Run anyway" prompt. The site, README, release
notes, and support page all explain both.

If you later want prompt-free installs, Apple's Developer ID ($99/year) and
Azure Artifact Signing are the usual routes; Tauri signs automatically once
the `APPLE_*` environment variables or a Windows `signCommand` are set.

## CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to
`main` and every pull request: Rust tests, the Playwright UI smoke test, and
the website build.

## Website

[`site/`](site/) is an Astro project (Node ≥ 22.23.4). Links to GitHub live in [site/src/config.ts](site/src/config.ts).

```bash
npm install && npm --prefix site install
npm run site:dev      # http://localhost:4321
npx wrangler login    # first time only
npm run site:deploy   # → https://gigaflush-site.<account>.workers.dev
```

Add the custom domain in Cloudflare (Workers & Pages → gigaflush-site →
Settings → Domains & Routes).
