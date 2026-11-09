import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { consentStatus, setConsent, startAnalytics, track } from "@/lib/analytics";

const ASK_AFTER_MS = 2500;
const CAL_HOST = "cal.com";

/** Starts PostHog, reports links leaving the site, and asks once about recording the visit. */
export function Analytics() {
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    void startAnalytics().then(() => {
      if (cancelled || consentStatus() !== "pending") return;
      timer = setTimeout(() => setAsking(true), ASK_AFTER_MS);
    });

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const external = link.protocol.startsWith("http") && link.hostname !== location.hostname;
      if (link.protocol === "mailto:" || (external && !link.hostname.endsWith(CAL_HOST))) {
        track("outbound_click", { href: link.href, label: link.textContent?.trim() });
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("click", onClick);
    };
  }, []);

  if (!asking) return null;

  const answer = (granted: boolean) => {
    setConsent(granted);
    setAsking(false);
  };

  return (
    <aside
      aria-label="Recording this visit"
      className="fixed right-4 bottom-4 left-4 z-50 rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_16px_40px_rgba(0,0,0,0.12)] transition-[opacity,translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none sm:right-auto sm:w-88 print:hidden"
    >
      <p className="text-pretty">
        Can I remember your browser and record this visit? It shows me what's unclear on the page. Without it I only keep anonymous stats.{" "}
        <Link to="/privacy" hash="website" className="underline decoration-neutral-300 underline-offset-2 transition-colors duration-300 hover:decoration-neutral-900">
          Details
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => answer(true)}
          className="h-9 rounded-full bg-neutral-900 px-4 font-medium text-white transition-colors duration-300 hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          That's fine
        </button>
        <button
          type="button"
          onClick={() => answer(false)}
          className="h-9 rounded-full bg-neutral-100 px-4 font-medium text-neutral-900 transition-colors duration-300 hover:bg-neutral-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          No thanks
        </button>
      </div>
    </aside>
  );
}
