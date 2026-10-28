import { createFileRoute } from "@tanstack/react-router";
import { RunsPage } from "@/components/replays/runs-page";
import { siteConfig } from "@/lib/config";
import { listRuns } from "@/lib/replays/get-run";
import { latestRun } from "@/lib/replays/runs";
import { createMeta } from "@/lib/seo";

/* /m: every speedrun replay, newest first. The watch page's back arrow comes here. */
export const Route = createFileRoute("/m/")({
  staticData: { bare: true },
  loader: () => listRuns(),
  head: ({ loaderData }) => {
    const poster = loaderData ? latestRun(loaderData)?.poster : null;
    return createMeta({
      title: "Speedrun replays",
      description:
        "Every speedrun replay, newest first: every player's point of view on one clock.",
      url: `${siteConfig.url}/m`,
      noindex: true,
      ...(poster?.startsWith("https://") ? { image: poster } : {}),
    });
  },
  component: RunsRoute,
});

function RunsRoute() {
  return <RunsPage runs={Route.useLoaderData()} />;
}
