import { useEffect, useState } from "react";

/* Decides whether this device should run the decorative WebGL background.
 *
 * PixelBlast is a full-viewport fragment shader — FBM noise, Bayer dithering and a per-fragment
 * ripple loop, redrawn every frame. On a weak GPU that is the difference between a smooth page and
 * one that janks on scroll, so the effect is opt-in per device rather than always-on.
 *
 * Two layers of defence:
 *   - this hook: cheap static signals, checked once before any WebGL context is created;
 *   - the FPS watchdog inside PixelBlast: catches devices that pass everything below and still
 *     can't keep up.
 *
 * Everything here is a heuristic except `prefers-reduced-motion` and `saveData`, which are explicit
 * user choices. Missing hints are never held against a device — Safari and Firefox report neither
 * core count nor memory, and there the watchdog is the real gate.
 */

// Logical cores. Current phones report 8; the budget-Android and older-iPhone tier that actually
// struggles with a full-screen shader reports 4 or fewer.
const MIN_CORES = 4;

// `navigator.deviceMemory` is approximate RAM in GiB, rounded down to a power of two and capped at
// 8 for fingerprinting reasons — so this means "reports 2 GiB or less".
const MIN_MEMORY_GB = 4;

// Software rasterizers happily compile the shader and then run it at single-digit FPS.
const SOFTWARE_RENDERERS =
  /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen|generic renderer|microsoft basic/i;

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Probes for a WebGL2 context good enough to be worth using, then throws it away. */
function hasUsableWebgl2(): boolean {
  let gl: WebGL2RenderingContext | null = null;
  try {
    // `failIfMajorPerformanceCaveat` lets the browser tell us it would fall back to software.
    // A null result therefore means either no WebGL2 at all — and the shader is authored for
    // GLSL3, which WebGL1 cannot compile — or WebGL2 that the driver itself flagged as slow.
    // Both are reasons not to run the effect.
    gl = document.createElement("canvas").getContext("webgl2", {
      failIfMajorPerformanceCaveat: true,
    });
    if (!gl) return false;

    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) {
      const renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) ?? "");
      if (SOFTWARE_RENDERERS.test(renderer)) return false;
    }

    return true;
  } catch {
    return false;
  } finally {
    // Contexts are a limited resource; hand this one back rather than waiting for GC.
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

function canRunHeavyEffects(): boolean {
  if (typeof window === "undefined") return false;

  // User preferences first: these are stated choices, not inferences about the hardware.
  if (window.matchMedia?.(REDUCED_MOTION_QUERY).matches) return false;

  const nav = navigator as NavigatorWithHints;
  if (nav.connection?.saveData) return false;

  if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < MIN_CORES)
    return false;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < MIN_MEMORY_GB) return false;

  return hasUsableWebgl2();
}

/** `false` during SSR and on the first client render, so nothing heavy is mounted until we know. */
export function useHeavyEffectsAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(canRunHeavyEffects());

    // Toggling reduced-motion in the OS should take effect without a reload.
    const mq = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!mq) return;
    const onChange = () => setAllowed(canRunHeavyEffects());
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return allowed;
}

/** Just the motion preference, for effects that stay on screen but stop animating. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.(REDUCED_MOTION_QUERY);
    if (!mq) return;
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
