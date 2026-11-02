// Parts shared by every Gigaflush figure: a bench to stand things on, its
// feet, groove, screws, label plate and ruler, plus small helpers. Built on
// the Anatomy kit (kit/iso-kit.mjs, MIT).
import * as k from "./kit/iso-kit.mjs";

export { k };

export const byDepth = (P, items, at = (it) => it) =>
  [...items].sort((a, b) => k.depthOf(at(a), P) - k.depthOf(at(b), P));

export function tools(P) {
  const at = (point) => k.iso(point, P);
  return {
    at,
    S: (paths, style) => k.solidSvg(paths, style),
    L: (d, style) => k.lineSvg(d, style),
    D: (points, style) => k.dotsSvg(points, style),
    pts: (points) => points.map(at),
  };
}

// A bench plate on four feet with a groove, corner screws, a ruler strip
// along its front edge and a label plate with three rule lines.
export function bench(P, plate, { height = 10, foot = 5, ruler = true, label = true } = {}) {
  const { S, L, D, at } = tools(P);
  const out = [`<path class="iso-halo" d="${k.haloOf(plate, -height - foot, height, P)}"/>`];
  for (const [x, y] of byDepth(P, k.corners(plate, 18), ([x, y]) => [x, y, 0])) {
    out.push(S(k.cylinder(x, y, 6, -height - foot, 1.4, P, 24), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 4.6, -height - foot + 1.4, foot - 1.4, P, 24), { tone: "mid" }));
  }
  out.push(S(k.slabOf(plate, -height, height, P, 8, 1.4), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 5), 0, P), { tone: "faint" }));
  const screws = k.corners(plate, 9);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  if (ruler) {
    const strip = { x: plate.x + 16, y: plate.y + plate.d - 13, w: plate.w * 0.46, d: 6, r: 1 };
    out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
    const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 4, 5, strip.y, 0.6, [1.6, 2.6], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(D([at([strip.x + 1.6, strip.y + 3, 0.6]), at([strip.x + strip.w - 1.6, strip.y + 3, 0.6])], { size: 0.4 }));
  }
  if (label) {
    const plan = { x: plate.x + plate.w - 62, y: plate.y + plate.d - 15, w: 44, d: 9, r: 1.2 };
    out.push(S(k.slabOf(plan, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
    out.push(L(k.planOutline(k.insetPlan(plan, 1.4), 0.8, P, 3), { tone: "faint" }));
    [[6, 30], [6, 22], [6, 14]].forEach(([x0, len], i) => {
      out.push(L(k.lineOnTop([plan.x + x0, plan.y + 2.6 + i * 1.9], [plan.x + x0 + len, plan.y + 2.6 + i * 1.9], 0.8, P), { tone: "lo", free: true }));
    });
    out.push(D([at([plan.x + 2.6, plan.y + 4.5, 0.8]), at([plan.x + plan.w - 2.6, plan.y + 4.5, 0.8])], { size: 0.4 }));
  }
  return out.join("");
}

// A knurled knob standing on a face, with a pointer line on top.
export function knob(P, x, y, z, r = 5, h = 4) {
  const { S, L } = tools(P);
  return (
    S(k.cylinder(x, y, r, z, h, P, 28), { tone: "mid" }) +
    L(k.knurl(x, y, r, z, z + h, 30, P), { tone: "lo" }) +
    L(k.lineOnTop([x - r * 0.4, y], [x + r * 0.75, y], z + h, P), { tone: "hi" })
  );
}

// Shared live-loop plumbing: visibility, reduced motion and an idle tour that
// pauses on input and resumes after a quiet spell.
export function liveLoop(stage, tick) {
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = 0;
  let visible = false;
  const loop = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
    last = now;
    const keep = tick(dt, still.matches);
    frame = visible && keep ? requestAnimationFrame(loop) : 0;
  };
  const run = () => {
    if (!frame && visible) {
      last = 0;
      frame = requestAnimationFrame(loop);
    }
  };
  new IntersectionObserver(
    (entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) run();
    },
    { rootMargin: "120px 0px" },
  ).observe(stage);
  return { run, still };
}

export const follow = (x, target, dt, tau, calm) => {
  if (calm) return target;
  const next = x + (target - x) * (1 - Math.exp(-dt / tau));
  return Math.abs(target - next) < 5e-4 ? target : next;
};

export function spring(state, target, dt, stiff, drag, calm) {
  if (calm) {
    state.at = target;
    state.rate = 0;
    return true;
  }
  const n = Math.max(1, Math.ceil(dt * 240));
  for (let i = 0; i < n; i++) {
    state.rate += ((target - state.at) * stiff - state.rate * drag) * (dt / n);
    state.at += state.rate * (dt / n);
  }
  if (Math.abs(target - state.at) < 5e-4 && Math.abs(state.rate) < 5e-4) {
    state.at = target;
    state.rate = 0;
    return true;
  }
  return false;
}
