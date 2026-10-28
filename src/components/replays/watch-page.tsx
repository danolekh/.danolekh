import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { Handle } from "motion-panels/react";
import {
  IconArrowLeft,
  IconArrowsMaximize,
  IconCheck,
  IconCopy,
  IconGripVertical,
  IconLayoutGrid,
  IconMinus,
} from "@tabler/icons-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getRunMeta } from "@/lib/replays/get-run";
import {
  chapterCues,
  findPlayer,
  isRunSettling,
  runOutcome,
  runStartedLabel,
  type RunMeta,
} from "@/lib/replays/meta";
import { SyncGroup } from "@/lib/replays/sync";
import { cn } from "@/lib/utils";
import { Outcome } from "./outcome";
import { createHost, FitBox, PlayerSlot, PlayerView } from "./player";
import { PanelStage, type TileControls } from "./stage";
import { SyncContext, useMediaQuery, useMounted, useSyncState } from "./sync-context";
import { Timeline } from "./timeline";

const POLL_MS = 15_000;

export function WatchPage({
  meta: loaded,
  nick,
  seekTo,
}: {
  meta: RunMeta;
  nick: string | undefined;
  /** `?t=` in seconds: where everyone starts, and where they jump when it changes. */
  seekTo: number | null;
}) {
  const [startAt] = useState(() => seekTo ?? 0);
  const [meta, setMeta] = useState(loaded);
  // A navigation reloads the route's data; take it when it's newer than what polling found.
  useEffect(() => {
    setMeta((prev) =>
      prev.runId !== loaded.runId || (loaded.updatedUnixMs ?? 0) >= (prev.updatedUnixMs ?? 0)
        ? loaded
        : prev,
    );
  }, [loaded]);

  // While the run is live or a view is still rendering, the meta.json keeps changing.
  const settling = isRunSettling(meta);
  useEffect(() => {
    if (!settling) return;
    const id = setInterval(async () => {
      const next = await getRunMeta({ data: { runId: meta.runId } }).catch(() => null);
      if (next) setMeta((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    }, POLL_MS);
    return () => clearInterval(id);
  }, [settling, meta.runId]);

  const [group] = useState(() => new SyncGroup({}, startAt));
  useEffect(() => () => group.destroy(), [group]);
  useEffect(() => {
    // For poking at the sync from the console (and the headless checks), dev only.
    if (import.meta.env.DEV) Object.assign(window, { __replaySync: group });
  }, [group]);
  const [initialSeek] = useState(seekTo);
  useEffect(() => {
    if (seekTo !== null && seekTo !== initialSeek) group.seek(seekTo);
  }, [group, seekTo, initialSeek]);
  // Waits time out and parked views rejoin even when no video fires an event.
  useEffect(() => {
    const id = setInterval(() => group.tick(true), 250);
    return () => clearInterval(id);
  }, [group]);

  const names = meta.players.map((p) => p.name);
  // An unknown nick falls back to the overview.
  const focus = findPlayer(meta, nick)?.name ?? null;
  const lead = focus ?? names[0] ?? null;
  useEffect(() => group.setLeader(lead), [group, lead]);

  const mounted = useMounted();
  const wide = useMediaQuery("(min-width: 768px)");
  const [hosts] = useState(() => new Map<string, HTMLDivElement>());
  if (mounted) for (const name of names) if (!hosts.has(name)) hosts.set(name, createHost());

  const playing = useSyncExternalStore(
    group.subscribe,
    () => group.getSnapshot().playing,
    () => false,
  );
  const [started, setStarted] = useState(startAt > 0);
  useEffect(() => {
    if (playing) setStarted(true);
  }, [playing]);

  // The timeline's length before any video knows its own: the run's time, or what's rendered.
  const fallbackEnd = useMemo(() => {
    if (meta.timeMs !== null) return meta.timeMs / 1000;
    return Math.max(0, ...meta.players.map((p) => (p.readyUntilMs ?? 0) / 1000));
  }, [meta]);

  const chapters = useMemo(
    () => (meta.events.length > 0 ? chapterCues(meta.events, fallbackEnd + 5) : []),
    [meta.events, fallbackEnd],
  );

  usePageShortcuts(group);

  const tile = (name: string, big: boolean, controls: TileControls, stacked = false) => (
    <Tile
      key={name}
      runId={meta.runId}
      name={name}
      host={hosts.get(name)}
      big={big}
      focused={focus !== null}
      stacked={stacked}
      controls={controls}
    />
  );

  const ordered = focus ? [focus, ...names.filter((n) => n !== focus)] : names;

  return (
    <SyncContext.Provider value={group}>
      <div className="flex min-h-dvh flex-col md:h-dvh md:min-h-0">
        <Header meta={meta} focus={focus} />

        <main className="flex min-h-0 flex-1 flex-col">
          {!mounted ? null : names.length === 0 ? (
            <p className="m-auto px-6 text-center text-sm text-muted-foreground">
              No views yet. They appear here as the first segments render.
            </p>
          ) : wide ? (
            <div className="min-h-0 flex-1 px-2">
              <PanelStage
                names={names}
                focus={focus}
                renderTile={(name, big, c) => tile(name, big, c)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-3 pb-4">
              {ordered.map((name) => tile(name, name === focus, {}, true))}
            </div>
          )}
        </main>

        <footer className="sticky bottom-0 z-30 shrink-0 border-t bg-background/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-3">
          <Timeline meta={meta} fallbackEnd={fallbackEnd} />
        </footer>
      </div>

      {mounted &&
        meta.players.map((player) =>
          createPortal(
            <PlayerView
              key={`${player.name}:${player.hls ?? ""}`}
              player={player}
              startAt={startAt}
              audible={player.name === lead}
              chapters={chapters}
              showStart={!started && player.name === lead}
            />,
            hosts.get(player.name)!,
            player.name,
          ),
        )}
    </SyncContext.Provider>
  );
}

/** Space/K, J/L and the arrows drive every view when no player or control has focus (a focused
 *  player handles its own keys, and the sync carries them to the rest). */
function usePageShortcuts(group: SyncGroup) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        target?.closest(
          'input, textarea, select, button, a, [contenteditable], [role="slider"], [role="menu"], [role="separator"], [data-slot="media-player"]',
        )
      ) {
        return;
      }
      const step = { j: -10, l: 10, arrowleft: -5, arrowright: 5 }[event.key.toLowerCase()];
      if (event.key === " " || event.key.toLowerCase() === "k") group.toggle();
      else if (step !== undefined) group.seek(group.time() + step);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [group]);
}

/* ── Header ──────────────────────────────────────────────────────────────────────────────────── */

function Header({ meta, focus }: { meta: RunMeta; focus: string | null }) {
  const started = runStartedLabel(meta);
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 px-3 pt-3 pb-2 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/m"
          aria-label="All runs"
          title="All runs"
          className="grid size-8 shrink-0 place-items-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <IconArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h1 className="text-base font-semibold tracking-tight sm:text-lg">
              {started ?? meta.runId}
            </h1>
            <Outcome outcome={runOutcome(meta)} />
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>Speedrun replay</span>
            {meta.seed && (
              <>
                <span aria-hidden>·</span>
                <Seed seed={meta.seed} />
              </>
            )}
          </p>
        </div>
      </div>

      <nav
        aria-label="Views"
        className="-mx-1 flex max-w-full items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] md:ml-auto"
      >
        <ViewLink runId={meta.runId} active={focus === null}>
          <IconLayoutGrid className="size-3.5" />
          All
        </ViewLink>
        {meta.players.map((p) => (
          <ViewLink key={p.name} runId={meta.runId} nick={p.name} active={focus === p.name}>
            {p.name}
          </ViewLink>
        ))}
      </nav>
      <ThemeToggle className="hidden size-8 shadow-none md:inline-flex" />
    </header>
  );
}

function Seed({ seed }: { seed: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <button
      type="button"
      title="Copy the seed"
      onClick={() => void navigator.clipboard?.writeText(seed).then(() => setCopied(true))}
      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
    >
      seed <span className="font-mono tabular-nums">{seed}</span>
      {copied ? <IconCheck className="size-3" /> : <IconCopy className="size-3 opacity-60" />}
    </button>
  );
}

function ViewLink({
  runId,
  nick,
  active,
  children,
}: {
  runId: string;
  nick?: string;
  active: boolean;
  children: ReactNode;
}) {
  const className = cn(
    "inline-flex h-7 shrink-0 items-center gap-1.5 px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
    active
      ? "bg-muted text-foreground"
      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
  );
  return nick ? (
    <Link
      to="/m/$runId/$nick"
      params={{ runId, nick }}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {children}
    </Link>
  ) : (
    <Link
      to="/m/$runId"
      params={{ runId }}
      aria-current={active ? "page" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

/* ── Tiles ───────────────────────────────────────────────────────────────────────────────────── */

const CHIP = "rounded-sm bg-black/55 text-white backdrop-blur-sm";

function Tile({
  runId,
  name,
  host,
  big,
  focused,
  stacked,
  controls: { collapse, x, y },
}: {
  runId: string;
  name: string;
  host: HTMLDivElement | undefined;
  big: boolean;
  focused: boolean;
  stacked: boolean;
  controls: TileControls;
}) {
  const status = useSyncState((s) => s.players[name]);
  const swap = big ? (
    <Link
      to="/m/$runId"
      params={{ runId }}
      aria-label="Every player side by side"
      title="Every player side by side"
      className={cn(CHIP, "pointer-events-auto grid size-7 place-items-center hover:bg-black/75")}
    >
      <IconLayoutGrid className="size-4" />
    </Link>
  ) : (
    <Link
      to="/m/$runId/$nick"
      params={{ runId, nick: name }}
      aria-label={`Watch ${name} big`}
      title={`Watch ${name} big`}
      className={cn(CHIP, "pointer-events-auto grid size-7 place-items-center hover:bg-black/75")}
    >
      <IconArrowsMaximize className="size-4" />
    </Link>
  );

  if (stacked) {
    return (
      <section aria-label={name}>
        <div className="flex items-center gap-2 pb-1.5">
          <h2 className={cn("text-sm font-medium", big && "text-base")}>{name}</h2>
          {status === "unavailable" ? null : status === "buffering" ? (
            <span className="text-xs text-muted-foreground">buffering…</span>
          ) : null}
          {!big && (
            <Link
              to="/m/$runId/$nick"
              params={{ runId, nick: name }}
              className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Watch big
            </Link>
          )}
          {big && focused && (
            <Link
              to="/m/$runId"
              params={{ runId }}
              className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              All players
            </Link>
          )}
        </div>
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          <PlayerSlot host={host} />
        </div>
      </section>
    );
  }

  return (
    <FitBox className="group/tile relative" x={x} y={y}>
      <PlayerSlot host={host} />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-1 p-1.5">
        <Handle
          aria-label={`Move ${name}`}
          className={cn(
            CHIP,
            "pointer-events-auto grid h-7 w-5 place-items-center text-white/80 hover:text-white",
          )}
        >
          <IconGripVertical className="size-3.5" />
        </Handle>
        <span className={cn(CHIP, "truncate px-2 py-1 text-xs font-medium")}>{name}</span>
        <div className="ml-auto flex gap-1 opacity-0 transition-opacity group-hover/tile:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          {swap}
          {collapse && (
            <button
              type="button"
              onClick={collapse}
              aria-label={`Hide ${name}`}
              title={`Hide ${name}`}
              className={cn(
                CHIP,
                "pointer-events-auto grid size-7 place-items-center hover:bg-black/75",
              )}
            >
              <IconMinus className="size-4" />
            </button>
          )}
        </div>
      </div>
    </FitBox>
  );
}
