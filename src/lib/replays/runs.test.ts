import { describe, expect, it } from "vitest";
import { parseRunMeta } from "./meta";
import {
  formatElapsed,
  isShortRun,
  latestRun,
  newestRunIds,
  progressLabel,
  runIdFromPrefix,
  runPoster,
  runStart,
  sortRuns,
  summarizeRun,
} from "./runs";

const player = (name: string, extra: Record<string, unknown> = {}) => ({
  name,
  hls: `https://b/runs/x/${name}/master.m3u8`,
  poster: `https://b/runs/x/${name}/poster.jpg?v=1`,
  status: "rendering",
  readyUntilMs: 0,
  segmentsDone: 0,
  segmentsTotal: 4,
  ...extra,
});

describe("listing", () => {
  it("takes run IDs from R2's prefixes and skips test runs and _ names", () => {
    expect(runIdFromPrefix("runs/20261028-2340-3jv8/")).toBe("20261028-2340-3jv8");
    expect(runIdFromPrefix("runs/test-20261027-live/")).toBeNull();
    expect(runIdFromPrefix("runs/_index/")).toBeNull();
    expect(runIdFromPrefix("runs/a/b/")).toBeNull();
    expect(runIdFromPrefix("other/20261028-2340-3jv8/")).toBeNull();
  });

  it("keeps the newest IDs, once each", () => {
    const prefixes = [
      "runs/20261028-0059-hq28/",
      "runs/20261028-2340-3jv8/",
      "runs/test-20261029-0000-zzzz/",
      "runs/20261028-2222-m57u/",
      "runs/20261028-2340-3jv8/",
    ];
    expect(newestRunIds(prefixes, 2)).toEqual(["20261028-2340-3jv8", "20261028-2222-m57u"]);
  });
});

describe("summarizeRun", () => {
  it("adds up rendering over every player", () => {
    const meta = parseRunMeta({
      runId: "20261028-2340-3jv8",
      result: "fail",
      timeMs: 1011254,
      startUnixMs: 1793227208727,
      players: [
        player("presensea", { segmentsDone: 2, readyUntilMs: 400000 }),
        player("scapelawg", { segmentsDone: 1 }),
        player("uNByte"),
      ],
      events: [{ type: "death", detail: "presensea — mob by hoglin", t: 1011254 }],
    })!;
    const run = summarizeRun(meta);
    expect(run.rendering).toEqual({ done: 3, total: 12 });
    expect(progressLabel(run.rendering!)).toBe("rendering 3/12 segments");
    expect(run.outcome).toEqual({ kind: "death", name: "presensea", timeMs: 1011254 });
    expect(run.players).toEqual(["presensea", "scapelawg", "uNByte"]);
    expect(run.moving).toBe(true);
  });

  it("has no total while the run is live and no progress once every view is ready", () => {
    const live = summarizeRun(
      parseRunMeta({
        runId: "a",
        result: "running",
        players: [player("a", { segmentsDone: 3, segmentsTotal: null })],
      })!,
    );
    expect(live.rendering).toEqual({ done: 3, total: null });
    expect(progressLabel(live.rendering!)).toBe("rendering, 3 segments so far");
    expect(progressLabel({ done: 0, total: null })).toBe("rendering");
    expect(progressLabel({ done: 1, total: 1 })).toBe("rendering 1/1 segment");

    const done = summarizeRun(
      parseRunMeta({
        runId: "a",
        result: "win",
        timeMs: 46071,
        players: [player("a", { status: "ready", segmentsDone: 4 })],
      })!,
    );
    expect(done.rendering).toBeNull();
    expect(done.moving).toBe(false);
  });

  it("only offers a poster that exists", () => {
    const meta = (players: unknown[]) => parseRunMeta({ runId: "a", result: "fail", players })!;
    // Nothing rendered yet: every poster URL 404s.
    expect(runPoster(meta([player("a"), player("b")]))).toBeNull();
    // The first player's, once they have footage.
    expect(
      runPoster(meta([player("a", { readyUntilMs: 1 }), player("b", { status: "ready" })])),
    ).toContain("/a/");
    // Otherwise the first ready player's.
    expect(runPoster(meta([player("a"), player("b", { status: "ready" })]))).toContain("/b/");
  });
});

describe("order", () => {
  const run = (runId: string, startUnixMs: number | null, result = "fail", timeMs = 600_000) => ({
    runId,
    startUnixMs,
    result: result as "fail" | "abandoned",
    timeMs,
  });

  it("sorts newest first, by start time", () => {
    const sorted = sortRuns([
      run("20261028-2222-m57u", 1793222539761),
      run("20261028-2340-3jv8", 1793227208727),
      run("20261028-0059-hq28", null),
    ]);
    expect(sorted.map((r) => r.runId)).toEqual([
      "20261028-2340-3jv8",
      "20261028-2222-m57u",
      "20261028-0059-hq28",
    ]);
  });

  it("leads with the newest run that isn't a quick reset", () => {
    const reset = run("20261028-2350-zzzz", 1793227800000, "abandoned", 30_000);
    const real = run("20261028-2340-3jv8", 1793227208727);
    expect(isShortRun(reset)).toBe(true);
    expect(isShortRun(run("x", 0, "abandoned", 61_000))).toBe(false);
    expect(isShortRun(run("x", 0, "fail", 10_000))).toBe(false);
    expect(latestRun([reset, real])).toBe(real);
    expect(latestRun([reset])).toBe(reset);
    expect(latestRun([])).toBeNull();
  });
});

describe("labels", () => {
  it("dates a run in Vienna time", () => {
    // 22:40 UTC on 28 Oct 2026 is 23:40 in Vienna (CET, after the clocks went back).
    expect(runStart({ runId: "x", startUnixMs: 1793227208727 }, 2026)).toEqual({
      date: "Wed 28 Oct",
      time: "23:40",
      year: 2026,
    });
    // Summer time: 22:30 UTC on 1 Jul is 00:30 the next day.
    expect(runStart({ runId: "x", startUnixMs: Date.UTC(2026, 6, 1, 22, 30) }, 2026)).toMatchObject(
      { date: "Thu 2 Jul", time: "00:30" },
    );
    expect(runStart({ runId: "x", startUnixMs: 1793227208727 }, 2027)?.date).toBe(
      "Wed 28 Oct 2026",
    );
  });

  it("falls back to the time in the run ID", () => {
    expect(runStart({ runId: "20261028-0059-hq28", startUnixMs: null }, 2026)).toMatchObject({
      date: "Wed 28 Oct",
      time: "00:59",
    });
    expect(runStart({ runId: "nope", startUnixMs: null })).toBeNull();
  });

  it("says how long ago a live run started", () => {
    expect(formatElapsed(4 * 60_000 + 59_000)).toBe("4 min");
    expect(formatElapsed(65 * 60_000)).toBe("1 h 05 min");
  });
});
