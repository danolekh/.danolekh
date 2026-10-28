/* The /m runs list: what each run shows there, cut down from its meta.json on the server so the
 * page gets a few hundred bytes per run instead of every event and URL. Dates are Vienna time,
 * where the server that records the runs is. */
import {
  isRunId,
  isRunSettling,
  runOutcome,
  type RunMeta,
  type RunOutcome,
  type RunPlayer,
  type RunResult,
} from "./meta";

export interface RunSummary {
  runId: string;
  result: RunResult;
  outcome: RunOutcome;
  /** `null` while the run is going. */
  timeMs: number | null;
  startUnixMs: number | null;
  players: string[];
  /** A poster that exists (a player's appears with their first rendered footage). */
  poster: string | null;
  /** Segments rendered over every player while a view is still rendering, `null` once all are
   *  ready. `total` is `null` while the run is live: nobody knows yet how many there will be. */
  rendering: { done: number; total: number | null } | null;
  /** The live run or a view still rendering: its meta.json keeps changing. */
  moving: boolean;
}

/** Abandoned before a minute was up: a reset, kept out of the way at the bottom of the list. */
export const SHORT_RUN_MS = 60_000;

/** `runs/<id>/` from R2's delimited listing → `<id>`, or `null` for what the list skips: test runs
 *  (`test-…`), anything starting with `_`, and names that can't be a run. */
export function runIdFromPrefix(prefix: string) {
  const match = /^runs\/([^/]+)\/$/.exec(prefix);
  const id = match?.[1];
  if (!id || id.startsWith("test-") || id.startsWith("_") || !isRunId(id)) return null;
  return id;
}

/** The newest `limit` run IDs. IDs start with the start time (`20261028-2340-…`), so their order
 *  is start order to the minute, which is all the cap needs. */
export function newestRunIds(prefixes: Iterable<string>, limit: number) {
  const ids = new Set<string>();
  for (const prefix of prefixes) {
    const id = runIdFromPrefix(prefix);
    if (id) ids.add(id);
  }
  return [...ids].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)).slice(0, limit);
}

/** Before a player's first footage is published their poster URL 404s. */
function hasFootage(player: RunPlayer) {
  return (
    player.status === "ready" || (player.readyUntilMs ?? 0) > 0 || (player.segmentsDone ?? 0) > 0
  );
}

/** The first player's poster, or the first ready player's, or anyone's that exists yet. */
export function runPoster(meta: RunMeta) {
  const first = meta.players[0];
  const pick =
    (first && hasFootage(first) ? first : null) ??
    meta.players.find((p) => p.status === "ready" && p.poster) ??
    meta.players.find((p) => hasFootage(p) && p.poster);
  return pick?.poster ?? null;
}

export function renderProgress(meta: RunMeta): RunSummary["rendering"] {
  if (meta.players.length === 0) return meta.result === "running" ? { done: 0, total: null } : null;
  if (meta.players.every((p) => p.status === "ready")) return null;
  let done = 0;
  let total: number | null = 0;
  for (const p of meta.players) {
    done += p.segmentsDone ?? 0;
    total = total === null || p.segmentsTotal === null ? null : total + p.segmentsTotal;
  }
  return { done, total };
}

export function summarizeRun(meta: RunMeta): RunSummary {
  return {
    runId: meta.runId,
    result: meta.result,
    outcome: runOutcome(meta),
    timeMs: meta.timeMs,
    startUnixMs: meta.startUnixMs,
    players: meta.players.map((p) => p.name),
    poster: runPoster(meta),
    rendering: renderProgress(meta),
    moving: isRunSettling(meta),
  };
}

export function isShortRun(run: Pick<RunSummary, "result" | "timeMs">) {
  return run.result === "abandoned" && (run.timeMs ?? 0) < SHORT_RUN_MS;
}

/** When a run started, for sorting: `startUnixMs`, or the time in its ID (Vienna, so this can be
 *  an hour or two off, which only matters for a run without a start in its meta.json). */
function startKey(run: Pick<RunSummary, "runId" | "startUnixMs">) {
  if (run.startUnixMs !== null) return run.startUnixMs;
  const parts = idTime(run.runId);
  return parts ? Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) : 0;
}

/** Newest first. */
export function sortRuns<T extends Pick<RunSummary, "runId" | "startUnixMs">>(runs: T[]) {
  return [...runs].sort(
    (a, b) => startKey(b) - startKey(a) || (a.runId < b.runId ? 1 : a.runId > b.runId ? -1 : 0),
  );
}

/** The run the page leads with and /m/latest opens: the newest one that isn't a quick reset. */
export function latestRun<T extends Pick<RunSummary, "result" | "timeMs">>(sorted: T[]) {
  return sorted.find((run) => !isShortRun(run)) ?? sorted[0] ?? null;
}

/* ── Labels ───────────────────────────────────────────────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

const VIENNA = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Vienna",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function viennaTime(unixMs: number): WallTime {
  const parts: Record<string, number> = {};
  for (const part of VIENNA.formatToParts(new Date(unixMs))) {
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  }
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
  };
}

/** The ID's own time (`20261028-2340-…`), which is the recording server's, Vienna's. */
function idTime(runId: string): WallTime | null {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(runId);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  if (month < 1 || month > 12) return null;
  return { year, month, day, hour, minute };
}

/** `{ date: "Wed 28 Oct", time: "23:40" }` in Vienna time; the year joins the date when it isn't
 *  `currentYear`. Built from numbers (not a locale's month names), so the server render and every
 *  browser agree. */
export function runStart(
  run: Pick<RunSummary, "runId" | "startUnixMs">,
  currentYear?: number,
): { date: string; time: string; year: number } | null {
  const t = run.startUnixMs !== null ? viennaTime(run.startUnixMs) : idTime(run.runId);
  if (!t) return null;
  const weekday = WEEKDAYS[new Date(Date.UTC(t.year, t.month - 1, t.day)).getUTCDay()];
  const year = currentYear === undefined || currentYear === t.year ? "" : ` ${t.year}`;
  return {
    date: `${weekday} ${t.day} ${MONTHS[t.month - 1]}${year}`,
    time: `${String(t.hour).padStart(2, "0")}:${String(t.minute).padStart(2, "0")}`,
    year: t.year,
  };
}

export function progressLabel(rendering: NonNullable<RunSummary["rendering"]>) {
  const segments = (n: number) => `${n} segment${n === 1 ? "" : "s"}`;
  if (rendering.total !== null) return `rendering ${rendering.done}/${segments(rendering.total)}`;
  return rendering.done > 0 ? `rendering, ${segments(rendering.done)} so far` : "rendering";
}

/** "4 min", "1 h 05 min": how long ago a live run started. */
export function formatElapsed(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}
