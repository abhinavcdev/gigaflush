// Gigaflush frontend application logic.

const ONBOARD_KEY = "gigaflush:onboarded";
const LAST_PATH_KEY = "gigaflush:lastPath";

let projects = [];
let selectedPaths = new Set();
let isScanning = false;
let isPurging = false;
let currentPath = "";
let homePath = "";
let scanStartedAt = 0;
let scanTimer = null;
let purgeDeletedPaths = new Set();
let purgeFailedCount = 0;
let purgeHideTimer = null;
let confirmResolver = null;
let renderTimer = null;
let visibleLimit = 100;
let focusBeforeDialog = null;
let isPicking = false;
const rowCache = new Map();
const TYPE_NAMES = {
  node: "Node.js",
  flutter: "Flutter / Dart",
  rust: "Rust",
  python: "Python",
  swift: "Swift",
  gradle: "Gradle",
  maven: "Maven",
};
const TYPES_KEY = "gigaflush:cleanupTypes";
const THEME_KEY = "gigaflush:theme";
const UPDATE_KEY = "gigaflush:updateCheck";
const UPDATE_INTERVAL = 12 * 60 * 60 * 1000;
const GITHUB_REPO = "abhinavcdev/gigaflush";
// Paid macOS/Windows builds are delivered through Polar; buyers download new
// versions from their Polar library. Linux builds live on GitHub Releases.
const LINKS = {
  source: `https://github.com/${GITHUB_REPO}`,
  support: "https://gigaflush.app/support",
  library: "https://polar.sh/gigaflush/portal",
  releases: `https://github.com/${GITHUB_REPO}/releases/latest`,
};
let appVersion = "";
const THEME_MODES = ["system", "light", "dark"];
const THEME_NAMES = { system: "System", light: "Light", dark: "Dark" };
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let reclaimTimer = null;
let lastReclaimed = 0;
let devServers = [];
let idleServers = [];
let idleCheckedAt = 0;
let isStoppingServers = false;
let currentView = "files";
let mixFilter = null;
let serversNotice = null;
const stoppedPids = new Set();
const IDLE_REFRESH_MS = 10 * 1000;
// Categorical slots follow the ecosystem, never its rank. Four slots only;
// the rarer ecosystems share "Other".
const MIX_GROUPS = [
  { id: "node", name: "Node.js", types: ["node"] },
  { id: "rust", name: "Rust", types: ["rust"] },
  { id: "flutter", name: "Flutter", types: ["flutter"] },
  { id: "other", name: "Other", types: ["python", "swift", "gradle", "maven"] },
];

const els = {};

const ELEMENT_IDS = [
  "search-input",
  "type-options",
  "types-summary",
  "cleanup-options",
  "scan-path",
  "path-button",
  "scan-btn",
  "pick-folder-btn",
  "select-all-btn",
  "select-all-label",
  "scan-progress",
  "status-line",
  "total-size",
  "total-count",
  "selected-count",
  "projects-list",
  "empty-state",
  "scan-skeleton",
  "results-subtitle",
  "purge-progress",
  "purge-progress-label",
  "purge-progress-path",
  "purge-progress-count",
  "purge-progress-fill",
  "purge-progress-freed",
  "purge-progress-state",
  "footer-summary",
  "footer-detail",
  "purge-all-btn",
  "help-btn",
  "hide-btn",
  "theme-btn",
  "update-banner",
  "update-label",
  "app-version",
  "onboarding-overlay",
  "onboarding-pick-btn",
  "onboarding-start-btn",
  "onboarding-dismiss",
  "confirm-overlay",
  "confirm-title",
  "confirm-body",
  "confirm-paths",
  "confirm-cancel",
  "confirm-accept",
  "idle-list",
  "idle-stop-all",
  "shell",
  "view-switch",
  "view-files",
  "view-servers",
  "servers-badge",
  "mix",
  "mix-bar",
  "mix-legend",
  "idle-memory",
  "idle-count",
  "live-count",
  "port-map",
  "servers-subtitle",
  "servers-empty",
  "servers-empty-copy",
  "servers-summary",
  "idle-label",
  "servers-refresh",
  "live-group",
  "live-group-count",
  "live-list",
  "map-count",
];

function invoke(cmd, args) {
  return window.__TAURI__.core.invoke(cmd, args);
}

function listen(event, handler) {
  return window.__TAURI__.event.listen(event, handler);
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  for (const id of ELEMENT_IDS) {
    els[toCamel(id)] = document.getElementById(id);
  }

  try {
    const saved = JSON.parse(localStorage.getItem(TYPES_KEY));
    if (Array.isArray(saved))
      els.typeOptions.querySelectorAll("input").forEach((input) => {
        input.checked = saved.includes(input.value);
      });
  } catch (_) {
    /* Use defaults if saved preferences are invalid. */
  }
  if (window.__TAURI__ && /Mac/.test(navigator.userAgent))
    document.documentElement.classList.add("vibrant");
  buildMix();
  updateTypes();
  applyTheme(readTheme());
  bindEvents();
  await restoreScanPath();
  updatePathDisplay();
  updateStats();
  setStatus("Ready to scan");

  await listen("project-found", (event) => onProjectFound(event.payload));
  await listen("scan-complete", (event) => onScanComplete(event.payload));
  await listen("purge-progress", (event) => updatePurgeProgress(event.payload));
  await listen("quick-scan-requested", () => {
    dismissOnboarding();
    setView("files");
    startScan();
  });
  await listen("panel-shown", presentPanel);
  moveThumb();

  if (!localStorage.getItem(ONBOARD_KEY)) {
    showOnboarding();
  }
  checkForUpdates();
  refreshIdleServers(true);
}

function toCamel(id) {
  return id.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

function bindEvents() {
  els.scanBtn.addEventListener("click", startScan);
  els.pickFolderBtn.addEventListener("click", () => pickFolder());
  els.pathButton.addEventListener("click", () => pickFolder());
  els.selectAllBtn.addEventListener("click", toggleSelectAll);
  els.purgeAllBtn.addEventListener("click", purgeSelected);
  els.helpBtn.addEventListener("click", showOnboarding);
  els.hideBtn.addEventListener("click", hideWindow);
  els.themeBtn.addEventListener("click", cycleTheme);
  els.updateBanner.addEventListener("click", () =>
    openExternal(isLinux() ? LINKS.releases : LINKS.library),
  );
  document
    .querySelectorAll("[data-link]")
    .forEach((link) =>
      link.addEventListener("click", () =>
        openExternal(LINKS[link.dataset.link]),
      ),
    );
  window.addEventListener("focus", checkForUpdates);
  window.addEventListener("focus", () => refreshIdleServers());
  els.idleStopAll.addEventListener("click", () => stopServers(idleServers));
  els.viewSwitch
    .querySelectorAll("[role=tab]")
    .forEach((tab) =>
      tab.addEventListener("click", () => setView(tab.dataset.view)),
    );
  els.viewSwitch.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setView(currentView === "files" ? "servers" : "files", { focus: true });
  });
  window.addEventListener("resize", moveThumb);
  els.serversRefresh.addEventListener("click", () => refreshIdleServers(true));
  bindServerLinks();

  els.onboardingDismiss.addEventListener("click", dismissOnboarding);
  els.onboardingStartBtn.addEventListener("click", () => {
    dismissOnboarding();
    currentPath = homePath || currentPath;
    updatePathDisplay();
    startScan();
  });
  els.onboardingPickBtn.addEventListener("click", async () => {
    dismissOnboarding();
    const picked = await pickFolder();
    if (picked) startScan();
  });

  els.confirmCancel.addEventListener("click", () => settleConfirm(false));
  els.confirmAccept.addEventListener("click", () => settleConfirm(true));
  els.confirmOverlay.addEventListener("click", (event) => {
    if (event.target === els.confirmOverlay) settleConfirm(false);
  });

  els.searchInput.addEventListener("input", () => {
    visibleLimit = 100;
    renderProjectList();
    updateStats();
  });
  els.typeOptions.addEventListener("change", () => {
    localStorage.setItem(TYPES_KEY, JSON.stringify(getEnabledTypes()));
    updateTypes();
    setStatus("Cleanup types updated. Scan to apply.");
  });
  document.addEventListener("keydown", (event) => {
    const dialog = !els.confirmOverlay.hidden
      ? els.confirmOverlay
      : !els.onboardingOverlay.hidden
        ? els.onboardingOverlay
        : null;
    if (dialog && event.key === "Tab") {
      const focusable = [
        ...dialog.querySelectorAll("button:not(:disabled), input"),
      ];
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (
      !dialog &&
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "f"
    ) {
      event.preventDefault();
      setView("files");
      els.searchInput.focus();
    }
    if (
      !dialog &&
      (event.metaKey || event.ctrlKey) &&
      /^[12]$/.test(event.key)
    ) {
      event.preventDefault();
      setView(event.key === "1" ? "files" : "servers");
    }
    if (
      !dialog &&
      (event.metaKey || event.ctrlKey) &&
      event.key.toLowerCase() === "r"
    ) {
      event.preventDefault();
      if (currentView === "servers") refreshIdleServers(true);
      else startScan();
    }
    if (event.key !== "Escape") return;
    if (!els.confirmOverlay.hidden) {
      settleConfirm(false);
      return;
    }
    if (!els.onboardingOverlay.hidden) {
      dismissOnboarding();
      return;
    }
    hideWindow();
  });
}

async function restoreScanPath() {
  try {
    homePath = await invoke("get_default_path");
  } catch (err) {
    console.warn("Could not get default path, using fallback:", err);
    homePath = "~/";
  }
  currentPath = homePath;

  const stored = localStorage.getItem(LAST_PATH_KEY);
  if (!stored) return;
  try {
    if (await invoke("path_exists", { path: stored })) {
      currentPath = stored;
    } else {
      localStorage.removeItem(LAST_PATH_KEY);
    }
  } catch (_) {
    // Keep the default path if validation fails.
  }
}

function hideWindow() {
  try {
    window.__TAURI__.window.getCurrentWindow().hide();
  } catch (err) {
    console.warn("Could not hide window:", err);
  }
}

// ── Theme ────────────────────────────────────────────────────────

function readTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEME_MODES.includes(saved) ? saved : "system";
  } catch (_) {
    return "system";
  }
}

function applyTheme(mode) {
  if (mode === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = mode;
  const label = `Theme: ${THEME_NAMES[mode]}`;
  els.themeBtn.dataset.mode = mode;
  els.themeBtn.title = label;
  els.themeBtn.setAttribute("aria-label", label);
}

function cycleTheme() {
  const current = els.themeBtn.dataset.mode || "system";
  const next =
    THEME_MODES[(THEME_MODES.indexOf(current) + 1) % THEME_MODES.length];
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (_) {
    /* The theme still applies for this session. */
  }
  applyTheme(next);
}

// ── Updates & links ──────────────────────────────────────────────

function openExternal(url) {
  invoke("plugin:opener|open_url", { url }).catch((err) =>
    console.warn("Could not open link:", err),
  );
}

function isLinux() {
  return (
    /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent)
  );
}

function isNewer(latest, current) {
  const parse = (v) =>
    v
      .replace(/^v/, "")
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const [a, b] = [parse(latest), parse(current)];
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

// Builds are distributed outside an app store, so the panel checks GitHub for
// a newer release at most twice a day and offers the right download page.
async function checkForUpdates() {
  try {
    if (!appVersion) {
      appVersion = (await invoke("plugin:app|version")) || "";
      if (appVersion) els.appVersion.textContent = `Gigaflush ${appVersion}`;
    }
    if (!appVersion) return;
    let cached = null;
    try {
      cached = JSON.parse(localStorage.getItem(UPDATE_KEY));
    } catch (_) {
      /* Re-check below. */
    }
    let latest = cached?.latest;
    if (!cached || Date.now() - cached.at > UPDATE_INTERVAL) {
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (!response.ok) return;
      latest = (await response.json()).tag_name;
      localStorage.setItem(
        UPDATE_KEY,
        JSON.stringify({ at: Date.now(), latest }),
      );
    }
    if (latest && isNewer(latest, appVersion)) {
      els.updateLabel.textContent = `Gigaflush ${latest.replace(/^v/, "")} is available`;
      els.updateBanner.hidden = false;
    }
  } catch (_) {
    /* Offline or rate-limited: try again on a later focus. */
  }
}

// ── Onboarding ───────────────────────────────────────────────────

function showOnboarding() {
  focusBeforeDialog = document.activeElement;
  els.onboardingOverlay.hidden = false;
  els.onboardingStartBtn.focus();
}

function dismissOnboarding() {
  localStorage.setItem(ONBOARD_KEY, "1");
  els.onboardingOverlay.hidden = true;
  focusBeforeDialog?.focus();
}

// ── Confirm dialog ───────────────────────────────────────────────

function showConfirm({ title, body, paths, confirmLabel }) {
  return new Promise((resolve) => {
    focusBeforeDialog = document.activeElement;
    confirmResolver = resolve;
    els.confirmTitle.textContent = title;
    els.confirmBody.textContent = body;
    els.confirmAccept.textContent = confirmLabel || "Remove";
    els.confirmPaths.textContent = "";
    for (const path of paths || []) {
      const row = document.createElement("div");
      row.textContent = path;
      row.title = path;
      els.confirmPaths.appendChild(row);
    }
    els.confirmOverlay.hidden = false;
    els.confirmCancel.focus();
  });
}

function settleConfirm(result) {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  els.confirmOverlay.hidden = true;
  focusBeforeDialog?.focus();
  resolve(result);
}

// ── Folder picking ───────────────────────────────────────────────

async function pickFolder() {
  if (isScanning || isPurging || isPicking) return false;
  setStatus("");
  setPicking(true);

  try {
    const selected = await invoke("pick_folder", { currentPath });
    if (!selected) return false;
    currentPath = selected;
    localStorage.setItem(LAST_PATH_KEY, selected);
    projects = [];
    selectedPaths.clear();
    clearProjectList();
    updatePathDisplay();
    updateStats();
    setStatus("Folder selected. Ready to scan.");
    return true;
  } catch (err) {
    console.error("Folder picker error:", err);
    setStatus(`Could not open the folder picker: ${formatError(err)}`, "error");
    return false;
  } finally {
    setPicking(false);
  }
}

function setPicking(picking) {
  isPicking = picking;
  els.pickFolderBtn.disabled = isPicking;
  els.pathButton.disabled = isPicking;
  els.pickFolderBtn.setAttribute("aria-busy", String(isPicking));
  updateTypes();
}

// ── Scanning ─────────────────────────────────────────────────────

async function startScan() {
  if (
    isScanning ||
    isPurging ||
    isPicking ||
    confirmResolver ||
    !getEnabledTypes().length
  )
    return;
  els.cleanupOptions.open = false;
  els.searchInput.value = "";
  visibleLimit = 100;
  projects = [];
  selectedPaths.clear();
  lastReclaimed = 0;
  scanStartedAt = Date.now();
  isScanning = true;
  clearProjectList();
  setStatus("Indexing directories...");
  startScanTimer();
  updateScanUI();
  updateStats();

  try {
    await invoke("start_scan", {
      path: currentPath,
      ecosystems: getEnabledTypes(),
    });
  } catch (err) {
    console.error("Scan error:", err);
    isScanning = false;
    stopScanTimer();
    updateScanUI();
    renderProjectList();
    setStatus(`Scan failed: ${formatError(err)}`, "error");
  }
}

function onProjectFound(payload) {
  projects.push(normalizeProject(payload));
  if (renderTimer) return;
  renderTimer = window.setTimeout(() => {
    renderTimer = null;
    sortProjects();
    renderProjectList();
    setSkeletonVisible(false);
    updateStats();
    updateScanStatus();
  }, 80);
}

function onScanComplete(payload) {
  isScanning = false;
  if (renderTimer) {
    clearTimeout(renderTimer);
    renderTimer = null;
  }
  sortProjects();
  stopScanTimer();
  updateScanUI();

  renderProjectList();
  updateStats();

  const totalCount =
    payload && typeof payload.total_count === "number"
      ? payload.total_count
      : projects.length;

  if (totalCount === 0) {
    setStatus("No matching generated folders found in accessible locations.");
  } else {
    setStatus(
      `Scan complete. ${totalCount} folder${totalCount === 1 ? "" : "s"} · ${formatBytes(getTotalSize())} reclaimable.`,
      "success",
    );
  }
  updateResultsSubtitle();
}

function normalizeProject(project) {
  return {
    ...project,
    path: project && project.path ? project.path : "",
    cleanup_path: project && project.cleanup_path ? project.cleanup_path : "",
    name: project && project.name ? project.name : "Unknown",
    size_bytes:
      project && typeof project.size_bytes === "number"
        ? project.size_bytes
        : 0,
  };
}

function startScanTimer() {
  stopScanTimer();
  updateScanStatus();
  scanTimer = window.setInterval(updateScanStatus, 500);
}

function stopScanTimer() {
  if (scanTimer) {
    window.clearInterval(scanTimer);
    scanTimer = null;
  }
}

function updateScanStatus() {
  if (!isScanning) return;
  const elapsed = scanStartedAt
    ? formatDuration(Date.now() - scanStartedAt)
    : "0s";
  setStatus(
    projects.length === 0
      ? `Indexing directories · ${elapsed}`
      : `${projects.length} found · ${formatBytes(getTotalSize())} reclaimable · ${elapsed}`,
  );
}

function updateScanUI() {
  updateTypes();
  els.pickFolderBtn.disabled = isScanning || isPurging;
  els.pathButton.disabled = isScanning || isPurging;
  if (isScanning) {
    els.scanBtn.classList.add("scanning");
    els.scanProgress.hidden = false;
    els.purgeAllBtn.disabled = true;
    els.selectAllBtn.disabled = true;
    setSkeletonVisible(projects.length === 0);
  } else {
    els.scanBtn.classList.remove("scanning");
    els.scanProgress.hidden = true;
    setSkeletonVisible(false);
    updatePurgeButton();
    updateSelectAllButton();
  }
}

// ── Purging ──────────────────────────────────────────────────────

async function nukeProject(index) {
  if (isPurging || isScanning) return;
  const project = projects[index];
  if (!project) return;
  const size = formatBytes(project.size_bytes || 0);

  const confirmed = await showConfirm({
    title: `Remove ${project.folder || "generated files"}?`,
    body: `Permanently remove ${size} from ${project.name}. ${project.recovery || "Rebuild before using this project again."}`,
    paths: [project.cleanup_path],
    confirmLabel: `Remove ${size}`,
  });
  if (!confirmed) return;

  try {
    await runPurge([project.cleanup_path]);
    const ok = purgeDeletedPaths.has(project.cleanup_path);
    setStatus(
      ok
        ? `Removed ${project.name || "project"} · reclaimed ${size}.`
        : `Could not remove ${project.name || "project"}.`,
      ok ? "success" : "error",
    );
  } catch (err) {
    console.error("Delete error:", err);
    setStatus(
      `Could not remove ${project.name || "project"}: ${formatError(err)}`,
      "error",
    );
  }
}

async function purgeSelected() {
  if (projects.length === 0 || isPurging || isScanning) return;
  const selectedProjects = getSelectedProjects();
  if (selectedProjects.length === 0) return;

  const totalSize = selectedProjects.reduce(
    (sum, project) => sum + (project.size_bytes || 0),
    0,
  );
  const confirmed = await showConfirm({
    title: `Remove ${selectedProjects.length} folder${selectedProjects.length === 1 ? "" : "s"}?`,
    body: `Permanently remove ${formatBytes(totalSize)}. Stop builds and dev servers first. ${[...new Set(selectedProjects.map((p) => p.recovery))].join(" ")}`,
    paths: selectedProjects.map((project) => project.cleanup_path),
    confirmLabel: `Remove ${formatBytes(totalSize)}`,
  });
  if (!confirmed) return;

  try {
    const freed = await runPurge(
      selectedProjects.map((project) => project.cleanup_path),
    );
    setStatus(
      purgeFailedCount > 0
        ? `Removed ${formatBytes(freed || 0)}. ${purgeFailedCount} item${purgeFailedCount === 1 ? "" : "s"} could not be deleted.`
        : `Removed ${formatBytes(freed || 0)}.`,
      purgeFailedCount > 0 ? "error" : "success",
    );
  } catch (err) {
    console.error("Purge error:", err);
    setStatus(`Cleanup failed: ${formatError(err)}`, "error");
  }
}

async function runPurge(paths) {
  isPurging = true;
  purgeDeletedPaths = new Set();
  purgeFailedCount = 0;
  resetPurgeProgress(paths.length);
  setBusyControls(true);
  window.clearTimeout(reclaimTimer);
  els.totalSize.classList.add("is-reclaiming");
  els.purgeAllBtn.textContent = "Cleaning up…";
  setStatus("");

  try {
    const freed = await invoke("delete_all", { paths });
    lastReclaimed = freed || 0;
    return freed;
  } finally {
    isPurging = false;
    setBusyControls(false);
    els.purgeAllBtn.textContent = "Review cleanup";
    removeDeletedProjects();
    schedulePurgeProgressHide();
    reclaimTimer = window.setTimeout(
      () => els.totalSize.classList.remove("is-reclaiming"),
      1400,
    );
  }
}

function setBusyControls(busy) {
  els.scanBtn.disabled = busy;
  els.pickFolderBtn.disabled = busy;
  els.pathButton.disabled = busy;
  els.selectAllBtn.disabled = busy;
  els.purgeAllBtn.disabled = busy;
  updateTypes();
  renderProjectList();
}

function removeDeletedProjects() {
  if (purgeDeletedPaths.size > 0) {
    projects = projects.filter(
      (project) => !purgeDeletedPaths.has(project.cleanup_path),
    );
    purgeDeletedPaths.forEach((path) => selectedPaths.delete(path));
  }
  renderProjectList();
  updateStats();
}

// ── Purge progress display ───────────────────────────────────────

function resetPurgeProgress(total) {
  if (purgeHideTimer) {
    window.clearTimeout(purgeHideTimer);
    purgeHideTimer = null;
  }
  els.purgeProgress.hidden = false;
  els.purgeProgress.classList.remove("is-complete", "is-error");
  els.purgeProgressLabel.textContent = "Preparing cleanup";
  els.purgeProgressPath.textContent = "Resolving deletion queue...";
  els.purgeProgressCount.textContent = `0/${total}`;
  els.purgeProgressFill.style.transform = "scaleX(0)";
  els.purgeProgressFreed.textContent = "0 B reclaimed";
  els.purgeProgressState.textContent = "Starting";
}

function updatePurgeProgress(progress) {
  if (!progress) return;
  els.purgeProgress.hidden = false;

  const completed =
    progress.status === "deleting" ? progress.index - 1 : progress.index;
  const percent =
    progress.total > 0
      ? Math.min(100, Math.max(0, (completed / progress.total) * 100))
      : 0;

  const row = rowCache.get(progress.path);
  if (progress.status === "deleting") row?.classList.add("is-deleting");
  if (progress.status === "deleted") {
    purgeDeletedPaths.add(progress.path);
    retireProject(progress.path);
  }
  if (progress.status === "failed") {
    purgeFailedCount += 1;
    row?.classList.remove("is-deleting");
    els.purgeProgress.classList.add("is-error");
  }

  els.purgeProgressLabel.textContent =
    progress.status === "deleting"
      ? "Removing generated files"
      : progress.status === "deleted"
        ? "Deleted"
        : "Deletion failed";
  els.purgeProgressPath.textContent = truncatePath(progress.path, 64);
  els.purgeProgressPath.title = progress.path;
  els.purgeProgressCount.textContent = `${completed}/${progress.total}`;
  els.purgeProgressFill.style.transform = `scaleX(${percent / 100})`;
  els.purgeProgressFreed.textContent = `${formatBytes(progress.freed_bytes || 0)} reclaimed`;
  els.purgeProgressState.textContent =
    progress.status === "failed"
      ? progress.error || "Failed"
      : `${formatBytes(progress.size_bytes || 0)} ${progress.status}`;

  if (completed === progress.total && purgeFailedCount === 0) {
    els.purgeProgress.classList.add("is-complete");
    els.purgeProgressLabel.textContent = "Cleanup complete";
  }
}

// Drop a removed folder from the data right away so the readout counts
// down live, and let its row confirm the removal before collapsing.
function retireProject(path) {
  projects = projects.filter((project) => project.cleanup_path !== path);
  selectedPaths.delete(path);
  updateStats();

  const row = rowCache.get(path);
  rowCache.delete(path);
  if (!row) return;
  row.classList.remove("is-deleting");
  row.classList.add("is-deleted", "is-exiting");
  if (reducedMotion.matches) {
    row.remove();
    return;
  }
  row
    .animate(
      [
        { height: `${row.offsetHeight}px`, opacity: 1 },
        {
          height: "0px",
          paddingTop: "0px",
          paddingBottom: "0px",
          borderBottomWidth: "0px",
          opacity: 0,
        },
      ],
      {
        duration: 320,
        delay: 560,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "forwards",
      },
    )
    .finished.finally(() => row.remove());
}

function schedulePurgeProgressHide() {
  if (purgeHideTimer) window.clearTimeout(purgeHideTimer);
  purgeHideTimer = window.setTimeout(() => {
    els.purgeProgress.hidden = true;
    purgeHideTimer = null;
  }, 3200);
}

// ── Rendering ────────────────────────────────────────────────────

function getVisibleProjects() {
  const query = els.searchInput.value.trim().toLowerCase();
  if (!query && !mixFilter) return projects;
  return projects.filter(
    (p) =>
      (!mixFilter || mixGroupOf(p.ecosystem).id === mixFilter) &&
      (!query ||
        `${p.name} ${p.cleanup_path} ${TYPE_NAMES[p.ecosystem] || ""}`
          .toLowerCase()
          .includes(query)),
  );
}

function renderProjectList() {
  const visible = getVisibleProjects();
  const page = visible.slice(0, visibleLimit);
  const keep = new Set(page.map((p) => p.cleanup_path));
  for (const [path, row] of rowCache) {
    if (!keep.has(path)) {
      row.remove();
      rowCache.delete(path);
    }
  }
  els.projectsList.querySelector(".load-more")?.remove();
  els.emptyState.hidden = visible.length > 0 || isScanning;
  const heading = els.emptyState.querySelector("h3");
  const copy = els.emptyState.querySelector("p");
  const clean = !els.searchInput.value && lastReclaimed > 0;
  els.emptyState.classList.toggle("is-clean", clean);
  heading.textContent = els.searchInput.value
    ? "No matching folders"
    : clean
      ? "Clean slate."
      : "A little room to build.";
  copy.textContent = els.searchInput.value
    ? "Try another project name, path, or cleanup type."
    : clean
      ? `Reclaimed ${formatBytes(lastReclaimed)}. Reinstall or rebuild whenever you return.`
      : "Choose a workspace and scan for dependencies, build output, and tool caches. Your source stays yours.";
  // Walk rows into place without touching ones already in order, and skip
  // rows that are animating out so they collapse where they stand.
  let cursor = els.scanSkeleton;
  let arrivals = 0;
  page.forEach((project) => {
    let row = rowCache.get(project.cleanup_path);
    if (!row) {
      row = createProjectRow(project);
      row.classList.add("is-new");
      row.style.setProperty("--stagger", Math.min(arrivals++, 10));
      row.addEventListener(
        "animationend",
        () => row.classList.remove("is-new"),
        { once: true },
      );
      rowCache.set(project.cleanup_path, row);
    }
    row.classList.toggle(
      "is-selected",
      selectedPaths.has(project.cleanup_path),
    );
    row.querySelector("input").checked = selectedPaths.has(
      project.cleanup_path,
    );
    row.querySelector("input").disabled = isScanning || isPurging;
    row.querySelector("button").disabled = isScanning || isPurging;
    let next = cursor.nextElementSibling;
    while (next?.classList.contains("is-exiting"))
      next = next.nextElementSibling;
    if (next !== row) cursor.after(row);
    cursor = row;
  });
  if (visible.length > visibleLimit) {
    const more = document.createElement("button");
    more.className = "key load-more";
    more.textContent = `Show next ${Math.min(100, visible.length - visibleLimit)} · ${visible.length} total`;
    more.addEventListener("click", () => {
      const nextIndex = visibleLimit;
      visibleLimit += 100;
      renderProjectList();
      els.projectsList.querySelectorAll(".project-check")[nextIndex]?.focus();
    });
    els.projectsList.appendChild(more);
  }
}

function createProjectRow(project) {
  const row = document.createElement("div");
  row.className = "project-row";
  row.classList.toggle("is-selected", selectedPaths.has(project.cleanup_path));

  const checkbox = document.createElement("input");
  checkbox.className = "project-check";
  checkbox.type = "checkbox";
  checkbox.checked = selectedPaths.has(project.cleanup_path);
  checkbox.disabled = isScanning || isPurging || !project.cleanup_path;
  checkbox.setAttribute(
    "aria-label",
    `Select ${project.name}: ${project.folder}`,
  );
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectedPaths.add(project.cleanup_path);
    else selectedPaths.delete(project.cleanup_path);
    row.classList.toggle("is-selected", checkbox.checked);
    updateStats();
  });

  const info = document.createElement("div");
  info.className = "project-info";

  const name = document.createElement("div");
  name.className = "project-name";
  name.textContent = project.name || "Unknown";
  name.title = project.name || "";

  const pathEl = document.createElement("div");
  pathEl.className = "project-path";
  pathEl.title = project.cleanup_path || "";
  pathEl.textContent = compactHomePath(project.cleanup_path || "");

  info.appendChild(name);
  info.appendChild(pathEl);
  const kind = document.createElement("div");
  kind.className = "project-kind";
  kind.textContent = `${TYPE_NAMES[project.ecosystem] || "Project"} · ${project.folder || "Generated files"}`;
  kind.title = project.recovery || "";
  info.appendChild(kind);

  const actions = document.createElement("div");
  actions.className = "project-actions";

  const sizeEl = document.createElement("div");
  sizeEl.className = "project-size";
  sizeEl.textContent = formatBytes(project.size_bytes || 0);

  const nukeBtn = document.createElement("button");
  nukeBtn.className = "nuke-btn";
  nukeBtn.textContent = "Review";
  nukeBtn.disabled = isScanning || isPurging;
  nukeBtn.addEventListener("click", () => {
    nukeProject(projects.indexOf(project));
  });

  actions.appendChild(sizeEl);
  actions.appendChild(nukeBtn);
  row.appendChild(checkbox);
  row.appendChild(info);
  row.appendChild(actions);

  return row;
}

function clearProjectList() {
  rowCache.clear();
  if (renderTimer) {
    clearTimeout(renderTimer);
    renderTimer = null;
  }
  els.projectsList.querySelector(".load-more")?.remove();
  const rows = els.projectsList.querySelectorAll(".project-row");
  rows.forEach((row) => {
    row.getAnimations().forEach((animation) => animation.cancel());
    row.remove();
  });
  els.emptyState.hidden = isScanning;
  updateResultsSubtitle();
}

function toggleSelectAll() {
  if (projects.length === 0 || isScanning || isPurging) return;
  const selectable = getVisibleProjects().filter(
    (project) => project.cleanup_path,
  );
  const allSelected = selectable.every((project) =>
    selectedPaths.has(project.cleanup_path),
  );
  if (allSelected)
    selectable.forEach((p) => selectedPaths.delete(p.cleanup_path));
  else selectable.forEach((project) => selectedPaths.add(project.cleanup_path));
  renderProjectList();
  updateStats();
}

function setSkeletonVisible(visible) {
  els.scanSkeleton.hidden = !visible;
  if (visible) els.emptyState.hidden = true;
}

// ── Stats & labels ───────────────────────────────────────────────

function updateStats() {
  const total = getTotalSize();
  setReadout(total);
  els.totalSize.classList.toggle("has-savings", total > 0);
  els.totalCount.textContent = projects.length.toString();
  els.selectedCount.textContent = getSelectedProjects().length.toString();
  updatePurgeButton();
  updateSelectAllButton();
  updateFooter();
  updateResultsSubtitle();
}

// The big readouts ride a critically damped spring: fast, no overshoot
// (bytes never dip below their target), and retargetable mid-flight.
function setReadout(target) {
  springNumber(els.totalSize, target, formatBytes);
  renderMix();
}

const numberSprings = new Map();
function springNumber(el, target, format) {
  let s = numberSprings.get(el);
  if (!s) {
    s = { x: 0, v: 0, target, frame: 0 };
    numberSprings.set(el, s);
  }
  s.target = target;
  if (reducedMotion.matches) {
    s.x = target;
    s.v = 0;
    el.textContent = format(target);
    return;
  }
  if (s.frame) return;
  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.032, (now - last) / 1000);
    last = now;
    const k = 190;
    const c = 2 * Math.sqrt(k);
    s.v += (-k * (s.x - s.target) - c * s.v) * dt;
    s.x += s.v * dt;
    const scale = Math.max(1, Math.abs(s.target));
    if (
      Math.abs(s.x - s.target) < scale * 0.002 &&
      Math.abs(s.v) < scale * 0.02
    ) {
      s.x = s.target;
      s.v = 0;
      s.frame = 0;
      el.textContent = format(s.target);
      return;
    }
    el.textContent = format(Math.max(0, Math.round(s.x)));
    s.frame = requestAnimationFrame(tick);
  };
  s.frame = requestAnimationFrame(tick);
}

// ── Composition bar ──────────────────────────────────────────────
// Part-to-whole of the reclaimable total by ecosystem. Segments are built
// once so their widths can spring between scans; the legend doubles as a
// filter for the list below.

function mixGroupOf(ecosystem) {
  return MIX_GROUPS.find((g) => g.types.includes(ecosystem)) || MIX_GROUPS[3];
}

function buildMix() {
  for (const group of MIX_GROUPS) {
    const seg = document.createElement("span");
    seg.className = `mix-seg mix-${group.id} is-empty`;
    seg.dataset.group = group.id;
    els.mixBar.appendChild(seg);

    const item = document.createElement("button");
    item.className = `mix-item mix-${group.id}`;
    item.dataset.group = group.id;
    item.hidden = true;
    item.setAttribute("aria-pressed", "false");
    item.innerHTML = '<i aria-hidden="true"></i><span></span><b></b>';
    item.querySelector("span").textContent = group.name;
    item.addEventListener("click", () => {
      mixFilter = mixFilter === group.id ? null : group.id;
      visibleLimit = 100;
      renderProjectList();
      updateStats();
    });
    els.mixLegend.appendChild(item);
  }
  const highlight = (id) =>
    els.mix
      .querySelectorAll("[data-group]")
      .forEach((el) =>
        el.classList.toggle("is-dim", Boolean(id) && el.dataset.group !== id),
      );
  els.mix.addEventListener("pointerover", (e) =>
    highlight(e.target.closest("[data-group]")?.dataset.group),
  );
  els.mix.addEventListener("pointerleave", () => highlight(null));
}

function renderMix() {
  const bytes = Object.fromEntries(MIX_GROUPS.map((g) => [g.id, 0]));
  for (const p of projects)
    bytes[mixGroupOf(p.ecosystem).id] += p.size_bytes || 0;
  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  if (mixFilter && !bytes[mixFilter]) mixFilter = null;
  els.mix.hidden = !total;
  if (!total) return;
  let first = true;
  const described = [];
  for (const group of MIX_GROUPS) {
    const value = bytes[group.id];
    const share = value / total;
    const seg = els.mixBar.querySelector(`[data-group="${group.id}"]`);
    const item = els.mixLegend.querySelector(`[data-group="${group.id}"]`);
    seg.style.flexGrow = value ? share.toFixed(4) : 0;
    seg.classList.toggle("is-empty", !value);
    seg.classList.toggle("is-first", Boolean(value) && first);
    seg.title = `${group.name} · ${formatBytes(value)} · ${Math.round(share * 100)}%`;
    item.hidden = !value;
    item.querySelector("b").textContent = formatBytes(value);
    item.setAttribute("aria-pressed", String(mixFilter === group.id));
    item.classList.toggle("is-active", mixFilter === group.id);
    if (value) {
      first = false;
      described.push(`${group.name} ${formatBytes(value)}`);
    }
  }
  els.mixLegend.style.setProperty("--n", described.length);
  els.mix.classList.toggle("is-filtered", Boolean(mixFilter));
  els.mixBar.setAttribute(
    "aria-label",
    `Reclaimable by type: ${described.join(", ")}`,
  );
}

function updatePurgeButton() {
  const selectedCount = getSelectedProjects().length;
  els.purgeAllBtn.disabled = selectedCount === 0 || isScanning || isPurging;
}

function updateSelectAllButton() {
  const selectable = getVisibleProjects().filter(
    (project) => project.cleanup_path,
  );
  const selectedCount = selectable.filter((p) =>
    selectedPaths.has(p.cleanup_path),
  ).length;
  els.selectAllBtn.disabled =
    selectable.length === 0 || isScanning || isPurging;
  els.selectAllLabel.textContent =
    selectedCount === selectable.length && selectable.length > 0
      ? "Clear"
      : "Select all";
}

function updateFooter() {
  const selected = getSelectedProjects();
  if (selected.length === 0) {
    els.footerSummary.textContent = "Nothing selected";
    els.footerDetail.textContent =
      projects.length === 0
        ? "Scan to find cleanup candidates."
        : "Choose folders to review.";
    return;
  }
  els.footerSummary.textContent = `${selected.length} selected`;
  els.footerDetail.textContent = `${formatBytes(getSelectedSize())} ready to reclaim`;
}

function updateResultsSubtitle() {
  if (isScanning) {
    els.resultsSubtitle.textContent =
      projects.length === 0
        ? "Looking for generated folders"
        : `${projects.length} found so far`;
    return;
  }
  els.resultsSubtitle.textContent =
    projects.length === 0
      ? "Ready to scan"
      : `${getVisibleProjects().length} folders · largest first`;
}

function updatePathDisplay() {
  const displayPath = compactHomePath(currentPath || "~/");
  els.scanPath.textContent = truncatePath(displayPath, 46);
  els.scanPath.title = currentPath;
  els.pathButton.title = currentPath || "Choose folder";
}

function setStatus(message, tone) {
  els.statusLine.textContent = message || "";
  els.statusLine.classList.toggle("error", tone === "error");
  els.statusLine.classList.toggle("success", tone === "success");
}

// ── Selection & data helpers ─────────────────────────────────────

function getTotalSize() {
  return projects.reduce((sum, project) => sum + (project.size_bytes || 0), 0);
}

function getSelectedProjects() {
  return projects.filter((project) => selectedPaths.has(project.cleanup_path));
}

function getSelectedSize() {
  return getSelectedProjects().reduce(
    (sum, project) => sum + (project.size_bytes || 0),
    0,
  );
}

function sortProjects() {
  projects.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0));
}

// ── Views & presentation ─────────────────────────────────────────

function cssEasing(name, fallback) {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

function setView(view, { focus } = {}) {
  if (view === currentView) return moveThumb();
  const forward = view === "servers";
  currentView = view;
  els.viewSwitch.querySelectorAll("[role=tab]").forEach((tab) => {
    const on = tab.dataset.view === view;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    if (on && focus) tab.focus();
  });
  els.viewFiles.hidden = view !== "files";
  els.viewServers.hidden = view !== "servers";
  moveThumb();
  const incoming = view === "files" ? els.viewFiles : els.viewServers;
  if (!reducedMotion.matches)
    incoming.animate(
      [
        { opacity: 0, transform: `translateX(${forward ? 18 : -18}px)` },
        { opacity: 1, transform: "none" },
      ],
      { duration: 520, easing: cssEasing("--spring", "ease-out") },
    );
  if (view === "servers") {
    clearStopped();
    refreshIdleServers(true);
  }
}

function moveThumb() {
  const tab = els.viewSwitch.querySelector('[aria-selected="true"]');
  const thumb = els.viewSwitch.querySelector(".segmented-thumb");
  if (!tab || !thumb) return;
  thumb.style.width = `${tab.offsetWidth}px`;
  thumb.style.transform = `translateX(${tab.offsetLeft}px)`;
}

// Opened from the tray: drop in from the menu bar like a native popover.
function presentPanel() {
  clearStopped();
  refreshIdleServers();
  if (reducedMotion.matches) return;
  els.shell.animate(
    [
      { opacity: 0, transform: "translateY(-8px) scale(0.965)" },
      { opacity: 1, transform: "none" },
    ],
    { duration: 560, easing: cssEasing("--spring-bounce", "ease-out") },
  );
}

// ── Idle dev servers ─────────────────────────────────────────────
// Forgotten dev servers (orphaned or idle for hours, no open connections)
// still hold ports and memory. The backend lists every dev server it can
// attribute; only `idle` ones are actionable, and each is re-verified before
// it is asked to exit.

async function refreshIdleServers(force) {
  if (isStoppingServers) return;
  if (!force && Date.now() - idleCheckedAt < IDLE_REFRESH_MS) return;
  idleCheckedAt = Date.now();
  els.serversRefresh.classList.add("is-spinning");
  try {
    const scan = await invoke("find_idle_servers");
    if (!scan.supported) {
      els.viewSwitch.querySelector('[data-view="servers"]').hidden = true;
      return;
    }
    devServers = scan.servers || [];
    idleServers = devServers.filter((s) => s.idle);
    renderServers();
  } catch (err) {
    console.warn("Idle server check failed:", err);
  } finally {
    setTimeout(
      () => els.serversRefresh.classList.remove("is-spinning"),
      reducedMotion.matches ? 0 : 500,
    );
  }
}

function renderServers() {
  const idle = idleServers;
  const live = devServers.filter((s) => !s.idle);
  const memory = idle.reduce((sum, s) => sum + s.memory_bytes, 0);

  springNumber(els.idleMemory, memory, formatBytes);
  els.idleMemory.classList.toggle("has-savings", memory > 0);
  els.idleLabel.textContent = idle.length
    ? `Held by ${idle.length} idle ${idle.length === 1 ? "server" : "servers"}`
    : "Held by idle servers";
  els.idleCount.textContent = idle.length;
  els.liveCount.textContent = live.length;
  els.serversBadge.hidden = !idle.length;
  els.serversBadge.textContent = idle.length;

  renderPortMap();
  renderIdleRows();
  renderLiveRows(live);

  els.serversEmpty.hidden = idle.length > 0;
  els.serversEmptyCopy.textContent = live.length
    ? "Everything listening is in use. Forgotten servers show up here."
    : "Nothing is listening. Forgotten servers show up here.";
  const notice =
    serversNotice && Date.now() < serversNotice.until ? serversNotice : null;
  els.serversSubtitle.textContent = notice
    ? notice.text
    : idle.length
      ? `${idle.length} found`
      : "All clear";
  els.serversSubtitle.className = notice ? notice.tone : "";
  els.serversSummary.textContent = idle.length
    ? `${idle.length} idle · ${formatBytes(memory)}`
    : "Nothing to stop";
  els.idleStopAll.disabled = !idle.length || isStoppingServers;
  els.idleStopAll.textContent =
    idle.length > 1 ? `Stop ${idle.length} idle` : "Stop idle";
}

function serverName(server) {
  const cwd = server.cwd || "";
  return cwd.split(/[\\/]/).filter(Boolean).pop() || server.label;
}

function serverPorts(server) {
  return server.ports.map((port) => `:${port}`).join(" ");
}

function formatAge(secs) {
  if (secs < 3600) return `${Math.round(secs / 60)}m`;
  if (secs < 86400) return `${Math.round(secs / 3600)}h`;
  return `${Math.round(secs / 86400)}d`;
}

// A strip of port pills, one per dev server in port order. Only idle ones
// are pressable. Pills never resize their neighbours: a stopped server keeps
// its slot, dimmed, until the view is opened again.
function renderPortMap() {
  const sockets = new Map(
    [...els.portMap.querySelectorAll(".socket")].map((el) => [
      Number(el.dataset.pid),
      el,
    ]),
  );
  const ordered = [...devServers].sort((a, b) => a.ports[0] - b.ports[0]);
  ordered.forEach((server, index) => {
    const state = server.idle ? "idle" : server.connected ? "live" : "run";
    let socket = sockets.get(server.pid);
    sockets.delete(server.pid);
    if (socket && socket.dataset.state === state) return;
    const fresh = document.createElement(server.idle ? "button" : "span");
    fresh.className = `socket is-${state}${socket ? "" : " is-new"}`;
    fresh.dataset.pid = server.pid;
    fresh.dataset.state = state;
    fresh.style.setProperty("--stagger", index);
    fresh.innerHTML =
      '<i aria-hidden="true"></i><span class="socket-port"></span>';
    const extra = server.ports.length > 1 ? ` +${server.ports.length - 1}` : "";
    fresh.querySelector(".socket-port").textContent =
      `:${server.ports[0]}${extra}`;
    fresh.title = `${serverName(server)} · ${server.label} · ${
      state === "idle" ? "idle" : state === "live" ? "connected" : "running"
    }`;
    fresh.setAttribute(
      "aria-label",
      `Port ${server.ports.join(", ")}, ${fresh.title}`,
    );
    if (server.idle)
      fresh.addEventListener("click", () => revealIdleRow(server.pid));
    fresh.dataset.port = server.ports[0];
    if (socket) socket.replaceWith(fresh);
    else {
      const next = [...els.portMap.children].find(
        (el) => Number(el.dataset.port) > server.ports[0],
      );
      els.portMap.insertBefore(fresh, next || null);
    }
  });
  for (const [pid, gone] of sockets) {
    if (stoppedPids.has(pid)) gone.classList.add("is-free");
    else unplug(gone);
  }
  els.mapCount.textContent = devServers.length
    ? `${devServers.length} listening`
    : "";
  els.portMap.classList.toggle("is-empty", !devServers.length);
  requestAnimationFrame(() =>
    els.portMap.classList.toggle(
      "is-overflowing",
      els.portMap.scrollWidth > els.portMap.clientWidth + 1,
    ),
  );
}

// Stopped rows and pills hold their place while you look; they clear the
// next time the view opens, when nothing is moving.
function clearStopped() {
  if (!stoppedPids.size) return;
  stoppedPids.clear();
  els.viewServers
    .querySelectorAll(".idle-row.is-deleted, .socket.is-free")
    .forEach((el) => el.remove());
}

// Why a server was left alone, derived from the same rules the backend uses:
// connected, too new, still busy, or parented and under six hours.
function keptBecause(server) {
  if (server.connected) return { tone: "live", text: "Connected" };
  if (server.uptime_secs < 30 * 60)
    return {
      tone: "run",
      text: `Started ${formatAge(server.uptime_secs)} ago`,
    };
  if (server.orphaned || server.uptime_secs >= 6 * 3600)
    return { tone: "run", text: "Busy" };
  return { tone: "run", text: "Terminal open" };
}

function renderLiveRows(live) {
  els.liveGroup.hidden = !live.length;
  els.liveGroupCount.textContent = live.length;
  els.liveList.textContent = "";
  for (const server of live) {
    const reason = keptBecause(server);
    const row = document.createElement("div");
    row.className = "project-row server-row live-row";
    row.dataset.pid = server.pid;
    row.innerHTML =
      '<i class="row-dot" aria-hidden="true"></i><div class="project-info"><div class="project-name"></div><div class="project-path"></div></div><span class="live-reason"></span>';
    row.querySelector(".row-dot").classList.add(`is-${reason.tone}`);
    row.querySelector(".project-name").textContent = serverName(server);
    row.querySelector(".project-path").textContent =
      `:${server.ports.join(" :")} · ${server.label}`;
    row.querySelector(".live-reason").textContent = reason.text;
    row.title = compactHomePath(server.cwd || "");
    els.liveList.appendChild(row);
  }
}

// Hovering a socket lights its row and the other way round.
function bindServerLinks() {
  const link = (pid) => {
    els.viewServers
      .querySelectorAll(".is-linked")
      .forEach((el) => el.classList.remove("is-linked"));
    if (!pid) return;
    els.viewServers
      .querySelectorAll(`[data-pid="${pid}"]`)
      .forEach((el) => el.classList.add("is-linked"));
  };
  els.viewServers.addEventListener("pointerover", (e) =>
    link(e.target.closest("[data-pid]")?.dataset.pid),
  );
  els.viewServers.addEventListener("pointerleave", () => link(null));
}

function unplug(socket) {
  if (reducedMotion.matches) return socket.remove();
  socket.style.pointerEvents = "none";
  socket
    .animate(
      [
        { opacity: 1, maxWidth: `${socket.offsetWidth}px` },
        {
          opacity: 0,
          maxWidth: "0px",
          paddingInline: "0px",
          marginRight: "-6px",
        },
      ],
      { duration: 448, easing: cssEasing("--spring", "ease-out") },
    )
    .finished.then(
      () => socket.remove(),
      () => socket.remove(),
    );
}

function revealIdleRow(pid) {
  const row = els.idleList.querySelector(`[data-pid="${pid}"]`);
  if (!row) return;
  row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  row.classList.remove("is-flash");
  void row.offsetWidth;
  row.classList.add("is-flash");
  row.querySelector(".nuke-btn")?.focus({ preventScroll: true });
}

function renderIdleRows() {
  const rows = new Map(
    [...els.idleList.querySelectorAll(".idle-row:not(.is-exiting)")].map(
      (row) => [Number(row.dataset.pid), row],
    ),
  );
  idleServers.forEach((server, index) => {
    if (rows.delete(server.pid)) return;
    const row = createIdleRow(server);
    row.style.setProperty("--stagger", index);
    row.classList.add("is-new");
    els.idleList.appendChild(row);
  });
  for (const [pid, gone] of rows) {
    if (!stoppedPids.has(pid)) collapseRow(gone);
  }
}

function collapseRow(row) {
  if (reducedMotion.matches) return row.remove();
  row.classList.add("is-exiting");
  row
    .animate(
      [
        { height: `${row.offsetHeight}px`, opacity: 1 },
        { height: "0px", opacity: 0, paddingBlock: "0px" },
      ],
      { duration: 420, easing: cssEasing("--spring", "ease-out") },
    )
    .finished.then(
      () => row.remove(),
      () => row.remove(),
    );
}

// Idle meter: uptime on a log scale from 30 minutes to 30 days, so an
// hour and a week are both readable at this width.
const METER_MIN = 30 * 60;
const METER_MAX = 30 * 86400;
function meterPosition(secs) {
  const clamped = Math.min(METER_MAX, Math.max(METER_MIN, secs));
  return Math.log(clamped / METER_MIN) / Math.log(METER_MAX / METER_MIN);
}

function createIdleRow(server) {
  const row = document.createElement("div");
  row.className = "project-row server-row idle-row";
  row.dataset.pid = server.pid;
  row.innerHTML =
    '<i class="row-dot is-idle" aria-hidden="true"></i><div class="project-info"><div class="project-name"></div><div class="project-path"></div><div class="idle-meter"><span class="idle-track"><span class="idle-fill"></span></span><span class="idle-label"></span></div></div><div class="project-actions"><div class="project-size"></div><button class="nuke-btn">Stop</button></div>';

  const name = row.querySelector(".project-name");
  name.textContent = serverName(server);
  name.title = server.cwd || "";
  row.querySelector(".project-path").textContent =
    `:${server.ports.join(" :")} · ${server.label}`;

  const meter = row.querySelector(".idle-meter");
  meter.setAttribute("role", "img");
  meter.setAttribute(
    "aria-label",
    `${server.orphaned ? "Orphaned, " : ""}running for ${formatAge(server.uptime_secs)}`,
  );
  meter.title = "Uptime, log scale from 30 minutes to 30 days";
  meter
    .querySelector(".idle-fill")
    .style.setProperty("--fill", meterPosition(server.uptime_secs).toFixed(3));
  meter.querySelector(".idle-label").textContent = `${
    server.orphaned ? "Orphaned · " : ""
  }up ${formatAge(server.uptime_secs)}`;

  row.querySelector(".project-size").textContent = formatBytes(
    server.memory_bytes,
  );
  const stop = row.querySelector(".nuke-btn");
  stop.setAttribute(
    "aria-label",
    `Stop ${serverName(server)} on ${serverPorts(server)}`,
  );
  stop.addEventListener("click", () => stopServers([server]));
  return row;
}

async function stopServers(servers) {
  if (!servers.length || isStoppingServers) return;
  const single = servers.length === 1;
  const confirmed = await showConfirm({
    title: single
      ? `Stop ${serverName(servers[0])}?`
      : `Stop ${servers.length} idle servers?`,
    body: "Each server is asked to shut down, the same as pressing Ctrl+C. Run your usual dev command to start it again.",
    paths: servers.map(
      (s) =>
        `${serverPorts(s)}  ${s.label} · ${compactHomePath(s.cwd || s.runtime)}`,
    ),
    confirmLabel: single ? "Stop server" : `Stop ${servers.length} servers`,
  });
  if (!confirmed) return;

  isStoppingServers = true;
  els.idleStopAll.disabled = true;
  const rowFor = (pid) => els.idleList.querySelector(`[data-pid="${pid}"]`);
  for (const s of servers) rowFor(s.pid)?.classList.add("is-deleting");
  try {
    const results = await invoke("stop_idle_servers", {
      targets: servers.map(({ pid, started }) => ({ pid, started })),
    });
    let freed = 0;
    let stopped = 0;
    for (const result of results) {
      const row = rowFor(result.pid);
      row?.classList.remove("is-deleting");
      if (result.stopped) {
        stopped += 1;
        freed += result.memory_bytes;
        stoppedPids.add(result.pid);
        row?.classList.add("is-deleted");
        row?.querySelector(".nuke-btn")?.setAttribute("disabled", "");
      }
    }
    const failed = results.length - stopped;
    setStatus(
      failed
        ? `Stopped ${stopped} of ${results.length} servers. Some were busy again or already gone.`
        : `Stopped ${stopped} ${stopped === 1 ? "server" : "servers"} · ${formatBytes(freed)} memory released`,
      failed ? "error" : "success",
    );
    serversNotice = {
      text: els.statusLine.textContent,
      tone: failed ? "error" : "success",
      until: Date.now() + 6000,
    };
  } catch (err) {
    setStatus(`Could not stop servers: ${formatError(err)}`, "error");
    serversNotice = {
      text: els.statusLine.textContent,
      tone: "error",
      until: Date.now() + 6000,
    };
  } finally {
    els.serversSubtitle.textContent = serversNotice.text;
    els.serversSubtitle.className = serversNotice.tone;
    await new Promise((r) => setTimeout(r, reducedMotion.matches ? 0 : 900));
    isStoppingServers = false;
    await refreshIdleServers(true);
  }
}

// ── Formatting ───────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  if (i === 0) return `${bytes} B`;
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function compactHomePath(path) {
  if (!path) return path;
  try {
    if (path.startsWith("/Users/")) {
      const parts = path.split("/");
      if (parts.length >= 3)
        return `~${path.slice(("/Users/" + parts[2]).length)}` || "~";
    } else if (path.startsWith("/home/")) {
      const parts = path.split("/");
      if (parts.length >= 3)
        return `~${path.slice(("/home/" + parts[2]).length)}` || "~";
    } else if (path.match(/^[A-Z]:\\Users\\/i)) {
      const parts = path.split("\\");
      if (parts.length >= 3)
        return (
          `~${path.slice((parts[0] + "\\Users\\" + parts[2]).length)}` || "~"
        );
    }
  } catch (_) {
    // Keep the original path if compacting fails.
  }
  return path;
}

function truncatePath(path, maxLen) {
  maxLen = maxLen || 44;
  if (!path || path.length <= maxLen) return path;
  const head = path.slice(0, 16);
  const tail = path.slice(-Math.max(12, maxLen - 22));
  return `${head}...${tail}`;
}

function formatError(err) {
  if (!err) return "unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return String(err);
}

function getEnabledTypes() {
  return [...els.typeOptions.querySelectorAll("input:checked")].map(
    (input) => input.value,
  );
}

function updateTypes() {
  const count = getEnabledTypes().length;
  els.typesSummary.textContent = `${count} enabled`;
  els.scanBtn.disabled = !count || isScanning || isPurging || isPicking;
  els.typeOptions.querySelectorAll("input").forEach((input) => {
    input.disabled = isScanning || isPurging;
  });
}
