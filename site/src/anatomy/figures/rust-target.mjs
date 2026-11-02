// Fig: a platform scale weighing a Rust target/ directory. Each bin is one
// part of target/, as tall as its size; the platform sinks on its spring and
// the dial reads the total. cargo commands lift bins off the stack.
import { k, bench, knob, tools, byDepth, liveLoop, spring } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 380;

// An example mid-size workspace, in GB. Bottom of the stack first.
export const PARTS = [
  { name: "debug/deps", gb: 1.4, profile: "debug" },
  { name: "debug/incremental", gb: 0.9, profile: "debug" },
  { name: "debug/build", gb: 0.3, profile: "debug" },
  { name: "release", gb: 0.8, profile: "release" },
  { name: "doc", gb: 0.1, profile: "doc" },
];
const STEPS = [
  { cmd: "cargo build && cargo build --release && cargo doc", keep: [1, 1, 1, 1, 1] },
  { cmd: "cargo clean --release", keep: [1, 1, 1, 0, 1] },
  { cmd: "cargo clean --doc", keep: [1, 1, 1, 0, 0] },
  { cmd: "cargo clean", keep: [0, 0, 0, 0, 0] },
];
const PER_GB = 13;
const BIN_PAD = 3;
const heightOf = (gb) => gb * PER_GB + BIN_PAD;
const SINK = 2.2;
const FULL = 4;

const PLATE = { x: -124, y: -74, w: 248, d: 148, r: 9 };
const BODY = { x: -66, y: -50, w: 100, d: 100, r: 7 };
const BODY_H = 14;
const PAN = { x: -56, y: -40, w: 80, d: 80, r: 5 };
const PAN_Z = 19;
const PAN_H = 3;
const BIN = { x: -45, y: -29, w: 58, d: 58, r: 3.5 };
const DIAL = [84, 22];
const DIAL_R = 19;
const DIAL_Z = 30;
const DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const TOP = PAN_Z + PAN_H + PARTS.reduce((n, p) => n + heightOf(p.gb) + 0.6, 0);

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), ...k.boxCorners(BIN, 0, TOP), [DIAL[0] + DIAL_R, DIAL[1], DIAL_TOP]],
  WIDTH,
  HEIGHT,
  { pad: 30, azimuth: 38 },
);
const { at, S, L, D } = tools(P);

const totalOf = (keep) => PARTS.reduce((n, p, i) => n + (keep[i] ? p.gb : 0), 0);
const sinkOf = (gb) => -gb * SINK;

function scaleBody() {
  const out = [];
  out.push(S(k.slabOf(BODY, 0, BODY_H, P, 7, 1.2), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BODY, 4), BODY_H, P, 5), { tone: "faint" }));
  const screws = k.corners(BODY, 7);
  out.push(D(screws.map(([x, y]) => at([x, y, BODY_H])), { size: 0.45 }));
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.6, BODY_H, P, 14)).join(""), { tone: "lo" }));
  out.push(knob(P, BODY.x + BODY.w - 12, BODY.y + BODY.d - 12, BODY_H, 4.4, 3.6));
  // Spirit level: a ring with its bubble near the centre.
  const lv = [BODY.x + 12, BODY.y + BODY.d - 12];
  out.push(S(k.cylinder(lv[0], lv[1], 4, BODY_H, 0.8, P, 24), { tone: "lo", crease: "none" }));
  out.push(L(k.ring(lv[0], lv[1], 2.6, BODY_H + 0.8, P, 20), { tone: "mid" }));
  out.push(D([at([lv[0] + 0.5, lv[1] - 0.3, BODY_H + 0.8])], { size: 0.7, tone: "hi" }));
  return out.join("");
}

// Calibration weights in a fitted block at the back of the bench.
const WEIGHTS = { x: 52, y: -64, w: 50, d: 22, r: 3 };
function weightSet() {
  const out = [];
  out.push(S(k.slabOf(WEIGHTS, 0, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(D([at([WEIGHTS.x + 3, WEIGHTS.y + WEIGHTS.d - 3, 6]), at([WEIGHTS.x + WEIGHTS.w - 3, WEIGHTS.y + WEIGHTS.d - 3, 6])], { size: 0.4 }));
  [[64, 6, 11], [80, 5, 9], [93, 4, 7]].forEach(([x, r, h]) => {
    const y = WEIGHTS.y + WEIGHTS.d / 2;
    out.push(L(k.ring(x, y, r + 1, 6, P, 24), { tone: "faint" }));
    out.push(S(k.cylinder(x, y, r, 3, h, P, 32, 0.5), { tone: "hi", crease: "lo" }));
    out.push(L(k.sideArc(x, y, r, 3 + h - 2.4, P, 24), { tone: "faint" }));
    out.push(S(k.cylinder(x, y, r * 0.45, 3 + h, 2.6, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, r * 0.62, 5.6 + h, 1.6, P, 20), { tone: "mid" }));
  });
  return out.join("");
}

// The pan rides on four guide posts that disappear into the body.
function pan() {
  const out = [];
  for (const [x, y] of byDepth(P, k.corners(PAN, 9), ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 2.6, BODY_H - 6, PAN_Z - BODY_H + 6, P, 18), { tone: "lo", crease: "none" }));
  }
  out.push(S(k.slabOf(PAN, PAN_Z, PAN_H, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PAN, 3.5), PAN_Z + PAN_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(PAN, 6).map(([x, y]) => at([x, y, PAN_Z + PAN_H])), { size: 0.4 }));
  return out.join("");
}

// One bin, built standing at z = 0; live code lifts it into the stack.
function bin(part, index) {
  const h = heightOf(part.gb);
  const out = [];
  const tone = index === 3 ? "hi" : "hi";
  out.push(S(k.slabOf(BIN, 0, h, P, 4, 0.6), { tone, crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(BIN, 3), h, P, 3), { tone: "faint" }));
  // Handle on the +x face and a label holder on the +y face.
  out.push(S(k.slabOf({ x: BIN.x + BIN.w, y: -10, w: 2.2, d: 20, r: 1 }, Math.max(0.6, h / 2 - 1.6), 3.2, P, 3), { tone: "mid", crease: "none" }));
  const holderH = Math.min(6, h - 2);
  out.push(S(k.slabOf({ x: BIN.x + 14, y: BIN.y + BIN.d, w: 26, d: 1, r: 0.4 }, (h - holderH) / 2, holderH, P, 2), { tone: "lo", crease: "none" }));
  out.push(D([at([BIN.x + 3, BIN.y + BIN.d, h - 1.6]), at([BIN.x + BIN.w - 3, BIN.y + BIN.d, h - 1.6])], { size: 0.35 }));
  return out.join("");
}

function dialBase() {
  const [x, y] = DIAL;
  const out = [];
  out.push(S(k.cylinder(x, y, 7, 0, 3, P, 28), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 3, 3, DIAL_Z - 3, P, 20), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(x, y, 3, 16, P, 12), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 80, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 2.6, FULL * 5, 5, DIAL_TOP, [1.2, 2.6], P, 0, (Math.PI * 2 * 300) / 360);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.5, DIAL_TOP, P, 14), { tone: "mid" }));
  return out.join("");
}

export const needleAt = (gb) => {
  const angle = (Math.min(gb, FULL) / FULL) * ((Math.PI * 2 * 300) / 360);
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(angle) * 3, y + Math.cos(angle) * 3], [x + Math.sin(angle) * (DIAL_R - 4), y - Math.cos(angle) * (DIAL_R - 4)], DIAL_TOP + 0.2, P);
};

const stackZ = (keep, i) => {
  let z = PAN_Z + PAN_H;
  for (let j = 0; j < i; j++) if (keep[j]) z += heightOf(PARTS[j].gb) + 0.6;
  return z;
};

export const meta = {
  fig: "Fig 1",
  title: "Weighing target/",
  hint: "Click or ← → to run cargo",
  control: "Scale weighing a Rust target directory. Arrow keys or click run the next cargo command.",
  keys: [
    { mark: "raised", label: "One bin per part of target/, as tall as its size" },
    { mark: "lit", label: "Needle: the total on disk" },
  ],
  caption:
    "An example workspace's target/ on a scale: 1.4 GB of compiled dependencies, 0.9 GB of incremental cache, 0.3 GB of build-script output, 0.8 GB of release build and 0.1 GB of docs. Each cargo clean variant lifts its bins off; plain cargo clean empties the pan.",
};

const readoutOf = (gb, step) => `${gb.toFixed(1)} GB · ${STEPS[step].cmd.split(" &&")[0]}`;

export function figure() {
  const keep = STEPS[0].keep;
  const total = totalOf(keep);
  const sink = sinkOf(total);
  const bins = PARTS.map(
    (part, i) => `<g data-bin="${i}" transform="${k.translateAlong(P, [0, 0, stackZ(keep, i) + sink])}">${bin(part, i)}</g>`,
  );
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "A bench scale with a stack of five bins on its pan, one for each part of a Rust target directory, each as tall as its size. A dial beside it reads the total weight in gigabytes.",
    body: [
      bench(P, PLATE),
      weightSet(),
      scaleBody(),
      `<g data-part="pan" transform="${k.translateAlong(P, [0, 0, sink])}">${pan()}</g>`,
      ...bins,
      dialBase(),
      `<path data-part="needle" class="iso-line" data-tone="lit" data-free="" d="${needleAt(total)}" style="stroke-width:1.1"/>`,
    ],
  });
  return { svg, readout: readoutOf(total, 0) };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const panEl = svg.querySelector('[data-part="pan"]');
  const needle = svg.querySelector('[data-part="needle"]');
  const binEls = PARTS.map((_, i) => svg.querySelector(`[data-bin="${i}"]`));
  let step = 0;
  let touring = true;
  let clock = 0;
  let idle = 0;
  const weight = { at: totalOf(STEPS[0].keep), rate: 0 };
  // Each bin: its height in the stack (spring), and how far it has lifted away (0..1).
  const bins = PARTS.map((_, i) => ({ z: { at: stackZ(STEPS[0].keep, i), rate: 0 }, away: 1, gone: 0 }));
  bins.forEach((b) => (b.away = 0));
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      const next = Math.floor(clock / 3.2) % STEPS.length;
      if (next !== step) step = next;
    }
    const keep = STEPS[step].keep;
    let busy = !spring(weight, totalOf(keep), dt, 90, 13, calm);
    const sink = sinkOf(weight.at);
    bins.forEach((b, i) => {
      const target = keep[i] ? 0 : 1;
      const before = b.away;
      b.away = calm ? target : b.away + (target - b.away) * (1 - Math.exp(-dt / 0.35));
      if (Math.abs(target - b.away) < 5e-3) b.away = target;
      busy ||= b.away !== before;
      busy = !spring(b.z, stackZ(keep, i), dt, 260, 24, calm) || busy;
      const lift = b.away * 70;
      const slide = b.away * 120;
      binEls[i].setAttribute("transform", k.translateAlong(P, [slide, 0, b.z.at + sink + lift]));
      binEls[i].style.opacity = String(1 - b.away);
    });
    panEl.setAttribute("transform", k.translateAlong(P, [0, 0, sink]));
    needle.setAttribute("d", needleAt(weight.at));
    const text = readoutOf(weight.at, step);
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy;
  });
  const go = (to) => {
    touring = false;
    step = (to + STEPS.length) % STEPS.length;
    stage.setAttribute("aria-valuetext", `${STEPS[step].cmd}: ${totalOf(STEPS[step].keep).toFixed(1)} GB in target`);
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !loop.still.matches;
      clock = step * 3.2;
      loop.run();
    }, 3600);
    loop.run();
  };
  if (loop.still.matches) touring = false;
  stage.setAttribute("aria-valuemin", "0");
  stage.setAttribute("aria-valuemax", String(STEPS.length - 1));
  stage.addEventListener("click", () => go(step + 1));
  stage.addEventListener("keydown", (e) => {
    const to = { ArrowRight: step + 1, ArrowUp: step + 1, ArrowLeft: step - 1, ArrowDown: step - 1, Home: 0, End: STEPS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  });
  loop.run();
}
