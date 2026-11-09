import { POSTHOG_API, POSTHOG_ASSETS, POSTHOG_KEY, RELAY_PATH } from "./config";

// The Worker side of analytics, ahead of the app router so trailing slashes reach PostHog untouched.
//   /rly/geo     what Cloudflare knows about this request: PostHog gets no IP in cookieless mode, so
//                this is where country, city and network come from for visitors who didn't consent
//   /rly/cal     Cal.com's booking webhook, which turns "clicked Book a call" into a name and email
//   /rly/*       everything else goes to PostHog, with the visitor's IP for its GeoIP step

type CfProps = {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  asOrganization?: string;
};

function geo(request: Request): Response {
  const cf = (request as Request & { cf?: CfProps }).cf;
  return Response.json(
    {
      country: cf?.country,
      region: cf?.region,
      city: cf?.city,
      timezone: cf?.timezone,
      network: cf?.asOrganization,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function asset(request: Request, target: string, ctx: ExecutionContext): Promise<Response> {
  // Workers' own cache; the DOM types in this project don't know about `default`.
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(target);
  if (response.ok) ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}

async function forward(request: Request, target: string): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  headers.delete("host");
  if (!/^Bearer ph[csx]_/.test(headers.get("authorization") ?? "")) headers.delete("authorization");
  headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") ?? "");
  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer(),
  });
}

async function verifyCal(body: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

type CalWebhook = {
  triggerEvent?: string;
  payload?: {
    title?: string;
    startTime?: string;
    type?: string;
    attendees?: { name?: string; email?: string; timeZone?: string }[];
    metadata?: Record<string, unknown>;
    responses?: Record<string, { value?: unknown }>;
  };
};

const CAL_EVENTS: Record<string, string> = {
  BOOKING_CREATED: "call_booked",
  BOOKING_RESCHEDULED: "call_rescheduled",
  BOOKING_CANCELLED: "call_cancelled",
};

async function cal(request: Request, env: { CAL_WEBHOOK_SECRET?: string }, ctx: ExecutionContext): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (!env.CAL_WEBHOOK_SECRET || !POSTHOG_KEY) return new Response(null, { status: 503 });
  const body = await request.text();
  if (!(await verifyCal(body, request.headers.get("x-cal-signature-256"), env.CAL_WEBHOOK_SECRET))) {
    return new Response(null, { status: 401 });
  }
  const { triggerEvent, payload } = JSON.parse(body) as CalWebhook;
  const event = triggerEvent && CAL_EVENTS[triggerEvent];
  const attendee = payload?.attendees?.[0];
  if (!event || !attendee?.email) return new Response(null, { status: 204 });

  // A visitor who agreed to tracking arrives with their PostHog id, so the booking lands on the same
  // person as their visit and its replay. Anyone else stays separate from their browsing.
  const visitor = payload?.metadata?.ph_id;
  const distinct_id = typeof visitor === "string" && visitor ? visitor : attendee.email;
  const properties = {
    title: payload?.title,
    starts_at: payload?.startTime,
    event_type: payload?.type,
    where: payload?.metadata?.where,
    $set: { email: attendee.email, name: attendee.name, timezone: attendee.timeZone },
  };
  ctx.waitUntil(
    fetch(`https://${POSTHOG_API}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: POSTHOG_KEY, event, distinct_id, properties }),
    }),
  );
  return new Response(null, { status: 204 });
}

/** The response for a relay path, or null when the request belongs to the app. */
export function relay(
  request: Request,
  env: { CAL_WEBHOOK_SECRET?: string },
  ctx: ExecutionContext,
): Promise<Response> | Response | null {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${RELAY_PATH}/`)) return null;
  const path = url.pathname.slice(RELAY_PATH.length);
  if (path === "/geo") return geo(request);
  if (path === "/cal") return cal(request, env, ctx);
  if (path.startsWith("/static/") || path.startsWith("/array/")) {
    return asset(request, `https://${POSTHOG_ASSETS}${path}${url.search}`, ctx);
  }
  return forward(request, `https://${POSTHOG_API}${path}${url.search}`);
}
