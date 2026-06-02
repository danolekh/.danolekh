import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { env } from "cloudflare:workers";
import {
  AGGREGATOR_EXAMPLE,
  FIXTURES,
  rankMatches,
  SAMPLES,
  type FlowResult,
} from "./flow-contents";

// In-memory cache keyed by sampleId. The sample set is a fixed allow-list, so the live API bills at
// most once per sample per Worker isolate — a few cents total regardless of traffic.
const cache = new Map<string, FlowResult>();

/**
 * Runs Google Lens (SerpApi) live on the selected sample's image and returns ranked retailer matches.
 * Falls back to a committed real-data fixture when there's no API key (local dev) or the call fails,
 * so the UI always renders. Only allow-listed sampleIds are accepted.
 */
export const resolveFlowDemo = createServerFn({ method: "POST" })
  .inputValidator(Schema.Struct({ sampleId: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }): Promise<FlowResult> => {
    const sample = SAMPLES.find((s) => s.id === data.sampleId);
    if (!sample) throw new Error(`Unknown sample: ${data.sampleId}`);

    const cached = cache.get(sample.id);
    if (cached) return cached;

    const apiKey = (env as unknown as { SERPAPI_KEY?: string }).SERPAPI_KEY;
    const fixture = FIXTURES[sample.id] ?? emptyResult(sample.id);
    if (!apiKey) return fixture;

    try {
      const u = new URL("https://serpapi.com/search.json");
      u.search = new URLSearchParams({
        engine: "google_lens",
        type: "products",
        url: sample.imageUrl,
        country: "us",
        api_key: apiKey,
      }).toString();

      const res = await fetch(u.toString());
      if (!res.ok) throw new Error(`SerpApi ${res.status}`);
      const json = (await res.json()) as { visual_matches?: Array<Record<string, any>> };

      const matches = rankMatches(json.visual_matches ?? []);
      if (matches.length === 0) return fixture;

      const result: FlowResult = {
        sampleId: sample.id,
        chosen: matches[0] ?? null,
        matches: matches.slice(0, 3),
        aggregatorExample: AGGREGATOR_EXAMPLE,
        source: "live",
      };
      cache.set(sample.id, result);
      return result;
    } catch {
      return fixture;
    }
  });

function emptyResult(sampleId: string): FlowResult {
  return {
    sampleId,
    chosen: null,
    matches: [],
    aggregatorExample: AGGREGATOR_EXAMPLE,
    source: "fixture",
  };
}
