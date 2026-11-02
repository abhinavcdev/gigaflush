import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "motion/react";
import s from "./ui.module.css";

const ROWS = [
  { key: "node", label: "Node.js projects", folder: "node_modules", mb: 350 },
  { key: "rust", label: "Rust projects", folder: "target", mb: 1500 },
  { key: "flutter", label: "Flutter projects", folder: "build + .dart_tool", mb: 800 },
  { key: "swift", label: "Swift packages", folder: ".build", mb: 400 },
  { key: "jvm", label: "Gradle / Maven projects", folder: ".gradle / target", mb: 300 },
] as const;

export default function SpaceCalculator({ disk = 512 }: { disk?: number }) {
  const [counts, setCounts] = useState<Record<string, number>>({ node: 12, rust: 2, flutter: 1, swift: 0, jvm: 1 });
  const totalMb = ROWS.reduce((n, r) => n + (counts[r.key] || 0) * r.mb, 0);
  const spring = useSpring(0, { stiffness: 140, damping: 22 });
  const label = useTransform(spring, (v) => `${(v / 1024).toFixed(1)} GB`);
  const width = useTransform(spring, (v) => `${Math.min(100, (v / 1024 / disk) * 100)}%`);
  const pct = useTransform(spring, (v) => `${((v / 1024 / disk) * 100).toFixed(1)}% of a ${disk} GB disk`);
  useEffect(() => spring.set(totalMb), [totalMb, spring]);

  return (
    <div className={s.box}>
      <div className={s.head}>
        <div>
          <div className={s.label}>Estimated reclaimable</div>
          <motion.div className={s.big}>{label}</motion.div>
        </div>
        <motion.div style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: 12 }}>{pct}</motion.div>
      </div>
      <div style={{ height: 10, borderRadius: 10, background: "var(--control)", overflow: "hidden", marginBottom: 22 }}>
        <motion.div style={{ width, height: "100%", borderRadius: 10, background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }} />
      </div>
      <div style={{ display: "grid", gap: 14 }}>
        {ROWS.map((r) => (
          <label key={r.key} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", alignItems: "center" }}>
            <span>
              {r.label} <code style={{ color: "var(--faint)", fontSize: 11 }}>{r.folder}</code>
            </span>
            <b style={{ fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{counts[r.key]}</b>
            <input
              type="range"
              min={0}
              max={r.key === "node" ? 60 : 20}
              value={counts[r.key]}
              onChange={(e) => setCounts((c) => ({ ...c, [r.key]: Number(e.target.value) }))}
              style={{ gridColumn: "1 / -1", accentColor: "var(--accent)" }}
              aria-label={r.label}
            />
          </label>
        ))}
      </div>
      <p className={s.note}>
        Uses rough per-project averages ({ROWS.map((r) => `${r.folder} ≈ ${r.mb >= 1024 ? (r.mb / 1024).toFixed(1) + " GB" : r.mb + " MB"}`).join(", ")}). Your numbers will differ; Gigaflush measures the real ones.
      </p>
    </div>
  );
}
