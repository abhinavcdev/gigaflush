import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls } from "motion/react";
import s from "./bento.module.css";
import { useLive } from "./useLive";

const CHIPS = [
  { text: "~/Developer", x: 10, y: 28, dx: 6, dy: 4 },
  { text: "node_modules", x: 46, y: 60, dx: -6, dy: 3 },
  { text: "3.2 GB", x: 12, y: 84, dx: 7, dy: -3 },
];

// Your files drift inside the machine and never cross its edge; the one
// request that leaves is the periodic version check.
export default function LocalOnly() {
  const ref = useRef<HTMLDivElement>(null);
  const { running, reduce } = useLive(ref);
  const packet = useAnimationControls();
  const [label, setLabel] = useState("latest?");

  useEffect(() => {
    if (!running) return;
    let alive = true;
    const trip = async () => {
      setLabel("latest?");
      await packet.start({ left: ["46%", "74%"], opacity: [0, 1, 1], transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } });
      if (!alive) return;
      setLabel("v0.2.0");
      await packet.start({ left: ["74%", "46%"], opacity: [1, 1, 0], transition: { duration: 1.1, ease: [0.16, 1, 0.3, 1] } });
    };
    trip();
    const id = setInterval(trip, 4800);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [running, packet]);

  return (
    <div ref={ref} className={s.stage} role="img" aria-label="Folder names and sizes stay inside your machine. The only request that leaves is a version check to GitHub.">
      <div className={s.machine}>
        <span className={s.machineLabel}>Your machine</span>
        {CHIPS.map((c) => (
          <motion.span
            key={c.text}
            className={s.chip}
            style={{ left: c.x, top: c.y }}
            animate={running ? { x: [0, c.dx, 0], y: [0, c.dy, 0] } : { x: 0, y: 0 }}
            transition={{ duration: 5 + c.dx / 6, repeat: Infinity, ease: "easeInOut" }}
          >
            {c.text}
          </motion.span>
        ))}
      </div>
      <div className={s.remote}>
        <span className={s.remoteIcon}>
          <svg viewBox="0 0 256 256" width="17" height="17" fill="currentColor" stroke="none" aria-hidden="true">
            <path d="M208.31 75.68A59.78 59.78 0 0 0 202.93 28a8 8 0 0 0-6.93-4 59.75 59.75 0 0 0-48 24h-24a59.75 59.75 0 0 0-48-24 8 8 0 0 0-6.93 4 59.78 59.78 0 0 0-5.38 47.68A58.14 58.14 0 0 0 56 104v8a56.06 56.06 0 0 0 48.44 55.47A39.8 39.8 0 0 0 96 192v8H72a24 24 0 0 1-24-24 40 40 0 0 0-40-40 8 8 0 0 0 0 16 24 24 0 0 1 24 24 40 40 0 0 0 40 40h24v16a8 8 0 0 0 16 0v-40a24 24 0 0 1 48 0v40a8 8 0 0 0 16 0v-40a39.8 39.8 0 0 0-8.44-24.53A56.06 56.06 0 0 0 216 112v-8a58.14 58.14 0 0 0-7.69-28.32Z" />
          </svg>
        </span>
        GitHub
      </div>
      {!reduce && (
        <motion.span className={s.packet} initial={{ left: "46%", opacity: 0 }} animate={packet}>
          {label}
        </motion.span>
      )}
      <div className={s.log}>
        <span>
          <b className={s.zero}>0</b> files sent
        </span>
        <span>1 request: version check</span>
      </div>
    </div>
  );
}
