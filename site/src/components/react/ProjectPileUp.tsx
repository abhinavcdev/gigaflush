import { useEffect, useState } from "react";
import { AnimatePresence, motion, useSpring, useTransform } from "motion/react";
import s from "./ui.module.css";

// Typical, illustrative sizes. Real folders vary a lot with dependencies.
const STACKS = [
  { name: "Next.js app", folder: "node_modules", mb: 420, color: "#68aeff" },
  { name: "Vite + React", folder: "node_modules", mb: 180, color: "#9ccbff" },
  { name: "Expo app", folder: "node_modules", mb: 520, color: "#a78bfa" },
  { name: "Rust CLI", folder: "target", mb: 1400, color: "#f0a36b" },
  { name: "Flutter app", folder: "build", mb: 900, color: "#5ec8d8" },
  { name: "SvelteKit site", folder: "node_modules", mb: 160, color: "#ff8a6b" },
  { name: "Tauri app", folder: "target", mb: 2100, color: "#f5c45e" },
  { name: "Python API", folder: ".mypy_cache", mb: 90, color: "#8aca9b" },
];
const IDEAS = ["habit tracker", "AI journal", "invoice tool", "recipe app", "landing page", "Discord bot", "todo app (again)", "portfolio v7", "chess engine", "budget app", "SaaS boilerplate", "weather widget"];

type Project = { id: number; idea: string; stack: (typeof STACKS)[number] };

export default function ProjectPileUp() {
  const [projects, setProjects] = useState<Project[]>([]);
  const total = projects.reduce((n, p) => n + p.stack.mb, 0);
  const spring = useSpring(0, { stiffness: 120, damping: 20 });
  const shown = useTransform(spring, (v) => (v >= 1024 ? `${(v / 1024).toFixed(1)} GB` : `${Math.round(v)} MB`));
  useEffect(() => spring.set(total), [total, spring]);

  const ship = () =>
    setProjects((p) => [
      ...p,
      { id: Date.now() + Math.random(), idea: IDEAS[p.length % IDEAS.length], stack: STACKS[(p.length * 5 + 3) % STACKS.length] },
    ]);

  return (
    <div className={s.box}>
      <div className={s.head}>
        <div>
          <div className={s.label}>Generated folders on disk</div>
          <motion.div className={s.big}>{shown}</motion.div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {projects.length > 0 && (
            <button className={s.btn} onClick={() => setProjects([])}>
              Flush
            </button>
          )}
          <motion.button className={`${s.btn} ${s.primary}`} onClick={ship} whileTap={{ scale: 0.94 }} whileHover={{ y: -2 }}>
            ✦ Vibe-code another app
          </motion.button>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 120, alignContent: "flex-start" }}>
        <AnimatePresence>
          {projects.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: -40, scale: 0.6, rotate: -8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, y: 30, transition: { duration: 0.25 } }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              title={`${p.idea} · ${p.stack.name} · ${p.stack.folder} ~${p.stack.mb} MB`}
              style={{
                width: Math.max(84, Math.sqrt(p.stack.mb) * 3.6),
                height: Math.max(52, Math.sqrt(p.stack.mb) * 2.1),
                borderRadius: 10,
                padding: "6px 8px",
                background: `color-mix(in srgb, ${p.stack.color} 22%, var(--surface))`,
                border: `1px solid color-mix(in srgb, ${p.stack.color} 45%, transparent)`,
                fontSize: 10.5,
                lineHeight: 1.3,
                overflow: "hidden",
              }}
            >
              <b style={{ display: "block", fontWeight: 600 }}>{p.idea}</b>
              <code style={{ color: "var(--muted)", fontSize: 10 }}>{p.stack.folder}</code>
            </motion.div>
          ))}
        </AnimatePresence>
        {projects.length === 0 && <p style={{ color: "var(--faint)", alignSelf: "center" }}>Every new idea comes with its own dependencies. Click the button.</p>}
      </div>
      <p className={s.note}>Sizes are typical ballparks for a fresh project, not measurements. Check yours with <code>du -sh */node_modules</code>.</p>
    </div>
  );
}
