import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { BlockShell } from "@/lib/content/block-shell";
import type { DotFieldConfig } from "@/lib/content/consolline/dot-field";
import type { GlobeOptions } from "@/lib/content/consolline/globe-renderer";
import { cn } from "@/lib/utils";

/* Live versions of two consolline.com effects, embedded in its case study.
 *
 * The server renders a poster only — a still of the same effect, sized by a fixed-aspect stage so
 * nothing shifts when the canvas takes over. The WebGL code is a dynamic import that fires once the
 * block is near the viewport, so it is its own chunk and no other page ever downloads it. The poster
 * fades out only after the first real frame, and stays for no-JS, no-WebGL and failed loads.
 *
 * In the dark theme the stage is Consolline's own ground (#121311) and their lime is the ink: a window
 * onto their site. consolline.com has no light theme, so the light cut is a reading of it rather than
 * a copy, matched to the light cover: an olive ink on a warm near-white. Each theme has its own poster
 * (both in the markup, the `.dark` class shows one), and a theme switch remounts the effect, so the
 * new theme's poster covers the gap while the new canvas starts. */

type Mode = "light" | "dark";

/** The resolved theme, or null until the client knows it; the effects wait for it rather than start
 *  in one theme and remount into the other a frame later. */
function useMode(): Mode | null {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "light" || resolvedTheme === "dark" ? resolvedTheme : null;
}

/** Poster pair: the `.dark` class on <html> picks one before paint. */
function Posters({
  name,
  alt,
  className,
  width,
  height,
}: {
  name: string;
  alt: Record<Mode, string>;
  className: string;
  width: number;
  height: number;
}) {
  const img = (mode: Mode, visibility: string) => (
    <img
      src={`/images/p/consolline/${name}${mode === "light" ? "-light" : ""}.webp`}
      alt={alt[mode]}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn(className, visibility)}
    />
  );
  return (
    <>
      {img("light", "dark:hidden")}
      {img("dark", "hidden dark:block")}
    </>
  );
}

/* A stage per theme; the class keeps SSR right before the client knows the theme. */
const STAGE_CLASS = "bg-[#f6f7f3] dark:bg-[#121311]";
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

/* consolline.com draws the globe as a background at 640px; framed here at half that, the same levels
   read as a smudge, so the land and the floor get a little more light. The light cut paints the dots
   over the body instead of adding light to it, with the limb deepening rather than whitening. */
const GLOBE_LOOK: Record<Mode, Partial<GlobeOptions>> = {
  dark: { mapBrightness: 0.9, ambient: 0.13, oceanBrightness: 0.1 },
  light: {
    paint: 1,
    baseColor: [0.925, 0.93, 0.91],
    dotColor: [0.4, 0.49, 0.13],
    highlight: [0.2, 0.26, 0.04],
    mapBrightness: 1.6,
    oceanBrightness: 0.22,
    ambient: 0.3,
    whiten: 0.5,
    bloom: 0.35,
  },
};

export function ConsollineGlobeBlock(props: { title?: string; caption?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(hostRef);
  const mode = useMode();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!near || !host || !mode) return;
    const canvas = createCanvas(host);
    let dispose: (() => void) | null = null;
    let cancelled = false;

    import("@/lib/content/consolline/globe")
      .then(({ mountGlobe }) => {
        if (cancelled) return;
        dispose = mountGlobe(host, canvas, {
          reducedMotion: window.matchMedia(REDUCED_MOTION_QUERY).matches,
          look: GLOBE_LOOK[mode],
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
  }, [near, mode]);

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
        data-capture="globe"
        className={cn(
          "relative aspect-square touch-pan-y overflow-hidden select-none sm:aspect-[16/10]",
          STAGE_CLASS,
        )}
      >
        {/* A square still of the sphere, which is .8 of the stage's height and centred — so the
            poster lines up with the first frame at every aspect. */}
        <Posters
          name="globe-poster"
          alt={{
            dark: "A dotted globe in lime on a near-black background",
            light: "A dotted globe in olive on an off-white background",
          }}
          width={1200}
          height={1200}
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
const HALFTONE_BASE = {
  texture: "/images/p/consolline/halftone-plate.webp",
  source: { width: 2052, height: 1155 },
  lattice: { pitch: 10.37, angle: 45, dotX: 1.467, dotY: 12.038 },
  ink: (186 + 238 + 42) / 255,
  cull: 0.0008,
  alpha: 1,
  push: 1.15,
  glow: 0.6,
  lift: 1,
};

/* The wake mixes each dot toward `liftColor`: the accent on the dark ground, a deeper olive on the
 * light one, where brightening would only wash the dots into the page. */
const HALFTONE: Record<Mode, DotFieldConfig> = {
  dark: { ...HALFTONE_BASE, color: [124, 159, 28], liftColor: [186, 238, 42] },
  light: { ...HALFTONE_BASE, color: [104, 132, 30], liftColor: [58, 84, 6] },
};

export function HalftoneFieldBlock(props: { title?: string; caption?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(hostRef);
  const mode = useMode();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const plate = plateRef.current;
    if (!near || !host || !plate || !mode) return;
    /* Under reduced motion the poster is the still frame; the field is nothing but motion. */
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const canvas = createCanvas(host);
    let dispose: (() => void) | null = null;
    let cancelled = false;

    import("@/lib/content/consolline/dot-field")
      .then(({ mountDotField }) => {
        if (cancelled) return;
        dispose = mountDotField(host, canvas, plate, HALFTONE[mode], () => {
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
  }, [near, mode]);

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
        data-capture="halftone"
        className={cn(
          "relative aspect-[4/3] overflow-hidden select-none sm:aspect-[16/9]",
          STAGE_CLASS,
        )}
      >
        {/* The field at rest, zoomed in on the middle of the map. The shader reads this wrapper's
            box (the plate's aspect; a hidden poster would measure as nothing), so the live dots
            land exactly on the still ones at every breakpoint. */}
        <div
          ref={plateRef}
          className={cn(
            "absolute top-1/2 left-1/2 aspect-[2052/1155] w-[260%] max-w-none -translate-x-[55%] -translate-y-[35%] transition-opacity duration-700 sm:w-[160%]",
            live && "opacity-0",
          )}
        >
          <Posters
            name="halftone-poster"
            alt={{
              dark: "A halftone world map in lime dots on a near-black background",
              light: "A halftone world map in olive dots on an off-white background",
            }}
            width={2052}
            height={1155}
            className="size-full"
          />
        </div>
      </div>
    </BlockShell>
  );
}
