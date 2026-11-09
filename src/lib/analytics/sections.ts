import { useEffect, type RefObject } from "react";
import { track, trackNow } from "./index";

// What holds attention on a long page: which sections reached the middle of the screen, and for how
// long. Marked up with `data-section="name"`.

const MIN_DWELL_MS = 1000;

export function useSectionTracking(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const seen = new Set<string>();
    const entered = new Map<string, number>();

    const leave = (name: string, send: typeof track) => {
      const since = entered.get(name);
      if (since === undefined) return;
      entered.delete(name);
      const ms = Math.round(performance.now() - since);
      if (ms >= MIN_DWELL_MS) send("section_dwell", { section: name, ms, seconds: Math.round(ms / 1000) });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const name = (entry.target as HTMLElement).dataset.section;
          if (!name) continue;
          if (entry.isIntersecting) {
            entered.set(name, performance.now());
            if (!seen.has(name)) {
              seen.add(name);
              track("section_view", { section: name });
            }
          } else {
            leave(name, track);
          }
        }
      },
      // A one-pixel reading line across the middle of the screen: one section at a time.
      { rootMargin: "-50% 0px -50% 0px" },
    );
    el.querySelectorAll("[data-section]").forEach((section) => io.observe(section));

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        [...entered.keys()].forEach((name) => {
          const since = entered.get(name);
          leave(name, trackNow);
          if (since !== undefined) entered.set(name, Infinity);
        });
      } else {
        for (const [name, since] of entered) if (since === Infinity) entered.set(name, performance.now());
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      [...entered.keys()].forEach((name) => leave(name, track));
    };
  }, [root]);
}
