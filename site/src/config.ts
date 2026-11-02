// Everything the site links to lives here.

export const GITHUB_REPO = "abhinavcdev/gigaflush";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`;
export const DOWNLOAD_BASE = `${RELEASES_URL}/download`;

// Polar checkout links for the paid, signed builds. Create one product per
// platform in Polar (one-time price, "File downloads" benefit), then paste
// each product's checkout link here.
export const POLAR = {
  mac: "https://buy.polar.sh/REPLACE_WITH_MAC_CHECKOUT_LINK",
  windows: "https://buy.polar.sh/REPLACE_WITH_WINDOWS_CHECKOUT_LINK",
  library: "https://polar.sh/gigaflush/portal",
};

export const PRICE = "$4.99";
export const SUPPORT_EMAIL = "support@gigaflush.app";

export const LINUX = {
  appimage: `${DOWNLOAD_BASE}/Gigaflush-linux-x86_64.AppImage`,
  deb: `${DOWNLOAD_BASE}/Gigaflush-linux-amd64.deb`,
  sums: `${DOWNLOAD_BASE}/SHA256SUMS.txt`,
};
