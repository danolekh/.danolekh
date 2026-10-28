import { useEffect } from "react";
import { createFileRoute, Link, notFound, useParams, useRouter } from "@tanstack/react-router";
import { IconAlertTriangle, IconArrowLeft, IconMovie, IconRefresh } from "@tabler/icons-react";
import { WatchPage } from "@/components/replays/watch-page";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { siteConfig } from "@/lib/config";
import { getRunMeta } from "@/lib/replays/get-run";
import {
  findPlayer,
  formatRunTime,
  isRunId,
  parseTimeParam,
  runOutcome,
  runStartedLabel,
  type RunMeta,
} from "@/lib/replays/meta";
import { createMeta } from "@/lib/seo";

/* /m/<runId> (everyone side by side) and /m/<runId>/<nick> (that player big). The in-game
 * /history links here. This route owns the whole page; the two children only exist so the URL
 * matches, which keeps the players mounted (and playing) when the view switches. */
export const Route = createFileRoute("/m/$runId")({
  staticData: { bare: true },
  validateSearch: (search: Record<string, unknown>): { t?: string } => {
    const t = search.t;
    return typeof t === "string" || typeof t === "number" ? { t: String(t) } : {};
  },
  loader: async ({ params }) => {
    const meta = await getRunMeta({ data: { runId: params.runId } });
    if (!meta) throw notFound();
    return meta;
  },
  head: ({ loaderData, params }) => {
    const nick = (params as { nick?: string }).nick;
    const url = `${siteConfig.url}/m/${params.runId}${nick ? `/${nick}` : ""}`;
    if (!loaderData) {
      return createMeta({ title: "Speedrun replay", url, noindex: true });
    }
    const focus = findPlayer(loaderData, nick);
    const poster = (focus ?? loaderData.players[0])?.poster;
    return createMeta({
      title: `${focus ? `${focus.name} · ` : ""}Speedrun ${runStartedLabel(loaderData) ?? loaderData.runId}`,
      description: describe(loaderData),
      url,
      noindex: true,
      ...(poster?.startsWith("https://") ? { image: poster } : {}),
    });
  },
  notFoundComponent: RunNotFound,
  errorComponent: RunError,
  component: WatchRoute,
});

function describe(meta: RunMeta) {
  const names = meta.players.map((p) => p.name);
  const who =
    names.length <= 1
      ? (names[0] ?? "A run")
      : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
  const outcome = runOutcome(meta);
  const how =
    outcome.kind === "live"
      ? "Live."
      : outcome.kind === "win"
        ? `Win${outcome.timeMs !== null ? ` in ${formatRunTime(outcome.timeMs, 3)}` : ""}.`
        : outcome.kind === "death"
          ? `${outcome.name} died at ${formatRunTime(outcome.timeMs, 0)}.`
          : `${outcome.result === "abandoned" ? "Abandoned" : "Failed"}.`;
  return `${who}, every point of view on one clock. ${how}`;
}

function WatchRoute() {
  const meta = Route.useLoaderData();
  const { t } = Route.useSearch();
  const { nick } = useParams({ strict: false });
  return <WatchPage meta={meta} nick={nick} seekTo={parseTimeParam(t)} />;
}

function RunNotFound() {
  const { runId } = useParams({ strict: false });
  const router = useRouter();
  // /history links a run as soon as it starts; its meta.json appears with the first rendered
  // segment, so keep looking for a while.
  useEffect(() => {
    if (!runId || !isRunId(runId)) return;
    const id = setInterval(() => void router.invalidate(), 15_000);
    return () => clearInterval(id);
  }, [router, runId]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMovie />
          </EmptyMedia>
          <EmptyTitle>No replay here (yet)</EmptyTitle>
          <EmptyDescription>
            {runId && isRunId(runId) ? (
              <>
                Run <span className="font-mono">{runId}</span> hasn&apos;t been published. If it
                just started, its first views are still rendering; this page checks again every 15
                seconds.
              </>
            ) : (
              "That doesn't look like a run ID."
            )}
          </EmptyDescription>
        </EmptyHeader>
        <Button
          variant="link"
          className="text-muted-foreground"
          size="sm"
          nativeButton={false}
          render={
            <Link to="/">
              <IconArrowLeft /> danolekh.com
            </Link>
          }
        />
      </Empty>
    </div>
  );
}

function RunError() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconAlertTriangle />
          </EmptyMedia>
          <EmptyTitle>The replay stopped</EmptyTitle>
          <EmptyDescription>
            Something went wrong on this page. Reloading usually fixes it.
          </EmptyDescription>
        </EmptyHeader>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          <IconRefresh /> Reload
        </Button>
      </Empty>
    </div>
  );
}
