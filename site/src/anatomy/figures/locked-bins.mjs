// Fig: six lidded bins. Tool caches lift their lids and clear; a virtual
// environment and the global Gradle cache are padlocked: rebuildable in
// theory, but not something to clear by accident.
import { k, bench, tools, liveLoop, follow } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 360;

export const BINS = [
  { name: ".pytest_cache", mb: 28, locked: false, why: "pytest rebuilds it" },
  { name: ".mypy_cache", mb: 96, locked: false, why: "mypy rebuilds it" },
  { name: ".ruff_cache", mb: 4, locked: false, why: "ruff rebuilds it" },
  { name: ".venv", mb: 640, locked: true, why: "your installed packages" },
  { name: ".gradle", mb: 310, locked: false, why: "project cache, rebuilt on build" },
  { name: "~/.gradle", mb: 2400, locked: true, why: "global cache for every project" },
];
const XS = [-112, -74, -36, 2, 40, 78];
const W = 30;
const D = 32;
const Y0 = -16;
const H = 16;
const WALL = 1.4;
const PLATE = { x: -132, y: -44, w: 264, d: 88, r: 9 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [XS[0], Y0, H + 24]], WIDTH, HEIGHT, { pad: 26, azimuth: 40 });
const { at, S, L, D: Dots } = tools(P);

function binBack(i) {
  const x = XS[i];
  const plan = { x, y: Y0, w: W, d: D, r: 1.6 };
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 2, P)}"/>`];
  out.push(S(k.slabOf(plan, 0, 1.6, P, 2, 0.3), { tone: "lo" }));
  out.push(S(k.slabOf({ x, y: Y0, w: WALL, d: D, r: 0.4 }, 1.6, H - 1.6, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x, y: Y0, w: W, d: WALL, r: 0.4 }, 1.6, H - 1.6, P, 2), { tone: "mid" }));
  return out.join("");
}
const contents = (i) => {
  const plan = { x: XS[i] + 4, y: Y0 + 4, w: W - 8, d: D - 8, r: 1 };
  return S(k.slabOf(plan, 1.6, H - 4, P, 2, 0.4), { tone: "hi", crease: "lo", lit: true }) + Dots(k.dotGrid(plan.x + 3, plan.y + 3, 4, 5, 4.4, H - 2.4, P), { size: 0.35, tone: "lo" });
};
function binFront(i) {
  const x = XS[i];
  const out = [];
  out.push(S(k.slabOf({ x: x + W - WALL, y: Y0, w: WALL, d: D, r: 0.4 }, 1.6, H - 1.6, P, 2), { tone: "mid" }));
  out.push(S(k.slabOf({ x, y: Y0 + D - WALL, w: W, d: WALL, r: 0.4 }, 1.6, H - 1.6, P, 2), { tone: "mid" }));
  if (BINS[i].locked) {
    // Padlock on the front wall; its shackle runs up through a staple on the lid.
    const cx = x + W / 2;
    const fy = Y0 + D;
    out.push(S(k.slabOf({ x: cx - 3.4, y: fy, w: 6.8, d: 2.2, r: 0.8 }, 5, 6.5, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    out.push(Dots([at([cx, fy + 2.2, 8])], { size: 0.5, tone: "mid" }));
  } else {
    const holder = { x: x + 7, y: Y0 + D, w: 16, d: 0.8, r: 0.3 };
    out.push(S(k.slabOf(holder, 5, 5, P, 2), { tone: "lo", crease: "none" }));
  }
  return out.join("");
}
const lid = (i) => {
  const x = XS[i];
  const plan = { x: x - 1, y: Y0 - 1, w: W + 2, d: D + 2, r: 2 };
  const out = [S(k.slabOf(plan, H, 2.6, P, 3, 0.5), { tone: "mid" })];
  out.push(S(k.slabOf({ x: x + W / 2 - 5, y: Y0 + D / 2 - 2, w: 10, d: 4, r: 1 }, H + 2.6, 2.2, P, 2, 0.3), { tone: "mid", crease: "none" }));
  if (BINS[i].locked) {
    const cx = x + W / 2;
    const fy = Y0 + D + 1;
    out.push(S(k.slabOf({ x: cx - 2.4, y: fy, w: 4.8, d: 1.6, r: 0.4 }, H - 1.4, 3.4, P, 2), { tone: "mid", crease: "none" }));
    out.push(L(k.pathOf([at([cx - 1.8, fy + 1.2, 11.5]), at([cx - 1.8, fy + 1.2, H + 1.2]), at([cx + 1.8, fy + 1.2, H + 1.2]), at([cx + 1.8, fy + 1.2, 11.5])]), { tone: "hi" }));
  }
  return out.join("");
};

export const meta = {
  fig: "Fig 1",
  title: "Caches and locks",
  hint: "← → to pick a bin · Enter to try it",
  control: "Six bins for Python, Gradle and Maven caches. Arrow keys pick a bin; Enter tries to clear it.",
  keys: [
    { mark: "lit", label: "A tool cache, cleared" },
    { mark: "raised", label: "Padlocked: a virtual environment and the global Gradle cache" },
  ],
  caption:
    "Tool caches are disposable: pytest, mypy, Ruff and a project's .gradle rebuild themselves on the next run. A .venv holds the packages you installed, and ~/.gradle serves every project on the machine. Gigaflush leaves both alone.",
};
const fmt = (mb) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`);

export function figure() {
  const body = [bench(P, PLATE)];
  BINS.forEach((_, i) => {
    body.push(binBack(i), `<g data-contents="${i}">${contents(i)}</g>`, binFront(i), `<g data-lid="${i}">${lid(i)}</g>`);
  });
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Six lidded bins in a row. Four tool caches open and empty; a .venv and the global ~/.gradle cache are padlocked shut.", body });
  return { svg, readout: "6 bins · 4 safe to clear" };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const lids = BINS.map((_, i) => svg.querySelector(`[data-lid="${i}"]`));
  const stuff = BINS.map((_, i) => svg.querySelector(`[data-contents="${i}"]`));
  const open = BINS.map(() => 0);
  const gone = BINS.map(() => 0);
  const cleared = BINS.map(() => false);
  let shake = BINS.map(() => 0);
  let pick = 0;
  let touring = true;
  let clock = 0;
  let idle = 0;
  let last = -1;
  const tryBin = (i) => {
    if (BINS[i].locked) shake[i] = 1;
    else cleared[i] = true;
  };
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      const c = clock % 16;
      const n = Math.floor(c / 2.2);
      if (n !== last && n < BINS.length) {
        last = n;
        pick = n;
        tryBin(n);
      }
      if (c > 14.6 && cleared.some(Boolean)) cleared.fill(false), (last = -1);
    }
    let busy = false;
    BINS.forEach((b, i) => {
      const o0 = open[i];
      const g0 = gone[i];
      open[i] = follow(open[i], cleared[i] && gone[i] < 0.98 ? 1 : 0, dt, 0.22, calm);
      gone[i] = follow(gone[i], cleared[i] && open[i] > 0.9 ? 1 : cleared[i] ? gone[i] : 0, dt, 0.3, calm);
      shake[i] = Math.max(0, shake[i] - dt * 1.4);
      const wobble = b.locked ? Math.sin(shake[i] * 40) * shake[i] * 0.9 : 0;
      busy ||= open[i] !== o0 || gone[i] !== g0 || shake[i] > 0;
      lids[i].setAttribute("transform", k.translateAlong(P, [0, 0, open[i] * 18 + Math.max(0, wobble)]));
      stuff[i].setAttribute("transform", k.translateAlong(P, [0, 0, gone[i] * 26]));
      stuff[i].style.opacity = String(1 - gone[i]);
    });
    const b = BINS[pick];
    const freed = BINS.reduce((n, x, i) => n + (cleared[i] ? x.mb : 0), 0);
    const text = `${b.name} · ${b.locked ? `locked: ${b.why}` : cleared[pick] ? `cleared ${fmt(b.mb)}` : `${fmt(b.mb)} · ${b.why}`} · freed ${fmt(freed)}`;
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy;
  });
  const choose = (i, act) => {
    touring = false;
    pick = (i + BINS.length) % BINS.length;
    if (act) tryBin(pick);
    stage.setAttribute("aria-valuetext", `${BINS[pick].name}: ${BINS[pick].locked ? "locked, " + BINS[pick].why : BINS[pick].why}`);
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !loop.still.matches;
      clock = 0;
      last = -1;
      cleared.fill(false);
      loop.run();
    }, 5000);
    loop.run();
  };
  if (loop.still.matches) touring = false;
  stage.addEventListener("click", () => choose(pick + 1, true));
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") (e.preventDefault(), choose(pick + 1, false));
    else if (e.key === "ArrowLeft") (e.preventDefault(), choose(pick - 1, false));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), choose(pick, true));
  });
  loop.run();
}
