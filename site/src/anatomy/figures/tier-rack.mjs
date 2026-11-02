// Fig: a tiered rack. One npm install drops your one dependency on the top
// tier, then each tier below fills with more, smaller transitive packages.
import { k, bench, tools, byDepth, liveLoop, spring } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 380;

// Illustrative tree: depth 0 is what you asked for. Sizes in MB per crate.
export const TIERS = [
  { label: "you asked for", cols: 1, rows: 1, size: 22, mb: 14 },
  { label: "its dependencies", cols: 1, rows: 4, size: 13, mb: 9 },
  { label: "theirs", cols: 2, rows: 5, size: 10, mb: 4 },
  { label: "and theirs", cols: 3, rows: 6, size: 7.6, mb: 1.5 },
];
const STEP_W = 42;
const STEP_Z = 13;
const Y0 = -38;
const DEPTH = 76;
const X0 = -96;
const PLATE = { x: -128, y: -58, w: 256, d: 116, r: 9 };

const steps = TIERS.map((t, i) => ({ x: X0 + i * STEP_W, top: (TIERS.length - i) * STEP_Z }));
const crates = TIERS.flatMap((t, i) => {
  const s = steps[i];
  const out = [];
  const gx = STEP_W / t.cols;
  const gy = DEPTH / t.rows;
  for (let c = 0; c < t.cols; c++)
    for (let r = 0; r < t.rows; r++) out.push({ tier: i, x: s.x + gx * (c + 0.5), y: Y0 + gy * (r + 0.5), z: s.top, size: t.size, mb: t.mb });
  return out;
});
const HEIGHT_OF = (c) => c.size * 0.8;

const P = k.fitProjection([...k.boxCorners(PLATE, -15, 0), [X0, Y0, steps[0].top + 40], [X0 + STEP_W, Y0 + DEPTH, steps[0].top + 30]], WIDTH, HEIGHT, { pad: 28, azimuth: 40 });
const { at, S, L, D } = tools(P);

function step(i) {
  const s = steps[i];
  const plan = { x: s.x, y: Y0, w: STEP_W, d: DEPTH, r: 1.6 };
  const out = [S(k.slabOf(plan, 0, s.top, P, 3, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(plan, s.top - 2.6, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(plan, 2.6), s.top, P, 2), { tone: "faint" }));
  out.push(D([at([s.x + 2.4, Y0 + 2.4, s.top]), at([s.x + STEP_W - 2.4, Y0 + 2.4, s.top]), at([s.x + STEP_W - 2.4, Y0 + DEPTH - 2.4, s.top])], { size: 0.4 }));
  return out.join("");
}
function crate(c) {
  const h = HEIGHT_OF(c);
  const plan = { x: c.x - c.size / 2 + 0.6, y: c.y - c.size / 2 + 0.6, w: c.size - 1.2, d: c.size - 1.2, r: 0.8 };
  return (
    S(k.slabOf(plan, c.z, h, P, 2, 0.4), { tone: "hi", crease: "lo", inner: c.size > 9 ? k.lineSvg(k.sideSeam(plan, c.z + h - 1.8, P, 2), { tone: "faint" }) : "" }) +
    (c.size > 9 ? L(k.planOutline(k.insetPlan(plan, 1.4), c.z + h, P, 2), { tone: "faint" }) : "")
  );
}
export const meta = {
  fig: "Fig 1",
  title: "One install, four tiers",
  hint: "Click or space to install / remove",
  control: "Tiered rack showing transitive dependencies. Space or click installs or removes.",
  keys: [
    { mark: "raised", label: "Each crate is one package; smaller tiers are deeper in the tree" },
    { mark: "lit", label: "The package you asked for" },
  ],
  caption:
    "An illustrative tree: one package you asked for, four it depends on, ten they depend on, eighteen below that. A real framework install runs to hundreds of packages, which is why node_modules holds so many small files.",
};
const totals = (n) => {
  const list = crates.slice(0, n);
  return { count: list.length, mb: list.reduce((a, c) => a + c.mb, 0) };
};
const readoutOf = (n) => {
  const { count, mb } = totals(n);
  return count ? `${count} package${count === 1 ? "" : "s"} · ${mb.toFixed(0)} MB` : "node_modules is empty";
};

export function figure() {
  const order = byDepth(P, crates.map((c, i) => ({ c, i })), ({ c }) => [c.x, c.y, c.z]);
  const body = [bench(P, PLATE)];
  steps.forEach((_, i) => {
    body.push(step(i));
    order.filter(({ c }) => c.tier === i).forEach(({ c, i: j }) => body.push(`<g data-crate="${j}"${c.tier === 0 ? ' data-lit=""' : ""}>${crate(c)}</g>`));
  });
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label: "A four-tier stepped rack. The top tier holds one crate, then four, ten and eighteen progressively smaller crates on the tiers below: one installed package and its transitive dependencies.",
    body,
  });
  return { svg: svg.replace('<g data-crate="0" data-lit="">', '<g data-crate="0" data-lit="" class="lit-crate">'), readout: readoutOf(crates.length) };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const els = crates.map((_, i) => svg.querySelector(`[data-crate="${i}"]`));
  const lit = els[0].querySelector(".iso-solid");
  if (lit) lit.setAttribute("data-lit", "");
  const drop = crates.map(() => ({ at: 60, rate: 0 }));
  let installed = false;
  let touring = true;
  let clock = 0;
  let idle = 0;
  let since = 99;
  const delayOf = (i) => crates[i].tier * 0.55 + (i % 18) * 0.04;
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      const phase = clock % 9.4;
      const want = phase > 0.5 && phase < 6.9;
      if (want !== installed) ((installed = want), (since = 0));
    }
    since += dt;
    let busy = false;
    let landed = 0;
    crates.forEach((c, i) => {
      const go = installed ? since >= delayOf(i) : true;
      const target = installed ? (go ? 0 : 60) : 60;
      busy = !spring(drop[i], target, dt, installed ? 180 : 120, installed ? 13 : 20, calm) || busy;
      els[i].setAttribute("transform", k.translateAlong(P, [0, 0, drop[i].at]));
      els[i].style.opacity = String(Math.max(0, 1 - drop[i].at / 60));
      if (drop[i].at < 1) landed = i + 1;
    });
    const n = installed ? crates.filter((_, i) => drop[i].at < 1).length : crates.filter((_, i) => drop[i].at < 1).length;
    const text = readoutOf(n);
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy || landed < 0;
  });
  const toggle = () => {
    touring = false;
    installed = !installed;
    since = 0;
    stage.setAttribute("aria-valuetext", installed ? `Installed: ${crates.length} packages` : "Removed: node_modules is empty");
    clearTimeout(idle);
    idle = setTimeout(() => {
      touring = !loop.still.matches;
      loop.run();
    }, 3600);
    loop.run();
  };
  if (loop.still.matches) touring = false;
  stage.addEventListener("click", toggle);
  stage.addEventListener("keydown", (e) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    toggle();
  });
  loop.run();
}
