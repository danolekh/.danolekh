import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { env } from "cloudflare:workers";
import { isRunId, parseRunMeta, type RunMeta } from "./meta";

const PUBLIC_BUCKET = "https://bucket.danolekh.com";

/** A run's meta.json, read through the `r2` binding (bucket `danolekh-bucket`). `null` when the
 *  run doesn't exist (yet: the worker publishes it once the first segment is rendered). */
export const getRunMeta = createServerFn({ method: "GET" })
  .inputValidator(Schema.Struct({ runId: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }): Promise<RunMeta | null> => {
    if (!isRunId(data.runId)) return null;
    const key = `runs/${data.runId}/meta.json`;
    const object = await env.r2.get(key);
    if (object) return parseRunMeta(await object.json().catch(() => null));

    // `vite dev` emulates R2 locally, holding only the fixtures (scripts/replays-fixtures.ts).
    // Real runs come from the public bucket so the page can be checked against them too.
    if (import.meta.env.DEV) {
      const base = env.VITE_BUCKET_PUBLIC_URL || PUBLIC_BUCKET;
      const response = await fetch(`${base}/${key}`).catch(() => null);
      const meta = response?.ok ? parseRunMeta(await response.json().catch(() => null)) : null;
      return meta && throughDevProxy(meta, base);
    }
    return null;
  });

/** Dev only: the bucket's URLs through vite's /__bucket proxy (vite.config.ts). hls.js fetches
 *  with XHR, and the bucket's CORS doesn't cover dev origins (localhost, the tailnet). */
function throughDevProxy(meta: RunMeta, base: string): RunMeta {
  const local = (url: string | null) =>
    url?.startsWith(`${base}/`) ? `/__bucket/${url.slice(base.length + 1)}` : url;
  return {
    ...meta,
    players: meta.players.map((p) => ({ ...p, hls: local(p.hls), poster: local(p.poster) })),
  };
}
