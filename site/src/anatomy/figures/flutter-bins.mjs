// Fig: four platform bins. Each flutter build stacks output plates in its
// platform's bin (one plate per 100 MB); flutter clean empties them all,
// along with the .dart_tool tray.
import { k, bench, tools, liveLoop, follow } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 370;

// An example app's build output, MB.
export const BINS = [
  { name: "android", mb: 640 },
  { name: "ios", mb: 900 },
  { name: "web", mb: 140 },
  { name: "macos", mb: 420 },
];
const DART_TOOL_MB = 128;
const STEPS = [
  { cmd: "flutter pub get", built: [0, 0, 0, 0], tool: 1 },
  { cmd: "flutter build apk", built: [1, 0, 0, 0], tool: 1 },
  { cmd: "flutter build ios", built: [1, 1, 0, 0], tool: 1 },
  { cmd: "flutter build web", built: [1, 1, 1, 0], tool: 1 },
  { cmd: "flutter build macos", built: [1, 1, 1, 1], tool: 1 },
  { cmd: "flutter clean", built: [0, 0, 0, 0], tool: 0 },
];
const PLATE_H = 2.2;
const platesOf = (mb) => Math.max(1, Math.round(mb / 100));

const W = 34;
const D = 38;
const BACK_H = 26;
const FRONT_H = 11;
const WALL = 1.6;
const XS = [-94, -52, -10, 32];
const Y0 = -26;
const TRAY = { x: 72, y: -14, w: 34, d: 28, r: 2 };
const PLATE = { x: -122, y: -50, w: 244, d: 100, r: 9 };

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [XS[0], Y0, BACK_H + 4]], WIDTH, HEIGHT, { pad: 28, azimuth: 42 });
const { at, S, L, D: Dots } = tools(P);

function binBack(i) {
  const x = XS[i];
  const plan = { x, y: Y0, w: W, d: D, r: 2 };
  const out = [`<path class="iso-halo" d="${k.haloOf(plan, 0, 2, P)}"/>`];
  out.push(S(k.slabOf(plan, 0, 2.4, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x, y: Y0, w: WALL, d: D, r: 0.5 }, 2.4, BACK_H, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x, y: Y0, w: W, d: WALL, r: 0.5 }, 2.4, BACK_H, P, 2, 0.3), { tone: "mid" }));
  out.push(Dots([at([x + 4, Y0 + WALL, BACK_H + 2.4 - 3]), at([x + W - 4, Y0 + WALL, BACK_H + 2.4 - 3])], { size: 0.4 }));
  return out.join("");
}
function binFront(i) {
  const x = XS[i];
  const out = [];
  const right = { x: x + W - WALL, y: Y0, w: WALL, d: D, r: 0.5 };
  const front = { x, y: Y0 + D - WALL, w: W, d: WALL, r: 0.5 };
  out.push(S(k.slabOf(right, 2.4, FRONT_H, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf(front, 2.4, FRONT_H, P, 2, 0.3), { tone: "mid" }));
  // A label holder on the front wall.
  const holder = { x: x + 8, y: Y0 + D, w: 18, d: 0.8, r: 0.3 };
  out.push(S(k.slabOf(holder, 4.4, 5, P, 2), { tone: "lo", crease: "none" }));
  out.push(Dots([at([x + 6.6, Y0 + D, 6.9]), at([x + W - 6.6, Y0 + D, 6.9])], { size: 0.35 }));
  return out.join("");
}
const plateAt = (i, j) => {
  const x = XS[i];
  const plan = { x: x + WALL + 1.6, y: Y0 + WALL + 1.6, w: W - 2 * WALL - 3.2, d: D - 2 * WALL - 3.2, r: 1 };
  const z = 2.4 + j * (PLATE_H + 0.3);
  return S(k.slabOf(plan, z, PLATE_H, P, 2, 0.3), { tone: "hi", crease: "lo" });
};

function trayBase() {
  const out = [S(k.slabOf(TRAY, 0, 3, P, 3, 0.5), { tone: "mid" })];
  out.push(L(k.planOutline(k.insetPlan(TRAY, 2.4), 3, P, 2), { tone: "faint" }));
  return out.join("");
}
const toolBlocks = () => {
  const out = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const plan = { x: TRAY.x + 4 + c * 9.4, y: TRAY.y + 4 + r * 10.4, w: 7.6, d: 8.4, r: 0.8 };
      out.push(S(k.slabOf(plan, 3, 4, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    }
  return out.join("");
};

export const meta = {
  fig: "Fig 1",
  title: "build/ and .dart_tool/",
  hint: "Click or ← → to run the next command",
  control: "Flutter build bins. Arrow keys or click run the next flutter command.",
  keys: [
    { mark: "raised", label: "One plate per 100 MB of build output" },
    { mark: "flat", label: ".dart_tool tray, filled by pub get" },
  ],
  caption:
    "An example app's build/ directory, one bin per platform: 640 MB for Android, 900 MB for iOS, 140 MB for web and 420 MB for macOS, plus 128 MB of .dart_tool. flutter clean empties every bin and the tray; flutter pub get brings .dart_tool back.",
};
const sizeOf = (step) => BINS.reduce((n, b, i) => n + (step.built[i] ? b.mb : 0), 0);
const fmt = (mb) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${mb} MB`);
const readoutOf = (s) => `${STEPS[s].cmd} · build/ ${fmt(sizeOf(STEPS[s]))} · .dart_tool ${STEPS[s].tool ? DART_TOOL_MB + " MB" : "0 MB"}`;

export function figure() {
  const body = [bench(P, PLATE)];
  BINS.forEach((b, i) => {
    body.push(binBack(i));
    const n = platesOf(b.mb);
    for (let j = 0; j < n; j++) body.push(`<g data-plate="${i}-${j}">${plateAt(i, j)}</g>`);
    body.push(binFront(i));
  });
  body.push(trayBase(), `<g data-part="tool">${toolBlocks()}</g>`);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Four bins for a Flutter app's build output, one per platform, filled with plates in proportion to size, and a tray for .dart_tool.", body });
  return { svg, readout: readoutOf(4) };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const plates = BINS.map((b, i) => Array.from({ length: platesOf(b.mb) }, (_, j) => svg.querySelector(`[data-plate="${i}-${j}"]`)));
  const tool = svg.querySelector('[data-part="tool"]');
  const fill = BINS.map(() => 0);
  let toolFill = 0;
  let step = 0;
  let touring = true;
  let clock = 0;
  let idle = 0;
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      step = Math.floor(clock / 2.4) % STEPS.length;
    }
    const s = STEPS[step];
    let busy = false;
    BINS.forEach((b, i) => {
      const before = fill[i];
      fill[i] = follow(fill[i], s.built[i], dt, s.built[i] ? 0.5 : 0.25, calm);
      busy ||= fill[i] !== before;
      const n = plates[i].length;
      plates[i].forEach((el, j) => {
        const share = Math.max(0, Math.min(1, fill[i] * n - j));
        el.style.opacity = String(share);
        el.setAttribute("transform", k.translateAlong(P, [0, 0, (1 - share) * (s.built[i] ? 14 : -4)]));
      });
    });
    const t0 = toolFill;
    toolFill = follow(toolFill, s.tool, dt, 0.3, calm);
    busy ||= toolFill !== t0;
    tool.style.opacity = String(toolFill);
    tool.setAttribute("transform", k.translateAlong(P, [0, 0, (1 - toolFill) * -3]));
    const text = readoutOf(step);
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy;
  });
  const go = (to) => {
    touring = false;
    step = (to + STEPS.length) % STEPS.length;
    stage.setAttribute("aria-valuetext", readoutOf(step));
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !loop.still.matches;
      clock = step * 2.4;
      loop.run();
    }, 3600);
    loop.run();
  };
  if (loop.still.matches) ((touring = false), (step = 4));
  stage.addEventListener("click", () => go(step + 1));
  stage.addEventListener("keydown", (e) => {
    const to = { ArrowRight: step + 1, ArrowLeft: step - 1, Home: 0, End: STEPS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    go(to);
  });
  loop.run();
}
