import type { PostHogInterface as PostHog } from "posthog-js";
import { POSTHOG_KEY, POSTHOG_UI, RELAY_PATH } from "./config";

// Two levels of tracking, both through PostHog:
//   no answer or declined: cookieless. Nothing is stored in the browser and visitors are counted by a
//     daily hash on PostHog's side. Pages, clicks, sections and heatmaps still arrive.
//   accepted: a persistent id, which adds returning visitors, session replay and a person profile.

type Props = Record<string, unknown>;

// Open /?me=1 once in a browser of Dan's own and it's never tracked again.
const ME = "dan-me";

let posthog: PostHog | undefined;
let off = false;
let starting: Promise<PostHog | undefined> | undefined;
let queue: [string, Props?][] = [];
let visitor: Props = {};

function allowed() {
  if (!POSTHOG_KEY) return false;
  if (import.meta.env.DEV) return false;
  const anyHost = import.meta.env.VITE_ANALYTICS_ANY_HOST === "1";
  if (!anyHost && location.hostname !== "www.danolekh.com") return false;
  // The replay watch page is private and all video.
  if (location.pathname === "/m" || location.pathname.startsWith("/m/")) return false;
  try {
    if (new URLSearchParams(location.search).has("me")) localStorage.setItem(ME, "1");
    if (localStorage.getItem(ME)) return false;
  } catch {
    // Storage blocked: carry on, cookieless needs none of it.
  }
  return true;
}

async function fetchVisitor(): Promise<Props> {
  const found: Props = {};
  try {
    const response = await fetch(`${RELAY_PATH}/geo`);
    const geo = (await response.json()) as Record<string, string | undefined>;
    for (const [key, value] of Object.entries(geo)) if (value) found[`visitor_${key}`] = value;
  } catch {
    // The events still go out, just without this.
  }
  // A link Dan hands out, like danolekh.com/?c=acme, says who the visit is before anything else can.
  const params = new URLSearchParams(location.search);
  const ref = params.get("c") ?? params.get("ref");
  if (ref) found.visitor_ref = ref;
  return found;
}

function setPerson(ph: PostHog) {
  if (ph.get_explicit_consent_status() === "granted") ph.setPersonProperties(visitor);
}

/** Loads PostHog after the page has settled. Safe to call more than once. */
export function startAnalytics(): Promise<PostHog | undefined> {
  if (starting) return starting;
  if (!allowed()) {
    off = true;
    queue = [];
    return (starting = Promise.resolve(undefined));
  }
  starting = new Promise((resolve) => {
    const idle = window.requestIdleCallback ?? ((run: () => void) => setTimeout(run, 1500));
    idle(
      async () => {
        const [{ default: ph }, found] = await Promise.all([import("posthog-js"), fetchVisitor()]);
        visitor = found;
        ph.init(POSTHOG_KEY, {
          api_host: `${location.origin}${RELAY_PATH}`,
          ui_host: POSTHOG_UI,
          defaults: "2026-08-30",
          cookieless_mode: "on_reject",
          // With no answer, count the visit cookieless instead of dropping it.
          opt_out_capturing_by_default: true,
          cross_subdomain_cookie: false,
          person_profiles: "identified_only",
          autocapture: true,
          capture_pageview: "history_change",
          capture_pageleave: true,
          enable_heatmaps: true,
          capture_dead_clicks: true,
          capture_exceptions: true,
          capture_performance: { web_vitals: true, network_timing: true },
          session_recording: {
            maskAllInputs: true,
            // The work gallery is WebGL; a replay without this shows a hole where the hero is.
            captureCanvas: { recordCanvas: true, canvasFps: 2, canvasQuality: "0.4" },
          },
          before_send: (event) => {
            if (event && event.event !== "$snapshot") event.properties = { ...event.properties, ...visitor };
            return event;
          },
          loaded: (client) => {
            posthog = client;
            for (const [event, props] of queue) client.capture(event, props);
            queue = [];
            setPerson(client);
            resolve(client);
          },
        });
      },
      { timeout: 2500 },
    );
  });
  return starting;
}

export function track(event: string, props?: Props) {
  if (off) return;
  if (posthog) posthog.capture(event, props);
  else if (queue.length < 50) queue.push([event, props]);
}

/** For the moment the tab is going away: the batch queue wouldn't get the chance to flush. */
export function trackNow(event: string, props?: Props) {
  if (off) return;
  if (posthog) posthog.capture(event, props, { transport: "sendBeacon", send_instantly: true });
}

/** The visitor's PostHog id, only when they agreed to be recognised. */
export function consentedVisitorId(): string | undefined {
  return posthog?.get_explicit_consent_status() === "granted" ? posthog.get_distinct_id() : undefined;
}

export type Consent = "pending" | "granted" | "denied";

export function consentStatus(): Consent | undefined {
  return posthog?.get_explicit_consent_status();
}

export function setConsent(granted: boolean) {
  if (!posthog) return;
  if (granted) {
    posthog.opt_in_capturing();
    setPerson(posthog);
  } else {
    posthog.opt_out_capturing();
  }
}
