# Launch checklist

The model: Gigaflush is free and open source (GPL-3.0-or-later) on every
platform. Unsigned builds are published on GitHub Releases; a tip jar
replaces pricing.

## 1. Accounts

- [ ] **Tip jar.** Enable GitHub Sponsors for `abhinavcdev` (no fee on personal
      sponsorships), or use Ko-fi / Buy Me a Coffee and update `TIP_URL` in
      [site/src/config.ts](site/src/config.ts). The app links to
      `gigaflush.com/#tip`, so it follows whatever the site points at.
- [ ] Domain `gigaflush.com` (or update `site` in
      [site/astro.config.mjs](site/astro.config.mjs) and the links in
      [src/main.js](src/main.js)).
- [ ] A working support inbox (`support@gigaflush.com` in the site config).

## 2. Repository

- [ ] Rename the GitHub repo to `abhinavcdev/gigaflush` (GitHub redirects the
      old URL) and make it public.
- [ ] Commit the GPL `LICENSE`. Add a `CONTRIBUTING.md` that says
      contributions are accepted under GPL-3.0-or-later.
- [ ] If `main` is protected, let `github-actions[bot]` push, so the Release
      workflow can commit the version bump.
- [ ] Turn on the FUNDING button: add `.github/FUNDING.yml` with
      `github: abhinavcdev`.

## 3. First release

- [ ] Date the CHANGELOG entry, then Actions → Release → Run workflow with
      `0.2.0`.
- [ ] On a clean Mac: open the `.dmg`, follow the Open Anyway steps on the
      site, and confirm the tray icon appears.
- [ ] On Windows 11: run the installer through SmartScreen.
- [ ] On Ubuntu: AppImage and .deb launch and the tray icon appears.
- [ ] Click every download button on the site (desktop and mobile) and
      confirm it fetches the right file.
- [ ] From an older build, check the update banner opens the download page.

## 4. Website

- [ ] Review [Privacy](site/src/pages/privacy.astro),
      [Terms](site/src/pages/terms.astro), and
      [Support](site/src/pages/support.astro). They are a sensible starting
      point, not legal advice.
- [ ] `npm run site:deploy` and attach `gigaflush.com` in Cloudflare.
- [ ] Add `www.gigaflush.com` too, with a Cloudflare redirect rule
      (301, `www.gigaflush.com/*` → `https://gigaflush.com/${1}`) so there is
      one canonical host. Do the same for any other domains you own.
- [ ] Check https://gigaflush.com/does-not-exist returns a real 404 (it
      should: `not_found_handling` is `404-page`).
- [ ] Check the social preview (og.png) with a link-preview debugger, e.g.
      opengraph.xyz.
- [ ] Run the homepage and one blog post through Google's Rich Results Test
      (FAQPage, HowTo, BreadcrumbList, BlogPosting, SoftwareApplication).
- [ ] Verify the domain in Google Search Console (DNS TXT record) and Bing
      Webmaster Tools (it can import from Search Console), submit
      `https://gigaflush.com/sitemap.xml`, and request indexing for
      `/`, `/guides`, `/mac`, `/windows`, `/linux` and the `/clean/*` pages.
- [ ] Turn on Cloudflare's Crawler Hints (Caching → Configuration), which
      pings IndexNow (Bing, Yandex) when pages change.
- [ ] Backlinks: put `https://gigaflush.com` in the GitHub repo's website
      field and topics (`node-modules`, `disk-cleanup`, `tauri`, `rust`,
      `developer-tools`), and submit to AlternativeTo (as an alternative to
      npkill, kondo and CleanMyMac) and awesome-tauri / awesome-mac lists.
- [ ] Re-read the blog posts before publishing. Each post is dated
      2026-11-01; set real publish dates if you release them gradually.
- [ ] Publish a post every week or two (one keyword per post) and link
      each one from the relevant `/clean/*` guide (`posts` in
      [site/src/data/cleanup.ts](site/src/data/cleanup.ts)).

## 5. Launch day

- [ ] A 20–30 second screen recording of scan → review → reclaim.
- [ ] Show HN ("Show HN: Gigaflush – free, open-source cleanup for
      node_modules, Rust target, Flutter build…"), r/webdev, r/rust,
      r/FlutterDev, X/Bluesky, Product Hunt.
- [ ] Mention the unsigned-build prompt up front and link the checksums;
      it heads off the first comment.
- [ ] Be in the comments for the first few hours.

## 6. After launch

- [ ] Watch issues for detection misses; each new ecosystem is a good
      changelog entry and a reason to post again.
- [ ] Ship small, frequent releases so the update banner reminds people the
      app is alive.
- [ ] Get listed: Homebrew cask, winget, Flathub, AUR. Each is a few lines
      pointing at the stable release URLs.
