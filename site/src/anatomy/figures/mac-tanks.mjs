// Fig: five tanks on a bench, one per kind of developer storage on a Mac.
// Each has a glass sight gauge; opening its valve drains it to what the
// cleanup command leaves behind.
import { k, bench, tools, byDepth, liveLoop, follow } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 390;

// An example developer Mac, GB: before, and after the usual command.
export const TANKS = [
  { name: "Xcode DerivedData", gb: 18, after: 0, cmd: "rm -rf DerivedData/*" },
  { name: "Simulators", gb: 12, after: 3, cmd: "xcrun simctl delete unavailable" },
  { name: "Docker", gb: 26, after: 6, cmd: "docker system prune" },
  { name: "Homebrew", gb: 4, after: 1, cmd: "brew cleanup --prune=all" },
  { name: "Project folders", gb: 31, after: 2, cmd: "Gigaflush" },
];
const CAP = 34;
const R = 14;
const TANK_H = 66;
const BASE_Z = 4;
const XS = [-100, -52, -4, 44, 92];
const PLATE = { x: -130, y: -42, w: 260, d: 84, r: 9 };
const GAUGE = (x) => [x + 10.5, 10.5];

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [XS[0], 0, BASE_Z + TANK_H + 8], [XS[4], 0, BASE_Z + TANK_H + 8]], WIDTH, HEIGHT, { pad: 28, azimuth: 44 });
const { at, S, L, D } = tools(P);
const levelZ = (gb) => BASE_Z + 3 + (gb / CAP) * (TANK_H - 8);

function tank(i) {
  const x = XS[i];
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - R, y: -R, w: 2 * R, d: 2 * R, r: R }, 0, 4, P)}"/>`];
  out.push(S(k.cylinder(x, 0, R + 3, 0, BASE_Z, P, 56, 0.6), { tone: "lo" }));
  out.push(D([0, 1, 2, 3, 4, 5].map((j) => at([x + (R + 1.5) * Math.cos(j * 1.05 + 0.3), (R + 1.5) * Math.sin(j * 1.05 + 0.3), BASE_Z])), { size: 0.4 }));
  out.push(S(k.cylinder(x, 0, R, BASE_Z, TANK_H, P, 56), { tone: "mid", crease: "none", inner: k.lineSvg([18, 44].map((z) => k.sideArc(x, 0, R, BASE_Z + z, P, 40)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, 0, R + 1, BASE_Z + TANK_H, 3, P, 56, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(x, 0, 5, BASE_Z + TANK_H + 3, 3, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(x, 0, 5, BASE_Z + TANK_H + 3, BASE_Z + TANK_H + 6, 24, P), { tone: "lo" }));
  return out.join("");
}
// Sight gauge: a glass tube between two blocks, with the fluid inside it.
function gaugeFrame(i, part) {
  const [gx, gy] = GAUGE(XS[i]);
  const out = [];
  if (part === "low") {
    out.push(S(k.slabOf({ x: gx - 3, y: gy - 3, w: 6, d: 6, r: 1 }, BASE_Z, 4, P, 2, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(gx, gy, 2.2, BASE_Z + 4, TANK_H - 8, P, 18), { tone: "lo", crease: "none" }));
  } else {
    out.push(S(k.slabOf({ x: gx - 3, y: gy - 3, w: 6, d: 6, r: 1 }, BASE_Z + TANK_H - 4, 4, P, 2, 0.3), { tone: "mid" }));
    out.push(D([at([gx, gy + 3, BASE_Z + TANK_H - 2])], { size: 0.4 }));
  }
  return out.join("");
}
export const fluidAt = (i, gb) => {
  const [gx, gy] = GAUGE(XS[i]);
  const top = levelZ(gb);
  const h = Math.max(0.05, top - (BASE_Z + 4));
  return k.solidSvg(k.cylinder(gx, gy, 1.5, BASE_Z + 4, h, P, 16), { tone: "hi", crease: "none", lit: true });
};
function valve(i) {
  const x = XS[i];
  const [vx, vy] = [x - 4, R + 1];
  const out = [];
  out.push(S(k.slabOf({ x: vx - 2.5, y: vy - 2, w: 5, d: 6, r: 1 }, BASE_Z + 2, 5, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(vx, vy + 2, 3, BASE_Z + 7, 2.4, P, 20), { tone: "hi", crease: "lo" }));
  out.push(L(k.lineOnTop([vx - 2.4, vy + 2], [vx + 2.4, vy + 2], BASE_Z + 9.4, P), { tone: "mid" }));
  return out.join("");
}

export const meta = {
  fig: "Fig 1",
  title: "Where a Mac's space goes",
  hint: "Click a tank or ← → to drain it",
  control: "Five storage tanks with sight gauges. Arrow keys choose a tank; Enter drains or refills it.",
  keys: [
    { mark: "lit", label: "Sight gauge: what each category holds" },
    { mark: "raised", label: "Tanks, left to right: DerivedData, simulators, Docker, Homebrew, project folders" },
  ],
  caption:
    "An example developer Mac. Each tank drains to what its usual cleanup leaves: DerivedData to nothing, simulators to the runtimes you use, Docker to images you keep, Homebrew to current versions, and project folders to the ones you are working on.",
};

export function figure() {
  const order = byDepth(P, XS.map((x, i) => ({ x, i })), ({ x }) => [x, 0, 0]);
  const body = [bench(P, PLATE)];
  order.forEach(({ i }) => {
    body.push(tank(i), valve(i), gaugeFrame(i, "low"), `<g data-fluid="${i}">${fluidAt(i, TANKS[i].gb)}</g>`, gaugeFrame(i, "high"));
  });
  const svg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "Five tanks with glass sight gauges, for Xcode DerivedData, simulators, Docker, Homebrew and project folders. Each drains to what its cleanup command leaves.", body });
  const total = TANKS.reduce((n, t) => n + t.gb, 0);
  return { svg, readout: `${total} GB in developer storage` };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const fluids = TANKS.map((_, i) => svg.querySelector(`[data-fluid="${i}"]`));
  const level = TANKS.map((t) => t.gb);
  const drained = TANKS.map(() => false);
  let pick = 0;
  let touring = true;
  let clock = 0;
  let idle = 0;
  const say = () => {
    const t = TANKS[pick];
    const total = level.reduce((a, b) => a + b, 0);
    const before = TANKS.reduce((n, x) => n + x.gb, 0);
    return `${t.name} · ${Math.round(level[pick])} GB · freed ${Math.round(before - total)} GB`;
  };
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      const c = clock % 15;
      const n = Math.min(TANKS.length, Math.floor(c / 2.2));
      TANKS.forEach((_, i) => (drained[i] = i < n && c < 13));
      pick = Math.min(TANKS.length - 1, Math.max(0, n - 1));
    }
    let busy = false;
    TANKS.forEach((t, i) => {
      const before = level[i];
      level[i] = follow(level[i], drained[i] ? t.after : t.gb, dt, drained[i] ? 0.7 : 0.4, calm);
      if (level[i] !== before) {
        busy = true;
        fluids[i].innerHTML = fluidAt(i, level[i]);
      }
    });
    const text = say();
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy;
  });
  const act = (i, toggle = true) => {
    touring = false;
    pick = i;
    if (toggle) drained[i] = !drained[i];
    stage.setAttribute("aria-valuetext", `${TANKS[i].name}: ${drained[i] ? `${TANKS[i].cmd} leaves ${TANKS[i].after} GB` : `${TANKS[i].gb} GB`}`);
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !loop.still.matches;
      clock = 0;
      loop.run();
    }, 4200);
    loop.run();
  };
  if (loop.still.matches) touring = false;
  stage.addEventListener("click", (e) => {
    const box = svg.getBoundingClientRect();
    const sx = ((e.clientX - box.left) / box.width) * WIDTH;
    let best = 0;
    XS.forEach((x, i) => {
      if (Math.abs(k.iso([x, 0, 40], P)[0] - sx) < Math.abs(k.iso([XS[best], 0, 40], P)[0] - sx)) best = i;
    });
    act(best);
  });
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      act((pick + (e.key === "ArrowRight" ? 1 : TANKS.length - 1)) % TANKS.length, false);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      act(pick);
    }
  });
  loop.run();
}
