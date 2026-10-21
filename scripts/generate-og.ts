import sharp from "sharp";
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import matter from "gray-matter";
import { projects } from "../src/data/projects";
import { lab } from "../src/data/lab";
import { H, ORIGIN, W, siteCard, workCard } from "./og/cards";

/* Social cards, 1200x630 (the 1.91:1 Open Graph asks for), in the riso look:
 *
 *   public/og.jpg              the site card, for /, /b and anything without art of its own
 *   public/og/<slug>.jpg       a case study (src/data/projects.ts, or src/content/p with a cover)
 *   public/og/b-<slug>.jpg     a post with a cover (a post's explicit `image` still wins at render)
 *   public/og/lab-<slug>.jpg   a lab item with a cover, and lab-<slug>-<look>.jpg per extra look
 *
 *   bun run scripts/generate-og.ts            # all of them
 *   bun run scripts/generate-og.ts lab- og    # only outputs whose name contains one of the words
 *
 * Output is committed; re-run when a cover or a title changes or a page is added. The templates are
 * in scripts/og/cards.ts; headless Chromium renders them because the type needs Archivo's width axis.
 */

type Card = { out: string; html: string };

const OUT_DIR = "public/og";

/** The light cut of a cover when it exists on disk, else the dark one: the cards are printed on paper. */
const lightest = (cover: string, light?: unknown) =>
  typeof light === "string" && existsSync(`public${light}`) ? light : cover;

function cards(): Card[] {
  const list: Card[] = [{ out: "public/og.jpg", html: siteCard() }];
  const work = (out: string, title: string, kind: string, art: string) =>
    list.push({ out: `${OUT_DIR}/${out}.jpg`, html: workCard({ title, kind, art }) });

  for (const p of projects) {
    if (p.internal) work(p.slug, p.title, "Case study", lightest(p.cover, p.coverLight));
  }
  // Markdown with its own `cover` in frontmatter: unlisted case studies (/og/<slug>.jpg) and posts
  // (/og/b-<slug>.jpg).
  const listed = new Set(projects.map((p) => p.slug));
  for (const [dir, kind, prefix] of [
    ["src/content/p", "Case study", ""],
    ["src/content/b", "Writing", "b-"],
  ] as const) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const slug = file.slice(0, -3);
      const { data } = matter(readFileSync(`${dir}/${file}`, "utf8"));
      if (typeof data.cover !== "string" || data.draft === true || listed.has(slug)) continue;
      work(
        `${prefix}${slug}`,
        String(data.title ?? slug),
        kind,
        lightest(data.cover, data.coverLight),
      );
    }
  }
  // The lab's pages, once an item has a cover; its other looks (/lab/<slug>/<look>) from a cover
  // named after the look when there is one.
  for (const item of lab) {
    if (item.cover)
      work(`lab-${item.slug}`, item.title, "Lab", lightest(item.cover, item.coverLight));
    for (const look of item.looks ?? []) {
      const cover = `/images/covers/lab-${item.slug}-${look}.webp`;
      if (existsSync(`public${cover}`)) work(`lab-${item.slug}-${look}`, item.title, "Lab", cover);
    }
  }
  return list;
}

async function main() {
  const only = process.argv.slice(2);
  const todo = cards().filter((c) => only.length === 0 || only.some((w) => c.out.includes(w)));
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  // The card's HTML is served at ORIGIN/card; every other path there is a file on disk.
  let html = "";
  await context.route(`${ORIGIN}/**`, (route) => {
    const path = decodeURIComponent(new URL(route.request().url()).pathname);
    return path === "/card"
      ? route.fulfill({ body: html, contentType: "text/html; charset=utf-8" })
      : route.fulfill({ path });
  });
  const page = await context.newPage();

  let failed = 0;
  for (const card of todo) {
    html = card.html;
    await page.goto(`${ORIGIN}/card`, { waitUntil: "load" });
    await page.waitForSelector("body[data-ready]");
    const spill = await page.evaluate(() => document.body.dataset.spill);
    const png = await page.screenshot({ type: "png" });
    await sharp(png)
      .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(card.out);
    if (spill) {
      failed++;
      console.error(`Clipped: ${card.out} → ${spill}`);
    } else console.log(`Generated: ${card.out}`);
  }
  await browser.close();
  if (failed) process.exit(1);
  console.log("Done!");
}

main();
