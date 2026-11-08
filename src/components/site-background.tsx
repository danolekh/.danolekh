import { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useHeavyEffectsAllowed } from "@/lib/use-heavy-effects";

// Lazy so three.js and postprocessing split into their own chunk. Statically imported they landed
// in the single entry bundle, which meant every visitor downloaded and parsed them — including the
// weak devices that now skip the effect, where that parse cost is itself a main source of jank.
const PixelBlast = lazy(() => import("@/components/pixel-blasts"));

/** The site's WebGL pixel field. Blue on light, white on dark. Paints nothing until the page is idle. */
export function SiteBackground({ dark = false }: { dark?: boolean }) {
  const [mounted, setMounted] = useState(false);
  // The background is decoration, so it waits until the page has loaded and the browser is idle:
  // its 140 KB of WebGL code and shader setup otherwise compete with the first paint on a phone.
  useEffect(() => {
    let idle = 0;
    const start = () => {
      idle = window.requestIdleCallback
        ? window.requestIdleCallback(() => setMounted(true), { timeout: 2000 })
        : window.setTimeout(() => setMounted(true), 200);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      window.removeEventListener("load", start);
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
    };
  }, []);

  // Weak devices skip the background entirely: whoever renders this already paints a plain colour
  // behind it, so dropping it costs nothing visually and buys back the frame budget.
  const heavyEffectsAllowed = useHeavyEffectsAllowed();

  // Latched, so a device whose frame rate already proved too low doesn't get the effect handed
  // back on the next theme change (which remounts PixelBlast via its `key`).
  const [tooSlow, setTooSlow] = useState(false);
  const handleTooSlow = useCallback(() => setTooSlow(true), []);

  if (!mounted || !heavyEffectsAllowed || tooSlow) return null;
  return (
    <Suspense fallback={null}>
      <PixelBlast
        key={dark ? "dark" : "light"}
        minFps={24}
        onTooSlow={handleTooSlow}
        variant="triangle"
        pixelSize={3}
        color={dark ? "#ffffff" : "blue"}
        pixelSizeJitter={0.35}
        patternScale={3.75}
        patternDensity={0.75}
        speed={2}
        edgeFade={0.2}
        enableRipples={true}
        liquid={false}
        rippleSpeed={0.15}
        rippleThickness={0.05}
        rippleIntensityScale={0.5}
      />
    </Suspense>
  );
}
