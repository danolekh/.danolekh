import { useEffect } from "react";
import { startAnalytics, track } from "@/lib/analytics";

const CAL_HOST = "cal.com";

/** Starts PostHog and reports links leaving the site. */
export function Analytics() {
  useEffect(() => {
    void startAnalytics();
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const external = link.protocol.startsWith("http") && link.hostname !== location.hostname;
      if (link.protocol === "mailto:" || (external && !link.hostname.endsWith(CAL_HOST))) {
        track("outbound_click", { href: link.href, label: link.textContent?.trim() });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
