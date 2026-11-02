import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import s from "./bento.module.css";
import { useLive } from "./useLive";

const BUNDLED = [
  { label: "Chromium", tag: "bundled", kind: "heavy" },
  { label: "Node.js", tag: "bundled", kind: "heavy" },
  { label: "App UI", tag: "", kind: "" },
];
const NATIVE = [
  { label: "System WebView", tag: "on your OS", kind: "system" },
  { label: "Rust core", tag: "", kind: "ours" },
  { label: "App UI", tag: "", kind: "ours" },
];

// Two runtime stacks drop into place, layer by layer, on a spring.
export default function NativeStack() {
  const ref = useRef<HTMLDivElement>(null);
  const { running, reduce } = useLive(ref);
  const [round, setRound] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRound((r) => r + 1), 5200);
    return () => clearInterval(id);
  }, [running]);

  const column = (layers: typeof BUNDLED, offset: number) =>
    layers.map((l, i) => (
      <motion.div
        key={`${round}-${l.label}-${offset}`}
        className={`${s.layer} ${l.kind ? s[l.kind] : ""}`}
        initial={reduce ? false : { y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 17, delay: (offset + i) * 0.16 }}
      >
        {l.label}
      </motion.div>
    ));

  return (
    <div ref={ref} className={s.stage} role="img" aria-label="An app that bundles Chromium and Node.js, beside Gigaflush: a Rust core on the system WebView already on your machine.">
      <div className={s.stacks}>
        <div>
          <div className={s.column}>{column(BUNDLED, 0)}</div>
          <div className={s.columnLabel}>Ships its own browser</div>
        </div>
        <div>
          <div className={s.column}>{column(NATIVE, 1)}</div>
          <div className={s.columnLabel}>Gigaflush: uses your OS</div>
        </div>
      </div>
    </div>
  );
}
