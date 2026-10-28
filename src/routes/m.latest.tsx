import { createFileRoute, redirect } from "@tanstack/react-router";
import { getLatestRunId } from "@/lib/replays/get-run";

/* /m/latest: a link that always opens the newest run (302, so nothing caches where it went). With
 * no runs at all it lands on the list. */
export const Route = createFileRoute("/m/latest")({
  loader: async () => {
    const runId = await getLatestRunId();
    throw runId
      ? redirect({ to: "/m/$runId", params: { runId }, statusCode: 302 })
      : redirect({ to: "/m", statusCode: 302 });
  },
});
