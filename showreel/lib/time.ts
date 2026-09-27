/* The reel's clock: 128 BPM, so a beat is 0.46875 s, a bar 1.875 s, and eight bars are exactly
 * fifteen seconds. Every cut, hit and sound is placed with `at(bar, beat)`, and the picture and the
 * soundtrack (audio.ts) read the same numbers. */

export const BPM = 128;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const BARS = 8;
export const DURATION = BAR * BARS;
export const FPS = 60;

/** Seconds at a bar (0-7) and a beat within it (0-3, fractions for 8ths and 16ths). */
export const at = (bar: number, beat = 0) => bar * BAR + beat * BEAT;

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** 0 before `a`, 1 after `b`, linear between. */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const within = (t: number, a: number, b: number) => t >= a && t < b;

export type Ease = (p: number) => number;
export const ease = {
  linear: (p: number) => p,
  inCubic: (p: number) => p * p * p,
  outCubic: (p: number) => 1 - (1 - p) ** 3,
  inOutCubic: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
  outQuart: (p: number) => 1 - (1 - p) ** 4,
  inOutQuart: (p: number) => (p < 0.5 ? 8 * p ** 4 : 1 - (-2 * p + 2) ** 4 / 2),
  outQuint: (p: number) => 1 - (1 - p) ** 5,
  inExpo: (p: number) => (p === 0 ? 0 : 2 ** (10 * p - 10)),
  outExpo: (p: number) => (p === 1 ? 1 : 1 - 2 ** (-10 * p)),
  inOutExpo: (p: number) =>
    p === 0 ? 0 : p === 1 ? 1 : p < 0.5 ? 2 ** (20 * p - 10) / 2 : (2 - 2 ** (-20 * p + 10)) / 2,
  outBack: (p: number, s = 1.7) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,
  outElastic: (p: number) =>
    p === 0 ? 0 : p === 1 ? 1 : 2 ** (-10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
} satisfies Record<string, Ease>;

/** `from` to `to` between `a` and `b`, eased. */
export const tween = (t: number, a: number, b: number, from: number, to: number, e: Ease = ease.outExpo) =>
  mix(from, to, e(seg(t, a, b)));

/** Keyframes: [time, value, ease into this key]. Holds the first value before and the last after. */
export function keys(t: number, frames: readonly (readonly [number, number, Ease?])[]): number {
  if (t <= frames[0]![0]) return frames[0]![1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, e = ease.inOutCubic] = frames[i]!;
    const [t0, v0] = frames[i - 1]!;
    if (t < t1) return mix(v0, v1, e(seg(t, t0, t1)));
  }
  return frames[frames.length - 1]![1];
}

/** A pulse: 1 at `hit`, decaying to 0 over `length` seconds, 0 before. */
export const pulse = (t: number, hit: number, length: number) =>
  t < hit ? 0 : Math.max(0, 1 - (t - hit) / length) ** 2;

/** A repeatable pseudo-random number for an integer seed, so every frame renders the same. */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const rgb = (hex: string) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};
export function mixColor(a: string, b: string, p: number, alpha = 1): string {
  const [r0, g0, b0] = rgb(a);
  const [r1, g1, b1] = rgb(b);
  const c = (x: number, y: number) => Math.round(mix(x, y, clamp(p)));
  return `rgb(${c(r0, r1)} ${c(g0, g1)} ${c(b0, b1)} / ${alpha})`;
}
export const withAlpha = (hex: string, alpha: number) => mixColor(hex, hex, 0, alpha);
