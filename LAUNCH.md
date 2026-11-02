# Launch checklist

The model: Gigaflush is open source (GPL-3.0-or-later). Signed macOS and
Windows builds sell for $4.99 each through Polar. Linux is free.

## 1. Accounts and money (first: some take days)

- [ ] **Apple Developer Program** ($99/year). Identity verification can take
      a few days. Needed for Developer ID signing and notarization.
- [ ] **Azure Artifact Signing** for Windows. Identity validation can take
      several days. Without it, SmartScreen warns on every install.
- [ ] **Polar**: create the organization (slug `gigaflush`, or update
      `LINKS.library` in [src/main.js](src/main.js) and `POLAR.library` in
      [site/src/config.ts](site/src/config.ts)), connect payouts, and finish
      account review.
- [ ] Domain `gigaflush.app` (or update `site` in
      [site/astro.config.mjs](site/astro.config.mjs) and the links in the app).
- [ ] A working support inbox (`support@gigaflush.app` in the site config).

## 2. Repository

- [ ] Rename the GitHub repo to `abhinavcdev/gigaflush` (GitHub redirects the
      old URL).
- [ ] Commit the GPL `LICENSE`. Add a `CONTRIBUTING.md` that says
      contributions are accepted under GPL-3.0-or-later. If you may ever want
      to relicense, require a CLA or DCO sign-off now; it's much harder later.
- [ ] Add the signing secrets listed in [RELEASING.md](RELEASING.md).
- [ ] Consider registering the "Gigaflush" trademark once revenue justifies it;
      the README already says forks must rename.

## 3. Polar products

Create two products, both one-time $4.99, each with a **File downloads**
benefit:

- [ ] "Gigaflush for macOS" → `Gigaflush-macos-universal.dmg`
- [ ] "Gigaflush for Windows" → `Gigaflush-windows-x64-setup.exe`
- [ ] Paste both checkout links into `POLAR` in
      [site/src/config.ts](site/src/config.ts) (the buy buttons are
      placeholders until then).
- [ ] Do one real purchase per platform (refund yourself afterwards) to check
      the receipt, the download, and the library link.

## 4. First signed release

- [ ] Bump the version to 0.2.0 in `package.json` and
      `src-tauri/tauri.conf.json`, and date the CHANGELOG entry.
- [ ] Tag `v0.2.0`, and confirm the workflow logs show **no** signing warnings.
- [ ] On a clean Mac: open the `.dmg`. It must launch with no Gatekeeper
      prompt beyond the normal "downloaded from the internet" one. Check
      `spctl -a -vv Gigaflush.app` reports *Notarized Developer ID*.
- [ ] On a clean Windows 11 machine: the installer shows your publisher name.
- [ ] On Ubuntu: AppImage and .deb launch and the tray icon appears.
- [ ] Upload the paid installers to Polar, then check the update banner on an
      older build points to the right place.

## 5. Website

- [ ] Review [Privacy](site/src/pages/privacy.astro),
      [Terms](site/src/pages/terms.astro) (especially the 30-day refund
      promise), and [Support](site/src/pages/support.astro). They are a
      sensible starting point, not legal advice.
- [ ] `npm run site:deploy`, attach the domain, and test buy links on mobile.
- [ ] Check the social preview (og.png) with a link-preview debugger.
- [ ] Submit `https://gigaflush.app/sitemap-index.xml` to Google Search Console
      and Bing Webmaster Tools, and request indexing for `/`, `/guides` and
      the `/clean/*` pages.
- [ ] Re-read the blog posts before publishing. Each post is dated
      2026-11-01; set real publish dates if you release them gradually.
      The npkill/kondo comparison reflects their READMEs as of November 2026.
- [ ] Publish a post every week or two (one keyword per post) and link
      each one from the relevant `/clean/*` guide (`posts` in
      [site/src/data/cleanup.ts](site/src/data/cleanup.ts)).

## 6. Launch day

- [ ] A 20–30 second screen recording of scan → review → reclaim (the hero
      demo, but real). It's the asset every channel needs.
- [ ] Show HN ("Show HN: Gigaflush – open-source cleanup for node_modules,
      Rust target, Flutter build…"), r/webdev, r/rust, r/FlutterDev, X/Bluesky,
      Product Hunt.
- [ ] Lead with "open source, review before delete". Mention paid builds
      plainly; HN is fine with it when the source really is there.
- [ ] Be in the comments for the first few hours.

## 7. After launch

- [ ] Watch issues for detection misses; each new ecosystem is a good
      changelog entry and a reason to post again.
- [ ] Ship small, frequent releases so the update banner reminds people the
      app is alive.
