// Fig: two ways to delete the same 20 files. The back lane is Explorer:
// each file is walked to the scanner, stamped, and moved into the Recycle
// Bin one at a time. The front lane is rd /s /q: the trapdoor opens and the
// whole tray goes at once.
import { k, bench, tools, liveLoop } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 380;

const FILES = 20;
const COLS = 5;
const PER_FILE = 0.62;
const TILE = 4.4;
const PITCH = 5.6;
const A_Y = -20;
const B_Y = 22;
const TRAY_X = -104;
const GATE_X = -24;
const BIN = { x: 50, y: A_Y - 12, w: 30, d: 24, r: 1.5 };
const B_X = -40;
const FLAPS = { x: B_X - 3, y: B_Y - 13, w: 34, d: 26 };
const PLATE = { x: -124, y: -44, w: 216, d: 90, r: 9 };
const CYCLE = FILES * PER_FILE + 3.2;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [GATE_X, A_Y - 12, 34]], WIDTH, HEIGHT, { pad: 28, azimuth: 46 });
const { at, S, L, D } = tools(P);

const slot = (i, y0, x0 = TRAY_X) => [x0 + 4 + (i % COLS) * PITCH, y0 - 8 + Math.floor(i / COLS) * PITCH];
const tile = (x, y, z) => S(k.slabOf({ x: x - TILE / 2, y: y - TILE / 2, w: TILE, d: TILE, r: 0.5 }, z, 1.4, P, 2), { tone: "hi", crease: "lo" });

function laneA() {
  const out = [];
  out.push(S(k.slabOf({ x: TRAY_X - 6, y: A_Y - 7, w: 190, d: 14, r: 1.2 }, 0, 2.4, P, 2, 0.4), { tone: "lo" }));
  out.push(L(k.lineOnTop([TRAY_X - 6, A_Y], [TRAY_X + 184, A_Y], 2.4, P), { tone: "faint" }));
  out.push(S(k.slabOf({ x: TRAY_X - 2, y: A_Y - 12, w: 32, d: 26, r: 1.4 }, 2.4, 2.4, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: GATE_X - 3, y: A_Y - 16, w: 6, d: 4, r: 0.8 }, 0, 30, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function gateFront() {
  return (
    S(k.slabOf({ x: GATE_X - 3, y: A_Y + 12, w: 6, d: 4, r: 0.8 }, 0, 30, P, 2, 0.3), { tone: "mid" }) +
    S(k.slabOf({ x: GATE_X - 4, y: A_Y - 17, w: 8, d: 34, r: 1 }, 30, 4, P, 2, 0.4), { tone: "mid" }) +
    D([at([GATE_X, A_Y - 14, 34]), at([GATE_X, A_Y + 14, 34])], { size: 0.45 })
  );
}
export const stampAt = (z) =>
  k.solidSvg(k.cylinder(GATE_X, A_Y, 1.4, z + 3, 30 - z - 3, P, 14), { tone: "mid", crease: "none" }) +
  k.solidSvg(k.slabOf({ x: GATE_X - 4, y: A_Y - 5, w: 8, d: 10, r: 1 }, z, 3, P, 2, 0.3), { tone: "hi", crease: "lo" });
function recycle(part) {
  const walls = part === "back"
    ? [{ x: BIN.x, y: BIN.y, w: 1.6, d: BIN.d }, { x: BIN.x, y: BIN.y, w: BIN.w, d: 1.6 }]
    : [{ x: BIN.x + BIN.w - 1.6, y: BIN.y, w: 1.6, d: BIN.d }, { x: BIN.x, y: BIN.y + BIN.d - 1.6, w: BIN.w, d: 1.6 }];
  const out = part === "back" ? [S(k.slabOf(BIN, 2.4, 1.4, P, 2), { tone: "lo" })] : [];
  walls.forEach((w) => out.push(S(k.slabOf({ ...w, r: 0.4 }, 3.8, 9, P, 2), { tone: "mid" })));
  return out.join("");
}
export const binFillAt = (n) => (n ? k.solidSvg(k.slabOf(k.insetPlan(BIN, 1.6), 3.8, 0.4 + n * 0.32, P, 2), { tone: "hi", crease: "lo" }) : "");
function laneB(part) {
  const out = [];
  if (part === "frame") {
    out.push(S(k.slabOf({ x: FLAPS.x - 4, y: FLAPS.y - 4, w: FLAPS.w + 8, d: FLAPS.d + 8, r: 1.6 }, 0, 6, P, 3, 0.5), { tone: "mid" }));
    out.push(L(k.planOutline({ x: FLAPS.x, y: FLAPS.y, w: FLAPS.w, d: FLAPS.d, r: 0.6 }, 6, P, 2), { tone: "lo" }));
    out.push(D(k.corners({ x: FLAPS.x - 4, y: FLAPS.y - 4, w: FLAPS.w + 8, d: FLAPS.d + 8, r: 0 }, 2).map(([x, y]) => at([x, y, 6])), { size: 0.4 }));
  }
  return out.join("");
}
const flap = (side) => S(k.slabOf({ x: side < 0 ? FLAPS.x : FLAPS.x + FLAPS.w / 2, y: FLAPS.y, w: FLAPS.w / 2, d: FLAPS.d, r: 0.4 }, 4.6, 1.4, P, 2), { tone: "mid", crease: "none" });

export const meta = {
  fig: "Fig 1",
  title: "Explorer vs rd /s /q",
  hint: "Hover to pause",
  control: "Two lanes deleting the same twenty files. Hover pauses.",
  keys: [
    { mark: "raised", label: "Back lane: Explorer, one file at a time through the scanner into the Recycle Bin" },
    { mark: "flat", label: "Front lane: rd /s /q, the whole tray at once" },
  ],
  caption:
    "The same twenty files, deleted two ways. Explorer enumerates each one, waits for the scan, and moves it to the Recycle Bin; rd /s /q unlinks them directly. The timings are illustrative: on a real node_modules there are tens of thousands of files, so the per-file cost is what you feel.",
};

export function figure() {
  const body = [bench(P, PLATE), laneA(), recycle("back"), `<g data-part="binfill"></g>`];
  for (let i = 0; i < FILES; i++) {
    const [x, y] = slot(i, A_Y);
    body.push(`<g data-a="${i}">${tile(x, y, 4.8)}</g>`);
  }
  body.push(`<g data-part="stamp">${stampAt(20)}</g>`, recycle("front"), gateFront());
  body.push(laneB("frame"), `<g data-part="flap-l">${flap(-1)}</g>`, `<g data-part="flap-r">${flap(1)}</g>`);
  body.push(`<g data-part="trayb">${Array.from({ length: FILES }, (_, i) => tile(...slot(i, B_Y, B_X), 6)).join("")}</g>`);
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Two lanes on a bench. In the back lane, file tiles move one at a time under a stamp into a recycle bin. In the front lane, a trapdoor opens and a whole tray of tiles drops at once.", body });
  return { svg, readout: `Explorer 0 of ${FILES} · rd waiting` };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const q = (s) => svg.querySelector(s);
  const tiles = Array.from({ length: FILES }, (_, i) => q(`[data-a="${i}"]`));
  const stamp = q('[data-part="stamp"]');
  const fill = q('[data-part="binfill"]');
  const flapL = q('[data-part="flap-l"]');
  const flapR = q('[data-part="flap-r"]');
  const trayB = q('[data-part="trayb"]');
  let t = 0;
  let paused = false;
  let lastDone = -1;
  const loop = liveLoop(stage, (dt, calm) => {
    if (!paused) t = (t + dt) % CYCLE;
    const now = calm ? FILES * PER_FILE + 0.5 : t;
    // Lane A: file i leaves the tray at i * PER_FILE.
    let done = 0;
    let stampZ = 20;
    tiles.forEach((el, i) => {
      const [sx, sy] = slot(i, A_Y);
      const age = now - i * PER_FILE;
      if (age < 0) {
        el.setAttribute("transform", "");
        el.style.opacity = "1";
        return;
      }
      const u = Math.min(1, age / PER_FILE);
      const toGate = Math.min(1, u / 0.35);
      const atGate = u >= 0.35 && u < 0.65;
      const toBin = Math.max(0, (u - 0.65) / 0.35);
      const gx = GATE_X - sx;
      const gy = A_Y - sy;
      const bx = BIN.x + BIN.w / 2 - sx;
      const x = toBin > 0 ? gx + (bx - gx) * toBin : gx * toGate;
      const y = toBin > 0 ? gy : gy * toGate;
      const z = toBin > 0 ? -1 * toBin + 0.5 : 0.5;
      el.setAttribute("transform", k.translateAlong(P, [x, y, z]));
      el.style.opacity = u >= 1 ? "0" : "1";
      if (atGate) stampZ = 20 - 13 * Math.sin(Math.PI * ((u - 0.35) / 0.3));
      if (u >= 1) done++;
    });
    stamp.innerHTML = stampAt(stampZ);
    if (done !== lastDone) {
      lastDone = done;
      fill.innerHTML = binFillAt(done);
    }
    // Lane B: the trapdoor opens at 0.8 s and the tray falls.
    const open = Math.max(0, Math.min(1, (now - 0.8) / 0.35));
    const fall = Math.max(0, Math.min(1, (now - 1.05) / 0.4));
    flapL.setAttribute("transform", k.translateAlong(P, [-open * 10, 0, 0]));
    flapR.setAttribute("transform", k.translateAlong(P, [open * 10, 0, 0]));
    trayB.setAttribute("transform", k.translateAlong(P, [0, 0, -fall * 14]));
    trayB.style.opacity = String(1 - fall);
    const text = `Explorer ${done} of ${FILES} · rd ${fall >= 1 ? "done" : open > 0 ? "deleting" : "waiting"}`;
    if (readout.textContent !== text) readout.textContent = text;
    return !calm;
  });
  stage.addEventListener("pointerenter", () => (paused = true));
  stage.addEventListener("pointerleave", () => ((paused = false), loop.run()));
  loop.run();
}
