// Fig: a beam balance. Every app you vibe-code puts a chip of source on the
// left tray and a crate of dependencies on the right; the spring-restored
// beam tips by the difference.
import { k, bench, tools, byDepth, liveLoop, spring } from "../parts.mjs";
import * as G from "../kit/lathe.mjs";

const WIDTH = 600;
const HEIGHT = 400;

// Typical fresh-project sizes in MB (the same ballparks as the post's demo).
export const APPS = [
  { stack: "Next.js app", deps: 420 },
  { stack: "Vite + React", deps: 180 },
  { stack: "Expo app", deps: 520 },
  { stack: "Rust CLI", deps: 1400 },
  { stack: "Flutter app", deps: 900 },
  { stack: "SvelteKit site", deps: 160 },
  { stack: "Tauri app", deps: 2100 },
  { stack: "Python API", deps: 90 },
];
const CODE_MB = 3;
const MB_PER_DEGREE = 250;
const MAX_TILT = 14;

const PLATE = { x: -122, y: -52, w: 244, d: 104, r: 9 };
const PIVOT = 104;
const HALF = 74;
const HANG = 40;
const TRAY = 46;
const SLOT = 13.5;
const COL_TOP = PIVOT - 7;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [0, 0, PIVOT + 30], [HALF + TRAY / 2, TRAY / 2, PIVOT - HANG - 30], [-HALF - TRAY / 2, -TRAY / 2, PIVOT + 20]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 56 },
);
const { at, S, L, D } = tools(P);

const massOf = (n) => {
  const code = n * CODE_MB;
  const deps = APPS.slice(0, n).reduce((a, b) => a + b.deps, 0);
  return { code, deps };
};
export const tiltOf = (n) => {
  const { code, deps } = massOf(n);
  return (-Math.min(MAX_TILT, (deps - code) / MB_PER_DEGREE) * Math.PI) / 180;
};
const endOf = (side, theta) => [side * HALF * Math.cos(theta), 0, PIVOT + side * HALF * Math.sin(theta)];
const fmt = (mb) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`);
const slots = () => {
  const out = [];
  for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) out.push([c * SLOT, r * SLOT]);
  return out;
};
const SLOTS = slots();
const crateH = (mb) => 4 + mb / 110;

function stand() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: -18, y: -18, w: 36, d: 36, r: 18 }, 0, 4, P)}"/>`);
  out.push(S(k.cylinder(0, 0, 18, 0, 4, P, 56, 0.8), { tone: "lo" }));
  out.push(L(k.ring(0, 0, 14, 4, P, 48), { tone: "faint" }));
  out.push(D([0, 1, 2, 3].map((i) => at([11.5 * Math.cos(i * Math.PI / 2 + 0.6), 11.5 * Math.sin(i * Math.PI / 2 + 0.6), 4])), { size: 0.45 }));
  out.push(S(k.cylinder(0, 0, 9, 4, 4, P, 36, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 3.6, 8, COL_TOP - 8, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([30, 60].map((z) => k.sideArc(0, 0, 3.6, z, P, 14)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, 5.4, 44, 5, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 5.4, COL_TOP - 3, 3, P, 28), { tone: "mid" }));
  return out.join("");
}

// The back cheek of the fork carries the arc scale the pointer swings over.
const SCALE_R = 22;
const SCALE_SPAN = (15 * Math.PI) / 180;
const CHEEK_HALF = SCALE_R * Math.sin(SCALE_SPAN);
function backCheek() {
  const out = [];
  const plan = { x: -CHEEK_HALF, y: -6.2, w: CHEEK_HALF * 2, d: 2.4, r: 0.4 };
  out.push(S(k.slabOf(plan, COL_TOP, PIVOT + 27 - COL_TOP, P, 2, 0.3), { tone: "mid" }));
  const face = -3.8;
  const arc = [];
  for (let i = 0; i <= 24; i++) {
    const a = -SCALE_SPAN + (2 * SCALE_SPAN * i) / 24;
    arc.push([SCALE_R * Math.sin(a), face, PIVOT + SCALE_R * Math.cos(a)]);
  }
  out.push(L(k.pathOf(arc.map(at)), { tone: "lo" }));
  const ticks = [];
  for (let deg = -15; deg <= 15; deg += 5) {
    const a = (deg * Math.PI) / 180;
    const r1 = deg === 0 ? 27 : SCALE_R + 2.4;
    ticks.push(k.pathOf([at([SCALE_R * Math.sin(a), face, PIVOT + SCALE_R * Math.cos(a)]), at([r1 * Math.sin(a), face, PIVOT + r1 * Math.cos(a)])]));
  }
  out.push(L(ticks.join(""), { tone: "mid" }));
  return out.join("");
}
function frontCheek() {
  const plan = { x: -5, y: 3.8, w: 10, d: 2.4, r: 0.4 };
  return S(k.slabOf(plan, COL_TOP, PIVOT + 6 - COL_TOP, P, 2, 0.3), { tone: "mid" }) + D([at([0, 6.2, PIVOT + 3])], { size: 0.45 });
}
function pin() {
  const F = G.frameAlong([0, 0, PIVOT], [0, 1, 0]);
  return S(G.disc(-7.2, 7.2, 1.6, F, P), { tone: "mid" });
}

export function beamAt(theta) {
  const F = G.frameOf([0, 0, PIVOT], [Math.cos(theta), 0, Math.sin(theta)], [0, 1, 0], [-Math.sin(theta), 0, Math.cos(theta)]);
  const body = G.prismOf(F, [[-2.2, -3], [2.2, -3], [2.2, 3], [-2.2, 3]], -HALF - 4, HALF + 4, P);
  return k.solidSvg(body, { tone: "hi", crease: "lo" });
}
export const pointerAt = (theta) => {
  const up = [-Math.sin(theta), 0, Math.cos(theta)];
  return k.pathOf([at([up[0] * 4, 0, PIVOT + up[2] * 4]), at([up[0] * (SCALE_R + 1.6), -3.6, PIVOT + up[2] * (SCALE_R + 1.6)])]);
};

// A tray on four wires from a hook under the beam end, built at the level
// pose; live code moves the whole group with the beam end.
function tray(side, fill) {
  const [ex, , ez] = endOf(side, 0);
  const plan = { x: ex - TRAY / 2, y: -TRAY / 2, w: TRAY, d: TRAY, r: 3 };
  const z = ez - HANG;
  const hook = [ex, 0, ez - 6];
  const corners = k.corners(plan, 3).map(([x, y]) => [x, y, z + 2.6]);
  const behind = corners.filter(([x, y]) => k.depthOf([x, y, z], P) < k.depthOf([ex, 0, z], P));
  const before = corners.filter((c) => !behind.includes(c));
  const out = [];
  out.push(S(k.cylinder(ex, 0, 1.4, ez - 6, 4, P, 14), { tone: "mid", crease: "none" }));
  out.push(behind.map((c) => k.wireSvg(at(hook), at(c), { tone: "lo", size: 0.9 })).join(""));
  out.push(S(k.slabOf(plan, z, 2.6, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.6), z + 2.6, P, 3), { tone: "faint" }));
  out.push(fill(ex, z + 2.6));
  out.push(before.map((c) => k.wireSvg(at(hook), at(c), { tone: "lo", size: 0.9 })).join(""));
  out.push(D([at(hook)], { size: 1.1, tone: "mid" }));
  return out.join("");
}

const ordered = byDepth(P, SLOTS.map((s, i) => ({ s, i })), ({ s }) => [s[0], s[1], 0]);
const chip = (x, y, z) => {
  const plan = { x: x - 3.4, y: y - 3.4, w: 6.8, d: 6.8, r: 0.8 };
  return S(k.slabOf(plan, z, 2.2, P, 2, 0.3), { tone: "hi", crease: "lo" }) + L(k.planOutline(k.insetPlan(plan, 1.4), z + 2.2, P, 2), { tone: "faint" });
};
const crate = (x, y, z, mb) => {
  const plan = { x: x - 5.6, y: y - 5.6, w: 11.2, d: 11.2, r: 1 };
  const h = crateH(mb);
  return (
    S(k.slabOf(plan, z, h, P, 2, 0.4), { tone: "hi", crease: "lo", inner: k.lineSvg(k.sideSeam(plan, z + h - 2, P, 2), { tone: "faint" }) }) +
    L(k.planOutline(k.insetPlan(plan, 1.6), z + h, P, 2), { tone: "faint" })
  );
};
const leftFill = (ex, z) => ordered.map(({ s, i }) => `<g data-chip="${i}">${chip(ex + s[0], s[1], z)}</g>`).join("");
const rightFill = (ex, z) => ordered.map(({ s, i }) => (i < APPS.length ? `<g data-crate="${i}">${crate(ex + s[0], s[1], z, APPS[i].deps)}</g>` : "")).join("");

const trayShift = (side, theta) => {
  const e = endOf(side, theta);
  const r = endOf(side, 0);
  return k.translateAlong(P, [e[0] - r[0], 0, e[2] - r[2]]);
};

export const meta = {
  fig: "Fig 1",
  title: "Code vs dependencies",
  hint: "Click or → to ship another app",
  control: "Beam balance: each step adds one vibe-coded app. Right arrow adds, left arrow removes.",
  keys: [
    { mark: "flat", label: "Left tray: your source, about 3 MB an app" },
    { mark: "raised", label: "Right tray: the dependency folder each app installs" },
    { mark: "lit", label: "Pointer: 1° of tilt per 250 MB of difference" },
  ],
  caption:
    "A spring-restored beam balance. Each app adds about 3 MB of code on the left and its dependencies on the right: 420 MB for a Next.js app, 1.4 GB for a Rust CLI's target, 2.1 GB for a Tauri app. The code never catches up.",
};
const readoutOf = (n) => {
  const { code, deps } = massOf(n);
  return n ? `${n} app${n === 1 ? "" : "s"} · code ${fmt(code)} · deps ${fmt(deps)}` : "no apps yet";
};

export function figure({ still = false } = {}) {
  const n = still ? APPS.length : 0;
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A beam balance on a bench. The left tray holds small chips of source code, the right tray holds dependency crates, and the beam tips toward the crates.",
    body: [
      bench(P, PLATE),
      `<g data-part="tray-left" transform="${trayShift(-1, tiltOf(n))}">${tray(-1, leftFill)}</g>`,
      stand(),
      backCheek(),
      `<g data-part="beam">${beamAt(tiltOf(n))}</g>`,
      frontCheek(),
      pin(),
      `<g data-part="tray-right" transform="${trayShift(1, tiltOf(n))}">${tray(1, rightFill)}</g>`,
      `<path data-part="pointer" class="iso-line" data-tone="lit" data-free="" d="${pointerAt(tiltOf(n))}" style="stroke-width:1.1"/>`,
    ],
  });
  return { svg: still ? svg : svg.replace(/<g data-(chip|crate)="(\d+)">/g, '<g data-$1="$2" style="opacity:0">'), readout: readoutOf(n) };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const beam = svg.querySelector('[data-part="beam"]');
  const pointer = svg.querySelector('[data-part="pointer"]');
  const trays = [svg.querySelector('[data-part="tray-left"]'), svg.querySelector('[data-part="tray-right"]')];
  const chips = [...svg.querySelectorAll("[data-chip]")].sort((a, b) => a.dataset.chip - b.dataset.chip);
  const crates = [...svg.querySelectorAll("[data-crate]")].sort((a, b) => a.dataset.crate - b.dataset.crate);
  const drops = APPS.map(() => ({ at: 40, rate: 0 }));
  const tilt = { at: 0, rate: 0 };
  let n = 0;
  let touring = true;
  let clock = 0;
  let idle = 0;
  const rest = [endOf(-1, 0), endOf(1, 0)];
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      const cycle = clock % 15.5;
      n = Math.min(APPS.length, Math.floor(cycle / 1.5));
    }
    let busy = !spring(tilt, tiltOf(n), dt, 60, 9, calm);
    [-1, 1].forEach((side, i) => {
      const e = endOf(side, tilt.at);
      trays[i].setAttribute("transform", k.translateAlong(P, [e[0] - rest[i][0], 0, e[2] - rest[i][2]]));
    });
    APPS.forEach((_, i) => {
      const on = i < n;
      const target = on ? 0 : 40;
      if (!on && drops[i].at >= 40) {
        crates[i].style.opacity = chips[i].style.opacity = "0";
        return;
      }
      busy = !spring(drops[i], target, dt, 220, 15, calm) || busy;
      const t = k.translateAlong(P, [0, 0, drops[i].at]);
      const opacity = String(Math.max(0, 1 - drops[i].at / 40));
      crates[i].setAttribute("transform", t);
      chips[i].setAttribute("transform", t);
      crates[i].style.opacity = chips[i].style.opacity = opacity;
    });
    beam.innerHTML = beamAt(tilt.at);
    pointer.setAttribute("d", pointerAt(tilt.at));
    const text = readoutOf(n);
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy;
  });
  const go = (to) => {
    touring = false;
    n = Math.max(0, Math.min(APPS.length, to));
    const { code, deps } = massOf(n);
    stage.setAttribute("aria-valuetext", `${n} apps: ${fmt(code)} of code against ${fmt(deps)} of dependencies`);
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !loop.still.matches;
      clock = n * 1.5;
      loop.run();
    }, 3600);
    loop.run();
  };
  if (loop.still.matches) {
    touring = false;
    n = 4;
  }
  stage.setAttribute("aria-valuemin", "0");
  stage.setAttribute("aria-valuemax", String(APPS.length));
  stage.addEventListener("click", () => go(n >= APPS.length ? 0 : n + 1));
  stage.addEventListener("keydown", (e) => {
    const to = { ArrowRight: n + 1, ArrowUp: n + 1, ArrowLeft: n - 1, ArrowDown: n - 1, Home: 0, End: APPS.length }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  });
  loop.run();
}
