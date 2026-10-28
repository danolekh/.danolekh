import { describe, expect, it } from "vitest";
import { SyncGroup, type SyncMedia } from "./sync";

/* A small stand-in for the browser: a virtual clock, a task queue, and media elements whose events
 * arrive later as tasks, the way real ones do. That asynchrony is what the group's bookkeeping of
 * its own calls has to survive, so the fakes keep it. */

class World {
  now = 0;
  private tasks: Array<{ at: number; seq: number; run: () => void }> = [];
  private seq = 0;
  readonly media: FakeMedia[] = [];

  queue(run: () => void, delay = 0) {
    this.tasks.push({ at: this.now + delay, seq: this.seq++, run });
  }

  /** Run everything that's due, including tasks those tasks queue. */
  flush() {
    for (let guard = 0; guard < 10_000; guard++) {
      this.tasks.sort((a, b) => a.at - b.at || a.seq - b.seq);
      const next = this.tasks[0];
      if (!next || next.at > this.now) return;
      this.tasks.shift();
      next.run();
    }
    throw new Error("task loop");
  }

  /** Let `ms` pass in 10 ms steps, playing every video. */
  advance(ms: number, group?: SyncGroup) {
    for (let elapsed = 0; elapsed < ms; elapsed += 10) {
      this.now += 10;
      for (const media of this.media) media.step(10);
      this.flush();
      if (elapsed % 250 === 0) group?.tick();
    }
  }

  spread() {
    const times = this.media.map((m) => m.currentTime);
    return Math.max(...times) - Math.min(...times);
  }
}

class FakeMedia implements SyncMedia {
  private t = 0;
  private rate = 1;
  private listeners = new Map<string, Set<() => void>>();
  private sinceTimeupdate = 0;
  paused = true;
  ended = false;
  seeking = false;
  readyState = 0;
  muted = false;
  /** >1 runs fast: real decoders don't keep perfect time against each other. */
  skew = 1;
  seekLatency = 80;
  stalled = false;
  refuseUnmuted = false;
  /** Data starts this late (WebKit reports a stream's first frame at 0.1 s): paused at 0, the
   *  element never gets past HAVE_CURRENT_DATA; playing, it jumps the gap. */
  startGap = 0;
  buffered = {
    length: 1,
    start: () => this.startGap,
    // Stalled means nothing buffered ahead.
    end: () => (this.stalled ? this.t : this.duration),
  };
  seeks = 0;
  plays = 0;

  constructor(
    private world: World,
    public duration = 90,
  ) {
    world.media.push(this);
  }

  get currentTime() {
    return this.t;
  }
  set currentTime(value: number) {
    if (this.readyState === 0) return;
    this.seeks++;
    this.t = Math.min(Math.max(0, value), this.duration);
    this.ended = false;
    this.seeking = true;
    this.readyState = 1;
    this.emit("seeking");
    this.world.queue(() => {
      if (!this.seeking) return;
      this.seeking = false;
      this.readyState = 4;
      this.emit("seeked");
      this.emit("canplay");
      if (!this.paused) this.emit("playing");
    }, this.seekLatency);
  }

  get playbackRate() {
    return this.rate;
  }
  set playbackRate(value: number) {
    if (value === this.rate) return;
    this.rate = value;
    this.emit("ratechange");
  }

  play() {
    if (this.startGap > 0 && this.t < this.startGap && this.readyState >= 1) {
      // Playing, the player jumps the hole by itself (a small seek).
      this.world.queue(() => {
        if (!this.paused && this.t < this.startGap) this.currentTime = this.startGap;
      }, 30);
    }
    if (this.refuseUnmuted && !this.muted) {
      const error = new Error("refused");
      error.name = "NotAllowedError";
      return Promise.reject(error);
    }
    if (this.paused) {
      this.plays++;
      this.paused = false;
      this.emit("play");
      this.emit(this.readyState >= 3 && !this.stalled ? "playing" : "waiting");
    }
    return Promise.resolve();
  }

  pause() {
    if (this.paused) return;
    this.paused = true;
    this.emit("pause");
  }

  /** Metadata now, enough data `after` ms later. */
  load(after = 50) {
    this.readyState = 1;
    this.emit("loadedmetadata");
    this.world.queue(() => {
      if (this.readyState < 1 || this.seeking) return;
      if (this.startGap > 0 && this.t < this.startGap) {
        this.readyState = 2;
        return;
      }
      this.readyState = 4;
      this.emit("canplay");
    }, after);
  }

  stall() {
    this.stalled = true;
    this.readyState = 2;
    this.emit("waiting");
  }

  recover() {
    this.stalled = false;
    this.readyState = 4;
    this.emit("canplay");
    if (!this.paused) this.emit("playing");
  }

  /** The viewer, through this video's own controls. */
  userSeek(time: number) {
    this.currentTime = time;
  }

  step(ms: number) {
    if (this.paused || this.seeking || this.stalled || this.readyState < 3) return;
    this.t += (ms / 1000) * this.rate * this.skew;
    this.sinceTimeupdate += ms;
    if (this.t >= this.duration) {
      this.t = this.duration;
      this.ended = true;
      this.paused = true;
      this.emit("pause");
      this.emit("ended");
      return;
    }
    if (this.sinceTimeupdate >= 250) {
      this.sinceTimeupdate = 0;
      this.emit("timeupdate");
    }
  }

  /** Jump without the element telling anyone, like a decoder hiccup. */
  jump(delta: number) {
    this.t += delta;
  }

  addEventListener(type: string, listener: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners.get(type)?.delete(listener);
  }
  private emit(type: string) {
    this.world.queue(() => {
      for (const listener of this.listeners.get(type) ?? []) listener();
    });
  }
}

function setup(count = 3, options: { startAt?: number; until?: number[] } = {}) {
  const world = new World();
  const group = new SyncGroup({ now: () => world.now }, options.startAt ?? 0);
  const media = Array.from({ length: count }, () => new FakeMedia(world));
  media.forEach((m, i) => group.attach(`p${i}`, m, options.until?.[i] ?? Number.POSITIVE_INFINITY));
  group.setLeader("p0");
  for (const m of media) m.load();
  world.advance(300, group);
  return { world, group, media };
}

describe("SyncGroup", () => {
  it("lines every video up at the start time once it has loaded", () => {
    const { media } = setup(3, { startAt: 15 });
    for (const m of media) expect(m.currentTime).toBe(15);
    for (const m of media) expect(m.paused).toBe(true);
  });

  it("plays and pauses everyone from any panel", () => {
    const { world, group, media } = setup();
    void media[2].play(); // the viewer, on a side panel
    world.advance(500, group);
    expect(group.getSnapshot().playing).toBe(true);
    for (const m of media) expect(m.paused).toBe(false);

    media[1].pause();
    world.advance(100, group);
    expect(group.getSnapshot().playing).toBe(false);
    for (const m of media) expect(m.paused).toBe(true);
    expect(world.spread()).toBeLessThanOrEqual(0.02);
  });

  it("seeks everyone to where the viewer seeked one video, once each", () => {
    const { world, group, media } = setup();
    group.play();
    world.advance(2000, group);
    const before = media.map((m) => m.seeks);
    media[1].userSeek(42);
    world.advance(400, group);
    expect(media[0].seeks - before[0]).toBe(1);
    expect(media[2].seeks - before[2]).toBe(1);
    expect(group.getSnapshot().playing).toBe(true);
    world.advance(1000, group);
    for (const m of media) expect(m.currentTime).toBeGreaterThan(42.5);
    expect(world.spread()).toBeLessThan(0.05);
  });

  it("does not echo its own seeks back as the viewer's", () => {
    const { world, group, media } = setup();
    group.seek(30);
    world.advance(500, group);
    group.seek(60);
    world.advance(500, group);
    for (const m of media) expect(m.currentTime).toBe(60);
    for (const m of media) expect(m.seeks).toBe(2);
  });

  it("spreads a speed change on any panel, but keeps its own nudges to itself", () => {
    const { world, group, media } = setup();
    media[0].skew = 1.004;
    group.play();
    world.advance(500, group);
    media[2].playbackRate = 1.5; // the viewer
    world.advance(300, group);
    expect(group.getSnapshot().rate).toBe(1.5);
    expect(media[0].playbackRate).toBe(1.5);
    world.advance(30_000, group);
    // Nudged around 1.5, never adopted as the group's rate.
    expect(group.getSnapshot().rate).toBe(1.5);
    for (const m of media) expect(Math.abs(m.playbackRate / 1.5 - 1)).toBeLessThanOrEqual(0.05);
  });

  it("nudges a drifting follower by 2–5% and keeps it within ~50 ms without seeking", () => {
    const { world, group, media } = setup();
    media[1].skew = 1.01; // gains 10 ms every second
    media[2].skew = 0.99;
    group.play();
    world.advance(500, group);
    const seeks = media.map((m) => m.seeks);
    let worst = 0;
    const rates = new Set<number>();
    for (let i = 0; i < 240; i++) {
      world.advance(250, group);
      worst = Math.max(worst, world.spread());
      rates.add(media[1].playbackRate);
    }
    expect(worst).toBeLessThan(0.12); // two followers, each held within ~55 ms of the leader
    expect(media.map((m) => m.seeks)).toEqual(seeks);
    expect(media[0].playbackRate).toBe(1);
    for (const rate of rates) {
      const off = Math.abs(rate - 1);
      expect(off === 0 || (off >= 0.0199 && off <= 0.0501)).toBe(true);
    }
    expect([...rates].some((r) => r < 1)).toBe(true);
  });

  it("hard-seeks a follower more than 500 ms off and settles it", () => {
    const { world, group, media } = setup();
    group.play();
    world.advance(2000, group);
    media[2].jump(-3);
    world.advance(300, group);
    expect(media[2].seeking || media[2].seeks > 1).toBe(true);
    world.advance(8000, group);
    expect(Math.abs(media[2].currentTime - media[0].currentTime)).toBeLessThan(0.05);
  });

  it("makes everyone wait while one video buffers, then goes on together", () => {
    const { world, group, media } = setup();
    group.play();
    world.advance(3000, group);
    media[1].stall();
    world.advance(1500, group);
    expect(group.getSnapshot().waiting).toBe(true);
    expect(group.getSnapshot().players.p1).toBe("buffering");
    expect(media[0].paused).toBe(true);
    expect(media[2].paused).toBe(true);
    const frozen = media[0].currentTime;
    world.advance(1000, group);
    expect(media[0].currentTime).toBe(frozen);

    media[1].recover();
    world.advance(500, group);
    expect(group.getSnapshot().waiting).toBe(false);
    for (const m of media) expect(m.paused).toBe(false);
    world.advance(2000, group);
    expect(world.spread()).toBeLessThan(0.06);
  });

  it("stops waiting after the timeout and catches the slow one up when it recovers", () => {
    const { world, group, media } = setup();
    group.play();
    world.advance(2000, group);
    media[2].stall();
    world.advance(9000, group);
    expect(group.getSnapshot().waiting).toBe(true);
    world.advance(4000, group); // past the 10 s timeout
    expect(group.getSnapshot().waiting).toBe(false);
    expect(media[0].paused).toBe(false);
    expect(media[0].currentTime).toBeGreaterThan(4);
    expect(group.getSnapshot().players.p2).toBe("buffering");

    media[2].recover();
    world.advance(10_000, group);
    expect(group.getSnapshot().players.p2).toBe("ready");
    expect(Math.abs(media[2].currentTime - media[0].currentTime)).toBeLessThan(0.06);
  });

  it("parks a video that isn't rendered that far yet, without holding the others", () => {
    const { world, group, media } = setup(3, { until: [Infinity, Infinity, 10] });
    group.play();
    world.advance(12_000, group);
    expect(group.getSnapshot().players.p2).toBe("unavailable");
    expect(group.getSnapshot().waiting).toBe(false);
    expect(media[2].paused).toBe(true);
    expect(media[2].currentTime).toBeLessThan(10);
    expect(media[0].currentTime).toBeGreaterThan(11.5);

    group.setAvailableUntil("p2", 60);
    world.advance(4000, group);
    expect(group.getSnapshot().players.p2).toBe("ready");
    expect(media[2].paused).toBe(false);
    expect(Math.abs(media[2].currentTime - media[0].currentTime)).toBeLessThan(0.06);
  });

  it("ignores the player's own small seeks while playing", () => {
    const { world, group, media } = setup();
    group.play();
    world.advance(3000, group);
    const others = [media[0].seeks, media[2].seeks];
    media[1].currentTime = media[1].currentTime + 0.1; // hls.js nudging past a stall
    world.advance(300, group);
    expect([media[0].seeks, media[2].seeks]).toEqual(others);
  });

  it("ignores a live stream's jump to its edge as it starts playing", () => {
    const { world, group, media } = setup();
    group.play();
    world.advance(3000, group);
    media[1].pause(); // the viewer
    world.advance(200, group);
    const leaderSeeks = media[0].seeks;
    void media[2].play(); // the viewer again, on a video whose browser then jumps to the edge
    media[2].currentTime = 48;
    world.advance(300, group);
    expect(media[0].seeks).toBe(leaderSeeks); // nobody followed it to 0:48
    expect(media[0].currentTime).toBeLessThan(4);
    world.advance(3000, group);
    expect(Math.abs(media[2].currentTime - media[0].currentTime)).toBeLessThan(0.06);
  });

  it("doesn't wait forever for a video paused just before its first frame", () => {
    const world = new World();
    const group = new SyncGroup({ now: () => world.now });
    const media = [new FakeMedia(world), new FakeMedia(world)];
    media[1].startGap = 0.1;
    media.forEach((m, i) => group.attach(`p${i}`, m));
    for (const m of media) m.load();
    world.advance(300, group);
    expect(media[1].readyState).toBe(2);
    group.play();
    world.advance(1000, group);
    expect(group.getSnapshot().waiting).toBe(false);
    for (const m of media) expect(m.paused).toBe(false);
    world.advance(3000, group);
    expect(world.spread()).toBeLessThan(0.06);
  });

  it("follows another video when the leader can't play there", () => {
    const { world, group, media } = setup(2, { until: [8, Infinity] });
    group.play();
    world.advance(10_000, group);
    expect(group.getSnapshot().leader).toBe("p1");
    expect(media[1].currentTime).toBeGreaterThan(9.5);
    expect(group.time()).toBeCloseTo(media[1].currentTime, 5);
  });

  it("stops at the end of the run and starts over on play", () => {
    const { world, group, media } = setup(2);
    group.seek(88);
    world.advance(300, group);
    group.play();
    world.advance(3000, group);
    expect(group.getSnapshot().playing).toBe(false);
    group.play();
    world.advance(500, group);
    for (const m of media) expect(m.currentTime).toBeLessThan(1);
    expect(group.getSnapshot().playing).toBe(true);
  });

  it("falls back to muted when the browser refuses sound", async () => {
    const { world, group, media } = setup(2);
    media[0].refuseUnmuted = true;
    media[1].muted = true;
    group.play();
    await new Promise((resolve) => setTimeout(resolve, 0)); // the refusal is a rejected promise
    world.advance(500, group);
    expect(media[0].muted).toBe(true);
    expect(media[0].paused).toBe(false);
    expect(group.getSnapshot().playing).toBe(true);
  });

  it("lets a video added mid-playback join without stopping the others", () => {
    const world = new World();
    const group = new SyncGroup({ now: () => world.now });
    const a = new FakeMedia(world);
    group.attach("a", a);
    a.load();
    world.advance(200, group);
    group.play();
    world.advance(5000, group);
    const b = new FakeMedia(world);
    group.attach("b", b);
    b.load(400);
    world.advance(100, group);
    expect(a.paused).toBe(false);
    expect(group.getSnapshot().waiting).toBe(false);
    world.advance(5000, group);
    expect(Math.abs(b.currentTime - a.currentTime)).toBeLessThan(0.06);
  });
});
