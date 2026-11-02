// Fig: a conveyor with a sensor gate. Folder blocks ride the belt; the gate
// reads whether each carries a project-marker plate, and the pusher diverts
// only those into the bin. A "build" folder with no marker rides on past.
import { k, bench, tools, liveLoop } from "../parts.mjs";
import * as G from "../kit/lathe.mjs";

const WIDTH = 600;
const HEIGHT = 380;

export const BLOCKS = [
  { name: "acme-web/node_modules", marker: true },
  { name: "cli/target", marker: true },
  { name: "assets/build", marker: false },
  { name: "app/build", marker: true },
  { name: "notes/dist", marker: false },
  { name: "api/.mypy_cache", marker: true },
];
const SPEED = 15;
const GAP = 40;
const LOOP = GAP * BLOCKS.length;
const START = -112;
const BELT_Z = 14;
const B = 16;
const BH = 10;
const GATE_X = -30;
const PUSH_X = 40;
const PUSH_T = 0.55;
const BIN = { x: 28, y: 26, w: 26, d: 24, r: 1.5 };
const PLATE = { x: -130, y: -56, w: 260, d: 112, r: 9 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [GATE_X, -28, 54]], WIDTH, HEIGHT, { pad: 28, azimuth: 46 });
const { at, S, L, D } = tools(P);

const rail = (y) => S(k.slabOf({ x: -120, y, w: 240, d: 3, r: 0.8 }, 10, 6, P, 2, 0.4), { tone: "mid" }) + D([-110, -40, 30, 100].map((x) => at([x, y + 1.5, 16])), { size: 0.4 });
function legs(y) {
  return [-112, 104].map((x) => S(k.slabOf({ x, y: y - 0.5, w: 4, d: 4, r: 0.6 }, 0, 10, P, 2), { tone: "lo" })).join("");
}
function belt() {
  const plan = { x: -118, y: -14, w: 236, d: 28, r: 1 };
  const out = [S(k.slabOf(plan, 11, 3, P, 2, 0.3), { tone: "lo" })];
  const slats = [];
  for (let x = -112; x <= 112; x += 10) slats.push(k.lineOnTop([x, -14], [x, 14], BELT_Z, P));
  out.push(L(slats.join(""), { tone: "faint" }));
  return out.join("");
}
const roller = (x) => S(G.disc(-15, 15, 3.4, G.frameAlong([x, 0, 12], [0, 1, 0]), P), { tone: "mid" });
function gatePost(y) {
  return S(k.slabOf({ x: GATE_X - 3, y, w: 6, d: 5, r: 0.8 }, 0, 48, P, 2, 0.4), { tone: "mid" }) + S(k.slabOf({ x: GATE_X - 5, y: y - 1, w: 10, d: 7, r: 1 }, 0, 2.4, P, 2), { tone: "lo" });
}
function gateTop() {
  const out = [S(k.slabOf({ x: GATE_X - 4, y: -27, w: 8, d: 53, r: 1 }, 48, 5, P, 2, 0.4), { tone: "mid" })];
  out.push(S(k.cylinder(GATE_X, 0, 3.2, 41, 7, P, 20), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(GATE_X, 0, 1.8, 39.6, 1.4, P, 16), { tone: "mid" }));
  out.push(D([at([GATE_X, -24, 53]), at([GATE_X, 23, 53])], { size: 0.45 }));
  return out.join("");
}
function pusherBase() {
  const out = [S(k.slabOf({ x: PUSH_X - 12, y: -44, w: 24, d: 14, r: 1.4 }, 0, 18, P, 3, 0.5), { tone: "mid" })];
  out.push(D([at([PUSH_X - 9, -32, 18]), at([PUSH_X + 9, -32, 18])], { size: 0.45 }));
  return out.join("");
}
export const ramAt = (reach) =>
  k.solidSvg(k.slabOf({ x: PUSH_X - 2, y: -30, w: 4, d: 12 + reach, r: 0.6 }, 16, 3, P, 2), { tone: "mid", crease: "none" }) +
  k.solidSvg(k.slabOf({ x: PUSH_X - 9, y: -18 + reach, w: 18, d: 3, r: 0.6 }, 14.5, 6, P, 2, 0.3), { tone: "hi", crease: "lo" });
function bin(part) {
  const walls = part === "back"
    ? [{ x: BIN.x, y: BIN.y, w: 1.6, d: BIN.d }, { x: BIN.x, y: BIN.y, w: BIN.w, d: 1.6 }]
    : [{ x: BIN.x + BIN.w - 1.6, y: BIN.y, w: 1.6, d: BIN.d }, { x: BIN.x, y: BIN.y + BIN.d - 1.6, w: BIN.w, d: 1.6 }];
  const out = part === "back" ? [S(k.slabOf(BIN, 0, 1.6, P, 2), { tone: "lo" })] : [];
  walls.forEach((w) => out.push(S(k.slabOf({ ...w, r: 0.4 }, 1.6, 10, P, 2), { tone: "mid" })));
  return out.join("");
}
const blockSvg = (i) => {
  const plan = { x: -B / 2, y: -B / 2, w: B, d: B, r: 1.2 };
  const out = [S(k.slabOf(plan, 0, BH, P, 2, 0.4), { tone: "hi", crease: "lo", inner: k.lineSvg(k.sideSeam(plan, BH - 2.2, P, 2), { tone: "faint" }) })];
  if (BLOCKS[i].marker) {
    const m = { x: 0.4, y: 0.4, w: 6.4, d: 6, r: 0.5 };
    out.push(S(k.slabOf(m, BH, 0.8, P, 2), { tone: "mid", crease: "none" }));
    out.push(L(k.lineOnTop([m.x + 1.2, m.y + 2], [m.x + 4.8, m.y + 2], BH + 0.8, P) + k.lineOnTop([m.x + 1.2, m.y + 3.8], [m.x + 4, m.y + 3.8], BH + 0.8, P), { tone: "lo", free: true }));
  } else out.push(L(k.planOutline(k.insetPlan(plan, 2.4), BH, P, 2), { tone: "faint" }));
  return out.join("");
};

// Where block i is at time t: on the belt, or diverted into the bin.
export function blockAt(i, t) {
  const u = ((t * SPEED + i * GAP) % LOOP + LOOP) % LOOP;
  const x = START + u;
  const edge = Math.min(1, (x - START) / 8, (START + LOOP - 16 - x) / 8);
  if (BLOCKS[i].marker && x >= PUSH_X) {
    const since = (x - PUSH_X) / SPEED;
    const push = Math.min(1, since / PUSH_T);
    const e = push * push * (3 - 2 * push);
    const fall = Math.max(0, Math.min(1, (since - PUSH_T) / 0.35));
    return { x: PUSH_X, y: e * (BIN.y + BIN.d / 2), z: BELT_Z + 3 * Math.sin(Math.PI * e) * (1 - fall) - fall * (BELT_Z - 1.6), opacity: Math.max(0, 1 - Math.max(0, since - PUSH_T - 0.6) / 0.6), out: true, push: since < PUSH_T + 0.2 ? e : Math.max(0, 1 - (since - PUSH_T - 0.2) / 0.3) };
  }
  return { x, y: 0, z: BELT_Z, opacity: Math.max(0, edge), out: false, push: 0 };
}

export const meta = {
  fig: "Fig 1",
  title: "Marker gate",
  hint: "Hover to pause the belt",
  control: "Conveyor with a marker gate. Hover or focus pauses the belt.",
  keys: [
    { mark: "flat", label: "Marker plate: package.json, Cargo.toml and friends" },
    { mark: "lit", label: "Sensor reading the block under the gate" },
    { mark: "raised", label: "Blocks without a marker ride on" },
  ],
  caption:
    "Name matching sends every folder called build or dist to the bin. Gigaflush reads the marker first: only a folder sitting beside its project file is diverted, so an assets/build or a notes/dist rides past untouched.",
};

export function figure() {
  const body = [
    bench(P, PLATE, { label: false }),
    legs(-17),
    pusherBase(),
    gatePost(-27),
    rail(-17),
    roller(-118),
    belt(),
    bin("back"),
    `<g data-part="ram">${ramAt(0)}</g>`,
    `<g data-layer="belt">${BLOCKS.map((_, i) => `<g data-block="${i}">${blockSvg(i)}</g>`).join("")}</g>`,
    legs(14),
    rail(14),
    roller(118),
    `<g data-layer="out"></g>`,
    bin("front"),
    `<path data-part="ray" class="iso-line" data-tone="lit" data-flow="" d="${k.pathOf([at([GATE_X, 0, 39.6]), at([GATE_X, 0, BELT_Z])])}"/>`,
    gatePost(22),
    gateTop(),
  ];
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "A conveyor belt with a sensor gate and a pusher. Folder blocks with a marker plate are pushed into a bin; blocks without one stay on the belt.", body });
  return { svg, readout: "checked 0 · diverted 0 · left 0" };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const belt = svg.querySelector('[data-layer="belt"]');
  const outLayer = svg.querySelector('[data-layer="out"]');
  const ram = svg.querySelector('[data-part="ram"]');
  const ray = svg.querySelector('[data-part="ray"]');
  const els = BLOCKS.map((_, i) => svg.querySelector(`[data-block="${i}"]`));
  let t = 1.2;
  let paused = false;
  const seen = new Set();
  let diverted = 0;
  let left = 0;
  const prev = BLOCKS.map((_, i) => blockAt(i, t).x);
  const loop = liveLoop(stage, (dt, calm) => {
    if (!paused && !calm) t += dt;
    let reach = 0;
    let under = null;
    const placed = BLOCKS.map((_, i) => ({ i, p: blockAt(i, t) }));
    placed.forEach(({ i, p }) => {
      if (prev[i] < GATE_X && p.x >= GATE_X && !p.out) {
        if (BLOCKS[i].marker) diverted++;
        else left++;
        seen.add(i + ":" + Math.floor(t));
      }
      if (Math.abs(p.x - GATE_X) < B / 2 && !p.out) under = p;
      prev[i] = p.x;
      reach = Math.max(reach, p.push * (BIN.y + BIN.d / 2 - 6));
    });
    placed
      .sort((a, b) => k.depthOf([a.p.x, a.p.y, 0], P) - k.depthOf([b.p.x, b.p.y, 0], P))
      .forEach(({ i, p }) => {
        const el = els[i];
        const layer = p.out && p.y > 15 ? outLayer : belt;
        if (el.parentNode !== layer || layer.lastChild !== el) layer.appendChild(el);
        el.setAttribute("transform", k.translateAlong(P, [p.x, p.y, p.z]));
        el.style.opacity = String(p.opacity);
      });
    ram.innerHTML = ramAt(reach);
    ray.setAttribute("d", k.pathOf([at([GATE_X, 0, 39.6]), at([GATE_X, 0, under ? BELT_Z + BH + (BLOCKS[els.indexOf(els.find((_, j) => blockAt(j, t) === under))]?.marker ? 0.8 : 0) : BELT_Z])]));
    const text = `checked ${diverted + left} · diverted ${diverted} · left ${left}`;
    if (readout.textContent !== text) readout.textContent = text;
    return !calm;
  });
  stage.addEventListener("pointerenter", () => (paused = true));
  stage.addEventListener("pointerleave", () => ((paused = false), loop.run()));
  stage.addEventListener("focus", () => (paused = true));
  stage.addEventListener("blur", () => ((paused = false), loop.run()));
  loop.run();
}
