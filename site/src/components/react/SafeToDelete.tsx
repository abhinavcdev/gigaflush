import { useState } from "react";
import { motion } from "motion/react";
import s from "./ui.module.css";

type Item = { name: string; safe: boolean; why: string };

const DEFAULT: Item[] = [
  { name: "node_modules", safe: true, why: "Recreated by npm, pnpm or yarn install. Gigaflush cleans it next to a package.json." },
  { name: "target (Rust)", safe: true, why: "Rebuilt by cargo build. Next build is slower." },
  { name: ".venv", safe: false, why: "A virtual environment you installed into. Gigaflush never touches it." },
  { name: "dist", safe: false, why: "Could be a published artifact. Too generic: Gigaflush skips it." },
  { name: ".dart_tool", safe: true, why: "Restored by flutter pub get." },
  { name: "~/.gradle", safe: false, why: "Global cache shared by every project. Out of scope by design." },
  { name: ".mypy_cache", safe: true, why: "mypy rebuilds it on the next run." },
  { name: "package-lock.json", safe: false, why: "Pins your dependency versions. Never delete it to save space." },
];

export default function SafeToDelete({ items = DEFAULT }: { items?: Item[] }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <div className={s.box}>
      <div className={s.head}>
        <div className={s.label}>Safe to delete? Tap to find out</div>
        <button className={s.btn} onClick={() => setFlipped(Object.fromEntries(items.map((_, i) => [i, true])))}>
          Reveal all
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
        {items.map((it, i) => (
          <motion.button
            key={it.name}
            onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
            animate={{ rotateY: flipped[i] ? 180 : 0 }}
            whileHover={{ y: -3 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            style={{ position: "relative", height: 120, border: 0, padding: 0, background: "none", cursor: "pointer", transformStyle: "preserve-3d", textAlign: "left" }}
            aria-label={`${it.name}: ${flipped[i] ? (it.safe ? "safe" : "not safe") + ". " + it.why : "tap to reveal"}`}
          >
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface)", backfaceVisibility: "hidden", fontFamily: "var(--mono)", fontSize: 13 }}>{it.name}</span>
            <span
              style={{
                position: "absolute",
                inset: 0,
                padding: 12,
                borderRadius: 12,
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                background: it.safe ? "var(--success-soft)" : "color-mix(in srgb, var(--danger) 10%, transparent)",
                border: `1px solid ${it.safe ? "color-mix(in srgb, var(--success) 40%, transparent)" : "color-mix(in srgb, var(--danger) 35%, transparent)"}`,
                fontSize: 11.5,
                lineHeight: 1.45,
                color: "var(--text)",
              }}
            >
              <b style={{ display: "block", color: it.safe ? "var(--success)" : "var(--danger)", marginBottom: 4 }}>{it.safe ? "✓ Safe" : "✕ Keep"}</b>
              {it.why}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
