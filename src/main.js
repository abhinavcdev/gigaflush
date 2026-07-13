// NodeMinus frontend application logic.

const ONBOARD_KEY = "nodeminus:onboarded";
const LAST_PATH_KEY = "nodeminus:lastPath";

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

const els = {};

const ELEMENT_IDS = [
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
    startScan();
  });

  if (!localStorage.getItem(ONBOARD_KEY)) {
    showOnboarding();
  }
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

  document.addEventListener("keydown", (event) => {
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

// ── Onboarding ───────────────────────────────────────────────────

function showOnboarding() {
  els.onboardingOverlay.hidden = false;
  els.onboardingStartBtn.focus();
}

function dismissOnboarding() {
  localStorage.setItem(ONBOARD_KEY, "1");
  els.onboardingOverlay.hidden = true;
}

// ── Confirm dialog ───────────────────────────────────────────────

function showConfirm({ title, body, paths, confirmLabel }) {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    els.confirmTitle.textContent = title;
    els.confirmBody.textContent = body;
    els.confirmAccept.textContent = confirmLabel || "Purge";
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
  resolve(result);
}

// ── Folder picking ───────────────────────────────────────────────

async function pickFolder() {
  if (isScanning || isPurging) return false;
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

function setPicking(isPicking) {
  els.pickFolderBtn.disabled = isPicking;
  els.pathButton.disabled = isPicking;
  els.pickFolderBtn.setAttribute("aria-busy", String(isPicking));
}

// ── Scanning ─────────────────────────────────────────────────────

async function startScan() {
  if (isScanning || isPurging) return;

  projects = [];
  selectedPaths.clear();
  scanStartedAt = Date.now();
  isScanning = true;
  clearProjectList();
  setStatus("Indexing directories...");
  startScanTimer();
  updateScanUI();
  updateStats();

  try {
    await invoke("start_scan", { path: currentPath });
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
  const project = normalizeProject(payload);
  projects.push(project);
  sortProjects();
  if (project.node_modules_path) selectedPaths.add(project.node_modules_path);
  renderProjectList();
  setSkeletonVisible(false);
  updateStats();
  updateScanStatus();
}

function onScanComplete(payload) {
  isScanning = false;
  stopScanTimer();
  updateScanUI();
  selectedPaths = new Set(projects.map((project) => project.node_modules_path).filter(Boolean));
  renderProjectList();
  updateStats();

  const totalCount =
    payload && typeof payload.total_count === "number" ? payload.total_count : projects.length;

  if (totalCount === 0) {
    setStatus("Scan complete. No node_modules found — this folder is clean.");
  } else {
    setStatus(
      `Scan complete. ${totalCount} project${totalCount === 1 ? "" : "s"} · ${formatBytes(getTotalSize())} reclaimable.`,
      "success"
    );
  }
  updateResultsSubtitle();
}

function normalizeProject(project) {
  return {
    ...project,
    path: project && project.path ? project.path : "",
    node_modules_path: project && project.node_modules_path ? project.node_modules_path : "",
    name: project && project.name ? project.name : "Unknown",
    size_bytes: project && typeof project.size_bytes === "number" ? project.size_bytes : 0,
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
  const elapsed = scanStartedAt ? formatDuration(Date.now() - scanStartedAt) : "0s";
  setStatus(
    projects.length === 0
      ? `Indexing directories · ${elapsed}`
      : `${projects.length} found · ${formatBytes(getTotalSize())} reclaimable · ${elapsed}`
  );
}

function updateScanUI() {
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
    title: `Purge ${project.name || "this project"}?`,
    body: `This permanently deletes its node_modules folder and reclaims ${size}. Rebuild any time with npm install.`,
    paths: [project.node_modules_path],
    confirmLabel: `Purge ${size}`,
  });
  if (!confirmed) return;

  try {
    await runPurge([project.node_modules_path]);
    const ok = purgeDeletedPaths.has(project.node_modules_path);
    setStatus(
      ok
        ? `Purged ${project.name || "project"} · reclaimed ${size}.`
        : `Could not purge ${project.name || "project"}.`,
      ok ? "success" : "error"
    );
  } catch (err) {
    console.error("Delete error:", err);
    setStatus(`Could not purge ${project.name || "project"}: ${formatError(err)}`, "error");
  }
}

async function purgeSelected() {
  if (projects.length === 0 || isPurging || isScanning) return;
  const selectedProjects = getSelectedProjects();
  if (selectedProjects.length === 0) return;

  const totalSize = selectedProjects.reduce((sum, project) => sum + (project.size_bytes || 0), 0);
  const confirmed = await showConfirm({
    title: `Purge ${selectedProjects.length} node_modules folder${selectedProjects.length === 1 ? "" : "s"}?`,
    body: `This permanently deletes rebuildable dependencies and reclaims ${formatBytes(totalSize)}.`,
    paths: selectedProjects.map((project) => project.node_modules_path),
    confirmLabel: `Purge ${formatBytes(totalSize)}`,
  });
  if (!confirmed) return;

  try {
    const freed = await runPurge(selectedProjects.map((project) => project.node_modules_path));
    setStatus(
      purgeFailedCount > 0
        ? `Purged ${formatBytes(freed || 0)}. ${purgeFailedCount} item${purgeFailedCount === 1 ? "" : "s"} could not be deleted.`
        : `Purged ${formatBytes(freed || 0)}.`,
      purgeFailedCount > 0 ? "error" : "success"
    );
  } catch (err) {
    console.error("Purge error:", err);
    setStatus(`Purge failed: ${formatError(err)}`, "error");
  }
}

async function runPurge(paths) {
  isPurging = true;
  purgeDeletedPaths = new Set();
  purgeFailedCount = 0;
  resetPurgeProgress(paths.length);
  setBusyControls(true);
  els.purgeAllBtn.textContent = "Purging...";
  setStatus("");

  try {
    return await invoke("delete_all", { paths });
  } finally {
    isPurging = false;
    setBusyControls(false);
    els.purgeAllBtn.textContent = "Purge selected";
    removeDeletedProjects();
    schedulePurgeProgressHide();
  }
}

function setBusyControls(busy) {
  els.scanBtn.disabled = busy;
  els.pickFolderBtn.disabled = busy;
  els.pathButton.disabled = busy;
  els.selectAllBtn.disabled = busy;
  els.purgeAllBtn.disabled = busy;
}

function removeDeletedProjects() {
  if (purgeDeletedPaths.size > 0) {
    projects = projects.filter((project) => !purgeDeletedPaths.has(project.node_modules_path));
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
  els.purgeProgressLabel.textContent = "Preparing purge";
  els.purgeProgressPath.textContent = "Resolving deletion queue...";
  els.purgeProgressCount.textContent = `0/${total}`;
  els.purgeProgressFill.style.width = "0%";
  els.purgeProgressFreed.textContent = "0 B reclaimed";
  els.purgeProgressState.textContent = "Starting";
}

function updatePurgeProgress(progress) {
  if (!progress) return;
  els.purgeProgress.hidden = false;

  const completed = progress.status === "deleting" ? progress.index - 1 : progress.index;
  const percent = progress.total > 0 ? Math.min(100, Math.max(0, (completed / progress.total) * 100)) : 0;

  if (progress.status === "deleted") purgeDeletedPaths.add(progress.path);
  if (progress.status === "failed") {
    purgeFailedCount += 1;
    els.purgeProgress.classList.add("is-error");
  }

  els.purgeProgressLabel.textContent =
    progress.status === "deleting" ? "Deleting node_modules" : progress.status === "deleted" ? "Deleted" : "Deletion failed";
  els.purgeProgressPath.textContent = truncatePath(progress.path, 64);
  els.purgeProgressPath.title = progress.path;
  els.purgeProgressCount.textContent = `${completed}/${progress.total}`;
  els.purgeProgressFill.style.width = `${percent}%`;
  els.purgeProgressFreed.textContent = `${formatBytes(progress.freed_bytes || 0)} reclaimed`;
  els.purgeProgressState.textContent =
    progress.status === "failed" ? progress.error || "Failed" : `${formatBytes(progress.size_bytes || 0)} ${progress.status}`;

  if (completed === progress.total && purgeFailedCount === 0) {
    els.purgeProgress.classList.add("is-complete");
    els.purgeProgressLabel.textContent = "Purge complete";
  }
}

function schedulePurgeProgressHide() {
  if (purgeHideTimer) window.clearTimeout(purgeHideTimer);
  purgeHideTimer = window.setTimeout(() => {
    els.purgeProgress.hidden = true;
    purgeHideTimer = null;
  }, 3200);
}

// ── Rendering ────────────────────────────────────────────────────

function renderProjectList() {
  const rows = els.projectsList.querySelectorAll(".project-row");
  rows.forEach((row) => row.remove());

  if (projects.length === 0) {
    els.emptyState.hidden = isScanning;
    return;
  }

  els.emptyState.hidden = true;
  projects.forEach((project, index) => {
    els.projectsList.appendChild(createProjectRow(project, index));
  });
}

function createProjectRow(project, index) {
  const row = document.createElement("div");
  row.className = "project-row";
  row.classList.toggle("is-selected", selectedPaths.has(project.node_modules_path));
  row.setAttribute("data-index", index);
  row.style.animationDelay = `${Math.min(index * 30, 240)}ms`;

  const checkbox = document.createElement("input");
  checkbox.className = "project-check";
  checkbox.type = "checkbox";
  checkbox.checked = selectedPaths.has(project.node_modules_path);
  checkbox.disabled = isScanning || isPurging || !project.node_modules_path;
  checkbox.setAttribute("aria-label", `Select ${project.name}`);
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) selectedPaths.add(project.node_modules_path);
    else selectedPaths.delete(project.node_modules_path);
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
  pathEl.title = project.path || "";
  pathEl.textContent = compactHomePath(project.path || "");

  info.appendChild(name);
  info.appendChild(pathEl);

  const actions = document.createElement("div");
  actions.className = "project-actions";

  const sizeEl = document.createElement("div");
  sizeEl.className = "project-size";
  sizeEl.textContent = formatBytes(project.size_bytes || 0);

  const nukeBtn = document.createElement("button");
  nukeBtn.className = "nuke-btn";
  nukeBtn.textContent = "Purge";
  nukeBtn.disabled = isScanning || isPurging;
  nukeBtn.addEventListener("click", () => {
    const currentIndex = parseInt(row.getAttribute("data-index"), 10);
    nukeProject(currentIndex);
  });

  actions.appendChild(sizeEl);
  actions.appendChild(nukeBtn);
  row.appendChild(checkbox);
  row.appendChild(info);
  row.appendChild(actions);

  return row;
}

function clearProjectList() {
  const rows = els.projectsList.querySelectorAll(".project-row");
  rows.forEach((row) => row.remove());
  els.emptyState.hidden = isScanning;
  updateResultsSubtitle();
}

function toggleSelectAll() {
  if (projects.length === 0 || isScanning || isPurging) return;
  const selectable = projects.filter((project) => project.node_modules_path);
  const allSelected = selectable.every((project) => selectedPaths.has(project.node_modules_path));
  if (allSelected) selectedPaths.clear();
  else selectable.forEach((project) => selectedPaths.add(project.node_modules_path));
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
  els.totalSize.textContent = formatBytes(total);
  els.totalSize.classList.toggle("has-savings", total > 0);
  els.totalCount.textContent = projects.length.toString();
  els.selectedCount.textContent = getSelectedProjects().length.toString();
  updatePurgeButton();
  updateSelectAllButton();
  updateFooter();
  updateResultsSubtitle();
}

function updatePurgeButton() {
  const selectedCount = getSelectedProjects().length;
  els.purgeAllBtn.disabled = selectedCount === 0 || isScanning || isPurging;
}

function updateSelectAllButton() {
  const selectable = projects.filter((project) => project.node_modules_path);
  const selectedCount = getSelectedProjects().length;
  els.selectAllBtn.disabled = selectable.length === 0 || isScanning || isPurging;
  els.selectAllLabel.textContent =
    selectedCount === selectable.length && selectable.length > 0 ? "Clear" : "Select all";
}

function updateFooter() {
  const selected = getSelectedProjects();
  if (selected.length === 0) {
    els.footerSummary.textContent = "Nothing selected";
    els.footerDetail.textContent =
      projects.length === 0 ? "Scan to find cleanup candidates." : "Select projects to purge.";
    return;
  }
  els.footerSummary.textContent = `${selected.length} selected`;
  els.footerDetail.textContent = `${formatBytes(getSelectedSize())} ready to reclaim`;
}

function updateResultsSubtitle() {
  if (isScanning) {
    els.resultsSubtitle.textContent =
      projects.length === 0 ? "Listening for dependency folders" : `${projects.length} found so far`;
    return;
  }
  els.resultsSubtitle.textContent =
    projects.length === 0
      ? "Ready to scan"
      : `${projects.length} project${projects.length === 1 ? "" : "s"} · largest first`;
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
  return projects.filter((project) => selectedPaths.has(project.node_modules_path));
}

function getSelectedSize() {
  return getSelectedProjects().reduce((sum, project) => sum + (project.size_bytes || 0), 0);
}

function sortProjects() {
  projects.sort((a, b) => (b.size_bytes || 0) - (a.size_bytes || 0));
}

// ── Formatting ───────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
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
      if (parts.length >= 3) return `~${path.slice(("/Users/" + parts[2]).length)}` || "~";
    } else if (path.startsWith("/home/")) {
      const parts = path.split("/");
      if (parts.length >= 3) return `~${path.slice(("/home/" + parts[2]).length)}` || "~";
    } else if (path.match(/^[A-Z]:\\Users\\/i)) {
      const parts = path.split("\\");
      if (parts.length >= 3) return `~${path.slice((parts[0] + "\\Users\\" + parts[2]).length)}` || "~";
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
