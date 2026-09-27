import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

/* Stills of the stage at given times, to look at one by one while building a scene:
 *
 *   pnpm showreel                                   # in another terminal
 *   bun run showreel/stills.ts 0.3,1.2,2.6 [out-dir] [scale]
 *
 * Each still is `?t=<s>`, which holds the reel at that time; live WebGL layers keep running on
 * their own clocks, so they're only roughly where the recording will have them. */

const times = (process.argv[2] ?? "0.3,1.2,2.6,3.5,4.8,6.5,8.4,10.2,11.8,12.8,14.5").split(",").map(Number);
const out = process.argv[3] ?? "showreel/out/stills";
const scale = Number(process.argv[4] ?? 1);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  channel: "chromium",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--force-color-profile=srgb"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: scale });
page.on("pageerror", (e) => console.error(e));
page.on("console", (m) => m.type() === "error" && console.error(m.text()));
for (const t of times) {
  await page.goto(`http://localhost:4174/?t=${t}`);
  await page.waitForSelector("html[data-ready]", { timeout: 30_000 });
  await page.waitForTimeout(600);
  const file = `${out}/t-${t.toFixed(2)}.png`;
  await page.screenshot({ path: file });
  console.log(file);
}
await browser.close();
