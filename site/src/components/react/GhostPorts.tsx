import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "motion/react";
import { useLive } from "./bento/useLive";
import s from "./ghost.module.css";

type Server = {
  port: number;
  name: string;
  cmd: string;
  rt: string;
  mb: number;
  /** hours running */
  up: number;
  state: "live" | "idle";
  orphaned?: boolean;
};

const SERVERS: Server[] = [
  { port: 3000, rt: "node", name: "dashboard", cmd: "next dev", mb: 312, up: 26, state: "idle", orphaned: true },
  { port: 4321, rt: "node", name: "marketing-site", cmd: "astro dev", mb: 140, up: 1.5, state: "live" },
  { port: 4322, rt: "node", name: "marketing-site", cmd: "astro preview", mb: 182, up: 168, state: "idle", orphaned: true },
  { port: 5173, rt: "node", name: "studio-web", cmd: "vite", mb: 210, up: 2, state: "live" },
  { port: 8000, rt: "python", name: "api", cmd: "manage.py runserver", mb: 64, up: 9, state: "idle" },
  { port: 8787, rt: "node", name: "edge", cmd: "wrangler dev", mb: 90, up: 0.4, state: "live" },
];

const SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;
const BOUNCE = { type: "spring", stiffness: 380, damping: 18 } as const;

const age = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
// Uptime on a log scale from 30 minutes to 30 days, like the app.
const meter = (h: number) => Math.log(Math.min(720, Math.max(0.5, h)) / 0.5) / Math.log(720 / 0.5);

// A patch panel of localhost. Connected servers carry traffic; idle ones sit
// hollow until they are flushed. Plays itself while on screen, hands over the
// moment you touch it.
export default function GhostPorts({ compact = false }: { compact?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const { running, reduce } = useLive(ref);
  const [gone, setGone] = useState<Set<number>>(() => new Set());
  const [touched, setTouched] = useState(false);
  const held = useMotionValue(0);
  const heldText = useTransform(held, (v) => `${Math.round(v)} MB`);

  const idle = SERVERS.filter((x) => x.state === "idle" && !gone.has(x.port));
  const listening = SERVERS.filter((x) => !gone.has(x.port));
  const total = idle.reduce((a, x) => a + x.mb, 0);

  useEffect(() => {
    const c = animate(held, total, reduce ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 22 });
    return () => c.stop();
  }, [total, reduce, held]);

  // Self-playing tour: flush one ghost at a time, wait, then they come back.
  useEffect(() => {
    if (!running || touched) return;
    const ghosts = SERVERS.filter((x) => x.state === "idle");
    const timers = [
      ...ghosts.map((g, i) => setTimeout(() => setGone((prev) => new Set(prev).add(g.port)), 2200 + i * 650)),
      setTimeout(() => setGone(new Set()), 2200 + ghosts.length * 650 + 3800),
    ];
    const loop = setInterval(() => {
      ghosts.forEach((g, i) => timers.push(setTimeout(() => setGone((prev) => new Set(prev).add(g.port)), 2200 + i * 650)));
      timers.push(setTimeout(() => setGone(new Set()), 2200 + ghosts.length * 650 + 3800));
    }, 2200 + ghosts.length * 650 + 5200);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [running, touched]);

  const stop = (port: number) => {
    setTouched(true);
    setGone((prev) => new Set(prev).add(port));
  };
  const flushAll = () => {
    setTouched(true);
    idle.forEach((x, i) => setTimeout(() => setGone((prev) => new Set(prev).add(x.port)), reduce ? 0 : i * 160));
  };
  const reset = () => {
    setTouched(true);
    setGone(new Set());
  };

  return (
    <div ref={ref} className={`${s.wrap} ${compact ? s.compact : ""}`}>
      <div className={s.head}>
        <div>
          <motion.b className={s.held}>{heldText}</motion.b>
          <span className={s.sub}>held by idle dev servers</span>
        </div>
        <div className={s.stats} aria-live="polite">
          <span>
            <b>{listening.length}</b> listening
          </span>
          <span>
            <b>{idle.length}</b> idle
          </span>
        </div>
      </div>

      <div className={s.panel} role="list" aria-label="Ports on localhost">
        {SERVERS.map((x, i) => {
          const out = gone.has(x.port);
          return (
            <div key={x.port} className={s.slot} role="listitem">
              <AnimatePresence initial={false}>
                {!out && (
                  <motion.button
                    type="button"
                    className={`${s.socket} ${x.state === "idle" ? s.idle : s.live}`}
                    disabled={x.state !== "idle"}
                    onClick={() => stop(x.port)}
                    initial={{ y: -14, scale: 0.85, opacity: 0 }}
                    animate={{ y: 0, scale: 1, opacity: 1, transition: { ...BOUNCE, delay: reduce ? 0 : i * 0.03 } }}
                    exit={{ y: 16, scale: 0.8, opacity: 0, transition: SPRING }}
                    whileHover={x.state === "idle" ? { y: -3 } : undefined}
                    whileTap={x.state === "idle" ? { scale: 0.94 } : undefined}
                    aria-label={`Port ${x.port}, ${x.cmd}, ${x.state === "idle" ? `idle ${age(x.up)}. Stop` : "connected"}`}
                  >
                    <span className={s.hole}>
                      <i />
                    </span>
                    <span className={s.port}>:{x.port}</span>
                    <span className={s.meta}>{x.state === "live" ? "live" : age(x.up)}</span>
                    {x.state === "live" && !reduce && (
                      <span className={s.traffic} aria-hidden="true">
                        <i style={{ animationDelay: `${i * 0.37}s` }} />
                        <i style={{ animationDelay: `${i * 0.37 + 0.6}s` }} />
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
              {out && <span className={s.freed}>:{x.port} free</span>}
            </div>
          );
        })}
      </div>

      <div className={s.legend} aria-hidden="true">
        <span>
          <i className={s.kLive} />
          Connected
        </span>
        <span>
          <i className={s.kIdle} />
          Idle, safe to stop
        </span>
      </div>

      {!compact && (
        <motion.div layout className={s.rows}>
          <AnimatePresence initial={false}>
            {idle.map((x) => (
              <motion.div
                key={x.port}
                layout
                className={s.row}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, transition: SPRING }}
                transition={SPRING}
              >
                <span className={s.plate}>
                  <b>:{x.port}</b>
                  <small>{x.rt}</small>
                </span>
                <span className={s.info}>
                  <b>{x.name}</b>
                  <code>{x.cmd}</code>
                  <span className={s.meter} title="Uptime on a log scale">
                    <span className={s.track}>
                      <motion.span
                        className={s.fill}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: meter(x.up) }}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18 }}
                      />
                    </span>
                    {x.orphaned ? "Orphaned · " : ""}
                    {age(x.up)}
                  </span>
                </span>
                <span className={s.side}>
                  <b>{x.mb} MB</b>
                  <button type="button" onClick={() => stop(x.port)}>
                    Stop
                  </button>
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {!idle.length && (
            <motion.p className={s.clear} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
              No ghosts. Every port left is in use.
            </motion.p>
          )}
        </motion.div>
      )}

      <div className={s.foot}>
        <span>Stopping works like Ctrl+C. Nothing connected is ever suggested.</span>
        {idle.length ? (
          <motion.button type="button" className={s.flush} onClick={flushAll} whileTap={{ scale: 0.96 }}>
            Stop {idle.length} idle
          </motion.button>
        ) : (
          <motion.button type="button" className={s.reset} onClick={reset} whileTap={{ scale: 0.96 }}>
            Restart demo
          </motion.button>
        )}
      </div>
    </div>
  );
}
