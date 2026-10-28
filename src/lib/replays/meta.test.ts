import { describe, expect, it } from "vitest";
import {
  chapterCues,
  deathName,
  findPlayer,
  formatRunTime,
  parseRunMeta,
  parseTimeParam,
  runOutcome,
  runStartedLabel,
  toTimeParam,
} from "./meta";

const META = {
  runId: "20261027-2347-q4eg",
  result: "fail",
  timeMs: 1421000,
  seed: -123456789,
  players: [
    { name: "presensea", hls: "https://b/x.m3u8", status: "ready", readyUntilMs: 1421000 },
    {
      name: "Bot2",
      hls: "https://b/y.m3u8",
      status: "rendering",
      readyUntilMs: 900000,
      segmentsDone: 3,
      segmentsTotal: 6,
    },
    { name: "bot2", hls: "dup" },
    { hls: "nameless" },
  ],
  events: [
    { type: "death", detail: "presensea — lava", t: 1421000 },
    { type: "split", key: "nether", label: "Nether", by: "Bot2", t: 312000 },
    { type: "weird", t: 5 },
  ],
};

describe("parseRunMeta", () => {
  it("keeps what the page needs and drops what it can't use", () => {
    const meta = parseRunMeta(META)!;
    expect(meta.seed).toBe("-123456789");
    expect(meta.players.map((p) => p.name)).toEqual(["presensea", "Bot2"]);
    expect(meta.players[1]).toMatchObject({
      status: "rendering",
      segmentsDone: 3,
      segmentsTotal: 6,
    });
    expect(meta.events.map((e) => e.t)).toEqual([312000, 1421000]);
  });

  it("rejects things that aren't a run", () => {
    expect(parseRunMeta(null)).toBeNull();
    expect(parseRunMeta({ players: [] })).toBeNull();
    expect(parseRunMeta({ runId: "x", result: "nope" })?.result).toBe("running");
  });

  it("finds a player regardless of case", () => {
    const meta = parseRunMeta(META)!;
    expect(findPlayer(meta, "PRESENSEA")?.name).toBe("presensea");
    expect(findPlayer(meta, "nobody")).toBeNull();
  });
});

describe("outcome", () => {
  it("names who died and when", () => {
    const outcome = runOutcome(parseRunMeta(META)!);
    expect(outcome).toEqual({ kind: "death", name: "presensea", timeMs: 1421000 });
    expect(formatRunTime(1421000, 0)).toBe("23:41");
  });

  it("reads the name from a death's detail when `by` is missing", () => {
    expect(
      deathName({ type: "death", key: null, label: null, by: null, detail: "Bot1 — inWall", t: 0 }),
    ).toBe("Bot1");
  });

  it("is live while running and a time when won", () => {
    expect(runOutcome(parseRunMeta({ runId: "a", result: "running" })!)).toEqual({ kind: "live" });
    expect(runOutcome(parseRunMeta({ runId: "a", result: "win", timeMs: 46071 })!)).toEqual({
      kind: "win",
      timeMs: 46071,
    });
  });
});

describe("time", () => {
  it("formats like the in-game timer", () => {
    expect(formatRunTime(0)).toBe("0:00.0");
    expect(formatRunTime(46071)).toBe("0:46.0");
    expect(formatRunTime(46071, 3)).toBe("0:46.071");
    expect(formatRunTime(1421987)).toBe("23:41.9");
    expect(formatRunTime(3723400)).toBe("1:02:03.4");
  });

  it("reads ?t= in the forms people paste", () => {
    expect(parseTimeParam("15:00")).toBe(900);
    expect(parseTimeParam("1:02:03")).toBe(3723);
    expect(parseTimeParam("90")).toBe(90);
    expect(parseTimeParam("90.5")).toBe(90.5);
    expect(parseTimeParam("1h2m3s")).toBe(3723);
    expect(parseTimeParam("2m")).toBe(120);
    expect(parseTimeParam("0:75")).toBeNull();
    expect(parseTimeParam("soon")).toBeNull();
    expect(parseTimeParam("")).toBeNull();
    expect(parseTimeParam(undefined)).toBeNull();
  });

  it("writes ?t= back", () => {
    expect(toTimeParam(900.7)).toBe("15:00");
    expect(toTimeParam(3723)).toBe("1:02:03");
  });

  it("dates a run from its ID", () => {
    expect(runStartedLabel({ runId: "20261027-2347-q4eg" })).toBe("27 Oct 2026, 23:47");
    expect(runStartedLabel({ runId: "test-run" })).toBeNull();
  });
});

describe("chapterCues", () => {
  it("opens a chapter at every split and death", () => {
    const meta = parseRunMeta(META)!;
    expect(chapterCues(meta.events, 1430)).toEqual([
      { startTime: 0, endTime: 312, value: "Start" },
      { startTime: 312, endTime: 1421, value: "Nether" },
      { startTime: 1421, endTime: 1430, value: "presensea died" },
    ]);
  });
});
