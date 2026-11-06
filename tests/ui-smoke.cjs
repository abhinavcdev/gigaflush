const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
process.chdir(root);
fs.mkdirSync(".impeccable/review", { recursive: true });
const server = http.createServer((req, res) => {
  const files = {
    "/": "index.html",
    "/main.js": "main.js",
    "/styles.css": "styles.css",
    "/brand/app-icon.svg": "brand/app-icon.svg",
    "/brand/app-icon-light.svg": "brand/app-icon-light.svg",
  };
  const file = files[req.url];
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.setHeader(
    "Content-Type",
    file.endsWith(".css")
      ? "text/css"
      : file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".svg")
          ? "image/svg+xml"
          : "text/html",
  );
  res.end(fs.readFileSync(path.join(root, "src", file)));
});
let browser;
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_PATH || undefined,
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 460, height: 700 },
    colorScheme: "light",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    localStorage.setItem("gigaflush:onboarded", "1");
    window.handlers = {};
    window.calls = [];
    window.fetch = async () => ({
      ok: true,
      json: async () => ({ tag_name: "v0.2.0" }),
    });
    window.__TAURI__ = {
      core: {
        invoke: async (cmd, args) => {
          window.calls.push({ cmd, args });
          if (cmd === "plugin:app|version") return "0.1.1";
          if (cmd === "get_default_path") return "/Users/demo/Developer";
          if (cmd === "path_exists") return true;
          if (cmd === "pick_folder") return "/Users/demo/Projects";
          if (cmd === "find_idle_servers")
            return {
              supported: true,
              servers: (window.idleServers ??= [
                {
                  pid: 4101,
                  started: "Sun Oct 25 15:45:53 2026",
                  runtime: "node",
                  label: "astro preview",
                  cwd: "/Users/demo/Projects/marketing-site",
                  ports: [4322],
                  uptime_secs: 7 * 86400,
                  memory_bytes: 182000000,
                  orphaned: true,
                  idle: true,
                  connected: false,
                },
                {
                  pid: 4102,
                  started: "Sat Oct 31 09:02:11 2026",
                  runtime: "python",
                  label: "manage runserver",
                  cwd: "/Users/demo/Projects/api",
                  ports: [8000],
                  uptime_secs: 9 * 3600,
                  memory_bytes: 64000000,
                  orphaned: false,
                  idle: true,
                  connected: false,
                },
                {
                  pid: 4103,
                  started: "Sun Nov 1 08:00:00 2026",
                  runtime: "node",
                  label: "vite",
                  cwd: "/Users/demo/Projects/studio-web",
                  ports: [5173],
                  uptime_secs: 2 * 3600,
                  memory_bytes: 210000000,
                  orphaned: false,
                  idle: false,
                  connected: true,
                },
              ]),
            };
          if (cmd === "stop_idle_servers") {
            const pids = args.targets.map((t) => t.pid);
            window.idleServers = window.idleServers.filter(
              (s) => !pids.includes(s.pid),
            );
            return pids.map((pid) => ({
              pid,
              stopped: true,
              memory_bytes: 182000000,
              error: null,
            }));
          }
          if (cmd === "delete_all") {
            let freed = 0;
            args.paths.forEach((path, i) => {
              freed += 100;
              window.handlers["purge-progress"]({
                payload: {
                  path,
                  index: i + 1,
                  total: args.paths.length,
                  status: "deleted",
                  size_bytes: 100,
                  freed_bytes: freed,
                },
              });
            });
            return freed;
          }
        },
      },
      event: {
        listen: async (name, cb) => {
          window.handlers[name] = cb;
        },
      },
      window: { getCurrentWindow: () => ({ hide: () => {} }) },
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.handlers["scan-complete"]);
  await page.waitForSelector("#update-banner:not([hidden])");
  assert.match(
    await page.locator("#update-label").textContent(),
    /0\.2\.0 is available/,
  );
  await page.waitForTimeout(350);
  await page.evaluate(
    () => (document.querySelector(".projects-list").scrollTop = 0),
  );
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/empty.png",
  });
  await page.locator("#scan-btn").click();
  await page.evaluate(() => {
    const fixtures = [
      ["atlas-mobile", "flutter", "build", 3248000000],
      ["studio-web", "node", "node_modules", 981000000],
      ["search-index", "rust", "target", 782000000],
      ["atlas-mobile", "flutter", ".dart_tool", 128000000],
      ["data-pipeline", "python", ".pytest_cache", 28000000],
      ["menu-bar", "swift", ".build", 18000000],
    ];
    fixtures.forEach(([name, ecosystem, folder, size_bytes]) =>
      handlers["project-found"]({
        payload: {
          name,
          ecosystem,
          folder,
          size_bytes,
          path: "/Users/demo/Developer/" + name,
          cleanup_path: "/Users/demo/Developer/" + name + "/" + folder,
          recovery:
            "Run your package manager or build command to regenerate these files.",
        },
      }),
    );
    handlers["scan-complete"]({ payload: { total_count: fixtures.length } });
  });
  assert.equal(await page.locator("#projects-list .project-row").count(), 6);
  // Composition bar: one segment per ecosystem group, legend filters the list.
  assert.equal(await page.locator("#mix").isVisible(), true);
  await page.locator('.mix-item[data-group="rust"]').click();
  assert.equal(
    await page.locator("#projects-list .project-row").count(),
    await page.evaluate(
      () => projects.filter((p) => p.ecosystem === "rust").length,
    ),
  );
  await page.locator('.mix-item[data-group="rust"]').click();
  assert.equal(await page.locator(".mix-item:not([hidden])").count(), 4);
  assert.equal(await page.locator(".project-check:checked").count(), 0);
  await page.locator(".project-check").first().check();
  await page.waitForTimeout(350);
  await page.evaluate(
    () => (document.querySelector(".projects-list").scrollTop = 0),
  );
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/light.png",
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.waitForTimeout(350);
  await page.evaluate(
    () => (document.querySelector(".projects-list").scrollTop = 0),
  );
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/dark.png",
  });
  // Theme: system by default, then pinned light → dark → back to system.
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    undefined,
  );
  await page.locator("#theme-btn").click();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "light",
  );
  await page.locator("#theme-btn").click();
  assert.equal(
    await page.evaluate(() => [
      document.documentElement.dataset.theme,
      localStorage.getItem("gigaflush:theme"),
    ]).then((v) => v.join()),
    "dark,dark",
  );
  await page.locator("#theme-btn").click();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    undefined,
  );
  await page.locator("#search-input").fill("Python");
  assert.equal(await page.locator("#projects-list .project-row").count(), 1);
  await page.locator("#select-all-btn").click();
  assert.equal(await page.locator("#selected-count").textContent(), "2");
  await page.locator("#purge-all-btn").click();
  assert.equal(await page.locator("#confirm-paths > div").count(), 2);
  await page.waitForTimeout(350);
  await page.evaluate(
    () => (document.querySelector(".projects-list").scrollTop = 0),
  );
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/confirmation.png",
  });
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page
      .locator("#confirm-accept")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator("#confirm-cancel")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#confirm-overlay").isVisible(), false);
  await page.locator("#search-input").fill("");
  await page.locator("#cleanup-options summary").click();
  await page.waitForTimeout(350);
  await page.evaluate(
    () => (document.querySelector(".projects-list").scrollTop = 0),
  );
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/options.png",
  });
  await page.setViewportSize({ width: 380, height: 560 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.waitForTimeout(350);
  await page.evaluate(
    () => (document.querySelector(".projects-list").scrollTop = 0),
  );
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/compact.png",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(
    await page
      .locator("#view-files .footer")
      .evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight),
    true,
  );
  await page.locator("#cleanup-options summary").click();
  await page.locator("#purge-all-btn").click();
  await page.locator("#confirm-accept").click();
  await page.waitForFunction(
    () => document.querySelector("#selected-count").textContent === "0",
  );
  assert.equal(await page.locator("#projects-list .project-row").count(), 4);
  // Stress: a burst of discoveries must keep the initial DOM bounded.
  await page.locator("#scan-btn").click();
  const elapsed = await page.evaluate(() => {
    const t = performance.now();
    for (let i = 0; i < 2000; i++)
      handlers["project-found"]({
        payload: {
          name: "project-" + i,
          ecosystem: "node",
          folder: "node_modules",
          path: "/tmp/project-" + i,
          cleanup_path: "/tmp/project-" + i + "/node_modules",
          size_bytes: i * 1000,
        },
      });
    handlers["scan-complete"]({ payload: { total_count: 2000 } });
    return performance.now() - t;
  });
  assert.equal(await page.locator("#projects-list .project-row").count(), 100);
  await page.locator(".load-more").click();
  assert.equal(await page.locator("#projects-list .project-row").count(), 200);
  assert.equal(
    await page
      .locator(".project-check")
      .nth(100)
      .evaluate((el) => el === document.activeElement),
    true,
  );
  // Idle dev servers: listed, confirmed, stopped by pid + start time.

  await page.setViewportSize({ width: 460, height: 700 });
  await page.locator("#tab-servers").click();
  assert.equal(await page.locator("#view-servers").isVisible(), true);
  assert.equal(await page.locator("#view-files").isVisible(), false);
  assert.equal(await page.locator("#servers-badge").textContent(), "2");
  // In-use servers appear on the port map only, never as stoppable rows.
  assert.equal(await page.locator("#port-map .socket").count(), 3);
  assert.equal(await page.locator("#port-map button.socket").count(), 2);
  assert.equal(await page.locator("#idle-list .idle-row").count(), 2);
  await page.waitForTimeout(900);
  await page.screenshot({
    animations: "disabled",
    path: process.cwd() + "/.impeccable/review/idle-servers.png",
  });
  await page.locator("#idle-list .idle-row").first().locator(".nuke-btn").click();
  assert.match(
    await page.locator("#confirm-title").textContent(),
    /Stop marketing-site/,
  );
  await page.locator("#confirm-accept").click();
  await page.waitForFunction(
    () => document.querySelectorAll("#idle-list .idle-row.is-deleted").length === 1,
  );
  assert.deepEqual(
    await page.evaluate(
      () => calls.find((c) => c.cmd === "stop_idle_servers").args,
    ),
    { targets: [{ pid: 4101, started: "Sun Oct 25 15:45:53 2026" }] },
  );
  assert.match(
    await page.locator("#servers-subtitle").textContent(),
    /Stopped 1 server/,
  );
  // Stopped items hold their place (no layout shift) until the view reopens.
  assert.equal(await page.locator("#idle-list .idle-row").count(), 2);
  await page.waitForSelector("#port-map .socket.is-free");
  assert.equal(await page.locator("#idle-list .idle-row").count(), 2);
  await page.locator("#tab-files").click();
  await page.locator("#tab-servers").click();
  await page.waitForFunction(
    () => document.querySelectorAll("#idle-list .idle-row").length === 1,
  );
  assert.equal(await page.locator("#port-map .socket").count(), 2);
  await page.keyboard.press("Meta+1");
  assert.equal(await page.locator("#view-files").isVisible(), true);

  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "passed",
      scenarios: [
        "light/dark",
        "theme switcher",
        "update banner",
        "filter",
        "selection",
        "confirm/cancel",
        "mock cleanup",
        "compact",
        "2000 results",
        "idle servers",
      ],
      burstRenderMs: Math.round(elapsed),
      browserErrors: errors,
    }),
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server.close();
  });
