// Everything the site links to lives here.

export const GITHUB_REPO = "abhinavcdev/gigaflush";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`;
export const DOWNLOAD_BASE = `${RELEASES_URL}/download`;

// Stable asset names. The release workflow copies every build to these names,
// so /releases/latest/download/<name> always serves the newest version.
export const DOWNLOADS = {
  mac: `${DOWNLOAD_BASE}/Gigaflush-macos-universal.dmg`,
  windows: `${DOWNLOAD_BASE}/Gigaflush-windows-x64-setup.exe`,
  windowsMsi: `${DOWNLOAD_BASE}/Gigaflush-windows-x64.msi`,
  appimage: `${DOWNLOAD_BASE}/Gigaflush-linux-x86_64.AppImage`,
  deb: `${DOWNLOAD_BASE}/Gigaflush-linux-amd64.deb`,
  rpm: `${DOWNLOAD_BASE}/Gigaflush-linux-x86_64.rpm`,
  sums: `${DOWNLOAD_BASE}/SHA256SUMS.txt`,
};

// The tip jar. GitHub Sponsors takes no fee on personal sponsorships; enable it
// at https://github.com/sponsors, or point this at Ko-fi / Buy Me a Coffee.
export const TIP_URL = "https://github.com/sponsors/abhinavcdev";

export const SUPPORT_EMAIL = "support@gigaflush.com";
