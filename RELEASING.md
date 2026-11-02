# Releasing Gigaflush

Gigaflush is open source (GPL-3.0-or-later). The project is funded by selling
signed, ready-to-run builds:

| Platform | What's sold | Where it's delivered |
|---|---|---|
| macOS | Universal `.dmg`, Developer ID signed + notarized, $4.99 | Polar product "Gigaflush for macOS" |
| Windows | Signed `.exe` installer, $4.99 | Polar product "Gigaflush for Windows" |
| Linux | Free `.AppImage` / `.deb` | Public GitHub Release |

One workflow ([.github/workflows/release.yml](.github/workflows/release.yml))
runs on tag push. It builds all three platforms, publishes a public GitHub
Release with the Linux files, and keeps the macOS and Windows installers as a
private workflow artifact named `paid-installers-<tag>`.

## Cutting a release

```bash
# 1. Bump the version in BOTH files (keep them in sync):
#    src-tauri/tauri.conf.json  "version"
#    package.json               "version"
# 2. Add a CHANGELOG entry.
# 3. Tag and push.
git commit -am "release: v0.2.0"
git tag v0.2.0
git push && git push --tags
```

When the workflow finishes:

1. Download `paid-installers-v0.2.0` from the run's **Summary** page.
2. In Polar, open each product → **Benefits → File downloads** and upload the
   new installer (`Gigaflush-macos-universal.dmg`, `Gigaflush-windows-x64-setup.exe`).
   Existing customers see the new file in their Polar library.
3. The apps check GitHub's latest release at most twice a day and show an
   "update available" banner. Paid builds link to the Polar library, Linux
   builds to the GitHub Release.

Publish the GitHub Release only after the Polar files are updated, or buyers
will see the banner before the download exists.

## Signing

The workflow signs only when the secrets exist, and prints a warning
otherwise. **Never sell an unsigned build.**

### macOS (Developer ID + notarization)

Requires an Apple Developer Program membership ($99/year).

1. In Xcode or developer.apple.com, create a **Developer ID Application**
   certificate. Export it with its private key as a `.p12`.
2. Create an app-specific password at appleid.apple.com.
3. Add these repository secrets:

| Secret | Value |
|---|---|
| `APPLE_CERTIFICATE` | `base64 -i cert.p12` output |
| `APPLE_CERTIFICATE_PASSWORD` | the `.p12` export password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | your Apple ID email |
| `APPLE_PASSWORD` | the app-specific password |
| `APPLE_TEAM_ID` | your 10-character team ID |

Tauri signs with the hardened runtime and notarizes automatically when these
are set.

### Windows (Azure Artifact Signing)

SmartScreen warns on unsigned installers, and code-signing certificates now
have to live in a hardware or cloud HSM. Azure Artifact Signing (formerly
Azure Trusted Signing) is the cheapest route for an individual developer.

1. Create an Artifact Signing account and certificate profile in Azure, and
   complete identity validation.
2. Create an app registration (service principal) and give it the signer role
   on the certificate profile, following Microsoft's Artifact Signing setup guide.
3. Add these secrets: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`,
   `AZURE_TENANT_ID`, `AZURE_SIGNING_ENDPOINT` (e.g.
   `https://eus.codesigning.azure.net`), `AZURE_SIGNING_ACCOUNT`,
   `AZURE_SIGNING_PROFILE`.

The workflow installs `artifact-signing-cli` and passes it to Tauri as the
`signCommand`.

## Landing page

[`site/`](site/) is an Astro project (Node ≥ 22.23.4). Links to GitHub and
Polar live in [site/src/config.ts](site/src/config.ts). Set the Polar
checkout links there once the products exist.

```bash
npm install && npm --prefix site install
npm run site:dev      # http://localhost:4321
npx wrangler login    # first time only
npm run site:deploy   # → https://gigaflush-site.<account>.workers.dev
```

Add the custom domain in Cloudflare (Workers & Pages → gigaflush-site →
Settings → Domains & Routes).
