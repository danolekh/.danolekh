/* Local test runs for the /m watch page, so it can be built without the render worker.
 *
 *   bun run scripts/replays-fixtures.ts
 *
 * Writes fixtures/replays/ (gitignored): for three fake players, a 90 s HLS stream (720p60 +
 * 480p30, fMP4) with a big burned-in run-time clock, the player's name, a bar that sweeps once a
 * second (to eyeball sub-tenth offsets), and a silent audio track. Bot2 joined late: black until
 * 0:20. alex is still rendering: an EVENT playlist that stops at 1:00.
 *
 * Then it puts two meta.json files into the local R2 that `vite dev` emulates (.wrangler/state):
 *   /m/20261027-2210-fixt   finished: alex died at 1:24, alex still rendering 4/6 segments
 *   /m/20261027-2300-live   the same videos as a run that's still going
 * `vite dev` serves the videos at /__replays/ (see vite.config.ts). This ffmpeg has no drawtext,
 * so the clock is a digit sprite cropped per frame with ffmpeg expressions.
 */
import sharp from "sharp";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FFMPEG = process.env.FFMPEG ?? "/opt/homebrew/bin/ffmpeg";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "replays");
const DONE = "20261027-2210-fixt";
const LIVE = "20261027-2300-live";
const SECONDS = 90;
const W = 1280;
const H = 720;
// Digit cell in the sprite, and where each digit of "M:SS.d" sits on the card.
const DW = 96;
const DH = 168;
const CLOCK_Y = 300;
const CLOCK_X = 286;
const SLOTS = { m: 0, s10: 2, s1: 3, d: 5 } as const; // character columns; 1 = ":", 4 = "."

const PLAYERS = [
  { name: "presensea", color: "#1d4ed8", join: 0 },
  { name: "Bot2", color: "#047857", join: 20 },
  { name: "alex", color: "#b45309", join: 0, renderedUntil: 60 },
] as const;

const svg = (body: string, width = W, height = H) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  );

async function card(player: (typeof PLAYERS)[number], file: string) {
  const col = (i: number) => CLOCK_X + i * DW;
  const body = `
    <rect width="100%" height="100%" fill="${player.color}"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#ffffff33" stroke-width="2"/>
    <text x="72" y="128" font-family="Menlo" font-size="64" font-weight="bold" fill="#fff">${player.name}</text>
    <text x="72" y="176" font-family="Menlo" font-size="26" fill="#ffffffaa">fixture POV · run time below</text>
    <text x="${CLOCK_X - 150}" y="${CLOCK_Y + 128}" font-family="Menlo" font-size="56" font-weight="bold" fill="#fbbf24">IGT</text>
    <rect x="${CLOCK_X - 12}" y="${CLOCK_Y - 8}" width="${DW * 6 + 24}" height="${DH + 16}" fill="#00000055"/>
    <text x="${col(1) + 8}" y="${CLOCK_Y + 132}" font-family="Menlo" font-size="160" fill="#fff">:</text>
    <text x="${col(4) + 8}" y="${CLOCK_Y + 132}" font-family="Menlo" font-size="160" fill="#fff">.</text>
    <rect x="80" y="${H - 96}" width="${W - 160}" height="12" fill="#ffffff22"/>`;
  await sharp(svg(body)).png().toFile(file);
}

async function digits(file: string) {
  const glyphs = Array.from(
    { length: 10 },
    (_, i) =>
      `<text x="${i * DW + 4}" y="132" font-family="Menlo" font-size="160" fill="#fff">${i}</text>`,
  ).join("");
  await sharp(svg(glyphs, DW * 10, DH))
    .png()
    .toFile(file);
}

function run(args: string[]) {
  return new Promise<void>((done, fail) => {
    const proc = spawn(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
      stdio: "inherit",
    });
    proc.on("error", fail);
    proc.on("exit", (code) => (code === 0 ? done() : fail(new Error(`ffmpeg exited ${code}`))));
  });
}

async function encode(player: (typeof PLAYERS)[number], dir: string) {
  await mkdir(dir, { recursive: true });
  const cardPng = join(dir, "..", `.${player.name}-card.png`);
  const digitsPng = join(dir, "..", `.digits.png`);
  await card(player, cardPng);
  await digits(digitsPng);

  const on = `enable='gte(t,${player.join})'`;
  const digit = (expr: string) => `crop=${DW}:${DH}:x='${DW}*(${expr})':y=0`;
  const eps = "+0.000001";
  const filter = [
    `[0][1]overlay=0:0:${on}[b0]`,
    `[2]split=4[s0][s1][s2][s3]`,
    `[s0]${digit(`mod(floor(t/60${eps}),10)`)}[dm]`,
    `[s1]${digit(`floor(mod(t${eps},60)/10)`)}[ds10]`,
    `[s2]${digit(`mod(floor(t${eps}),10)`)}[ds1]`,
    `[s3]${digit(`mod(floor(t*10${eps}),10)`)}[dd]`,
    `[b0][dm]overlay=${CLOCK_X + SLOTS.m * DW}:${CLOCK_Y}:${on}[b1]`,
    `[b1][ds10]overlay=${CLOCK_X + SLOTS.s10 * DW}:${CLOCK_Y}:${on}[b2]`,
    `[b2][ds1]overlay=${CLOCK_X + SLOTS.s1 * DW}:${CLOCK_Y}:${on}[b3]`,
    `[b3][dd]overlay=${CLOCK_X + SLOTS.d * DW}:${CLOCK_Y}:${on}[b4]`,
    `[b4][3]overlay=x='80+mod(t,1)*${W - 160 - 48}':y=${H - 96}:${on},format=yuv420p,split=2[v720][vlow]`,
    `[vlow]scale=854:480,fps=30[v480]`,
  ].join(";");

  await run([
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=${W}x${H}:r=60:d=${SECONDS}`,
    "-loop",
    "1",
    "-framerate",
    "60",
    "-t",
    `${SECONDS}`,
    "-i",
    cardPng,
    "-loop",
    "1",
    "-framerate",
    "60",
    "-t",
    `${SECONDS}`,
    "-i",
    digitsPng,
    "-f",
    "lavfi",
    "-i",
    `color=c=white:s=48x12:r=60:d=${SECONDS}`,
    "-f",
    "lavfi",
    "-t",
    `${SECONDS}`,
    "-i",
    "anullsrc=r=48000:cl=stereo",
    "-filter_complex",
    filter,
    "-map",
    "[v720]",
    "-map",
    "4:a",
    "-map",
    "[v480]",
    "-map",
    "4:a",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-profile:v",
    "high",
    // A keyframe every 2 s in both renditions, so 4 s segments line up.
    "-force_key_frames",
    "expr:gte(t,n_forced*2)",
    "-b:v:0",
    "2000k",
    "-maxrate:v:0",
    "2400k",
    "-bufsize:v:0",
    "4000k",
    "-b:v:1",
    "700k",
    "-maxrate:v:1",
    "900k",
    "-bufsize:v:1",
    "1400k",
    "-c:a",
    "aac",
    "-b:a",
    "64k",
    "-ac",
    "2",
    "-t",
    `${SECONDS}`,
    "-f",
    "hls",
    "-hls_time",
    "4",
    "-hls_playlist_type",
    "vod",
    "-hls_segment_type",
    "fmp4",
    "-hls_flags",
    "independent_segments",
    "-master_pl_name",
    "master.m3u8",
    "-var_stream_map",
    "v:0,a:0,name:720p v:1,a:1,name:480p",
    "-hls_fmp4_init_filename",
    "init.mp4",
    "-hls_segment_filename",
    join(dir, "%v", "seg_%03d.m4s"),
    join(dir, "%v", "index.m3u8"),
  ]);

  // The poster: a frame where the player is in.
  await run([
    "-ss",
    `${player.join + 1}`,
    "-i",
    join(dir, "720p", "index.m3u8"),
    "-frames:v",
    "1",
    "-q:v",
    "4",
    join(dir, "poster.jpg"),
  ]);
  await rm(cardPng);
}

/** A rendering player's playlists: an EVENT playlist that stops where the renderer has got to. */
async function cutToEvent(dir: string, seconds: number) {
  for (const variant of await readdir(dir, { withFileTypes: true })) {
    if (!variant.isDirectory()) continue;
    const file = join(dir, variant.name, "index.m3u8");
    const lines = (await readFile(file, "utf8")).split("\n");
    const out: string[] = [];
    let elapsed = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.startsWith("#EXT-X-ENDLIST")) continue;
      if (line.startsWith("#EXT-X-PLAYLIST-TYPE")) {
        out.push("#EXT-X-PLAYLIST-TYPE:EVENT");
        continue;
      }
      if (line.startsWith("#EXTINF:")) {
        const duration = Number(line.slice(8).split(",")[0]);
        if (elapsed + duration > seconds + 0.01) break;
        elapsed += duration;
        out.push(line, lines[++i]!);
        continue;
      }
      out.push(line);
    }
    await writeFile(file, `${out.join("\n")}\n`);
  }
}

function meta(runId: string, live: boolean) {
  const start = Date.UTC(2026, 9, 27, live ? 22 : 21, live ? 0 : 10);
  const hls = (name: string) => `/__replays/${DONE}/${name}/master.m3u8`;
  const poster = (name: string) => `/__replays/${DONE}/${name}/poster.jpg`;
  const player = (
    name: string,
    status: "ready" | "rendering",
    readyUntilMs: number,
    done: number,
  ) => ({
    name,
    uuid: randomUUID(),
    hls: hls(name),
    poster: poster(name),
    status,
    readyUntilMs,
    segmentsDone: done,
    segmentsTotal: live ? null : 6,
  });
  const events = [
    { type: "split", key: "nether", label: "Nether", by: "presensea", detail: null, t: 21_400 },
    { type: "split", key: "bastion", label: "Bastion", by: "Bot2", detail: null, t: 47_850 },
    { type: "split", key: "fortress", label: "Fortress", by: "alex", detail: null, t: 66_200 },
    ...(live
      ? []
      : [{ type: "death", key: null, label: null, by: "alex", detail: "alex — lava", t: 84_300 }]),
  ].map((e) => ({ ...e, unixMs: start + e.t }));
  return {
    runId,
    result: live ? "running" : "fail",
    timeMs: live ? null : 84_300,
    seed: live ? "8812040419270017" : "-4172064412093516170",
    startUnixMs: start,
    updatedUnixMs: start + 90_000,
    players: live
      ? [
          player("presensea", "rendering", 75_000, 5),
          player("Bot2", "rendering", 72_000, 4),
          player("alex", "rendering", 60_000, 4),
        ]
      : [
          player("presensea", "ready", 89_300, 6),
          player("Bot2", "ready", 89_300, 6),
          player("alex", "rendering", 60_000, 4),
        ],
    events: live ? events.filter((e) => e.t < 70_000) : events,
  };
}

await mkdir(ROOT, { recursive: true });
for (const player of PLAYERS) {
  const dir = join(ROOT, DONE, player.name);
  await rm(dir, { recursive: true, force: true });
  console.log(`encoding ${player.name}…`);
  await encode(player, dir);
  if ("renderedUntil" in player) await cutToEvent(dir, player.renderedUntil);
}
await rm(join(ROOT, DONE, ".digits.png"), { force: true });

for (const [runId, live] of [
  [DONE, false],
  [LIVE, true],
] as const) {
  const file = join(ROOT, `${runId}.meta.json`);
  await writeFile(file, JSON.stringify(meta(runId, live), null, 2));
  execFileSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "r2",
      "object",
      "put",
      `danolekh-bucket/runs/${runId}/meta.json`,
      "--file",
      file,
      "--content-type",
      "application/json",
      "--local",
    ],
    { stdio: "ignore" },
  );
  console.log(`local R2: runs/${runId}/meta.json`);
}
console.log(`done: /m/${DONE} and /m/${LIVE} on the dev server`);
