import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

/* The last step: the soundtrack onto the recorded picture, and the cuts.
 *
 *   pnpm showreel                                             # in another terminal
 *   cd ~/code/cardstock && pnpm --filter promo record showreel --samples 4
 *   bun run showreel/finish.ts [--draft] [--master <mp4>]
 *
 * 1. Renders audio.ts offline in Chromium and writes showreel/out/showreel.wav.
 * 2. Two-pass loudness normalisation to -14 LUFS, -1 dBTP (what LinkedIn, X and YouTube play at).
 * 3. Muxes it with the recorder's master into showreel/out/Dan-Olekh-Showreel.mp4: 1080p60, H.264
 *    High CRF 18, AAC 256k, index up front. That's the file to upload and send.
 * 4. Unless --draft: the site's muted cuts via cardstock's encoder, into public/videos
 *    (showreel-1600.mp4, -800.mp4, and posters from the closing card at 14.5 s).
 * `--draft` writes showreel/out/draft.mp4 from the --fast take instead, for checking the sync. */

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? undefined : args[i + 1];
};
const DRAFT = args.includes("--draft");
const ROOT = new URL("..", import.meta.url).pathname;
const OUT = join(ROOT, "showreel/out");
const PROMO = join(homedir(), "code/cardstock/apps/promo");
const MASTER = flag("master") ?? join(PROMO, "out/showreel.mp4");
mkdirSync(OUT, { recursive: true });

const run = (cmd: string, argv: string[], cwd?: string) =>
  execFileSync(cmd, argv, { cwd, stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 26 }).toString();

// 1. The soundtrack, rendered where it was written: in the browser, on the page's own modules.
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage();
page.on("pageerror", (e) => console.error(e));
await page.goto("http://localhost:4174/?t=0");
await page.waitForFunction(() => "__renderWav" in window, null, { timeout: 30_000 });
const b64 = await page.evaluate(async () => {
  const buffer: ArrayBuffer = await (window as any).__renderWav();
  let s = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
});
await browser.close();
const raw = join(OUT, "showreel-raw.wav");
writeFileSync(raw, Buffer.from(b64, "base64"));

// 2. Measure, then normalise linearly to the measured values.
const TARGET = "I=-14:TP=-1:LRA=11";
const measured = (() => {
  const err = execFileSync(
    "sh",
    ["-c", `ffmpeg -hide_banner -i "${raw}" -af loudnorm=${TARGET}:print_format=json -f null - 2>&1`],
  ).toString();
  return JSON.parse(err.slice(err.lastIndexOf("{"), err.lastIndexOf("}") + 1)) as Record<string, string>;
})();
const wav = join(OUT, "showreel.wav");
run("ffmpeg", [
  ...["-y", "-loglevel", "error", "-i", raw],
  "-af",
  `loudnorm=${TARGET}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
  ...["-ar", "48000", wav],
]);
console.log(`soundtrack  ${measured.input_i} LUFS → -14  (${wav})`);

// 3. Picture and sound.
const master = MASTER;
const final = join(OUT, DRAFT ? "draft.mp4" : "Dan-Olekh-Showreel.mp4");
run("ffmpeg", [
  ...["-y", "-loglevel", "error", "-i", master, "-i", wav],
  ...["-map", "0:v:0", "-map", "1:a:0"],
  ...["-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p"],
  ...["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"],
  ...["-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", final],
]);
console.log(final);
console.log(
  run("ffprobe", [
    ...["-v", "error", "-show_entries", "stream=codec_name,width,height,r_frame_rate,sample_rate,channels"],
    ...["-show_entries", "format=duration,size", "-of", "compact", final],
  ]).trim(),
);

// 4. The site's cuts: muted, for autoplay, with the closing card as the poster.
if (!DRAFT)
  console.log(
    run(
      "pnpm",
      ["encode", master, "showreel", "--out", join(ROOT, "public/videos"), "--poster", "14.5"],
      PROMO,
    ).trim(),
  );
