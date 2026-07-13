# Releasing NodeMinus

Two distribution channels, both fed by one workflow ([.github/workflows/release.yml](.github/workflows/release.yml)):

- **GitHub Releases** — versioned artifacts with changelogs, created automatically on tag push.
- **Cloudflare R2 direct downloads** — stable URLs the landing page links to
  (`/latest/NodeMinus-macos-arm64.dmg` etc.), plus a `latest.json` version manifest
  and `SHA256SUMS.txt`.

## One-time setup

### 1. GitHub repository

```bash
git init && git add -A && git commit -m "NodeMinus"
gh repo create abhinavcdev/nodeminus --public --source=. --push
```

(If you pick a different repo name, update `GITHUB_REPO` in [site/index.html](site/index.html).)

### 2. Cloudflare R2 bucket

```bash
npx wrangler r2 bucket create nodeminus-releases

# Recommended: serve downloads from a custom domain (zone must be on Cloudflare)
npx wrangler r2 bucket domain add nodeminus-releases --domain dl.nodeminus.app
```

No custom domain? Enable the r2.dev public URL instead (Dashboard → R2 →
nodeminus-releases → Settings → Public access) and put the resulting
`https://pub-<hash>.r2.dev` URL into `DOWNLOAD_BASE` in [site/index.html](site/index.html).

If the landing page and downloads are on **different origins**, allow the site to
read `latest.json` (Dashboard → R2 → bucket → Settings → CORS policy):

```json
[{ "AllowedOrigins": ["https://your-site-domain"], "AllowedMethods": ["GET"] }]
```

The page degrades gracefully without CORS — it just shows the fallback version string.

### 3. R2 API credentials → GitHub secrets

Dashboard → R2 → **Manage R2 API Tokens** → Create token with
**Object Read & Write**, scoped to `nodeminus-releases`. Then:

```bash
gh secret set R2_ACCOUNT_ID        # Cloudflare account ID (dashboard sidebar)
gh secret set R2_ACCESS_KEY_ID     # from the R2 token
gh secret set R2_SECRET_ACCESS_KEY # from the R2 token
```

### 4. Landing page

Set the two constants at the top of the `<script>` in [site/index.html](site/index.html)
(`DOWNLOAD_BASE`, `GITHUB_REPO`), then deploy:

```bash
npm install
npx wrangler login   # first time only
npm run site:deploy  # → https://nodeminus-site.<account>.workers.dev
```

Add a custom domain for the site in the dashboard (Workers & Pages →
nodeminus-site → Settings → Domains & Routes).

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

The workflow then:

1. Builds macOS (Apple Silicon + Intel), Windows x64, and Linux x86_64 bundles.
2. Publishes a GitHub Release with the original Tauri artifacts.
3. Mirrors to R2:
   - `releases/v0.2.0/…` — immutable, versioned copies (1-year cache).
   - `latest/NodeMinus-<platform>.<ext>` — stable names (5-minute cache).
   - `latest/SHA256SUMS.txt` and `latest.json` — checksums + version manifest.

## Stable download URLs

| Platform | URL |
|----------|-----|
| macOS (Apple Silicon) | `$DOWNLOAD_BASE/latest/NodeMinus-macos-arm64.dmg` |
| macOS (Intel) | `$DOWNLOAD_BASE/latest/NodeMinus-macos-x64.dmg` |
| Windows x64 | `$DOWNLOAD_BASE/latest/NodeMinus-windows-x64-setup.exe` |
| Linux AppImage | `$DOWNLOAD_BASE/latest/NodeMinus-linux-x86_64.AppImage` |
| Linux .deb | `$DOWNLOAD_BASE/latest/NodeMinus-linux-amd64.deb` |
| Checksums | `$DOWNLOAD_BASE/latest/SHA256SUMS.txt` |
| Version manifest | `$DOWNLOAD_BASE/latest.json` |

## Notes

- macOS builds are unsigned until you add `APPLE_CERTIFICATE` / notarization
  secrets to the workflow (tauri-action supports them) — users will need to
  right-click → Open on first launch.
- The R2 upload job uses the AWS CLI against R2's S3 endpoint with
  `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` — don't remove that env var;
  newer AWS CLI versions send integrity checksums R2 rejects.
