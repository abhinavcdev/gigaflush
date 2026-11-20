// GitHub social preview (1280×640): the real app panel, rendered from src/ with
// sample data, beside the headline. From the repo root, after brand/make.py:
//
//   node brand/social-preview.cjs        → brand/social-preview.png
//
// Upload it at GitHub → repo Settings → General → Social preview.
// Set BROWSER_PATH to use an existing Chrome.
const { chromium } = require("playwright");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p));
const b64 = (p) => read(p).toString("base64");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

const FOLDERS = [
  ["atlas-mobile", "flutter", "build", 3248000000],
  ["studio-web", "node", "node_modules", 1481000000],
  ["search-index", "rust", "target", 1182000000],
  ["billing-api", "node", "node_modules", 846000000],
  ["atlas-mobile", "flutter", ".dart_tool", 328000000],
  ["data-pipeline", "python", ".mypy_cache", 128000000],
  ["menu-bar", "swift", ".build", 98000000],
];

// Serves the app's frontend as Tauri would.
const server = http.createServer((req, res) => {
  const url = req.url === "/" ? "/index.html" : req.url.split("?")[0];
  const file = path.join(root, "src", path.normalize(url));
  if (!file.startsWith(path.join(root, "src")) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end();
  }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  res.end(fs.readFileSync(file));
});

async function capturePanel(browser, port) {
  const page = await browser.newPage({ viewport: { width: 460, height: 760 }, deviceScaleFactor: 3, colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("gigaflush:onboarded", "1");
    window.handlers = {};
    window.fetch = async () => ({ ok: true, json: async () => ({ tag_name: "v0.2.2" }) });
    window.__TAURI__ = {
      core: {
        invoke: async (cmd) => {
          if (cmd === "plugin:app|version") return "0.2.2";
          if (cmd === "get_default_path") return "/Users/demo/Developer";
          if (cmd === "path_exists") return true;
          if (cmd === "find_idle_servers") return { supported: true, servers: [] };
        },
      },
      event: { listen: async (name, cb) => void (window.handlers[name] = cb) },
      window: { getCurrentWindow: () => ({ hide: () => {} }) },
    };
  });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.handlers["scan-complete"]);
  await page.locator("#scan-btn").click();
  await page.evaluate((folders) => {
    folders.forEach(([name, ecosystem, folder, size_bytes]) =>
      window.handlers["project-found"]({
        payload: { name, ecosystem, folder, size_bytes, path: `/Users/demo/Developer/${name}`, cleanup_path: `/Users/demo/Developer/${name}/${folder}`, recovery: "Run your package manager or build command to regenerate these files." },
      }),
    );
    window.handlers["scan-complete"]({ payload: { total_count: folders.length } });
  }, FOLDERS);
  await page.waitForTimeout(500);
  await page.locator("#projects-list .project-check").first().click();
  await page.locator("#projects-list .project-check").nth(1).click();
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(0, 0); // no hover or focus state in the picture
  await page.waitForTimeout(900);
  const png = await page.screenshot({ animations: "disabled", omitBackground: true });
  await page.close();
  return png.toString("base64");
}

const html = (panel) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:500;src:url(data:font/woff;base64,${b64("site/node_modules/@fontsource/inter/files/inter-latin-500-normal.woff")})}
@font-face{font-family:Inter;font-weight:600;src:url(data:font/woff;base64,${b64("site/node_modules/@fontsource/inter/files/inter-latin-600-normal.woff")})}
@font-face{font-family:Mono;font-weight:500;src:url(data:font/woff;base64,${b64("site/node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff")})}
*{box-sizing:border-box;margin:0}
body{width:1280px;height:640px;overflow:hidden;position:relative;background:#111110;color:#f2f2ec;font-family:Inter;-webkit-font-smoothing:antialiased}
.line{position:absolute;background:#ffffff14}
.h{left:0;right:0;height:1px}.v{top:0;bottom:0;width:1px}
.cross{position:absolute;width:15px;height:15px;background:linear-gradient(#ffffff40,#ffffff40) 7px 0/1px 15px no-repeat,linear-gradient(#ffffff40,#ffffff40) 0 7px/15px 1px no-repeat}
.rail{position:absolute;top:0;bottom:0;width:40px;background:repeating-linear-gradient(-45deg,transparent 0 9px,#ffffff0d 9px 10px)}
.glow{position:absolute;right:-140px;top:-170px;width:860px;height:860px;background:radial-gradient(closest-side,#4a9dff30,transparent)}
.brand{position:absolute;left:88px;top:74px;display:flex;align-items:center;gap:16px;font-size:32px;font-weight:600;letter-spacing:-.8px}
.brand img{width:60px;height:60px}
h1{position:absolute;left:88px;top:196px;font-size:68px;line-height:1.06;font-weight:600;letter-spacing:-2.8px}
h1 span{color:#8f8f8a;display:block}
.chips{position:absolute;left:88px;top:376px;width:560px;display:flex;flex-wrap:wrap;gap:10px}
.chips code{font:500 19px Mono;padding:8px 13px;border-radius:9px;background:#ffffff0f;box-shadow:inset 0 0 0 1px #ffffff14;color:#e4e4de}
.meta{position:absolute;left:88px;top:534px;font-size:23px;font-weight:500;color:#a8a8a2;letter-spacing:-.3px}
.meta b{color:#f2f2ec;font-weight:600}
.panel{position:absolute;left:760px;top:56px;width:460px;filter:drop-shadow(0 34px 60px #000000b0)}
.panel img{display:block;width:460px;height:760px}
</style>
<div class="glow"></div>
<div class="rail" style="left:0"></div><div class="rail" style="right:0"></div>
<div class="line v" style="left:40px"></div><div class="line v" style="right:40px"></div>
<div class="line h" style="top:40px"></div><div class="line h" style="bottom:40px"></div>
<div class="cross" style="left:33px;top:33px"></div><div class="cross" style="right:33px;top:33px"></div>
<div class="cross" style="left:33px;bottom:33px"></div><div class="cross" style="right:33px;bottom:33px"></div>
<div class="brand"><img src="data:image/svg+xml;base64,${Buffer.from(read("brand/app-icon.svg").toString().replace('viewBox="0 0 1024 1024"', 'viewBox="100 100 824 824"')).toString("base64")}">Gigaflush</div>
<h1>Your disk isn’t full.<span>It’s build caches.</span></h1>
<div class="chips"><code>node_modules</code><code>target</code><code>build</code><code>.dart_tool</code><code>.gradle</code><code>.mypy_cache</code><code>.build</code></div>
<div class="meta"><b>Free and open source</b> · macOS · Windows · Linux</div>
<div class="panel"><img src="data:image/png;base64,${panel}"></div>`;

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || undefined });
  try {
    const panel = await capturePanel(browser, server.address().port);
    const page = await browser.newPage({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 2 });
    await page.setContent(html(panel), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(root, "brand/social-preview.png");
    await page.screenshot({ path: out });
    console.log(`brand/social-preview.png (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
