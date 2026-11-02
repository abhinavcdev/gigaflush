import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useLive } from "./bento/useLive";
import s from "./ghost.module.css";

type Server = {
  port: number;
  name: string;
  cmd: string;
  mb: number;
  /** hours running */
  up: number;
  idle: boolean;
  orphaned?: boolean;
  /** why an in-use server is left alone */
  kept?: string;
};

const SERVERS: Server[] = [
  { port: 4322, name: "marketing-site", cmd: "astro preview", mb: 182, up: 168, idle: true, orphaned: true },
  { port: 3000, name: "dashboard", cmd: "next dev", mb: 312, up: 26, idle: true, orphaned: true },
  { port: 8000, name: "api", cmd: "manage.py runserver", mb: 64, up: 9, idle: true },
  { port: 5173, name: "studio-web", cmd: "vite", mb: 210, up: 2, idle: false, kept: "Connected" },
  { port: 4321, name: "docs", cmd: "astro dev", mb: 140, up: 1.5, idle: false, kept: "Connected" },
  { port: 8787, name: "edge", cmd: "wrangler dev", mb: 90, up: 0.4, idle: false, kept: "Started 25m ago" },
];
const IDLE = SERVERS.filter((x) => x.idle);
const LIVE = SERVERS.filter((x) => !x.idle);
const BY_PORT = [...SERVERS].sort((a, b) => a.port - b.port);

const age = (h: number) => (h < 1 ? `${Math.round(h * 60)}m` : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`);
// Uptime on a log scale from 30 minutes to 30 days, like the app.
const meter = (h: number) => Math.log(Math.min(720, Math.max(0.5, h)) / 0.5) / Math.log(720 / 0.5);

// The app's Servers tab as a live demo. Every row and pill keeps its place:
// stopping dims an item instead of removing it, so the card never changes
// size. Plays itself while on screen; hands over the moment you touch it.
export default function GhostPorts() {
  const ref = useRef<HTMLDivElement>(null);
  const { running, reduce } = useLive(ref);
  const [stopped, setStopped] = useState<Set<number>>(() => new Set());
  const [touched, setTouched] = useState(false);
  const held = useMotionValue(IDLE.reduce((a, x) => a + x.mb, 0));
  const heldText = useTransform(held, (v) => `${Math.round(v)} MB`);

  const idleLeft = IDLE.filter((x) => !stopped.has(x.port));
  const total = idleLeft.reduce((a, x) => a + x.mb, 0);

  useEffect(() => {
    const c = animate(held, total, reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 24 });
    return () => c.stop();
  }, [total, reduce, held]);

  // Tour: stop each idle server in turn, hold, then bring them back.
  useEffect(() => {
    if (!running || touched) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const cycle = () => {
      IDLE.forEach((g, i) => timers.push(setTimeout(() => setStopped((p) => new Set(p).add(g.port)), 1800 + i * 700)));
      timers.push(setTimeout(() => setStopped(new Set()), 1800 + IDLE.length * 700 + 3600));
    };
    cycle();
    const loop = setInterval(cycle, 1800 + IDLE.length * 700 + 5000);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(loop);
    };
  }, [running, touched]);

  const stop = (port: number) => {
    setTouched(true);
    setStopped((p) => new Set(p).add(port));
  };
  const stopAll = () => {
    setTouched(true);
    idleLeft.forEach((x, i) => setTimeout(() => setStopped((p) => new Set(p).add(x.port)), reduce ? 0 : i * 140));
  };
  const reset = () => {
    setTouched(true);
    setStopped(new Set());
  };

  return (
    <div ref={ref} className={s.wrap}>
      <div className={s.head}>
        <div>
          <motion.b className={s.held}>{heldText}</motion.b>
          <span className={s.sub}>held by idle dev servers</span>
        </div>
        <div className={s.stats} aria-live="polite">
          <span>
            <b>{idleLeft.length}</b>idle
          </span>
          <span>
            <b>{LIVE.length}</b>in use
          </span>
        </div>
      </div>

      <div className={s.mapHead}>
        <span className={s.mono}>localhost</span>
        <span>{SERVERS.length - stopped.size} listening</span>
      </div>
      <div className={s.pills} role="list" aria-label="Ports on localhost">
        {BY_PORT.map((x) => (
          <span key={x.port} role="listitem" className={`${s.pill} ${x.idle ? s.idlePill : ""} ${stopped.has(x.port) ? s.freed : ""}`}>
            <i className={`${s.dot} ${x.idle ? s.dIdle : x.kept === "Connected" ? s.dLive : s.dRun}`} />:{x.port}
          </span>
        ))}
      </div>

      <div className={s.list}>
        <div className={s.group}>Idle · safe to stop</div>
        {IDLE.map((x) => {
          const done = stopped.has(x.port);
          return (
            <div key={x.port} className={`${s.row} ${done ? s.done : ""}`}>
              <i className={`${s.dot} ${s.dIdle}`} />
              <span className={s.info}>
                <b>{x.name}</b>
                <code>
                  :{x.port} · {x.cmd}
                </code>
              </span>
              <span className={s.uptime}>
                <span className={s.track}>
                  <span className={s.fill} style={{ transform: `scaleX(${meter(x.up)})` }} />
                </span>
                {x.orphaned ? "orphaned" : "up"} {age(x.up)}
              </span>
              <span className={s.side}>
                <b>{x.mb} MB</b>
                <button type="button" onClick={() => stop(x.port)} disabled={done}>
                  {done ? "Stopped" : "Stop"}
                </button>
              </span>
            </div>
          );
        })}
        <div className={s.group}>In use · left alone</div>
        {LIVE.map((x) => (
          <div key={x.port} className={s.row}>
            <i className={`${s.dot} ${x.kept === "Connected" ? s.dLive : s.dRun}`} />
            <span className={s.info}>
              <b>{x.name}</b>
              <code>
                :{x.port} · {x.cmd}
              </code>
            </span>
            <span />
            <span className={s.kept}>{x.kept}</span>
          </div>
        ))}
      </div>

      <div className={s.foot}>
        <span>Stopping works like Ctrl+C.</span>
        {idleLeft.length ? (
          <button type="button" className={s.primary} onClick={stopAll}>
            Stop {idleLeft.length} idle
          </button>
        ) : (
          <button type="button" className={s.secondary} onClick={reset}>
            Restart demo
          </button>
        )}
      </div>
    </div>
  );
}
