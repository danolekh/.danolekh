import { useEffect, useLayoutEffect, useRef } from "react";

import { DURATION, FPS } from "./time";

/* The driver: one requestAnimationFrame loop turns the page's clock into the reel's time `t` and
 * hands it to every scene, which sets its styles as a pure function of `t`. So any frame renders the
 * same however it's reached, and under cardstock's recorder (whose clock.js steps performance.now
 * and requestAnimationFrame one frame at a time) every frame is exact.
 *
 * Modes, from the URL:
 *   ?record   waits at 0 until the recorder calls window.__stage.start()
 *   ?t=7.5    holds that frame, for stills
 *   (none)    plays in a loop with a scrubber: space, ←/→ a frame, 1-8 a bar, `a` from the top with
 *             the soundtrack
 */

export const params = new URLSearchParams(location.search);
export const mode: "record" | "still" | "play" = params.has("record")
  ? "record"
  : params.has("t")
    ? "still"
    : "play";

type Frame = (t: number) => void;
const frames = new Set<{ current: Frame }>();
const listeners = new Set<(t: number, playing: boolean) => void>();

let started: number | null = null; // performance.now() at t = 0
let held: number | null = mode === "still" ? Number(params.get("t")) : mode === "play" ? 0 : null;
let playing = mode === "play";

export function time(): number {
  if (mode === "record") return started === null ? 0 : (performance.now() - started) / 1000;
  if (!playing || started === null) return held ?? 0;
  return ((performance.now() - started) / 1000) % DURATION;
}

export const control = {
  play() {
    if (playing) return;
    started = performance.now() - (held ?? 0) * 1000;
    playing = true;
  },
  pause() {
    held = time();
    playing = false;
  },
  seek(t: number) {
    held = Math.max(0, Math.min(DURATION - 1e-6, t));
    if (playing) started = performance.now() - held * 1000;
  },
  get playing() {
    return playing;
  },
  onTick(fn: (t: number, playing: boolean) => void) {
    listeners.add(fn);
    return () => void listeners.delete(fn);
  },
};

if (mode === "play") started = performance.now();

(window as unknown as { __stage: unknown }).__stage = {
  start() {
    started = performance.now();
  },
  time,
};

function loop() {
  const t = time();
  for (const f of frames) f.current(t);
  for (const l of listeners) l(t, playing);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/** Runs `fn(t)` every frame, and once right away so the first paint is already at `t`. */
export function useFrame(fn: Frame) {
  const ref = useRef(fn);
  ref.current = fn;
  useLayoutEffect(() => {
    frames.add(ref);
    ref.current(time());
    return () => void frames.delete(ref);
  }, []);
}

/* Ready once everything that takes time to arrive has: the fonts, every image, the decoded
 * morph frames, and each WebGL layer's first real frame. The recorder waits for html[data-ready]. */
const pending = new Set<string>(["fonts", "mount"]);
const check = () => {
  if (pending.size === 0) document.documentElement.setAttribute("data-ready", "");
};
export function waitFor(key: string) {
  pending.add(key);
  return () => {
    pending.delete(key);
    check();
  };
}
// Asked for by name: at this point nothing on the page has requested them yet.
void Promise.all(
  ['400 20px "Nunito Reel"', 'italic 400 20px "Nunito Reel"', '400 20px "JetBrains Mono Variable"'].map((f) =>
    document.fonts.load(f),
  ),
)
  .then(() => document.fonts.ready)
  .then(() => {
    pending.delete("fonts");
    check();
  });
/** Called once the whole tree has mounted, so every part has had the chance to register. */
export function mounted() {
  const images = waitFor("images");
  void Promise.all([...document.images].map((img) => img.decode().catch(() => {}))).then(images);
  pending.delete("mount");
  check();
}

export function useWaitFor(key: string, ready: boolean) {
  const done = useRef<(() => void) | null>(null);
  if (!done.current) done.current = waitFor(key);
  useEffect(() => {
    if (ready) done.current?.();
  }, [ready]);
}

export const frameOf = (t: number) => Math.floor(t * FPS + 1e-6);
