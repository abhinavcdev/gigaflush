import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import s from "./ui.module.css";

// An illustration of transitive dependencies, not a real install graph.
const NAMES = ["react", "react-dom", "scheduler", "next", "@swc/helpers", "postcss", "nanoid", "picocolors", "source-map-js", "styled-jsx", "client-only", "busboy", "streamsearch", "caniuse-lite", "graceful-fs", "@next/env", "sharp", "detect-libc", "semver", "color", "color-string", "simple-swizzle", "is-arrayish", "color-convert", "color-name", "tslib", "typescript", "eslint", "@eslint/js", "acorn", "ajv", "fast-deep-equal", "json-schema-traverse", "uri-js", "punycode", "chalk", "debug", "ms", "glob", "minimatch", "brace-expansion", "balanced-match", "path-scurry", "lru-cache", "minipass", "esbuild", "@esbuild/darwin-arm64", "tailwindcss", "jiti", "lightningcss"];

export default function DependencyBurst() {
  const [n, setN] = useState(0);
  const nodes = useMemo(
    () =>
      NAMES.map((name, i) => {
        const ring = i < 3 ? 1 : i < 14 ? 2 : 3;
        const a = (i * 137.5 * Math.PI) / 180;
        const r = ring * 70 + (i % 3) * 12;
        return { name, x: Math.cos(a) * r * 1.5, y: Math.sin(a) * r * 0.75, ring };
      }),
    [],
  );
  const shown = nodes.slice(0, n);
  return (
    <div className={s.box}>
      <div className={s.head}>
        <div>
          <div className={s.label}>You typed one install command</div>
          <div className={s.big}>{n === 0 ? "1" : n} <span style={{ fontSize: 16, color: "var(--muted)", letterSpacing: 0 }}>packages</span></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {n > 0 && <button className={s.btn} onClick={() => setN(0)}>Reset</button>}
          <motion.button whileTap={{ scale: 0.94 }} className={`${s.btn} ${s.primary}`} onClick={() => setN((v) => (v === 0 ? NAMES.length : 0))}>
            $ npm install next
          </motion.button>
        </div>
      </div>
      <div style={{ position: "relative", height: 340, overflow: "hidden", borderRadius: 12, background: "radial-gradient(circle at 50% 50%, var(--glow), transparent 70%), var(--surface)" }}>
        <motion.div
          animate={{ scale: n ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.4 }}
          style={{ position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", padding: "8px 12px", borderRadius: 10, background: "var(--text)", color: "var(--page)", fontFamily: "var(--mono)", fontSize: 12, zIndex: 2 }}
        >
          your-app
        </motion.div>
        <AnimatePresence>
          {shown.map((d, i) => (
            <motion.span
              key={d.name}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
              animate={{ x: d.x, y: d.y, opacity: 1, scale: 1 }}
              exit={{ x: 0, y: 0, opacity: 0, scale: 0.3, transition: { duration: 0.3, delay: (shown.length - i) * 0.006 } }}
              transition={{ type: "spring", stiffness: 140, damping: 11, delay: i * 0.025 }}
              drag
              dragSnapToOrigin
              dragTransition={{ bounceStiffness: 300, bounceDamping: 12 }}
              whileDrag={{ scale: 1.15, zIndex: 3 }}
              style={{ position: "absolute", left: "50%", top: "50%", translate: "-50% -50%", padding: "3px 8px", borderRadius: 999, background: "var(--content)", border: "1px solid var(--line-strong)", fontFamily: "var(--mono)", fontSize: d.ring === 1 ? 11.5 : 10, color: d.ring === 3 ? "var(--muted)" : "var(--text)", whiteSpace: "nowrap", cursor: "grab", touchAction: "none" }}
            >
              {d.name}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      <p className={s.note}>Illustrative: a real Next.js install pulls in hundreds of packages. Drag them around; they spring back. Run <code>npm ls --all</code> to see your actual tree.</p>
    </div>
  );
}
