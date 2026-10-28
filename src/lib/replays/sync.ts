/* One clock for several <video> elements showing the same speedrun from different players.
 *
 * Every player's video starts at run time 0, so being in sync means equal `currentTime`. The group
 * follows a leader (the big panel, when it can play), and every other video chases it:
 *
 *  - Play, pause, seek and speed on ANY video are the viewer's, and drive all of them. Telling the
 *    viewer's actions from our own is the whole trick: each call we make on an element is noted
 *    first (`expectPlay`, `seeksPending`, the `rate` we set), and the event it causes is dropped.
 *  - Drift: off by more than 50 ms, a follower runs 2–5% fast or slow until it's back within 15 ms;
 *    more than 500 ms, it's seeked (a little ahead, by how long its last catch-up took).
 *  - Buffering: while one video can't play, the others wait for it (up to `holdTimeout`; after that
 *    it's left behind and caught up once it recovers). A video still being rendered stops just
 *    short of its last segment instead of stalling, and is out of the game until it has more.
 *
 * Mute and volume are left alone: each panel keeps its own. Framework-free so it can be tested
 * against fake media elements; the React side only attaches elements and reads snapshots. */

export interface SyncMedia {
  currentTime: number;
  playbackRate: number;
  muted: boolean;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly seeking: boolean;
  readonly readyState: number;
  readonly duration: number;
  readonly seekable?: TimeRangesLike;
  readonly buffered?: TimeRangesLike;
  play(): Promise<void> | void;
  pause(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

interface TimeRangesLike {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}

export type SyncPlayerStatus = "loading" | "ready" | "buffering" | "unavailable";

export interface SyncSnapshot {
  /** What the viewer asked for. */
  playing: boolean;
  /** Playing, but held while a video catches up or buffers. */
  waiting: boolean;
  rate: number;
  leader: string | null;
  /** The furthest any video reaches, in seconds; `null` until one knows its length. */
  end: number | null;
  players: Readonly<Record<string, SyncPlayerStatus>>;
}

export interface SyncOptions {
  /** Start nudging a follower's rate past this drift (s). */
  nudgeAbove: number;
  /** Stop nudging once within this (s). */
  settleBelow: number;
  /** Seek a follower instead past this drift (s). */
  seekAbove: number;
  minNudge: number;
  maxNudge: number;
  /** How long everyone waits for a buffering video before going on without it (ms). */
  holdTimeout: number;
  /** A video still rendering stops this far before its last segment (s). */
  edgeMargin: number;
  /** A seek nobody asked for that lands this close is the player's own adjustment (hls.js gap
   *  jumping, stall nudges), not the viewer's (s). */
  ignoreSeeksWithin: number;
  now: () => number;
}

const DEFAULTS: SyncOptions = {
  nudgeAbove: 0.05,
  settleBelow: 0.015,
  seekAbove: 0.5,
  minNudge: 0.02,
  maxNudge: 0.05,
  holdTimeout: 10_000,
  edgeMargin: 0.5,
  ignoreSeeksWithin: 0.75,
  now: () => (typeof performance === "undefined" ? Date.now() : performance.now()),
};

const HAVE_METADATA = 1;
const HAVE_FUTURE_DATA = 3;
/** Paused videos are lined up to the frame (60 fps). */
const PAUSED_TOLERANCE = 0.02;
/** A rendered video's end is real: it may play right up to it. */
const READY_EDGE = 0.05;
/** Unasked seeks this soon after a video starts playing are the browser's, not the viewer's. */
const LIVE_EDGE_JUMP_MS = 600;
/** A paused video can sit just before its data (a stream whose first frame is at 0.1 s, a hole
 *  between segments) and never report HAVE_FUTURE_DATA; hls.js jumps such a gap once it plays. */
const MAX_GAP = 0.3;
/** Buffered this far ahead counts as ready to play. */
const ENOUGH_AHEAD = 0.5;

const EVENTS = [
  "play",
  "pause",
  "seeking",
  "seeked",
  "ratechange",
  "waiting",
  "playing",
  "canplay",
  "loadedmetadata",
  "durationchange",
  "timeupdate",
  "ended",
  "emptied",
] as const;

interface Entry {
  id: string;
  media: SyncMedia;
  /** Seconds of video that exist; `Infinity` once fully rendered. */
  until: number;
  /** Moved to the clock once its metadata arrived. */
  positioned: boolean;
  /** Ready once; from here its seeks are the viewer's. */
  armed: boolean;
  seeksPending: number;
  expectPlay: boolean;
  expectPause: boolean;
  /** The rate we last gave it. */
  rate: number;
  /** +1 running fast to catch up, -1 running slow, 0 at the group's rate. */
  nudge: -1 | 0 | 1;
  /** Seeked by drift correction while the rest play on: not waited for. */
  catchingUp: boolean;
  catchUpStartedAt: number;
  /** Kept the others waiting past holdTimeout; left behind until it can play. */
  stuck: boolean;
  /** When it last started playing: a live (EVENT) stream may jump to its live edge then. */
  playedAt: number;
  off: () => void;
}

export class SyncGroup {
  private readonly options: SyncOptions;
  private readonly entries = new Map<string, Entry>();
  private intent = false;
  private rate = 1;
  /** The clock: `base` seconds at `now() == baseAt`. Re-anchored to the leader on every tick. */
  private base: number;
  private baseAt: number;
  private holdingSince: number | null = null;
  private preferred: string | null = null;
  private leaderId: string | null = null;
  /** How long a catch-up seek took last time (s): followers are seeked this far ahead. */
  private catchUpLead = 0.15;
  private reconciling = false;
  private lastTick = Number.NEGATIVE_INFINITY;
  private snapshot: SyncSnapshot;
  private readonly listeners = new Set<() => void>();

  constructor(options: Partial<SyncOptions> = {}, startAt = 0) {
    this.options = { ...DEFAULTS, ...options };
    this.base = Math.max(0, startAt);
    this.baseAt = this.options.now();
    this.snapshot = {
      playing: false,
      waiting: false,
      rate: 1,
      leader: null,
      end: null,
      players: {},
    };
  }

  /* ── Public API ─────────────────────────────────────────────────────────────────────────────── */

  attach(id: string, media: SyncMedia, until = Number.POSITIVE_INFINITY) {
    this.entries.get(id)?.off();
    const entry: Entry = {
      id,
      media,
      until,
      positioned: false,
      armed: false,
      seeksPending: 0,
      expectPlay: false,
      expectPause: false,
      rate: media.playbackRate,
      nudge: 0,
      // A video added while the others already play joins them when it's ready.
      catchingUp: this.intent && this.holdingSince === null && this.entries.size > 0,
      catchUpStartedAt: this.options.now(),
      stuck: false,
      playedAt: Number.NEGATIVE_INFINITY,
      off: () => {},
    };
    const handlers = EVENTS.map((type) => {
      const handler = () => this.handle(entry, type);
      media.addEventListener(type, handler);
      return [type, handler] as const;
    });
    entry.off = () => {
      for (const [type, handler] of handlers) media.removeEventListener(type, handler);
    };
    this.entries.set(id, entry);
    this.setEntryRate(entry, this.rate);
    this.tick(true);
    return () => {
      if (this.entries.get(id) !== entry) return;
      entry.off();
      this.entries.delete(id);
      if (this.leaderId === id) this.leaderId = null;
      this.tick(true);
    };
  }

  /** How much of a player's video exists (s). Grows while the run renders. */
  setAvailableUntil(id: string, until: number) {
    const entry = this.entries.get(id);
    if (!entry || entry.until === until) return;
    entry.until = until;
    this.tick(true);
  }

  /** The video the others follow when it can play: the big panel's. */
  setLeader(id: string | null) {
    this.preferred = id;
    this.tick(true);
  }

  play() {
    if (this.intent) return;
    const end = this.end();
    if (end !== null && this.clock() >= end - READY_EDGE * 2) this.seek(0);
    this.intent = true;
    const time = this.clock();
    this.anchor(time);
    // Called inside the viewer's tap where possible. Safari lets a video play with sound later on
    // only if a play() on it came from a gesture once, so every video gets one now, even those the
    // reconcile below pauses again to wait for the slowest.
    for (const entry of this.entries.values()) {
      if (entry.positioned && this.covers(entry, time)) this.playEntry(entry);
    }
    this.tick(true);
  }

  pause() {
    if (!this.intent) return;
    const time = this.time();
    this.intent = false;
    this.holdingSince = null;
    this.anchor(time);
    for (const entry of this.entries.values()) {
      entry.catchingUp = false;
      this.pauseEntry(entry);
    }
    this.tick(true);
  }

  toggle() {
    if (this.intent) this.pause();
    else this.play();
  }

  /** Everyone to `seconds`. `from` is a video that's already there (the viewer seeked on it). */
  seek(seconds: number, from?: SyncMedia) {
    const end = this.end();
    const target = Math.max(0, end === null ? seconds : Math.min(seconds, end));
    this.anchor(target);
    for (const entry of this.entries.values()) {
      entry.catchingUp = false;
      entry.nudge = 0;
      this.setEntryRate(entry, this.rate);
      if (entry.media === from || !entry.positioned) continue;
      if (this.covers(entry, target)) this.seekEntry(entry, target);
    }
    this.tick(true);
  }

  setRate(rate: number) {
    if (!(rate > 0) || !Number.isFinite(rate)) return;
    this.anchor(this.time());
    this.rate = rate;
    for (const entry of this.entries.values()) {
      entry.nudge = 0;
      this.setEntryRate(entry, rate);
    }
    this.tick(true);
  }

  /** Run time now, in seconds. */
  time() {
    const leader = this.leaderId ? this.entries.get(this.leaderId) : undefined;
    if (leader && leader.armed && !leader.media.seeking && leader.seeksPending === 0) {
      const t = leader.media.currentTime;
      if (this.covers(leader, t)) return t;
    }
    return this.clock();
  }

  /** The furthest any video reaches (s), or `null` while none knows its length yet. */
  end() {
    let end: number | null = null;
    for (const entry of this.entries.values()) {
      const reach = this.reach(entry);
      if (Number.isFinite(reach)) end = Math.max(end ?? 0, reach);
    }
    return end;
  }

  getSnapshot = () => this.snapshot;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Reconcile every video with the clock. Runs on media events; call it on an interval too, so
   *  waits time out and unavailable videos rejoin while nothing fires events. */
  tick(force = false) {
    const now = this.options.now();
    // Every video fires timeupdate ~4 times a second; one pass covers them all.
    if (!force && now - this.lastTick < 30) return;
    if (this.reconciling) return;
    this.reconciling = true;
    this.lastTick = now;
    try {
      this.reconcile(now);
    } finally {
      this.reconciling = false;
    }
  }

  destroy() {
    for (const entry of this.entries.values()) entry.off();
    this.entries.clear();
    this.listeners.clear();
  }

  /* ── Events from the videos ─────────────────────────────────────────────────────────────────── */

  private handle(entry: Entry, type: (typeof EVENTS)[number]) {
    const { media } = entry;
    switch (type) {
      case "play":
        entry.playedAt = this.options.now();
        if (entry.expectPlay) entry.expectPlay = false;
        else this.play();
        return;
      case "pause":
        if (entry.expectPause) entry.expectPause = false;
        // Reaching the end pauses a video by itself; that isn't the viewer pausing.
        else if (media.ended || media.currentTime >= this.reach(entry) - READY_EDGE)
          this.tick(true);
        else this.pause();
        return;
      case "seeking": {
        if (entry.seeksPending > 0) {
          entry.seeksPending--;
          return;
        }
        // hls.js moves a fresh video to its start position itself, and a browser playing a
        // still-growing (EVENT) playlist natively jumps to the live edge as it starts.
        if (!entry.armed || this.options.now() - entry.playedAt < LIVE_EDGE_JUMP_MS) return;
        const target = media.currentTime;
        // While playing, hls.js nudges a stalled video or jumps a gap by itself.
        if (this.intent && Math.abs(target - this.clock()) < this.options.ignoreSeeksWithin) return;
        this.seek(target, media);
        return;
      }
      case "seeked":
        // Every seek has finished; a `seeking` we counted on and never got can't block it forever.
        if (!media.seeking) entry.seeksPending = 0;
        this.tick(true);
        return;
      case "emptied":
        // The source was reset (a new load, or hls.js recovering): position it again.
        entry.positioned = false;
        entry.armed = false;
        entry.seeksPending = 0;
        this.tick(true);
        return;
      case "ratechange": {
        const rate = media.playbackRate;
        if (Math.abs(rate - entry.rate) < 1e-3) return;
        this.setRate(rate);
        return;
      }
      case "timeupdate":
        this.tick();
        return;
      default:
        this.tick(true);
    }
  }

  /* ── The reconcile pass ─────────────────────────────────────────────────────────────────────── */

  private reconcile(now: number) {
    // A rate the viewer set on some video whose `ratechange` hasn't arrived: theirs wins over a
    // nudge we'd otherwise write over it.
    for (const entry of this.entries.values()) {
      const rate = entry.media.playbackRate;
      if (Math.abs(rate - entry.rate) > 1e-3 && rate > 0) {
        this.setRate(rate);
        return;
      }
    }

    const time = this.time();

    for (const entry of this.entries.values()) {
      const { media } = entry;
      if (!entry.positioned && media.readyState >= HAVE_METADATA) {
        entry.positioned = true;
        if (this.covers(entry, time) && Math.abs(media.currentTime - time) > PAUSED_TOLERANCE) {
          this.seekEntry(entry, time);
        }
      }
      if (!entry.armed && entry.positioned && this.isReady(entry)) entry.armed = true;
      // Recovered: drift correction below seeks it back to the others.
      if (entry.stuck && this.isReady(entry)) entry.stuck = false;
    }

    const inRange: Entry[] = [];
    for (const entry of this.entries.values()) {
      if (this.covers(entry, time)) inRange.push(entry);
      else {
        // Not rendered this far yet, or already over: it sits still under its overlay.
        this.pauseEntry(entry);
        entry.catchingUp = false;
      }
    }

    // Everyone waits for a video that should be playing and can't.
    const blocking = inRange.filter((e) => !e.stuck && !e.catchingUp && !this.isReady(e));
    if (this.intent && blocking.length > 0) {
      if (this.holdingSince === null) {
        this.holdingSince = now;
        this.anchor(time);
      }
      if (now - this.holdingSince <= this.options.holdTimeout) {
        // All of them stand still, the one being waited for too: hls.js keeps filling its buffer
        // while it's paused, and it can't run ahead when its data arrives.
        for (const entry of inRange) this.pauseEntry(entry);
        this.leaderId = this.pickLeader(inRange.filter((e) => e.armed));
        this.publish();
        return;
      }
      for (const entry of blocking) entry.stuck = true;
    }
    if (this.holdingSince !== null) {
      this.holdingSince = null;
      this.anchor(time);
    }

    const playable = inRange.filter((e) => e.armed && !e.stuck);
    const ready = playable.filter((e) => !e.catchingUp && this.isReady(e));
    this.leaderId = this.pickLeader(ready);
    const leader = this.leaderId ? this.entries.get(this.leaderId) : undefined;

    if (!this.intent) {
      for (const entry of this.entries.values()) this.pauseEntry(entry);
      // Paused, they show the same frame: line them up to the leader.
      if (leader) {
        const t = leader.media.currentTime;
        this.anchor(t);
        for (const entry of ready) {
          if (entry !== leader && Math.abs(entry.media.currentTime - t) > PAUSED_TOLERANCE) {
            this.seekEntry(entry, t);
          }
        }
      }
      this.publish();
      return;
    }

    if (inRange.length === 0 && [...this.entries.values()].every((e) => e.positioned)) {
      // Past the end of everything there is: stop there.
      this.intent = false;
      this.anchor(time);
      this.publish();
      return;
    }

    for (const entry of playable) this.playEntry(entry);
    for (const entry of inRange) if (entry.stuck) this.pauseEntry(entry);
    if (leader) this.correctDrift(leader, playable, now);
    this.publish();
  }

  private correctDrift(leader: Entry, playable: Entry[], now: number) {
    const { nudgeAbove, settleBelow, seekAbove, minNudge, maxNudge } = this.options;
    const lead = leader.media.currentTime;
    this.anchor(lead);
    leader.nudge = 0;
    leader.catchingUp = false;
    this.setEntryRate(leader, this.rate);

    for (const entry of playable) {
      if (entry === leader) continue;
      if (entry.media.seeking || entry.seeksPending > 0) continue;
      if (entry.catchingUp) {
        if (!this.isReady(entry)) continue;
        entry.catchingUp = false;
        // Next time, seek ahead by what this catch-up cost.
        const took = (now - entry.catchUpStartedAt) / 1000;
        this.catchUpLead = Math.min(1.5, Math.max(0.05, this.catchUpLead * 0.5 + took * 0.5));
      }
      const drift = entry.media.currentTime - lead;
      const size = Math.abs(drift);
      if (size > seekAbove) {
        entry.nudge = 0;
        this.setEntryRate(entry, this.rate);
        entry.catchingUp = true;
        entry.catchUpStartedAt = now;
        this.seekEntry(entry, lead + this.catchUpLead * this.rate);
        continue;
      }
      const direction = drift < 0 ? 1 : -1;
      if (size > nudgeAbove || (entry.nudge === direction && size > settleBelow)) {
        const strength = Math.min(maxNudge, Math.max(minNudge, (size / seekAbove) * maxNudge));
        entry.nudge = direction;
        this.setEntryRate(entry, this.rate * (1 + direction * strength));
      } else if (entry.nudge !== 0) {
        entry.nudge = 0;
        this.setEntryRate(entry, this.rate);
      }
    }
  }

  /* ── Helpers ────────────────────────────────────────────────────────────────────────────────── */

  private clock() {
    const running = this.intent && this.holdingSince === null;
    if (!running) return this.base;
    return this.base + ((this.options.now() - this.baseAt) / 1000) * this.rate;
  }

  private anchor(time: number) {
    this.base = time;
    this.baseAt = this.options.now();
  }

  /** How far this video can play (s): what's rendered, and what the element itself knows. */
  private reach(entry: Entry) {
    const { media } = entry;
    let known = Number.POSITIVE_INFINITY;
    if (Number.isFinite(media.duration) && media.duration > 0) known = media.duration;
    else if (media.seekable && media.seekable.length > 0) {
      const end = media.seekable.end(media.seekable.length - 1);
      // A live (EVENT) playlist: what the browser can reach so far.
      if (Number.isFinite(end) && end > 0) known = end;
    }
    return Math.min(entry.until, known);
  }

  private covers(entry: Entry, time: number) {
    const margin = Number.isFinite(entry.until) ? this.options.edgeMargin : READY_EDGE;
    return time < this.reach(entry) - margin;
  }

  private isReady(entry: Entry) {
    const { media } = entry;
    if (!entry.positioned || entry.seeksPending > 0 || media.seeking) return false;
    if (media.readyState >= HAVE_FUTURE_DATA) return true;
    if (media.readyState < HAVE_METADATA || !media.buffered) return false;
    const t = media.currentTime;
    const ranges = media.buffered;
    for (let i = 0; i < ranges.length; i++) {
      if (ranges.start(i) <= t + MAX_GAP && ranges.end(i) >= t + ENOUGH_AHEAD) return true;
    }
    return false;
  }

  private pickLeader(candidates: Entry[]) {
    const preferred = candidates.find((e) => e.id === this.preferred);
    if (preferred) return preferred.id;
    const current = candidates.find((e) => e.id === this.leaderId);
    return (current ?? candidates[0])?.id ?? null;
  }

  private seekEntry(entry: Entry, time: number) {
    // Before metadata a seek only sets the start position and fires no event to discount.
    if (entry.media.readyState < HAVE_METADATA) return;
    entry.seeksPending++;
    entry.media.currentTime = time;
  }

  private playEntry(entry: Entry) {
    const { media } = entry;
    if (!media.paused) return;
    entry.expectPlay = true;
    let result: Promise<void> | void;
    try {
      result = media.play();
    } catch {
      entry.expectPlay = false;
      return;
    }
    if (!result) return;
    result.catch((error: unknown) => {
      // An AbortError means a pause() overtook it; its `play` event was fired and discounted.
      if (error instanceof Error && error.name === "AbortError") return;
      // Refused (autoplay policy, no source): no `play` event is coming to discount.
      entry.expectPlay = false;
      // A browser that won't start sound without a tap on this very video still plays it muted;
      // the panel's own volume button brings the sound back.
      if (error instanceof Error && error.name === "NotAllowedError" && !media.muted) {
        media.muted = true;
        this.tick(true);
      }
    });
  }

  private pauseEntry(entry: Entry) {
    if (entry.media.paused) return;
    entry.expectPause = true;
    entry.media.pause();
  }

  private setEntryRate(entry: Entry, rate: number) {
    entry.rate = rate;
    if (Math.abs(entry.media.playbackRate - rate) > 1e-6) entry.media.playbackRate = rate;
  }

  private publish() {
    const time = this.time();
    const players: Record<string, SyncPlayerStatus> = {};
    for (const entry of this.entries.values()) {
      players[entry.id] = !this.covers(entry, time)
        ? "unavailable"
        : !entry.armed
          ? "loading"
          : entry.stuck || entry.catchingUp || !this.isReady(entry)
            ? "buffering"
            : "ready";
    }
    const next: SyncSnapshot = {
      playing: this.intent,
      waiting: this.intent && this.holdingSince !== null,
      rate: this.rate,
      leader: this.leaderId,
      end: this.end(),
      players,
    };
    const prev = this.snapshot;
    const same =
      prev.playing === next.playing &&
      prev.waiting === next.waiting &&
      prev.rate === next.rate &&
      prev.leader === next.leader &&
      prev.end === next.end &&
      Object.keys(next.players).length === Object.keys(prev.players).length &&
      Object.entries(next.players).every(([id, status]) => prev.players[id] === status);
    if (same) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}
