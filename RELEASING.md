# Releasing NodeMinus

Everything is served from GitHub — no external storage, domain, or secrets to
manage. One workflow ([.github/workflows/release.yml](.github/workflows/release.yml))
handles the whole thing on tag push:

1. Builds macOS (Apple Silicon + Intel), Windows x64, and Linux x86_64 bundles
   and publishes them as a **GitHub Release**.
2. Attaches a second, stable-named copy of each installer — plus a
   `SHA256SUMS.txt` — to that same release, so the landing page can link to
   URLs that never change between versions:

   ```
   https://github.com/<owner>/<repo>/releases/latest/download/<stable-name>
   ```

   GitHub resolves `releases/latest/download/<name>` against whichever
   release is currently marked latest — that redirect is a built-in GitHub
   feature, not something this project has to host or maintain.

## One-time setup

### 1. GitHub repository

```bash
git init && git add -A && git commit -m "NodeMinus"
gh repo create abhinavcdev/nodeminus --public --source=. --push
```

(If you pick a different repo name or owner, update `GITHUB_REPO` at the top
of the `<script>` in [site/index.html](site/index.html).)

No repo secrets are required — the workflow only uses the `GITHUB_TOKEN`
Actions provides automatically.

### 2. Landing page (optional)

The download page in [`site/`](site/) is a static file with no build step. It
can be hosted anywhere; the included config deploys it as a Cloudflare Worker:

```bash
npm install
npx wrangler login   # first time only
npm run site:deploy  # → https://nodeminus-site.<account>.workers.dev
```

Add a custom domain in the dashboard (Workers & Pages → nodeminus-site →
Settings → Domains & Routes), or skip this entirely and just link people to
the GitHub Releases page.

## Cutting a release

```bash
# 1. Bump the version in BOTH files (keep them in sync):
#    src-tauri/tauri.conf.json  "version"
#    package.json               "version"

# 2. Tag and push — everything else is automatic.
git commit -am "release: v0.2.0"
git tag v0.2.0
git push && git push --tags
```

Watch progress under the repo's **Actions** tab. Once both jobs finish, the
release is live and the stable download links immediately point at it.

## Stable download URLs

Replace `<owner>/<repo>` with your GitHub path (`abhinavcdev/nodeminus`):

| Platform | URL |
|----------|-----|
| macOS (Apple Silicon) | `https://github.com/<owner>/<repo>/releases/latest/download/NodeMinus-macos-arm64.dmg` |
| macOS (Intel) | `https://github.com/<owner>/<repo>/releases/latest/download/NodeMinus-macos-x64.dmg` |
| Windows x64 | `https://github.com/<owner>/<repo>/releases/latest/download/NodeMinus-windows-x64-setup.exe` |
| Linux AppImage | `https://github.com/<owner>/<repo>/releases/latest/download/NodeMinus-linux-x86_64.AppImage` |
| Linux .deb | `https://github.com/<owner>/<repo>/releases/latest/download/NodeMinus-linux-amd64.deb` |
| Checksums | `https://github.com/<owner>/<repo>/releases/latest/download/SHA256SUMS.txt` |

The landing page also reads `https://api.github.com/repos/<owner>/<repo>/releases/latest`
(public, unauthenticated, CORS-enabled by default) to show the current version
number — nothing to configure there either.

## Notes

- macOS builds are **ad-hoc signed** (`bundle.macOS.signingIdentity: "-"` in
  `tauri.conf.json`) but not notarized. This is required, not optional: an
  arm64 binary with no signature at all fails Gatekeeper with **"is damaged
  and can't be opened"** — a message that looks like a corrupted download but
  actually means "unsigned," and isn't fixable by the user. Ad-hoc signing
  fixes that; users still see the normal unidentified-developer prompt and
  need to right-click → Open on first launch. Full notarization (no prompt at
  all) requires an Apple Developer account and `APPLE_CERTIFICATE` /
  `APPLE_ID` / `APPLE_TEAM_ID` secrets, which `tauri-apps/tauri-action`
  supports if you add them later.
- GitHub Releases has no published bandwidth cap for public repos, but very
  large or very popular binaries are still better served from a real CDN —
  revisit this if that ever becomes the bottleneck.
- Re-running the release workflow for the same tag is safe: `gh release
  upload --clobber` overwrites the stable-named assets rather than failing
  on "already exists".
