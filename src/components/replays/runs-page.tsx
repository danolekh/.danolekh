import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  IconArrowLeft,
  IconChevronRight,
  IconMovie,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { listRuns } from "@/lib/replays/get-run";
import { formatRunTime } from "@/lib/replays/meta";
import {
  formatElapsed,
  isShortRun,
  latestRun,
  progressLabel,
  runStart,
  type RunSummary,
} from "@/lib/replays/runs";
import { cn } from "@/lib/utils";
import { Outcome } from "./outcome";

const POLL_MS = 15_000;

export function RunsPage({ runs: loaded }: { runs: RunSummary[] }) {
  const runs = useRunsRefresh(loaded);
  const latest = latestRun(runs);
  const rest = runs.filter((run) => run !== latest);
  const earlier = rest.filter((run) => !isShortRun(run));
  const short = rest.filter(isShortRun);
  // The year shows only on runs from another year than the newest one.
  const year = runs[0] ? runStart(runs[0])?.year : undefined;
  const now = useNow(runs.some((run) => run.outcome.kind === "live"));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-3 px-3 pt-3 pb-2 sm:px-4">
        <Link
          to="/"
          aria-label="danolekh.com"
          title="danolekh.com"
          className="grid size-8 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">Speedrun replays</h1>
          <p className="text-xs text-muted-foreground">
            {runs.length === 0
              ? "Every player's point of view on one clock"
              : `${runs.length} run${runs.length === 1 ? "" : "s"}, every point of view on one clock`}
          </p>
        </div>
        <ThemeToggle className="ml-auto size-8 shadow-none" />
      </header>

      {latest ? (
        <main className="flex flex-col gap-8 px-3 pt-2 sm:px-4 sm:pt-4">
          <LatestRun run={latest} year={year} now={now} />

          {earlier.length > 0 && (
            <section aria-labelledby="earlier-runs">
              <h2 id="earlier-runs" className="pb-1 text-sm font-medium text-muted-foreground">
                Earlier runs
              </h2>
              <RunList runs={earlier} year={year} now={now} />
            </section>
          )}

          {short.length > 0 && (
            <details className="group/short">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 py-1 text-sm font-medium text-muted-foreground transition-colors select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
                <IconChevronRight className="size-4 transition-transform group-open/short:rotate-90" />
                Short and abandoned
                <span className="font-normal tabular-nums">{short.length}</span>
              </summary>
              <p className="pt-1 pb-1 text-xs text-muted-foreground">
                Runs abandoned in under a minute.
              </p>
              <RunList runs={short} year={year} now={now} />
            </details>
          )}
        </main>
      ) : (
        <main className="flex flex-1 items-center justify-center px-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconMovie />
              </EmptyMedia>
              <EmptyTitle>No replays yet</EmptyTitle>
              <EmptyDescription>
                A run shows up here as soon as the render worker picks it up.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </main>
      )}
    </div>
  );
}

/** The list as loaded, then refreshed every 15 s while a run is live or a view is rendering (and
 *  right away when the tab comes back). */
function useRunsRefresh(loaded: RunSummary[]) {
  const [runs, setRuns] = useState(loaded);
  useEffect(() => setRuns(loaded), [loaded]);

  const moving = runs.some((run) => run.moving);
  useEffect(() => {
    if (!moving) return;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      const next = await listRuns().catch(() => null);
      if (next) setRuns((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    };
    const id = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [moving]);
  return runs;
}

/** The clock for "started 12 min ago": `null` on the server and until the page is mounted. */
function useNow(enabled: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [enabled]);
  return enabled ? now : null;
}

/* ── Latest run ───────────────────────────────────────────────────────────────────────────────── */

function LatestRun({
  run,
  year,
  now,
}: {
  run: RunSummary;
  year: number | undefined;
  now: number | null;
}) {
  const start = runStart(run, year);
  const live = run.outcome.kind === "live";
  return (
    <Link
      to="/m/$runId"
      params={{ runId: run.runId }}
      className="group grid gap-4 outline-none md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center md:gap-6"
    >
      <Thumb
        run={run}
        eager
        bar={false}
        className="ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-ring"
      >
        <span className={cn(CHIP, "absolute top-2 left-2 px-2 py-1 text-xs font-medium")}>
          Latest run
        </span>
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
            <IconPlayerPlayFilled className="size-6 translate-x-px" />
          </span>
        </span>
      </Thumb>

      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {start ? `${start.date}, ${start.time}` : run.runId}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Outcome outcome={run.outcome} className="text-base" />
          <Length run={run} now={now} className="text-sm" />
        </div>
        <Players names={run.players} className="text-sm" />
        {run.rendering && <Progress rendering={run.rendering} />}
        <span
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-2 h-10 w-full text-sm group-hover:bg-primary/85 md:w-fit md:px-5",
          )}
        >
          <IconPlayerPlayFilled className="size-4" />
          {live ? "Watch live" : "Watch"}
        </span>
      </div>
    </Link>
  );
}

function Progress({ rendering }: { rendering: NonNullable<RunSummary["rendering"]> }) {
  const share = rendering.total ? Math.min(1, rendering.done / rendering.total) : null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-muted-foreground">{progressLabel(rendering)}</p>
      {share !== null && (
        <div className="h-1 w-full max-w-xs bg-muted">
          <div className="h-full bg-foreground/70" style={{ width: `${share * 100}%` }} />
        </div>
      )}
    </div>
  );
}

/* ── The list ─────────────────────────────────────────────────────────────────────────────────── */

function RunList({
  runs,
  year,
  now,
}: {
  runs: RunSummary[];
  year: number | undefined;
  now: number | null;
}) {
  return (
    <ul className="divide-y divide-dashed">
      {runs.map((run) => (
        <li key={run.runId}>
          <RunRow run={run} year={year} now={now} />
        </li>
      ))}
    </ul>
  );
}

function RunRow({
  run,
  year,
  now,
}: {
  run: RunSummary;
  year: number | undefined;
  now: number | null;
}) {
  const start = runStart(run, year);
  return (
    <Link
      to="/m/$runId"
      params={{ runId: run.runId }}
      className="group -mx-2 flex items-center gap-3 px-2 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
    >
      <Thumb run={run} className="w-28 shrink-0 sm:w-40" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium">
          {start ? (
            <>
              {start.date}, <span className="tabular-nums">{start.time}</span>
            </>
          ) : (
            run.runId
          )}
        </p>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2">
          <Outcome outcome={run.outcome} />
          <Length run={run} now={now} className="text-xs" />
        </div>
        <p className="flex min-w-0 flex-col text-xs text-muted-foreground sm:flex-row sm:gap-1">
          <Players names={run.players} className="min-w-0 truncate" />
          {run.rendering && (
            <span className="shrink-0">
              <span className="hidden sm:inline">· </span>
              {progressLabel(run.rendering)}
            </span>
          )}
        </p>
      </div>
      <IconChevronRight className="hidden size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}

/* ── Bits ─────────────────────────────────────────────────────────────────────────────────────── */

const CHIP = "rounded-sm bg-black/55 text-white backdrop-blur-sm";

function Players({ names, className }: { names: string[]; className?: string }) {
  return (
    <span className={cn("text-muted-foreground", className)}>
      {names.length > 0 ? names.join(", ") : "no views yet"}
    </span>
  );
}

/** The run's length where the result doesn't already say it: how long a live run has been going,
 *  or the end when someone died before it. */
function Length({
  run,
  now,
  className,
}: {
  run: RunSummary;
  now: number | null;
  className?: string;
}) {
  let text: string | null = null;
  if (run.outcome.kind === "live") {
    if (now !== null && run.startUnixMs !== null) {
      text = `started ${formatElapsed(now - run.startUnixMs)} ago`;
    }
  } else if (
    run.outcome.kind === "death" &&
    run.timeMs !== null &&
    Math.abs(run.timeMs - run.outcome.timeMs) >= 1000
  ) {
    text = `run ${formatRunTime(run.timeMs, 0)}`;
  }
  if (!text) return null;
  return <span className={cn("text-muted-foreground tabular-nums", className)}>{text}</span>;
}

/** The run's poster, or a placeholder while nothing is rendered yet. Rendering progress runs along
 *  the bottom (`bar`). */
function Thumb({
  run,
  eager = false,
  bar = true,
  className,
  children,
}: {
  run: RunSummary;
  eager?: boolean;
  bar?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const share =
    bar && run.rendering?.total ? Math.min(1, run.rendering.done / run.rendering.total) : null;
  const poster = run.poster !== null && !broken;
  return (
    <div className={cn("relative aspect-video overflow-hidden bg-muted", className)}>
      <span className="absolute inset-0 grid place-items-center text-muted-foreground">
        <IconMovie className="size-5 opacity-50" />
      </span>
      {poster && (
        <img
          src={run.poster ?? undefined}
          alt=""
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover text-transparent transition-transform duration-300 group-hover:scale-[1.03]"
        />
      )}
      {share !== null && (
        <span
          className={cn(
            "absolute inset-x-0 bottom-0 h-1",
            poster ? "bg-black/40" : "bg-foreground/10",
          )}
        >
          <span
            className={cn("block h-full", poster ? "bg-white/85" : "bg-foreground/50")}
            style={{ width: `${share * 100}%` }}
          />
        </span>
      )}
      {children}
    </div>
  );
}
