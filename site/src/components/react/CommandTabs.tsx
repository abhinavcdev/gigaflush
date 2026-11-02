import { useState } from "react";
import { motion } from "motion/react";
import s from "./ui.module.css";

type Tab = { label: string; code: string; note?: string };

export default function CommandTabs({ tabs, id = "cmd" }: { tabs: Tab[]; id?: string }) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const tab = tabs[active];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return (
    <div className={s.box} style={{ padding: 0, overflow: "hidden" }}>
      <div role="tablist" style={{ display: "flex", gap: 4, padding: "8px 8px 0", borderBottom: "1px solid var(--line)", background: "var(--surface)", overflowX: "auto" }}>
        {tabs.map((t, i) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            style={{ position: "relative", padding: "9px 14px 11px", border: 0, background: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, color: i === active ? "var(--text)" : "var(--muted)", whiteSpace: "nowrap" }}
          >
            {t.label}
            {i === active && <motion.span layoutId={`${id}-underline`} style={{ position: "absolute", left: 10, right: 10, bottom: -1, height: 2, borderRadius: 2, background: "var(--accent)" }} transition={{ type: "spring", stiffness: 500, damping: 34 }} />}
          </button>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <motion.pre
          key={active}
          initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ margin: 0, padding: "20px 22px", paddingRight: 90, background: "#0d0d0d", color: "#e6e7e3", fontFamily: "var(--mono)", fontSize: 13, lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre" }}
        >
          <code>{tab.code}</code>
        </motion.pre>
        <motion.button whileTap={{ scale: 0.9 }} onClick={copy} style={{ position: "absolute", top: 12, right: 12, height: 30, padding: "0 12px", border: 0, borderRadius: 999, background: "#ffffff17", color: copied ? "#30d158" : "#c9ccc5", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
          {copied ? "Copied" : "Copy"}
        </motion.button>
      </div>
      {tab.note && <p className={s.note} style={{ margin: 0, padding: "12px 22px 16px" }}>{tab.note}</p>}
    </div>
  );
}
