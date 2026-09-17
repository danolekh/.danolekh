import { useEffect, useRef, useState } from "react";
import { BlockShell } from "@/lib/content/block-shell";
import type { DotFieldConfig } from "@/lib/content/consolline/dot-field";
import { cn } from "@/lib/utils";

/* Live versions of two consolline.com effects, embedded in its case study.
 *
 * The server renders a poster only — a still of the same effect, sized by a fixed-aspect stage so
 * nothing shifts when the canvas takes over. The WebGL code is a dynamic import that fires once the
 * block is near the viewport, so it is its own chunk and no other page ever downloads it. The poster
 * fades out only after the first real frame, and stays for no-JS, no-WebGL and failed loads.
 *
 * The stage is Consolline's own ground (#121311) in both site themes: this is a window onto their
 * site, and their lime-on-near-black is the thing being shown. */

const STAGE = "#121311";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Flips to true once the element comes within `rootMargin` of the viewport, and stays there. */
function useNearViewport(ref: React.RefObject<HTMLElement | null>, rootMargin = "400px 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setNear(true);
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, near]);
  return near;
}

/* The canvas is created per mount rather than rendered: a lost WebGL context cannot be revived, so
 * an effect that runs twice (StrictMode, a remount) must never be handed the canvas it just lost. */
function createCanvas(host: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.className =
    "pointer-events-none absolute inset-0 size-full opacity-0 transition-opacity duration-700";
  host.appendChild(canvas);
  return canvas;
}

export function ConsollineGlobeBlock(props: { title?: string; caption?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(hostRef);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!near || !host) return;
    const canvas = createCanvas(host);
    let dispose: (() => void) | null = null;
    let cancelled = false;

    import("@/lib/content/consolline/globe")
      .then(({ mountGlobe }) => {
        if (cancelled) return;
        dispose = mountGlobe(host, canvas, {
          reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
          /* consolline.com draws it as a background at 640px; framed here at half that, the same
             levels read as a smudge, so the land and the floor get a little more light */
          look: { mapBrightness: 0.9, ambient: 0.13, oceanBrightness: 0.1 },
          onLive: () => {
            canvas.classList.remove("opacity-0");
            setLive(true);
          },
        });
      })
      .catch(() => {
        /* a failed chunk load leaves the poster, which is the whole fallback */
      });

    return () => {
      cancelled = true;
      dispose?.();
      canvas.remove();
      setLive(false);
    };
  }, [near]);

  return (
    <BlockShell
      title={props.title ?? "Live · the WebGL globe"}
      caption={
        props.caption ??
        "The same shader and driver as consolline.com, running here. Drag it sideways to spin it; scrolling the page gives it a push."
      }
    >
      <div
        ref={hostRef}
        className="relative aspect-square touch-pan-y overflow-hidden select-none sm:aspect-[16/10]"
        style={{ background: STAGE }}
      >
        {/* A square still of the sphere, which is .8 of the stage's height and centred — so the
            poster lines up with the first frame at every aspect. */}
        <img
          src="/images/p/consolline/globe-poster.webp"
          alt="A dotted globe in lime on a near-black background"
          width={1200}
          height={1200}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            "absolute top-0 left-1/2 aspect-square h-full w-auto max-w-none -translate-x-1/2 transition-opacity duration-700",
            live && "opacity-0",
          )}
        />
      </div>
    </BlockShell>
  );
}

/* consolline.com's calculator map: a 45-degree halftone screen measured off the file itself (pitch
 * 10.37px, a dot centre at 1.467, 12.038). The texture is their plate at twice the brightness, so
 * full ink reads as the accent lime (186, 238, 42); the poster is a render of the field at rest, since
 * the plate's own dots are pixel art that looks rough once scaled. Dots rest at two thirds of that and the wake
 * lifts them by half, which lands exactly on the accent: any more and red and green both clip, and
 * the wake turns yellow. */
const HALFTONE: DotFieldConfig = {
  texture: "/images/p/consolline/halftone-plate.webp",
  source: { width: 2052, height: 1155 },
  lattice: { pitch: 10.37, angle: 45, dotX: 1.467, dotY: 12.038 },
  ink: (186 + 238 + 42) / 255,
  cull: 0.0008,
  color: [124, 159, 28],
  alpha: 1,
  push: 1.15,
  glow: 0.6,
  lift: 0.5,
};

export function HalftoneFieldBlock(props: { title?: string; caption?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLImageElement>(null);
  const near = useNearViewport(hostRef);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const plate = plateRef.current;
    if (!near || !host || !plate) return;
    /* Under reduced motion the poster is the still frame; the field is nothing but motion. */
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const canvas = createCanvas(host);
    let dispose: (() => void) | null = null;
    let cancelled = false;

    import("@/lib/content/consolline/dot-field")
      .then(({ mountDotField }) => {
        if (cancelled) return;
        dispose = mountDotField(host, canvas, plate, HALFTONE, () => {
          canvas.classList.remove("opacity-0");
          setLive(true);
        });
      })
      .catch(() => {
        /* a failed chunk load leaves the poster */
      });

    return () => {
      cancelled = true;
      dispose?.();
      canvas.remove();
      setLive(false);
    };
  }, [near]);

  return (
    <BlockShell
      title={props.title ?? "Live · the halftone dot field"}
      caption={
        props.caption ??
        "consolline.com's world map, redrawn dot by dot. Move your pointer or finger across it, or click for a ripple; left alone, it wanders on its own."
      }
    >
      <div
        ref={hostRef}
        className="relative aspect-[4/3] overflow-hidden select-none sm:aspect-[16/9]"
        style={{ background: STAGE }}
      >
        {/* The field at rest, zoomed in on the middle of the map. The shader reads this <img>'s
            box, so the live dots land exactly on the still ones at every breakpoint. */}
        <img
          ref={plateRef}
          src="/images/p/consolline/halftone-poster.webp"
          alt="A halftone world map in lime dots on a near-black background"
          width={2052}
          height={1155}
          loading="lazy"
          decoding="async"
          draggable={false}
          className={cn(
            "absolute top-1/2 left-1/2 h-auto w-[260%] max-w-none -translate-x-[55%] -translate-y-[35%] transition-opacity duration-700 sm:w-[160%]",
            live && "opacity-0",
          )}
        />
      </div>
    </BlockShell>
  );
}
