import { type ReactNode, useRef } from "react";

import { frameOf, useFrame } from "../lib/stage";
import { at, ease, hash, pulse, seg } from "../lib/time";

/* What sits over the picture: the camera's kick on each hit, a flash on the big ones, the halftone
 * dissolve into consolline, film grain and a vignette. */

/** The hits the camera feels: [time, strength in px]. */
const HITS: readonly [number, number][] = [
  [at(0, 1), 9],
  [at(1), 5],
  [at(1, 3), 6],
  [at(3), 4],
  [at(4), 4],
  [at(5), 4],
  [at(6), 4],
  [at(7), 8],
];

export function Camera({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFrame((t) => {
    let x = 0;
    let y = 0;
    let s = 1;
    const f = frameOf(t);
    for (const [hit, px] of HITS) {
      const k = pulse(t, hit, 0.32);
      if (!k) continue;
      x += (hash(f * 3.1 + hit) - 0.5) * 2 * px * k;
      y += (hash(f * 7.7 + hit) - 0.5) * 2 * px * k;
      s += 0.018 * pulse(t, hit, 0.22);
    }
    ref.current!.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
  });
  return (
    <div ref={ref} className="layer" style={{ zIndex: 10 }}>
      {children}
    </div>
  );
}

const FLASHES: readonly [number, number, number][] = [
  // time, strength, length
  [at(0, 1), 0.95, 0.09],
  [at(1), 0.18, 0.1],
  [at(3), 0.22, 0.12],
  [at(5), 0.2, 0.12],
  [at(6), 0.18, 0.1],
  [at(7), 0.9, 0.09],
];

export function Flash() {
  const ref = useRef<HTMLDivElement>(null);
  useFrame((t) => {
    let a = 0;
    for (const [hit, k, len] of FLASHES) a = Math.max(a, k * pulse(t, hit, len));
    ref.current!.style.opacity = a.toFixed(3);
  });
  // Over the grain and the vignette, and screened, so it reads as light rather than a grey veil.
  return (
    <div ref={ref} className="layer" style={{ zIndex: 80, background: "#eef3ff", mixBlendMode: "screen", opacity: 0 }} />
  );
}

/* consolline's halftone, as the cut into its scene: lime dots on a 45° screen swell from left to
 * right until they cover the frame, then shrink away the same way over the new ground. */
const PITCH = 20;
const IN = at(4) - 0.2;
const MID = at(4);
const OUT = at(4) + 0.24;

export function Halftone() {
  const ref = useRef<HTMLCanvasElement>(null);
  useFrame((t) => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== 1280 * dpr) {
      canvas.width = 1280 * dpr;
      canvas.height = 720 * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 1280, 720);
    if (t < IN || t > OUT + 0.05) return;
    ctx.fillStyle = "#baee2a";
    const max = PITCH * 0.74;
    const spread = 0.1;
    ctx.beginPath();
    // A 45° lattice: rows every PITCH/√2, each shifted by half a pitch.
    const step = PITCH / Math.SQRT2;
    for (let row = -1, y = 0; y < 720 + PITCH; row++, y = row * step) {
      const shift = row % 2 ? PITCH / 2 : 0;
      for (let x = -PITCH + shift; x < 1280 + PITCH; x += PITCH) {
        const d = (x / 1280) * 0.8 + (y / 720) * 0.2;
        const grow = ease.inCubic(seg(t, IN + d * spread, IN + d * spread + (MID - IN - spread)));
        const shrink = ease.outCubic(seg(t, MID + d * spread, MID + d * spread + (OUT - MID - spread)));
        const r = max * (t < MID ? grow : 1 - shrink);
        if (r <= 0.2) continue;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
    }
    ctx.fill();
  });
  return <canvas ref={ref} className="layer" style={{ zIndex: 55, width: 1280, height: 720 }} />;
}

/** Film grain, a new frame of noise every video frame, and a vignette. */
export function Grain() {
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef<ImageData | null>(null);
  useFrame((t) => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    if (!data.current) data.current = ctx.createImageData(canvas.width, canvas.height);
    const px = data.current.data;
    let seed = (frameOf(t) * 2654435761) >>> 0 || 1;
    for (let i = 0; i < px.length; i += 4) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      const v = (seed >>> 0) & 255;
      px[i] = px[i + 1] = px[i + 2] = v;
      px[i + 3] = 255;
    }
    ctx.putImageData(data.current, 0, 0);
  });
  return (
    <>
      <canvas
        ref={ref}
        width={640}
        height={360}
        className="layer"
        style={{ zIndex: 70, width: 1280, height: 720, opacity: 0.075, mixBlendMode: "overlay" }}
      />
      <div
        className="layer"
        style={{
          zIndex: 71,
          background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgb(0 0 0 / 0.55) 100%)",
        }}
      />
    </>
  );
}
