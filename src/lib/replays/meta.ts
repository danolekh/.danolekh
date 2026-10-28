/* A speedrun replay's meta.json (runs/<runId>/meta.json in R2), as the render worker publishes it,
 * plus the formatting the watch page needs. The shape is pinned in mc-replays/CONTRACT.md; the
 * parser below is lenient on purpose: the worker updates the file while a run is still going, and
 * one odd field shouldn't take the page down. Video time 0 is run time 0 for every player, so
 * `runMs = video.currentTime * 1000` on the same clock as the in-game timer. */

export type RunResult = "running" | "win" | "fail" | "abandoned";

export interface RunPlayer {
  name: string;
  uuid: string | null;
  hls: string | null;
  poster: string | null;
  status: "rendering" | "ready";
  /** How much of the run this player's video covers so far. `null` once it's all there. */
  readyUntilMs: number | null;
  segmentsDone: number | null;
  /** `null` while the run is live: nobody knows yet how many segments there will be. */
  segmentsTotal: number | null;
}

export interface RunEvent {
  type: "split" | "death";
  key: string | null;
  label: string | null;
  by: string | null;
  detail: string | null;
  /** Run time in ms. */
  t: number;
}

export interface RunMeta {
  runId: string;
  result: RunResult;
  /** `null` while the run is going. */
  timeMs: number | null;
  seed: string | null;
  startUnixMs: number | null;
  updatedUnixMs: number | null;
  players: RunPlayer[];
  events: RunEvent[];
}

const RESULTS: RunResult[] = ["running", "win", "fail", "abandoned"];

/** Run IDs look like `20261027-2347-q4eg`; anything that could escape the `runs/` prefix is out. */
export function isRunId(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
}

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown) => (typeof value === "string" && value.length > 0 ? value : null);
const obj = (value: unknown) =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

function parsePlayer(raw: unknown): RunPlayer | null {
  const p = obj(raw);
  const name = str(p?.name);
  if (!p || !name) return null;
  return {
    name,
    uuid: str(p.uuid),
    hls: str(p.hls),
    poster: str(p.poster),
    status: p.status === "ready" ? "ready" : "rendering",
    readyUntilMs: num(p.readyUntilMs),
    segmentsDone: num(p.segmentsDone),
    segmentsTotal: num(p.segmentsTotal),
  };
}

function parseEvent(raw: unknown): RunEvent | null {
  const e = obj(raw);
  const t = num(e?.t);
  if (!e || t === null || (e.type !== "split" && e.type !== "death")) return null;
  return {
    type: e.type,
    key: str(e.key),
    label: str(e.label),
    by: str(e.by),
    detail: str(e.detail),
    t: Math.max(0, t),
  };
}

/** `null` when it isn't a meta.json at all. */
export function parseRunMeta(raw: unknown): RunMeta | null {
  const m = obj(raw);
  const runId = str(m?.runId);
  if (!m || !runId) return null;
  const seed = typeof m.seed === "number" ? String(m.seed) : str(m.seed);
  const players = Array.isArray(m.players) ? m.players.map(parsePlayer) : [];
  const events = Array.isArray(m.events) ? m.events.map(parseEvent) : [];
  const seen = new Set<string>();
  return {
    runId,
    result: RESULTS.includes(m.result as RunResult) ? (m.result as RunResult) : "running",
    timeMs: num(m.timeMs),
    seed,
    startUnixMs: num(m.startUnixMs),
    updatedUnixMs: num(m.updatedUnixMs),
    // A name twice would give two panels one key; the first one wins.
    players: players.filter((p): p is RunPlayer => {
      if (!p || seen.has(p.name.toLowerCase())) return false;
      seen.add(p.name.toLowerCase());
      return true;
    }),
    events: events.filter((e): e is RunEvent => e !== null).sort((a, b) => a.t - b.t),
  };
}

/** The meta.json changes as segments render; until it stops, the page asks again. */
export function isRunSettling(meta: RunMeta) {
  return meta.result === "running" || meta.players.some((p) => p.status === "rendering");
}

/** Seconds of this player's video that exist. `Infinity` once the whole run is rendered. */
export function playerAvailableUntil(player: RunPlayer) {
  if (player.status === "ready") return Number.POSITIVE_INFINITY;
  return Math.max(0, (player.readyUntilMs ?? 0) / 1000);
}

export function findPlayer(meta: RunMeta, nick: string | undefined) {
  if (!nick) return null;
  const wanted = nick.toLowerCase();
  // Minecraft names are case-insensitive, and so is the URL a friend types.
  return meta.players.find((p) => p.name.toLowerCase() === wanted) ?? null;
}

/** Who died. Deaths carry `by` in the contract; older runs only have "Name — cause" in detail. */
export function deathName(event: RunEvent) {
  return event.by ?? event.detail?.split(/\s+[—–-]\s+/)[0]?.trim() ?? "Someone";
}

export function eventTitle(event: RunEvent) {
  if (event.type === "death") return `${deathName(event)} died`;
  return event.label ?? event.key ?? "Split";
}

/* ── Time ─────────────────────────────────────────────────────────────────────────────────────── */

/** Run time the way the in-game timer shows it: `m:ss.d`, `h:mm:ss.d` past the hour.
 *  `decimals` 0 drops the fraction (chapter list, "died at 23:41"), 3 gives the exact final time. */
export function formatRunTime(ms: number, decimals: 0 | 1 | 3 = 1) {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  const unit = decimals === 0 ? 1000 : decimals === 1 ? 100 : 1;
  // Floor, like the timer: 23:41.98 is still 23:41.9.
  const ticks = Math.floor(safe / unit);
  const totalSeconds = Math.floor((ticks * unit) / 1000);
  const fraction = ticks % (1000 / unit);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const clock =
    h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      : `${m}:${String(s).padStart(2, "0")}`;
  return decimals === 0 ? clock : `${clock}.${String(fraction).padStart(decimals, "0")}`;
}

/** `?t=` in any of the forms people paste: `15:00`, `1:02:03`, `90`, `90.5`, `1h2m3s`, `2m`.
 *  Seconds, or `null` when it doesn't read as a time. */
export function parseTimeParam(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (/^\d+(\.\d+)?$/.test(text)) return Number(text);
  const clock = /^(?:(\d+):)?(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(text);
  if (clock) {
    const [, h, m, s] = clock;
    if (Number(s) >= 60 || (h !== undefined && Number(m) >= 60)) return null;
    return Number(h ?? 0) * 3600 + Number(m) * 60 + Number(s);
  }
  const units = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?$/.exec(text);
  if (units && (units[1] || units[2] || units[3])) {
    return Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60 + Number(units[3] ?? 0);
  }
  return null;
}

/** The `?t=` value for a time: `15:00`, `1:02:03`. Whole seconds, like a YouTube link. */
export function toTimeParam(seconds: number) {
  return formatRunTime(Math.floor(Math.max(0, seconds)) * 1000, 0);
}

/** "27 Oct 2026, 23:47" from the run ID itself, which carries the server's local time, so the
 *  server render and the browser agree without guessing a time zone. */
export function runStartedLabel(meta: Pick<RunMeta, "runId">) {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(meta.runId);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][Number(mo) - 1];
  if (!month) return null;
  return `${Number(d)} ${month} ${y}, ${h}:${mi}`;
}

export type RunOutcome =
  | { kind: "live" }
  | { kind: "win"; timeMs: number | null }
  | { kind: "death"; name: string; timeMs: number }
  | { kind: "ended"; result: "fail" | "abandoned"; timeMs: number | null };

export function runOutcome(meta: RunMeta): RunOutcome {
  if (meta.result === "running") return { kind: "live" };
  if (meta.result === "win") return { kind: "win", timeMs: meta.timeMs };
  const death = [...meta.events].reverse().find((e) => e.type === "death");
  if (meta.result === "fail" && death)
    return { kind: "death", name: deathName(death), timeMs: death.t };
  return { kind: "ended", result: meta.result, timeMs: meta.timeMs };
}

export interface ChapterCue {
  startTime: number;
  endTime: number;
  value: string;
}

/** The chapters every player's seek bar shows (seconds). Each split or death opens a chapter that
 *  runs to the next one; the stretch before the first is "Start". */
export function chapterCues(events: RunEvent[], endSeconds: number): ChapterCue[] {
  const starts = [
    { t: 0, title: "Start" },
    ...events.filter((e) => e.t > 0).map((e) => ({ t: e.t / 1000, title: eventTitle(e) })),
  ];
  const end = Math.max(endSeconds, (starts.at(-1)?.t ?? 0) + 1);
  return starts.map((start, i) => ({
    startTime: start.t,
    endTime: Math.max(starts[i + 1]?.t ?? end, start.t + 0.001),
    value: start.title,
  }));
}
