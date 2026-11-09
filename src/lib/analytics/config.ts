// PostHog project "demos" (EU cloud), shared with the demos because the free plan allows one project:
// filter by $host. The key is public by design, it ships in the page either way. Empty turns analytics off.
export const POSTHOG_KEY = "phc_r9mS6GUsXCwhN4T2wD5ACUqz9NkijD4kUZmqb3Szq7Pn";
export const POSTHOG_API = "eu.i.posthog.com";
export const POSTHOG_ASSETS = "eu-assets.i.posthog.com";
export const POSTHOG_UI = "https://eu.posthog.com";

// First-party path the browser talks to, so blockers leave the requests alone. Served by
// src/lib/analytics/relay.ts. Not called anything like "analytics": blocklists match on that.
export const RELAY_PATH = "/rly";
