// Renders the PNG brand assets from the SVGs written by brand/make.py.
//
//   node brand/render.mjs                 (from the repo root, after make.py)
//   npx tauri icon brand/app-icon-1024.png   (regenerates src-tauri/icons)
//
// Uses sharp from the site's dependencies.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sharp = createRequire(join(root, "site/package.json"))("sharp");
const at = (p) => join(root, p);

const jobs = [
  // App icon source for `tauri icon`, and the README/brand copy.
  ["brand/app-icon.svg", "brand/app-icon-1024.png", 1024],
  // Menu-bar template icon (black on transparent; macOS tints it).
  ["brand/tray.svg", "src-tauri/icons/tray-icon.png", 44],
  // Site icons.
  ["brand/app-icon.svg", "site/public/apple-touch-icon.png", 180],
  ["brand/app-icon.svg", "site/public/icon-256.png", 256],
  ["brand/app-icon.svg", "site/public/icon-512.png", 512],
  ["brand/board.svg", "brand/board.png", 3360],
];

for (const [src, out, size] of jobs) {
  await sharp(at(src), { density: 300 }).resize(size).png({ compressionLevel: 9 }).toFile(at(out));
  console.log(`${out} (${size}px)`);
}
