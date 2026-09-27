import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

/* The showreel's raw footage, captured once and kept in showreel/assets:
 *
 *   bun run showreel/capture.ts [sites|morph]
 *
 * - sites: the live builds as a first-time visitor sees them, in Chrome at a real device scale
 *   (Oasi Kadir's new build, nuovo.oasikadir.it, on a desktop and a phone, sportmagaz.com.ua on a phone, consolline.com on a
 *   desktop). Cookie banners and chat bubbles are hidden, nothing is clicked.
 * - morph: the product-photo morph on sportmagaz.com.ua, from the case study's clip, as numbered
 *   JPEG stills. The stage decodes them up front and draws one per frame, so the clip keeps exact time
 *   under the recorder, where a <video> would run on the wall clock. */

const OUT = new URL("./assets/", import.meta.url).pathname;
const only = process.argv[2];

type Site = {
  name: string;
  url: string;
  viewport: { width: number; height: number };
  scale: number;
  /** How much of the page to keep, in CSS px from the top (a tall capture scrolls in a phone). */
  height?: number;
  mobile?: boolean;
  /** consolline.com fades its hero in over a few seconds. */
  settle?: number;
  /** A consent bar with no telling class name: its button's text. */
  dismiss?: string;
};

const SITES: Site[] = [
  { name: "oasi-desktop", url: "https://nuovo.oasikadir.it/", viewport: { width: 1440, height: 900 }, scale: 2 },
  {
    name: "oasi-phone",
    url: "https://nuovo.oasikadir.it/",
    viewport: { width: 390, height: 844 },
    scale: 3,
    height: 2400,
    mobile: true,
  },
  {
    name: "sportmagaz-phone",
    url: "https://sportmagaz.com.ua/",
    viewport: { width: 390, height: 844 },
    scale: 3,
    height: 2400,
    mobile: true,
  },
  {
    name: "consolline-desktop",
    url: "https://consolline.com/",
    viewport: { width: 1440, height: 900 },
    scale: 2,
    settle: 8000,
    dismiss: "Зрозуміло",
  },
];

// Consent dialogs, cookie bars and chat launchers: none of them are the work.
const HIDE = `
  :is(
    [id*="cookie" i], [class*="cookie" i], [id*="consent" i], [class*="consent" i],
    [id*="iubenda" i], [class*="iubenda" i], [id*="cmp" i], [class*="gdpr" i],
    [id*="chat" i], [class*="chat-widget" i], iframe[title*="chat" i],
    a[href*="wa.me"], a[href*="whatsapp" i], [class*="whatsapp" i], [class*="joinchat" i]
  ):not(html, body) {
    display: none !important;
  }
`;

async function sites() {
  const browser = await chromium.launch({ channel: "chrome" });
  for (const site of SITES) {
    const context = await browser.newContext({
      viewport: site.viewport,
      deviceScaleFactor: site.scale,
      isMobile: site.mobile ?? false,
      hasTouch: site.mobile ?? false,
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    const page = await context.newPage();
    await page.goto(site.url, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
    await page.addStyleTag({ content: HIDE });
    if (site.dismiss) await page.getByText(site.dismiss, { exact: true }).first().click({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(site.settle ?? 0);
    // Scroll through once so lazy images load, then back to the top.
    const height = site.height ?? site.viewport.height;
    for (let y = 0; y <= height; y += site.viewport.height / 2) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
      await page.waitForTimeout(350);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(1500);
    const png = await page.screenshot({
      fullPage: height > site.viewport.height,
      clip: { x: 0, y: 0, width: site.viewport.width, height },
    });
    const file = `${OUT}${site.name}.webp`;
    await sharp(png).webp({ quality: 90 }).toFile(file);
    console.log(file);
    await context.close();
  }
  await browser.close();
}

// The case study's clip is slowed 2.5x; the morph itself runs from about 0.6 s to 2.5 s of it.
function morph() {
  const dir = `${OUT}morph/`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync("ffmpeg", [
    ...["-loglevel", "error", "-y", "-ss", "0.6", "-t", "2.0"],
    ...["-i", new URL("../public/images/p/sportmagaz/product-morph.mp4", import.meta.url).pathname],
    ...["-q:v", "2", "-start_number", "0", `${dir}%03d.jpg`],
  ]);
  console.log(dir);
}

mkdirSync(OUT, { recursive: true });
if (!only || only === "sites") await sites();
if (!only || only === "morph") morph();
