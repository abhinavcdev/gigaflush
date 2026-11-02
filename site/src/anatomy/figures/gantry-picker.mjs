// Fig: a gantry picker over a row of project boxes. The gripper visits each
// box, checks for the package.json plate, and only then lifts node_modules
// out and drops it in the bin. The box without a marker is left alone.
import { k, bench, tools, byDepth, liveLoop, follow } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 380;

export const BOXES = [
  { name: "acme-web", mb: 412, marker: true },
  { name: "api-server", mb: 286, marker: true },
  { name: "old-export", mb: 0, marker: false },
  { name: "design-system", mb: 198, marker: true },
  { name: "weekend-idea", mb: 131, marker: true },
];
const XS = [-98, -62, -26, 10, 46];
const BOX_W = 28;
const BOX_D = 34;
const BOX_H = 14;
const BLOCK = { dx: -11, y: -14, w: 22, d: 16, h: 10 };
const MARK = { dx: 1, y: 4, w: 10, d: 9 };
const BIN = { x: 78, y: -17, w: 28, d: 34, r: 1.5 };
const BIN_H = 18;
const WALL = 1.6;
const BEAM_Z = 70;
const POSTS = [-122, 125];
const CARRY_Z = 46;
const HOVER_Z = BOX_H + BLOCK.h + 3;
const BIN_X = BIN.x + BIN.w / 2;
const PLATE = { x: -134, y: -44, w: 268, d: 88, r: 9 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [POSTS[0], 0, BEAM_Z + 12], [POSTS[1], 0, BEAM_Z + 12]], WIDTH, HEIGHT, { pad: 26, azimuth: 52 });
const { at, S, L, D } = tools(P);

function box(i) {
  const cx = XS[i];
  const plan = { x: cx - BOX_W / 2, y: -BOX_D / 2, w: BOX_W, d: BOX_D, r: 2 };
  const out = [];
  out.push(S(k.slabOf(plan, 0, BOX_H, P, 3, 0.6), { tone: "mid", inner: k.lineSvg(k.sideSeam(plan, BOX_H - 3, P, 3), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(plan, 2.4), BOX_H, P, 2), { tone: "faint" }));
  out.push(D(k.corners(plan, 3).map(([x, y]) => at([x, y, BOX_H])), { size: 0.4 }));
  // The source tray at the front left of the lid.
  const src = { x: cx - 11, y: 4, w: 9, d: 9, r: 0.8 };
  out.push(S(k.slabOf(src, BOX_H, 2.2, P, 2, 0.3), { tone: "mid", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(src, 1.4), BOX_H + 2.2, P, 2), { tone: "faint" }));
  if (BOXES[i].marker) {
    const m = { x: cx + MARK.dx, y: MARK.y, w: MARK.w, d: MARK.d, r: 0.6 };
    out.push(S(k.slabOf(m, BOX_H, 0.8, P, 2), { tone: "hi", crease: "lo" }));
    [7, 5, 6].forEach((len, j) => out.push(L(k.lineOnTop([m.x + 1.6, m.y + 2.4 + j * 2], [m.x + 1.6 + len, m.y + 2.4 + j * 2], BOX_H + 0.8, P), { tone: "mid", free: true })));
  }
  return out.join("");
}
const blockAt = (cx, z) => {
  const plan = { x: cx + BLOCK.dx, y: BLOCK.y, w: BLOCK.w, d: BLOCK.d, r: 1.2 };
  return (
    S(k.slabOf(plan, z, BLOCK.h, P, 3, 0.5), { tone: "hi", crease: "lo", inner: k.lineSvg(k.sideSeam(plan, z + BLOCK.h - 2.4, P, 3), { tone: "faint" }) }) +
    k.dotsSvg(k.dotGrid(plan.x + 4, plan.y + 4, 4, 3, 4.6, z + BLOCK.h, P), { size: 0.4, tone: "lo" })
  );
};

function bin(part) {
  const out = [];
  const back = [
    { x: BIN.x, y: BIN.y, w: WALL, d: BIN.d, r: 0.4 },
    { x: BIN.x, y: BIN.y, w: BIN.w, d: WALL, r: 0.4 },
  ];
  const front = [
    { x: BIN.x + BIN.w - WALL, y: BIN.y, w: WALL, d: BIN.d, r: 0.4 },
    { x: BIN.x, y: BIN.y + BIN.d - WALL, w: BIN.w, d: WALL, r: 0.4 },
  ];
  if (part === "back") {
    out.push(`<path class="iso-halo" d="${k.haloOf(BIN, 0, BIN_H, P)}"/>`);
    out.push(S(k.slabOf(BIN, 0, 2, P, 2), { tone: "lo" }));
    back.forEach((w) => out.push(S(k.slabOf(w, 2, BIN_H - 2, P, 2), { tone: "mid" })));
  } else {
    front.forEach((w) => out.push(S(k.slabOf(w, 2, BIN_H - 2, P, 2), { tone: "mid" })));
    out.push(D([at([BIN.x + BIN.w, BIN.y + 4, BIN_H]), at([BIN.x + BIN.w, BIN.y + BIN.d - 4, BIN_H]), at([BIN.x + 4, BIN.y + BIN.d, BIN_H])], { size: 0.4 }));
  }
  return out.join("");
}
export const fillAt = (count) => {
  const h = Math.max(0.01, count * 3);
  return k.solidSvg(k.slabOf(k.insetPlan(BIN, WALL), 2, h, P, 2), { tone: "hi", crease: "lo" });
};

function post(x) {
  const out = [];
  out.push(S(k.slabOf({ x: x - 8, y: -12, w: 16, d: 24, r: 2 }, 0, 3, P, 3, 0.5), { tone: "lo" }));
  out.push(D([at([x - 5, -9, 3]), at([x + 5, -9, 3]), at([x - 5, 9, 3]), at([x + 5, 9, 3])], { size: 0.45 }));
  out.push(S(k.slabOf({ x: x - 3.5, y: -5, w: 7, d: 10, r: 1 }, 3, BEAM_Z - 3, P, 3, 0.4), { tone: "mid" }));
  return out.join("");
}
function beam() {
  const plan = { x: POSTS[0] - 6, y: -4, w: POSTS[1] - POSTS[0] + 12, d: 8, r: 1.2 };
  const out = [S(k.slabOf(plan, BEAM_Z, 7, P, 3, 0.5), { tone: "mid" })];
  out.push(L(k.lineOnTop([plan.x, 0], [plan.x + plan.w, 0], BEAM_Z + 7, P), { tone: "faint" }));
  const t = k.topTicks(plan.x + 8, plan.x + plan.w - 8, 4, 5, 1.2, BEAM_Z + 7, [1.4, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([plan.x + 3, 0, BEAM_Z + 7]), at([plan.x + plan.w - 3, 0, BEAM_Z + 7])], { size: 0.45 }));
  return out.join("");
}

// The carriage wraps the beam; the rod and gripper hang from it. Built at x = 0.
function carriage() {
  const out = [];
  out.push(S(k.slabOf({ x: -8, y: -7, w: 16, d: 14, r: 1.6 }, BEAM_Z - 6, 17, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([-5, 7, BEAM_Z + 8]), at([5, 7, BEAM_Z + 8])], { size: 0.45 }));
  out.push(S(k.cylinder(6, 7.6, 2.2, BEAM_Z + 1, 4, P, 16), { tone: "mid" }));
  return out.join("");
}
export const rodAt = (tip) => k.solidSvg(k.cylinder(0, 0, 1.4, tip + 4, BEAM_Z - 6 - tip - 4, P, 16), { tone: "mid", crease: "none" });
export const headAt = (tip) =>
  k.solidSvg(k.slabOf({ x: -7, y: -6, w: 14, d: 12, r: 1.4 }, tip, 4, P, 3, 0.4), { tone: "hi", crease: "lo" }) +
  k.solidSvg(k.slabOf({ x: -7.6, y: -2, w: 1.6, d: 4, r: 0.4 }, tip - 3, 3, P, 2), { tone: "mid", crease: "none" }) +
  k.solidSvg(k.slabOf({ x: 6, y: -2, w: 1.6, d: 4, r: 0.4 }, tip - 3, 3, P, 2), { tone: "mid", crease: "none" });

// Scripted sequence for one box: move, lower, sense, then either carry the
// block to the bin or rise and move on.
const T = { move: 1.1, lower: 0.6, sense: 0.6, lift: 0.6, carry: 1.2, drop: 0.6, back: 0.5 };
const phasesFor = (i) => {
  const out = [["move", T.move], ["lower", T.lower], ["sense", T.sense]];
  if (BOXES[i].marker) out.push(["lift", T.lift], ["carry", T.carry], ["drop", T.drop], ["back", T.back]);
  else out.push(["back", T.back]);
  return out;
};
const PLAN = BOXES.flatMap((_, i) => phasesFor(i).map(([name, d]) => ({ i, name, d })));
const CYCLE = PLAN.reduce((n, p) => n + p.d, 0) + 2.4;
export const poseAt = (t) => {
  let left = t;
  const freedBefore = (i) => BOXES.slice(0, i).reduce((n, b) => n + b.mb, 0);
  for (const p of PLAN) {
    if (left < p.d) {
      const u = left / p.d;
      const e = u * u * (3 - 2 * u);
      const cx = XS[p.i];
      const prev = p.i === 0 ? XS[0] - 30 : BOXES[p.i - 1].marker ? BIN_X : XS[p.i - 1];
      const done = BOXES.slice(0, p.i).filter((b) => b.marker).length;
      const base = { box: p.i, phase: p.name, carried: false, removed: done, freed: freedBefore(p.i) };
      if (p.name === "move") return { ...base, x: prev + (cx - prev) * e, tip: CARRY_Z };
      if (p.name === "lower") return { ...base, x: cx, tip: CARRY_Z + (HOVER_Z - CARRY_Z) * e };
      if (p.name === "sense") return { ...base, x: cx, tip: HOVER_Z, sensing: true };
      if (p.name === "lift") return { ...base, x: cx, tip: HOVER_Z + (CARRY_Z - HOVER_Z) * e, carried: true };
      if (p.name === "carry") return { ...base, x: cx + (BIN_X - cx) * e, tip: CARRY_Z, carried: true };
      if (p.name === "drop") return { ...base, x: BIN_X, tip: CARRY_Z + (22 - CARRY_Z) * e, carried: true, fade: e };
      if (p.name === "back")
        return BOXES[p.i].marker
          ? { ...base, x: BIN_X, tip: 22 + (CARRY_Z - 22) * e, removed: done + 1, freed: freedBefore(p.i + 1) }
          : { ...base, x: cx, tip: HOVER_Z + (CARRY_Z - HOVER_Z) * e, skipped: true };
    }
    left -= p.d;
  }
  return { box: BOXES.length - 1, phase: "done", x: BIN_X, tip: CARRY_Z, removed: BOXES.filter((b) => b.marker).length, freed: freedBefore(BOXES.length) };
};

export const meta = {
  fig: "Fig 1",
  title: "Marker first, then remove",
  hint: "Hover to pause · ← → to step boxes",
  control: "Gantry picker over five project boxes. Arrow keys step from box to box.",
  keys: [
    { mark: "flat", label: "package.json plate: the project marker" },
    { mark: "lit", label: "node_modules being removed" },
    { mark: "raised", label: "Box three has no marker, so its folder stays" },
  ],
  caption:
    "A gantry picker over five project boxes. At each one it checks for the package.json plate before lifting node_modules into the bin. The third box has a folder with the right name but no marker, so it is skipped. That check is the difference between a careful cleanup and find -exec rm -rf.",
};
const fmt = (mb) => (mb >= 1000 ? `${(mb / 1000).toFixed(2)} GB` : `${mb} MB`);
const readoutOf = (pose) => {
  if (pose.phase === "done") return `all checked · ${pose.removed} removed, ${BOXES.length - pose.removed} skipped · freed ${fmt(pose.freed)}`;
  const b = BOXES[pose.box];
  const state = pose.sensing ? (b.marker ? "package.json found" : "no marker · skip") : pose.carried ? `removing ${b.mb} MB` : pose.skipped ? "left alone" : b.name;
  return `${b.name} · ${state} · freed ${fmt(pose.freed)}`;
};

export function figure() {
  const pose = poseAt(0);
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A gantry over five project boxes. Four boxes carry a package.json plate and a node_modules block; one has a block but no plate. A gripper lifts blocks from marked boxes into a bin.",
    body: [
      bench(P, PLATE, { label: false }),
      post(POSTS[0]),
      ...XS.map((cx, i) => `<g data-box="${i}">${box(i)}<g data-block="${i}">${blockAt(cx, BOX_H)}</g></g>`),
      bin("back"),
      `<g data-part="fill">${fillAt(0)}</g>`,
      bin("front"),
      post(POSTS[1]),
      beam(),
      `<g data-part="carriage" transform="${k.translateAlong(P, [pose.x, 0, 0])}">${carriage()}<g data-part="rod">${rodAt(pose.tip)}</g><path data-part="sense" class="iso-line" data-tone="lit" data-flow="" d="" /><g data-part="carried" style="opacity:0">${blockAt(0, 0)}</g><g data-part="head">${headAt(pose.tip)}</g></g>`,
    ],
  });
  return { svg, readout: readoutOf(pose) };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const car = q('[data-part="carriage"]');
  const rod = q('[data-part="rod"]');
  const head = q('[data-part="head"]');
  const carried = q('[data-part="carried"]');
  const sense = q('[data-part="sense"]');
  const fill = q('[data-part="fill"]');
  const blocks = BOXES.map((_, i) => q(`[data-block="${i}"]`));
  let clock = 0;
  let paused = false;
  let x = poseAt(0).x;
  let tip = poseAt(0).tip;
  let level = 0;
  let lastRemoved = -1;
  const loop = liveLoop(stage, (dt, calm) => {
    if (!paused) clock = (clock + dt) % CYCLE;
    const pose = poseAt(calm ? CYCLE - 0.01 : clock);
    x = follow(x, pose.x, dt, 0.05, calm);
    tip = follow(tip, pose.tip, dt, 0.05, calm);
    car.setAttribute("transform", k.translateAlong(P, [x, 0, 0]));
    rod.innerHTML = rodAt(tip);
    head.innerHTML = headAt(tip);
    const c = pose.carried ? 1 - (pose.fade ?? 0) * 0.98 : 0;
    carried.style.opacity = String(c);
    carried.setAttribute("transform", k.translateAlong(P, [0, 0, tip - 3 - BLOCK.h]));
    BOXES.forEach((b, i) => {
      const gone = b.marker && (i < pose.box || (i === pose.box && (pose.carried || pose.phase === "back")) || pose.phase === "done");
      blocks[i].style.opacity = gone ? "0" : "1";
    });
    if (pose.sensing && BOXES[pose.box].marker) {
      const cx = XS[pose.box];
      sense.setAttribute("d", k.pathOf([k.iso([cx - x + 6, 0, tip], P), k.iso([cx - x + MARK.dx + MARK.w / 2, MARK.y + MARK.d / 2, BOX_H + 0.8], P)]));
    } else sense.setAttribute("d", "");
    if (pose.removed !== lastRemoved) {
      lastRemoved = pose.removed;
      level = pose.removed;
      fill.innerHTML = fillAt(level);
      fill.style.opacity = level ? "1" : "0";
    }
    const text = readoutOf(pose);
    if (readout.textContent !== text) readout.textContent = text;
    return !calm;
  });
  const stepTo = (i) => {
    const target = Math.max(0, Math.min(BOXES.length - 1, i));
    let t = 0;
    for (const p of PLAN) {
      if (p.i === target) break;
      t += p.d;
    }
    clock = t + T.move + T.lower + T.sense * 0.5;
    paused = true;
    loop.run();
  };
  stage.addEventListener("pointerenter", () => (paused = true));
  stage.addEventListener("pointerleave", () => ((paused = false), loop.run()));
  stage.addEventListener("keydown", (e) => {
    const cur = poseAt(clock).box;
    const to = { ArrowRight: cur + 1, ArrowLeft: cur - 1, Home: 0, End: BOXES.length - 1 }[e.key];
    if (e.key === "Escape") return ((paused = false), loop.run());
    if (to === undefined) return;
    e.preventDefault();
    stepTo(to);
  });
  loop.run();
}
