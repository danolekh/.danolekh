import { useEffect, useRef, useState } from "react";

import { type Globe, createGlobe, LOOK } from "@/lib/content/consolline/globe-renderer";
import consollineHero from "../assets/consolline-desktop.webp";
import { useFrame, useWaitFor } from "../lib/stage";
import { at, ease, mix, seg } from "../lib/time";

/* Bar 5: consolline.com, built solo in Astro. Out of the halftone comes the site's own WebGL2 globe
 * (the renderer from src/lib/content/consolline, driven here by the reel's clock), then the live
 * hero slides in and a Figma-style redline measures its headline: 1238.72 px against 1239 in the
 * design. Figures from ~/growth/me/experience.md. */

const IN = at(4);
const OUT = at(5);
const HOST = { left: 700, top: 70, size: 600 };
/** The hero capture is 1440 CSS px wide; its headline runs from x 64 to 1302.72. */
const SHOT = { left: 500, top: 232, width: 620 };
const K = SHOT.width / 1440;

const CHIPS = [
  { at: at(4, 1), value: "4", text: "languages" },
  { at: at(4, 1.5), value: "148", text: "static pages" },
  { at: at(4, 2), value: "85", text: "components" },
];

const SHOT_IN = at(4, 2.3);
const LINE = at(4, 3.05);
const PILL = at(4, 3.3);
const FIGMA = at(4, 3.45);
/** For the soundtrack (audio.ts). The halftone's times are fx/Finish.tsx's. */
export const CONSOLLINE_CUES = {
  halftone: [at(4) - 0.2, at(4) + 0.24] as [number, number],
  chips: CHIPS.map((c) => c.at),
  shot: SHOT_IN,
  line: LINE,
  pill: PILL,
};

export function Consolline() {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const globe = useRef<Globe | null>(null);
  const title = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const shot = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const figma = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  useWaitFor("globe", live);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    globe.current = createGlobe(canvas.current!, {
      width: HOST.size,
      height: HOST.size,
      devicePixelRatio: dpr,
      phi: 4,
      theta: 0.06,
      scale: 1,
      rows: 160,
      columns: 320,
      ...LOOK,
      mapBrightness: 1.25,
      ambient: 0.16,
      oceanBrightness: 0.12,
      dotBloom: 3.6,
    });
    const id = setInterval(() => {
      if (globe.current?.ready) {
        clearInterval(id);
        setLive(true);
      }
    }, 50);
    return () => {
      clearInterval(id);
      globe.current?.destroy();
    };
  }, []);

  useFrame((t) => {
    const on = t >= IN - 0.02 && t < OUT + 0.25;
    root.current!.style.visibility = on ? "visible" : "hidden";
    if (!on) return;

    // The globe turns faster as it arrives and settles to a steady spin.
    const arrive = ease.outExpo(seg(t, IN, IN + 0.9));
    const spin = 4 + (t - IN) * 0.55 + (1 - arrive) * -1.4;
    globe.current?.update({ phi: spin, theta: 0.06 + (1 - arrive) * 0.25, width: HOST.size, height: HOST.size });
    const back = ease.inOutCubic(seg(t, at(4, 2.4), at(4, 3.1)));
    const leave = ease.inExpo(seg(t, OUT - 0.2, OUT + 0.12));
    host.current!.style.transform = `translate(${back * 60}px, ${-back * 40}px) scale(${mix(0.72, 1, arrive) * mix(1, 0.8, back) * (1 - leave * 0.9)})`;
    host.current!.style.opacity = String(seg(t, IN, IN + 0.2) * (1 - seg(t, OUT - 0.05, OUT + 0.1)));

    const tp = ease.outExpo(seg(t, IN + 0.1, IN + 0.6));
    title.current!.style.opacity = String(tp);
    title.current!.style.transform = `translateY(${mix(18, 0, tp)}px)`;
    chips.current.forEach((el, i) => {
      if (!el) return;
      const p = ease.outExpo(seg(t, CHIPS[i]!.at, CHIPS[i]!.at + 0.4));
      el.style.opacity = String(seg(t, CHIPS[i]!.at, CHIPS[i]!.at + 0.06));
      el.style.transform = `translateX(${mix(-30, 0, p)}px) scale(${mix(1.15, 1, p)})`;
    });

    // The hero, and the redline across МІЖНАРОДНА.
    const s = ease.outExpo(seg(t, SHOT_IN, SHOT_IN + 0.33));
    shot.current!.style.opacity = String(seg(t, SHOT_IN, SHOT_IN + 0.07));
    shot.current!.style.transform = `translateY(${mix(260, 0, s)}px) rotateX(${mix(18, 4, s)}deg) rotateY(-8deg)`;
    const l = ease.outExpo(seg(t, LINE, LINE + 0.19));
    line.current!.style.transform = `scaleX(${l})`;
    line.current!.style.opacity = String(l > 0 ? 1 : 0);
    const m = ease.outBack(seg(t, PILL, PILL + 0.14), 2.4);
    measure.current!.style.transform = `translateX(-50%) scale(${m})`;
    const fg = ease.outExpo(seg(t, FIGMA, FIGMA + 0.14));
    figma.current!.style.opacity = String(fg);
    figma.current!.style.transform = `translateX(-100%) translateX(${mix(12, 0, fg)}px)`;

    const exit = ease.inExpo(seg(t, OUT - 0.2, OUT + 0.1));
    root.current!.style.transform = `translateY(${-exit * 40}px)`;
    root.current!.style.opacity = String(1 - exit);
  });

  const left = SHOT.left + 64 * K;
  const width = 1238.72 * K;

  return (
    <div ref={root} className="layer" style={{ visibility: "hidden" }}>
      <div
        ref={host}
        className="abs"
        style={{ left: HOST.left, top: HOST.top, width: HOST.size, height: HOST.size, opacity: 0 }}
      >
        <canvas ref={canvas} style={{ width: HOST.size, height: HOST.size, display: "block" }} />
      </div>

      <div ref={title} className="abs" style={{ left: 92, top: 108 }}>
        <div style={{ fontSize: 58, fontWeight: 1000, letterSpacing: "-0.04em", lineHeight: 1 }}>consolline.com</div>
        <div style={{ marginTop: 14, fontSize: 21, fontWeight: 650, color: "var(--muted)" }}>
          Astro, built solo · hand-written WebGL2 shaders
        </div>
      </div>
      {CHIPS.map((c, i) => (
        <div
          key={c.text}
          ref={(e) => void (chips.current[i] = e)}
          className="chip"
          style={{ left: 92, top: 268 + i * 62, opacity: 0, transformOrigin: "left center" }}
        >
          <i style={{ background: "var(--lime)" }} />
          <b className="num">{c.value}</b>
          <span style={{ color: "var(--muted)", fontWeight: 600 }}>{c.text}</span>
        </div>
      ))}

      <div className="layer" style={{ perspective: 1400, perspectiveOrigin: "60% 60%" }}>
        <div ref={shot} className="browser" style={{ left: SHOT.left, top: SHOT.top, width: SHOT.width, opacity: 0 }}>
          <header>
            <span />
            <span />
            <span />
            <em>consolline.com</em>
          </header>
          <img src={consollineHero} alt="" style={{ display: "block", width: SHOT.width }} />
          {/* Measured as Figma shows it: a pink rule with end ticks and the width in a pill. */}
          <div
            ref={line}
            className="abs"
            style={{
              left: left - SHOT.left,
              width,
              top: 30 + 436 * K,
              height: 14,
              transformOrigin: "center",
              borderLeft: "2px solid #ff2e88",
              borderRight: "2px solid #ff2e88",
            }}
          >
            <div className="abs" style={{ left: 0, right: 0, top: 6, height: 2, background: "#ff2e88" }} />
          </div>
          <div
            ref={measure}
            className="abs mono num"
            style={{
              left: left - SHOT.left + width / 2,
              top: 30 + 436 * K - 30,
              padding: "4px 9px",
              borderRadius: 6,
              background: "#ff2e88",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              transformOrigin: "center bottom",
              whiteSpace: "nowrap",
            }}
          >
            1238.72 px
          </div>
          <div
            ref={figma}
            className="abs mono num"
            style={{
              left: left - SHOT.left + width,
              top: 30 + 436 * K - 30,
              padding: "5px 10px",
              borderRadius: 6,
              background: "rgb(0 0 0 / 0.72)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              opacity: 0,
            }}
          >
            Figma: 1239 px
          </div>
        </div>
      </div>
    </div>
  );
}
