// Shared by the FAQ section, its FAQPage structured data, and /llms.txt.
export const faqs: { q: string; a: string }[] = [
  { q: "Is it really free?", a: "Yes. Every build for macOS, Windows and Linux is free to download, and the source is GPL-3.0 on GitHub. There's no account, license key or trial. If it helps you, there's a tip jar." },
  { q: "Why does macOS or Windows warn me on first launch?", a: "The builds aren't code-signed by Apple or Microsoft, which costs money every year. On a Mac, open it once, then click Open Anyway in System Settings → Privacy & Security. On Windows, click More info, then Run anyway. Every build comes from GitHub Actions with published SHA-256 checksums, and you can always build it from source yourself." },
  { q: "What does the Servers tab stop?", a: "Only your own Node, Bun, Deno, Python, Ruby and PHP dev servers that have nothing connected to their port, have used almost no CPU, and were orphaned by a closed terminal or agent or have run for 6+ hours. Databases, Docker, editors, agents and language servers are never listed. Each one is re-checked, then asked to exit like Ctrl+C. Available on macOS and Linux; Windows is next." },
  { q: "Does it move files to the Trash?", a: "No. Cleanup is permanent, which is what actually frees the space. That's why every removal goes through a review sheet listing exact paths and rebuild steps first." },
  { q: "What will it never touch?", a: "Source code, lockfiles, virtual environments, global caches, SDKs, and generic dist/ or build/ folders without a matching project file. Inaccessible directories are skipped." },
  { q: "How do updates work?", a: "Gigaflush checks GitHub for a newer version at most twice a day and shows a small banner. Click it to download the new version from the site. Your settings carry over." },
  { q: "Does Gigaflush collect any data?", a: "No telemetry, no analytics, no account. The update check is a plain request to GitHub's public API. Scanning and cleanup happen entirely on your machine." },
  { q: "How accurate are the sizes?", a: "They're logical file-size estimates. Actual disk savings can differ with filesystem compression, clones, or hard links." },
  { q: "Something isn't working.", a: "Open an issue on GitHub with your OS and Gigaflush version, or email support." },
];
