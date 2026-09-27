import { useRef } from "react";

import { useFrame } from "../lib/stage";
import { at, BEAT, ease, mix, seg } from "../lib/time";

/* Bar 7: the backend, then the stack. First the iGaming platform's services around their event
 * bus, with events running the wires on sixteenths; then the camera pulls back into a tilted wall
 * of the stack, three rows streaming past faster and faster, until it slams shut into the closing
 * card. Services from ~/growth/me/experience.md (the company is never named); the stack is
 * me/resume/data/base.json's. */

const IN = at(6);
const WALL = at(6, 2);
const SLAM = at(7) - 0.17;
const OUT = at(7);

const HUB = { x: 800, y: 432 };
const RX = 300;
const RY = 150;
const SERVICES = ["gateway", "identity", "wallet", "bonus", "casino", "notification"];
const NODES = SERVICES.map((name, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 3;
  return { name, x: HUB.x + Math.cos(a) * RX, y: HUB.y + Math.sin(a) * RY };
});
/** An event every sixteenth: which wire, and which way. */
const PULSES = Array.from({ length: 16 }, (_, k) => ({
  start: at(6, 0.35) + k * (BEAT / 4),
  node: (k * 5 + (k >> 2)) % 6,
  inward: k % 3 === 1,
}));

const ROWS = [
  ["TypeScript", "React 19", "Next.js", "TanStack", "Astro", "WebGL2"],
  ["Node.js", "Bun", "Effect", "Hono", "tRPC", "Express"],
  ["PostgreSQL", "Drizzle", "Redis", "Docker", "Cloudflare Workers", "AWS"],
];

/** For the soundtrack (audio.ts). */
export const SYSTEMS_CUES = {
  nodes: NODES.map((_, i) => IN + 0.06 + i * (BEAT / 4)),
  pulses: PULSES.map((p) => p.start),
  wall: WALL,
  out: OUT,
};

export function Systems() {
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const graph = useRef<HTMLDivElement>(null);
  const hub = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);
  const wires = useRef<(SVGLineElement | null)[]>([]);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const wall = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLDivElement | null)[]>([]);

  useFrame((t) => {
    root.current!.style.visibility = t >= IN && t < OUT + 0.02 ? "visible" : "hidden";

    // ——— The services ———
    const away = ease.inOutCubic(seg(t, WALL - 0.12, WALL + 0.2));
    const tp = ease.outExpo(seg(t, IN, IN + 0.5));
    title.current!.style.opacity = String(tp * (1 - away));
    title.current!.style.transform = `translateY(${mix(18, 0, tp) - away * 24}px)`;
    graph.current!.style.opacity = String(1 - away);
    graph.current!.style.transform = `scale(${mix(1, 0.72, away)})`;
    graph.current!.style.filter = away > 0 ? `blur(${away * 10}px)` : "none";

    const hp = ease.outBack(seg(t, IN, IN + 0.35), 2);
    hub.current!.style.transform = `translate(-50%, -50%) scale(${hp})`;
    NODES.forEach((_, i) => {
      const s = IN + 0.06 + i * (BEAT / 4);
      const p = ease.outBack(seg(t, s, s + 0.3), 2.2);
      const el = nodes.current[i];
      if (el) {
        el.style.transform = `translate(-50%, -50%) scale(${p})`;
        el.style.opacity = String(seg(t, s, s + 0.05));
      }
      const w = wires.current[i];
      if (w) w.style.strokeDashoffset = String(1 - ease.outCubic(seg(t, s, s + 0.25)));
    });
    PULSES.forEach((pulse, k) => {
      const dot = dots.current[k];
      if (!dot) return;
      const p = seg(t, pulse.start, pulse.start + 0.3);
      const alive = p > 0 && p < 1;
      const n = NODES[pulse.node]!;
      const q = ease.inOutCubic(pulse.inward ? 1 - p : p);
      dot.setAttribute("cx", String(mix(HUB.x, n.x, q)));
      dot.setAttribute("cy", String(mix(HUB.y, n.y, q)));
      dot.style.opacity = alive ? "1" : "0";
    });
    nodes.current.forEach((el, i) => {
      if (!el) return;
      const lit = PULSES.some((pl) => pl.node === i && !pl.inward && t > pl.start + 0.26 && t < pl.start + 0.42);
      el.style.borderColor = lit ? "rgb(121 161 255 / 0.9)" : "rgb(255 255 255 / 0.14)";
      el.style.boxShadow = lit ? "0 0 24px rgb(59 130 246 / 0.55)" : "none";
    });

    // ——— The stack ———
    const wp = ease.outExpo(seg(t, WALL - 0.05, WALL + 0.5));
    const slam = ease.inExpo(seg(t, SLAM, OUT));
    wall.current!.style.opacity = String(seg(t, WALL - 0.05, WALL + 0.1));
    wall.current!.style.transform = `translate(-50%, -50%) perspective(1100px) rotateX(20deg) rotateZ(-7deg) scale(${mix(1.5, 1, wp)}) scaleY(${1 - slam * 0.98})`;
    wall.current!.style.filter = `brightness(${1 + slam * 2})`;
    const dt = Math.max(0, t - (WALL - 0.05));
    rows.current.forEach((el, i) => {
      if (!el) return;
      const dir = i % 2 ? 1 : -1;
      const x = 260 * dt + 1400 * dt * dt;
      el.style.transform = `translateX(${dir * x - (dir > 0 ? 1600 : 200)}px)`;
    });
  });

  return (
    <div ref={root} className="layer" style={{ visibility: "hidden" }}>
      <div ref={title} className="abs" style={{ left: 92, top: 108 }}>
        <div style={{ fontSize: 44, fontWeight: 1000, letterSpacing: "-0.035em", lineHeight: 1 }}>
          Event-driven Node microservices
        </div>
        <div style={{ marginTop: 14, fontSize: 21, fontWeight: 650, color: "var(--muted)" }}>
          iGaming platform, 2026 · idempotent withdrawals
        </div>
      </div>

      <div ref={graph} className="layer" style={{ transformOrigin: `${HUB.x}px ${HUB.y}px` }}>
        <svg width="1280" height="720" className="abs" style={{ inset: 0 }}>
          {NODES.map((n, i) => (
            <line
              key={n.name}
              ref={(e) => void (wires.current[i] = e)}
              x1={HUB.x}
              y1={HUB.y}
              x2={n.x}
              y2={n.y}
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset="1"
              stroke="rgb(121 161 255 / 0.4)"
              strokeWidth="1.5"
            />
          ))}
          {PULSES.map((_, k) => (
            <circle
              key={k}
              ref={(e) => void (dots.current[k] = e)}
              r="4.5"
              fill="#9dbaff"
              style={{ filter: "drop-shadow(0 0 6px #3b82f6)", opacity: 0 }}
            />
          ))}
        </svg>
        <div
          ref={hub}
          className="abs mono"
          style={{
            left: HUB.x,
            top: HUB.y,
            padding: "12px 18px",
            borderRadius: 14,
            background: "#0f172a",
            border: "1.5px solid var(--blue)",
            boxShadow: "0 0 40px rgb(59 130 246 / 0.35)",
            fontSize: 15,
            fontWeight: 700,
            color: "#cfe0ff",
            whiteSpace: "nowrap",
          }}
        >
          event bus
        </div>
        {NODES.map((n, i) => (
          <div
            key={n.name}
            ref={(e) => void (nodes.current[i] = e)}
            className="abs mono"
            style={{
              left: n.x,
              top: n.y,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: 12,
              background: "rgb(18 18 22 / 0.92)",
              border: "1px solid rgb(255 255 255 / 0.14)",
              fontSize: 15,
              fontWeight: 600,
              whiteSpace: "nowrap",
              opacity: 0,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: 2, background: "var(--good)" }} />
            {n.name}
          </div>
        ))}
      </div>

      <div
        ref={wall}
        className="abs"
        style={{ left: 640, top: 380, width: 2400, display: "grid", gap: 6, opacity: 0, transformOrigin: "center" }}
      >
        {ROWS.map((row, i) => (
          <div key={i} ref={(e) => void (rows.current[i] = e)} style={{ display: "flex", gap: 44, whiteSpace: "nowrap" }}>
            {[...row, ...row, ...row, ...row].map((word, j) => (
              <span
                key={j}
                style={{
                  fontSize: 92,
                  fontWeight: 1000,
                  letterSpacing: "-0.035em",
                  lineHeight: 1.1,
                  color: (i + j) % 3 === 0 ? "transparent" : (i + j) % 5 === 1 ? "var(--periwinkle)" : "var(--ink)",
                  WebkitTextStroke: (i + j) % 3 === 0 ? "1.5px rgb(255 255 255 / 0.55)" : undefined,
                }}
              >
                {word}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
