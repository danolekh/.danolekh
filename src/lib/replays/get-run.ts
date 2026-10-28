import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { Schema } from "effect";
import { env } from "cloudflare:workers";
import { isRunId, isRunSettling, parseRunMeta, type RunMeta } from "./meta";
import { latestRun, newestRunIds, sortRuns, summarizeRun, type RunSummary } from "./runs";

const PUBLIC_BUCKET = "https://bucket.danolekh.com";

/** How many runs /m reads at most, newest first. */
const MAX_RUNS = 200;

/** A run's meta.json, read through the `r2` binding (bucket `danolekh-bucket`). `null` when the
 *  run doesn't exist (yet: the worker publishes it when it picks the run up). */
export const getRunMeta = createServerFn({ method: "GET" })
  .inputValidator(Schema.Struct({ runId: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }): Promise<RunMeta | null> => readRunMeta(data.runId));

/** Every run for /m, newest first (the newest `MAX_RUNS` of them). */
export const listRuns = createServerFn({ method: "GET" }).handler(
  async (): Promise<RunSummary[]> => loadRuns(MAX_RUNS),
);

/** The run /m/latest opens: the newest that isn't a quick reset. Only the newest few are read;
 *  more than that many resets in a row and it's the newest run. */
export const getLatestRunId = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => latestRun(await loadRuns(24))?.runId ?? null,
);

async function readRunMeta(runId: string): Promise<RunMeta | null> {
  if (!isRunId(runId)) return null;
  const key = `runs/${runId}/meta.json`;
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
}

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

/* ── The runs list ────────────────────────────────────────────────────────────────────────────── */

interface PrefixPage {
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor?: string;
}

async function allPrefixes(list: (cursor: string | undefined) => Promise<PrefixPage>) {
  const prefixes: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list(cursor);
    prefixes.push(...page.delimitedPrefixes);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  return prefixes;
}

/** A finished, fully rendered run's meta.json doesn't change, so this isolate keeps its summary
 *  for a while and the 15 s refresh only rereads the runs that are still moving. */
const SETTLED_TTL_MS = 10 * 60_000;
const settled = new Map<string, { summary: RunSummary; until: number }>();

async function readSummary(runId: string): Promise<RunSummary | null> {
  const kept = settled.get(runId);
  if (kept && kept.until > Date.now()) return kept.summary;
  const meta = await readRunMeta(runId).catch(() => null);
  if (!meta) return null;
  const summary = summarizeRun(meta);
  if (!isRunSettling(meta)) settled.set(runId, { summary, until: Date.now() + SETTLED_TTL_MS });
  return summary;
}

async function loadRuns(limit: number): Promise<RunSummary[]> {
  const prefixes = await allPrefixes((cursor) =>
    env.r2.list({ prefix: "runs/", delimiter: "/", ...(cursor ? { cursor } : {}) }),
  );
  if (import.meta.env.DEV) prefixes.push(...(await devBucketPrefixes()));
  // Every read at once; the runtime queues what's over its connection limit.
  const runs = await Promise.all(newestRunIds(prefixes, limit).map(readSummary));
  return sortRuns(runs.filter((run): run is RunSummary => run !== null));
}

/** Dev only: the real bucket's runs next to the emulated R2's fixtures. The public URL can't list,
 *  so vite lists it through the Cloudflare API with wrangler's login (/__bucket-list in
 *  vite.config.ts); their meta.json files then come from the public bucket (readRunMeta). */
async function devBucketPrefixes() {
  const origin = getRequestUrl().origin;
  return allPrefixes(async (cursor) => {
    const query = new URLSearchParams({ prefix: "runs/", delimiter: "/" });
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`${origin}/__bucket-list?${query}`).catch(() => null);
    if (!response?.ok) {
      console.warn(`/m: no real runs in dev (${response?.status ?? "unreachable"})`);
      return { delimitedPrefixes: [], truncated: false };
    }
    return (await response.json()) as PrefixPage;
  }).catch(() => []);
}
