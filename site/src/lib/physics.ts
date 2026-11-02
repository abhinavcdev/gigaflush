// Spring physics for the site's micro-interactions. Everything here is
// progressive: with reduced motion (or no fine pointer for hover effects)
// elements simply stay put.
import { animate } from "motion";

const reduce = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(pointer: fine)").matches;

export const SPRING = { type: "spring", stiffness: 380, damping: 26, mass: 0.8 } as const;
export const SOFT = { type: "spring", stiffness: 170, damping: 18 } as const;
export const BOUNCY = { type: "spring", stiffness: 260, damping: 12 } as const;

/** Squash on press, spring back on release. */
function pressable(el: HTMLElement) {
  el.addEventListener("pointerdown", () => animate(el, { scale: 0.95 }, SPRING));
  const release = () => animate(el, { scale: 1 }, BOUNCY);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointerleave", release);
}

/** Cards lean toward the cursor in 3D. */
function tilt(el: HTMLElement) {
  const max = Number(el.dataset.springTilt || 6);
  el.style.transformPerspective = "1000px";
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    animate(el, { rotateY: px * max, rotateX: -py * max, transformPerspective: 1000 }, SOFT);
  });
  el.addEventListener("pointerleave", () => animate(el, { rotateX: 0, rotateY: 0 }, BOUNCY));
}

/**
 * Drag an element by a handle; on release it springs home carrying the
 * release velocity, like flicking a window that's tethered to its spot.
 */
export function tethered(el: HTMLElement, handle: HTMLElement = el, onRelease?: () => void) {
  if (reduce()) return;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let vx = 0;
  let vy = 0;
  let dragging = false;
  let bx = 0;
  let by = 0;

  handle.style.cursor = "grab";
  handle.style.touchAction = "none";
  handle.addEventListener("pointerdown", (e) => {
    if ((e.target as Element).closest("a, button, input")) return;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    handle.style.cursor = "grabbing";
    startX = e.clientX;
    startY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    vx = vy = 0;
    animate(el, { scale: 1.02 }, SPRING);
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dt = Math.max(1, now - lastT) / 1000;
    vx = (e.clientX - lastX) / dt;
    vy = (e.clientY - lastY) / dt;
    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
    // Rubber-band: the further you pull, the harder it resists.
    const band = (d: number) => Math.sign(d) * 260 * (1 - Math.exp(-Math.abs(d) / 260));
    bx = band(e.clientX - startX);
    by = band(e.clientY - startY);
    animate(el, { x: bx, y: by, rotate: bx / 60 }, { duration: 0 });
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    handle.style.cursor = "grab";
    animate(el, { x: 0 }, { ...BOUNCY, velocity: vx * 0.4 });
    animate(el, { y: 0 }, { ...BOUNCY, velocity: vy * 0.4 });
    animate(el, { rotate: 0, scale: 1 }, BOUNCY);
    onRelease?.();
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}

export function initPhysics() {
  if (reduce()) return;
  document.querySelectorAll<HTMLElement>("[data-press]").forEach(pressable);
  if (!finePointer()) return;
  document.querySelectorAll<HTMLElement>("[data-spring-tilt]").forEach(tilt);
}
