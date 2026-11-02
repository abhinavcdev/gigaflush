// Fig: a patch panel of localhost ports. Every dev server is a plug in a
// jack; a cable runs back to whatever is using it. Plugs with no cable are
// idle servers nobody is talking to, and those are the ones that get pulled.
import { k, bench, tools, byDepth, liveLoop, spring } from "../parts.mjs";

const WIDTH = 600;
const HEIGHT = 380;

// The model: one entry per jack. `mb` is memory the server holds.
export const JACKS = [
  { port: 3000, server: "next dev", idle: true, mb: 312 },
  { port: 4321, server: "astro dev", idle: false, mb: 140 },
  { port: 5173, server: "vite", idle: false, mb: 210 },
  { port: 8000, server: "runserver", idle: true, mb: 64 },
  { port: 8787, server: "wrangler", idle: false, mb: 90 },
  { port: 9229, server: null },
];

const PLATE = { x: -132, y: -62, w: 264, d: 124, r: 9 };
const PANEL = { x: -112, y: -6, w: 224, d: 30, r: 3 };
const PANEL_H = 16;
const SCREEN = { x: -66, y: -48, w: 132, d: 12, r: 2 };
const SCREEN_H = 30;
const PITCH = PANEL.w / JACKS.length;
const JACK_Y = PANEL.y + 11;
const PLUG = { r: 4.2, stem: 10, cap: 5, capR: 5.4 };
const LIFT = 34;

const jackX = (i) => PANEL.x + PITCH * (i + 0.5);
const plugTop = PANEL_H + PLUG.stem + PLUG.cap;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -15, 0), [SCREEN.x, SCREEN.y, SCREEN_H + 4], [PANEL.x, JACK_Y, plugTop + LIFT], [PANEL.x + PANEL.w, JACK_Y, plugTop + LIFT]],
  WIDTH,
  HEIGHT,
  { pad: 28, azimuth: 40 },
);
const { at, S, L, D } = tools(P);

function screen() {
  const face = { ...SCREEN };
  const out = [S(k.slabOf(face, 0, SCREEN_H, P, 3, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(face, SCREEN_H - 3, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(face, 2.4), SCREEN_H, P, 2), { tone: "faint" }));
  // A tab strip printed along the top: the browser on the other end.
  const tabs = [0, 1, 2].map((i) => SCREEN.x + 10 + i * 26);
  out.push(D(tabs.map((x) => at([x, SCREEN.y + SCREEN.d / 2, SCREEN_H])), { size: 0.9, tone: "lo" }));
  return out.join("");
}

function panel() {
  const out = [S(k.slabOf(PANEL, 0, PANEL_H, P, 3, 0.8), { tone: "mid", inner: k.lineSvg(k.sideSeam(PANEL, PANEL_H - 3, P, 3), { tone: "faint" }) })];
  out.push(L(k.planOutline(k.insetPlan(PANEL, 2.6), PANEL_H, P, 2), { tone: "faint" }));
  JACKS.forEach((jack, i) => {
    const x = jackX(i);
    out.push(L(k.ring(x, JACK_Y, PLUG.capR + 0.8, PANEL_H, P, 28), { tone: "lo" }));
    out.push(L(k.ring(x, JACK_Y, PLUG.r - 1.4, PANEL_H, P, 20), { tone: "faint" }));
    out.push(k.faceTextSvg(k.topMatrix([x - 7.4, PANEL.y + PANEL.d - 4], PANEL_H, P), String(jack.port), { size: 4.4, tone: "lo" }));
  });
  out.push(D(k.corners(PANEL, 3.4).map(([x, y]) => at([x, y, PANEL_H])), { size: 0.5 }));
  return out.join("");
}

function plug(i) {
  const x = jackX(i);
  return (
    S(k.cylinder(x, JACK_Y, PLUG.r, PANEL_H, PLUG.stem, P, 28), { tone: "mid" }) +
    S(k.cylinder(x, JACK_Y, PLUG.capR, PANEL_H + PLUG.stem, PLUG.cap, P, 28, 0.6), {
      tone: "hi",
      inner: k.lineSvg(k.knurl(x, JACK_Y, PLUG.capR, PANEL_H + PLUG.stem + 0.8, plugTop - 0.8, 22, P), { tone: "faint" }),
    })
  );
}

// A cable from the top of a live plug back over the panel to the screen.
function cable(i) {
  const x = jackX(i);
  const tx = SCREEN.x + 18 + (i / (JACKS.length - 1)) * (SCREEN.w - 36);
  const from = at([x, JACK_Y, plugTop]);
  const to = at([tx, SCREEN.y + SCREEN.d, SCREEN_H - 6]);
  const via = [at([x, JACK_Y - 6, plugTop + 10]), at([tx, SCREEN.y + SCREEN.d + 8, SCREEN_H + 4])];
  return k.wireSvg(from, to, { via, tone: "lo", size: 1 });
}

const plugged = JACKS.map((j, i) => ({ ...j, i })).filter((j) => j.server);
const idle = plugged.filter((j) => j.idle);

export const meta = {
  fig: "Fig 1",
  title: "Ports nobody is using",
  hint: "Click or space to flush / restart",
  control: "Patch panel of dev server ports. Space or click flushes or restarts the idle servers.",
  keys: [
    { mark: "raised", label: "A dev server holding a port" },
    { mark: "edge", label: "A cable: a browser tab or client connected right now" },
    { mark: "lit", label: "No cable, hours old: an idle server, safe to stop" },
  ],
  caption:
    "Five dev servers on a typical evening. Three have something connected; two were left behind by a closed terminal or an agent and hold their ports and memory until someone notices. Gigaflush only suggests the ones with no connection.",
};

const readoutOf = (out) => {
  const left = plugged.filter((j) => !(j.idle && out));
  const ghosts = left.filter((j) => j.idle);
  const held = idle.reduce((sum, j) => sum + j.mb, 0);
  return `${left.length} listening · ${ghosts.length} idle · ${held} MB ${out ? "freed" : "held"}`;
};

export function figure() {
  const body = [bench(P, PLATE), screen(), panel()];
  const order = byDepth(P, plugged, (j) => [jackX(j.i), JACK_Y, PANEL_H]);
  for (const j of order) body.push(`<g data-plug="${j.i}"${j.idle ? ' data-idle=""' : ""}>${plug(j.i)}</g>`);
  for (const j of plugged.filter((j) => !j.idle)) body.push(cable(j.i));
  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "A patch panel on a bench with six labelled jacks: 3000, 4321, 5173, 8000, 8787 and 9229. Five hold plugs. Cables run from the plugs on 4321, 5173 and 8787 back to a screen; the plugs on 3000 and 8000 have no cable. Jack 9229 is empty.",
    body,
  });
  return { svg, readout: readoutOf(false) };
}

export function mount(stage, readout) {
  const svg = stage.querySelector("svg");
  const plugs = idle.map((j) => ({ j, el: svg.querySelector(`[data-plug="${j.i}"]`), lift: { at: 0, rate: 0 } }));
  let out = false;
  let touring = true;
  let clock = 0;
  let since = 99;
  let timer = 0;
  const delayOf = (n) => n * 0.6;
  const loop = liveLoop(stage, (dt, calm) => {
    if (touring) {
      clock += dt;
      const phase = clock % 9;
      const want = phase > 1.4 && phase < 6.6;
      if (want !== out) ((out = want), (since = 0));
    }
    since += dt;
    let busy = false;
    plugs.forEach((p, n) => {
      const target = out && since >= delayOf(n) ? LIFT : 0;
      busy = !spring(p.lift, target, dt, out ? 140 : 210, out ? 15 : 17, calm) || busy;
      p.el.setAttribute("transform", k.translateAlong(P, [0, 0, p.lift.at]));
      p.el.style.opacity = String(Math.max(0, 1 - Math.max(0, p.lift.at - 8) / (LIFT - 8)));
      const lit = p.lift.at > 0.5 && p.lift.at < LIFT - 0.5;
      p.el.querySelectorAll(".iso-solid").forEach((s) => (lit ? s.setAttribute("data-lit", "") : s.removeAttribute("data-lit")));
    });
    const settled = plugs.every((p) => p.lift.at === (out ? LIFT : 0));
    const text = readoutOf(out && settled);
    if (readout.textContent !== text) readout.textContent = text;
    return touring || busy;
  });
  const toggle = () => {
    touring = false;
    out = !out;
    since = 0;
    stage.setAttribute("aria-valuetext", out ? `Flushed: ${idle.length} idle servers stopped` : "Restarted: idle servers back on their ports");
    clearTimeout(timer);
    timer = setTimeout(() => {
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
