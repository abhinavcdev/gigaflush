import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import s from "./bento.module.css";
import { useLive } from "./useLive";

const CELLS = 22;
// Each walker owns a slice of the tree; marks are the folders it will match.
const LANES = [
  { speed: 3.2, hits: [4, 13, 19], finds: ["acme-web/node_modules", "api/target", "docs/node_modules"] },
  { speed: 4.1, hits: [7, 16], finds: ["atlas-mobile/build", "atlas-mobile/.dart_tool"] },
  { speed: 2.7, hits: [2, 10, 17], finds: ["cli/target", "site/node_modules", "ml/.mypy_cache"] },
  { speed: 3.6, hits: [9, 20], finds: ["menu-bar/.build", "billing/target"] },
];
const SIZES = ["412 MB", "1.1 GB", "96 MB", "2.4 GB", "655 MB", "128 MB", "38 MB", "3.2 GB"];

type Found = { id: number; path: string; size: string };

// Four walkers sweep their part of the tree at their own pace; every match
// streams into the list the moment it is found.
export default function ParallelScan() {
  const ref = useRef<HTMLDivElement>(null);
  const { running, reduce } = useLive(ref);
  const [pos, setPos] = useState(() => LANES.map(() => 0));
  const [lit, setLit] = useState<Set<string>>(() => new Set());
  const [found, setFound] = useState<Found[]>([]);
  const [count, setCount] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (reduce) {
      setPos(LANES.map(() => 1));
      setLit(new Set(LANES.flatMap((l, i) => l.hits.map((h) => `${i}:${h}`))));
      setFound(LANES.slice(0, 3).map((l, i) => ({ id: i, path: l.finds[0], size: SIZES[i] })));
      setCount(LANES.reduce((n, l) => n + l.hits.length, 0));
      return;
    }
    if (!running) return;
    let frame = 0;
    let last = performance.now();
    const p = LANES.map((_, i) => (i * 0.21) % 1);
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      LANES.forEach((lane, i) => {
        const before = p[i] * CELLS;
        p[i] += dt / lane.speed;
        if (p[i] >= 1) {
          p[i] = 0;
          setLit((set) => new Set([...set].filter((k) => !k.startsWith(`${i}:`))));
          return;
        }
        const after = p[i] * CELLS;
        lane.hits.forEach((h, j) => {
          if (before < h + 0.5 && after >= h + 0.5) {
            const id = ++seq.current;
            setLit((set) => new Set(set).add(`${i}:${h}`));
            setFound((list) => [{ id, path: lane.finds[j], size: SIZES[id % SIZES.length] }, ...list].slice(0, 3));
            setCount((n) => n + 1);
          }
        });
      });
      setPos([...p]);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, reduce]);

  return (
    <div ref={ref} className={s.stage} role="img" aria-label="Four walkers scan different parts of the folder tree at once; each match appears in the list as soon as it is found.">
      <div className={s.lanes}>
        {LANES.map((lane, i) => (
          <div key={i} className={s.lane}>
            <span className={s.laneId}>w{i + 1}</span>
            <div className={s.track}>
              {Array.from({ length: CELLS }, (_, c) => (
                <span key={c} className={`${s.cell} ${lit.has(`${i}:${c}`) ? s.cellHit : ""}`} />
              ))}
              <span className={s.head} style={{ left: `calc(${pos[i] * 100}% - 1px)` }} />
            </div>
          </div>
        ))}
      </div>
      <span className={s.counter}>{LANES.length} walkers · {count} found</span>
      <div className={s.found}>
        <AnimatePresence initial={false}>
          {found.map((f) => (
            <motion.div
              key={f.id}
              layout
              className={s.foundRow}
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            >
              <span>{f.path}</span>
              <span>{f.size}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
