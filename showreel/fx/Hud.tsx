import { useRef } from "react";

import { frameOf, useFrame } from "../lib/stage";
import { at, DURATION, FPS, hash, keys, seg } from "../lib/time";

/* The frame around the reel, in the style of the site's covers: a thin inset rule with square ticks
 * at the corners, and small mono labels in the margins (the section, a timecode, where Dan is). */

const SECTIONS: readonly [number, string][] = [
  [at(1), "01 / 05 · Oasi Kadir"],
  [at(3), "02 / 05 · SportMagaz"],
  [at(4), "03 / 05 · Consolline"],
  [at(5), "04 / 05 · Open source"],
  [at(6), "05 / 05 · Systems"],
];

// Digits and marks only: random letters can spell words nobody wants in a showreel.
const GLYPHS = "0123456789#/·+-_*";

/** Text that decodes left to right over `length` seconds from `since`. */
export function decode(text: string, t: number, since: number, length = 0.22): string {
  const p = seg(t, since, since + length);
  if (p >= 1) return text;
  const f = frameOf(t);
  return [...text]
    .map((c, i) => {
      if (c === " " || i / text.length < p) return c;
      if ((i - 1) / text.length > p + 0.25) return " ";
      return GLYPHS[Math.floor(hash(f * 31 + i) * GLYPHS.length)]!;
    })
    .join("");
}

const pad = (n: number) => String(n).padStart(2, "0");

export function Hud() {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLSpanElement>(null);
  const tc = useRef<HTMLSpanElement>(null);
  const progress = useRef<HTMLDivElement>(null);

  useFrame((t) => {
    frame.current!.style.opacity = String(
      keys(t, [
        [0, 0],
        [at(0, 1.4), 0],
        [at(0, 2.2), 1],
      ]),
    );
    labels.current!.style.opacity = String(
      keys(t, [
        [0, 0],
        [at(1) - 0.15, 0],
        [at(1) + 0.1, 1],
        [at(7) - 0.12, 1],
        [at(7), 0],
      ]),
    );
    const current = [...SECTIONS].reverse().find(([s]) => t >= s) ?? SECTIONS[0]!;
    section.current!.textContent = decode(current[1].toUpperCase(), t, current[0]);
    const f = frameOf(t);
    tc.current!.textContent = `TC 00:${pad(Math.floor(f / FPS))}:${pad(f % FPS)}`;
    progress.current!.style.transform = `scaleX(${Math.min(1, t / DURATION)})`;
  });

  const tick = (style: React.CSSProperties) => (
    <span className="abs" style={{ width: 7, height: 7, background: "rgb(255 255 255 / 0.55)", ...style }} />
  );

  return (
    <div ref={root} className="layer" style={{ zIndex: 40 }}>
      <div ref={frame} className="layer" style={{ opacity: 0 }}>
        <div className="abs" style={{ inset: 28, border: "1px solid rgb(255 255 255 / 0.09)" }} />
        {tick({ left: 25, top: 25 })}
        {tick({ right: 25, top: 25 })}
        {tick({ left: 25, bottom: 25 })}
        {tick({ right: 25, bottom: 25 })}
        <div
          ref={progress}
          className="abs"
          style={{
            left: 28,
            right: 28,
            bottom: 28,
            height: 1,
            background: "rgb(255 255 255 / 0.4)",
            transformOrigin: "0 0",
          }}
        />
      </div>
      <div ref={labels} className="layer label" style={{ opacity: 0, fontSize: 11 }}>
        <span className="abs" style={{ right: 52, top: 40, display: "flex", gap: 22 }}>
          <span>Showreel 2026</span>
          <span ref={tc} className="num" style={{ color: "var(--ink)" }} />
        </span>
        <span ref={section} className="abs" style={{ left: 52, bottom: 40, color: "var(--ink)" }} />
        <span className="abs" style={{ right: 52, bottom: 40 }}>
          48.21° N 16.37° E · Vienna
        </span>
      </div>
    </div>
  );
}
