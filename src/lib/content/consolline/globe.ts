/* The globe driver from consolline.com: the turn, the drag and the lifecycle.
 *
 * The angle is integrated from a speed rather than derived from the scroll offset, and everything
 * that touches the globe feeds that one speed: a slow drift (about a minute to the turn), scrolling,
 * which adds a kick that decays back to the drift, and dragging, which drives the angle directly and
 * hands its own velocity over on release. The loop never settles, so the IntersectionObserver is
 * the whole budget — off screen, nothing runs.
 *
 * Loaded with a dynamic import from the case-study block, so this and the renderer are a chunk of
 * their own that only /p/consolline ever requests. */
import { type Globe, type GlobeOptions, LOOK, createGlobe, quality } from "./globe-renderer";

export type MountGlobeOptions = {
  reducedMotion: boolean;
  /** Overrides on top of the site's LOOK, e.g. exposure for a smaller frame. */
  look?: Partial<GlobeOptions>;
  /** Called once, after a frame with the land mask on the GPU has really drawn. */
  onLive: () => void;
};

const TWO_PI = Math.PI * 2;
const IDLE = TWO_PI / 60;
/* Scrolling takes it to eight times the drift. */
const BOOST_MAX = IDLE * 7;
/* e-fold of the glide back down to the drift. */
const TAU = 0.5;
/* An ordinary ~700px/s scroll sits at the ceiling; a slow one gets a proportionally smaller nudge. */
const BOOST_PER_PX = BOOST_MAX / (700 * TAU);
/* A flick can outrun scrolling: that one is the reader's own gesture. */
const FLING_MAX = IDLE * 24;
const BASE_PHI = 4.0;
/* The pole sits just beyond the top limb, as in the frame. */
const BASE_THETA = 0.06;

/** Returns a disposer, or null when WebGL is unavailable (the poster simply stays). */
export function mountGlobe(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  { reducedMotion, look, onLive }: MountGlobeOptions,
): (() => void) | null {
  const small = window.matchMedia("(max-width: 640px)");
  const controller = new AbortController();
  const { signal } = controller;

  let globe: Globe | null = null;
  let raf = 0;
  let near = false;
  let live = false;
  let phi = BASE_PHI;
  let boost = 0;
  let last = 0;
  let lastY = window.scrollY;
  let q = quality(small.matches);
  /* Measured on resize, never per frame: a layout read inside rAF is a forced layout. */
  let box = { width: host.clientWidth, height: host.clientHeight };

  let dragging = false;
  let dragPointer: number | null = null;
  let dragX = 0;
  let dragAt = 0;
  let dragVel = 0;

  /* Under reduced motion the sphere does not turn on its own — except while being dragged. */
  const animating = () => dragging || !reducedMotion;

  function draw() {
    if (!globe) return;
    globe.update({ phi, theta: BASE_THETA, width: box.width, height: box.height, ...q });
    if (!live && globe.ready) {
      live = true;
      onLive();
    }
  }

  function frame(now: number) {
    raf = 0;
    /* Capped, so a hidden tab coming back does not snap the sphere round. */
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    if (!dragging && !reducedMotion) {
      boost *= Math.exp(-dt / TAU);
      phi = (phi + (IDLE + boost) * dt) % TWO_PI;
    }
    draw();
    schedule();
  }

  function schedule() {
    if (raf || !globe || !near || document.hidden) return;
    /* A still sphere still needs the frame that shows the land mask once it lands. */
    if (!animating() && live) return;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (!raf) return;
    window.cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
  }

  /* Distance, not direction: scrolling up speeds it up exactly as much as scrolling down. */
  function onScroll() {
    const y = window.scrollY;
    const moved = Math.abs(y - lastY);
    lastY = y;
    if (dragging || reducedMotion) return;
    boost = Math.min(BOOST_MAX, boost + moved * BOOST_PER_PX);
    schedule();
  }

  /* A turn of pi across the sphere's own diameter, so the surface keeps up with the pointer. The
     sphere's diameter is .8 of the box's height. */
  const radiansPerPixel = () => Math.PI / Math.max(1, box.height * 0.8);

  function onPointerDown(event: PointerEvent) {
    if (!globe || dragging || !event.isPrimary) return;
    dragging = true;
    dragPointer = event.pointerId;
    dragX = event.clientX;
    dragAt = event.timeStamp || performance.now();
    dragVel = 0;
    boost = 0;
    try {
      host.setPointerCapture(event.pointerId);
    } catch {
      /* a synthetic pointer the element never received; the pointerleave backstop covers it */
    }
    schedule();
  }

  function onPointerMove(event: PointerEvent) {
    if (!dragging || event.pointerId !== dragPointer) return;
    const now = event.timeStamp || performance.now();
    const turn = (event.clientX - dragX) * radiansPerPixel();
    phi = (phi + turn) % TWO_PI;
    /* Smoothed: a release lands between two moves, and the last one alone may be jitter. */
    const dt = (now - dragAt) / 1000;
    if (dt > 0.001) dragVel = dragVel * 0.6 + (turn / dt) * 0.4;
    dragX = event.clientX;
    dragAt = now;
    if (!raf) draw();
    schedule();
  }

  function endDrag(event: PointerEvent, fling: boolean) {
    if (!dragging || event.pointerId !== dragPointer) return;
    dragging = false;
    dragPointer = null;
    /* A stale throw is worse than none: a drag that paused before release counts as a stop. */
    const still =
      !fling ||
      reducedMotion ||
      Math.abs(dragVel) < IDLE * 0.5 ||
      (event.timeStamp && event.timeStamp - dragAt > 120);
    boost = still ? 0 : Math.max(-FLING_MAX, Math.min(FLING_MAX, dragVel - IDLE));
    dragVel = 0;
    schedule();
  }

  function measure() {
    box = { width: host.clientWidth, height: host.clientHeight };
  }

  function resize() {
    q = quality(small.matches);
    measure();
    if (!globe) return;
    if (!animating()) draw();
    else schedule();
  }

  if (!box.width || !box.height) return null;
  globe = createGlobe(canvas, {
    width: box.width,
    height: box.height,
    phi: BASE_PHI,
    theta: BASE_THETA,
    scale: 1,
    ...q,
    ...LOOK,
    ...look,
  });
  if (!globe) return null;
  draw();

  const observer = new IntersectionObserver(
    (entries) => {
      near = entries.some((entry) => entry.isIntersecting);
      if (near) schedule();
      else stop();
    },
    { rootMargin: "100px 0px" },
  );
  observer.observe(host);

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);

  window.addEventListener("scroll", onScroll, { passive: true, signal });
  small.addEventListener("change", resize, { signal });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : schedule()), {
    signal,
  });
  host.addEventListener("pointerdown", onPointerDown, { signal });
  host.addEventListener("pointermove", onPointerMove, { signal });
  host.addEventListener("pointerup", (e) => endDrag(e, true), { signal });
  /* touch-action: pan-y on the host leaves vertical scrolling to the browser; when it claims the
     gesture it sends pointercancel, which ends the drag without a throw. */
  host.addEventListener("pointercancel", (e) => endDrag(e, false), { signal });
  host.addEventListener(
    "pointerleave",
    (e) => {
      if (!host.hasPointerCapture?.(e.pointerId)) endDrag(e, true);
    },
    { signal },
  );

  /* Browsers cap live WebGL contexts (~16): a client-side navigation away must hand this one back,
     or the globe silently stops drawing a few visits in. */
  return () => {
    stop();
    controller.abort();
    observer.disconnect();
    resizeObserver.disconnect();
    globe?.destroy();
    globe = null;
  };
}
