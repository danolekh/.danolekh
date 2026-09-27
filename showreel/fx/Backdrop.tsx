import { lazy, Suspense, useRef, useState } from "react";

import { useFrame, useWaitFor } from "../lib/stage";
import { at, keys, mixColor, seg } from "../lib/time";

const PixelBlast = lazy(() => import("@/components/pixel-blasts"));

/* Behind everything: the ground, a soft glow in the colour of the work on screen, the site's own
 * WebGL triangle field (danolekh.com's background), and its cover style's dot grid. */

/** The glow's colour, strength and centre over the reel. */
const GLOW: readonly [number, string, number, number, number][] = [
  // time, colour, alpha, x%, y%
  [0, "#3b82f6", 0, 50, 50],
  [at(0, 1), "#3b82f6", 0.28, 50, 50],
  [at(0, 3.6), "#3b82f6", 0.12, 30, 50],
  [at(1), "#fab219", 0.2, 26, 50],
  [at(1, 3), "#fab219", 0.22, 26, 50],
  [at(1, 3.1), "#3fce3f", 0.34, 26, 50],
  [at(2, 3.5), "#3fce3f", 0.2, 30, 60],
  [at(3), "#f7c600", 0.2, 62, 50],
  [at(3, 3.7), "#f7c600", 0.16, 62, 50],
  [at(4), "#baee2a", 0.16, 74, 50],
  [at(4, 3.7), "#baee2a", 0.12, 70, 50],
  [at(5), "#ff7a4d", 0.26, 70, 50],
  [at(5, 3.7), "#ff7a4d", 0.2, 70, 50],
  [at(6), "#3b82f6", 0.24, 62, 52],
  [at(6, 3.7), "#79a1ff", 0.24, 50, 50],
  [at(7), "#3b82f6", 0.3, 50, 42],
  [at(8), "#3b82f6", 0.22, 50, 42],
];

function glowAt(t: number) {
  let i = GLOW.findIndex(([k]) => k > t);
  if (i < 0) i = GLOW.length;
  const a = GLOW[Math.max(0, i - 1)]!;
  const b = GLOW[Math.min(GLOW.length - 1, i)]!;
  // Colours cross over in a quarter of a second; strength and position glide.
  const p = b[0] === a[0] ? 1 : seg(t, a[0], b[0]);
  const c = seg(t, b[0] - 0.25, b[0]);
  return {
    color: mixColor(a[1], b[1], a[1] === b[1] ? 0 : c),
    alpha: a[2] + (b[2] - a[2]) * p,
    x: a[3] + (b[3] - a[3]) * p,
    y: a[4] + (b[4] - a[4]) * p,
  };
}

/** Where the triangle field ripples: a synthetic pointerdown, which is what it listens for. */
const RIPPLES: readonly [number, number, number][] = [
  [at(0, 1), 640, 360],
  [at(1), 330, 360],
  [at(1, 3), 330, 360],
  [at(3), 860, 380],
  [at(5), 910, 360],
  [at(6), 800, 370],
  [at(7), 640, 300],
];

export function Backdrop() {
  const ground = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const last = useRef(-1);
  const [fieldReady, setFieldReady] = useState(false);
  useWaitFor("pixels", fieldReady);

  useFrame((t) => {
    // consolline's scene sits on its own near-black, swapped in under the halftone dissolve.
    const cons = t >= at(4) - 0.02 && t < at(5) - 0.06;
    ground.current!.style.background = cons ? "#121311" : "#0b0b0b";

    const g = glowAt(t);
    glow.current!.style.background = `radial-gradient(60% 75% at ${g.x}% ${g.y}%, ${g.color.replace("/ 1)", `/ ${g.alpha})`)}, transparent 70%)`;

    field.current!.style.opacity = String(
      keys(t, [
        [0, 0],
        [at(0, 1), 0],
        [at(0, 1.15), 0.8],
        [at(0, 3), 0.42],
        [at(1), 0.2],
        [at(4) - 0.1, 0.2],
        [at(4), 0],
        [at(5) - 0.05, 0],
        [at(5, 0.5), 0.16],
        [at(7) - 0.05, 0.12],
        [at(7, 0.3), 0.55],
        [at(8), 0.34],
      ]),
    );
    grid.current!.style.opacity = String(
      keys(t, [
        [0, 0],
        [at(1) - 0.1, 0],
        [at(1), 1],
        [at(4) - 0.05, 1],
        [at(4), 0.6],
        [at(7) - 0.1, 1],
        [at(7), 0.35],
      ]),
    );
    grid.current!.style.backgroundPosition = `${-t * 6}px ${-t * 3}px`;

    // Fire each ripple once, as the frame passes it (not while scrubbing backwards).
    const prev = last.current;
    last.current = t;
    if (t < prev || t - prev > 0.5) return;
    for (const [hit, x, y] of RIPPLES)
      if (prev < hit && hit <= t)
        window.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y, bubbles: true }));
  });

  return (
    <>
      <div ref={ground} className="layer" style={{ background: "#0b0b0b" }} />
      <div ref={glow} className="layer" />
      <div ref={field} data-field className="layer" style={{ opacity: 0 }}>
        <Suspense fallback={null}>
          <FieldReady onReady={() => setFieldReady(true)} />
          <PixelBlast
            variant="triangle"
            pixelSize={3}
            color="#ffffff"
            pixelSizeJitter={0.35}
            patternScale={3.75}
            patternDensity={0.75}
            speed={2}
            edgeFade={0.2}
            enableRipples
            liquid={false}
            rippleSpeed={0.22}
            rippleThickness={0.07}
            rippleIntensityScale={1.1}
            autoPauseOffscreen={false}
            minFps={0}
            style={{ position: "absolute", inset: 0 }}
          />
        </Suspense>
      </div>
      {/* The cover style's grid: 1.2px dots every 26px at 7%. */}
      <div
        ref={grid}
        className="layer"
        style={{
          backgroundImage: "radial-gradient(circle, rgb(255 255 255 / 0.07) 1.2px, transparent 1.6px)",
          backgroundSize: "26px 26px",
          opacity: 0,
        }}
      />
    </>
  );
}

/** Resolves once the lazy field's chunk has loaded and its canvas has painted a few frames. */
function FieldReady({ onReady }: { onReady: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    const canvas = document.querySelector<HTMLCanvasElement>("[data-field] canvas");
    if (canvas && canvas.width > 0) {
      done.current = true;
      setTimeout(onReady, 300);
    }
  });
  return null;
}
