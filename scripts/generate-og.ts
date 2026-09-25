import sharp from "sharp";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import matter from "gray-matter";
import { projects } from "../src/data/projects";

/* Social cards. Every page used to point og:image at /og.jpg, which was never in `public/` — so
 * Google, X, LinkedIn and Telegram all got a 404 where the preview should be. This writes the one
 * site-wide card plus a per-case-study card cut from the cover art that already exists.
 *
 *   bun run scripts/generate-og.ts
 *
 * Output is committed; it only needs re-running when a cover changes or a project is added.
 *
 * Text is drawn as SVG, which sharp hands to librsvg — and librsvg resolves families through the
 * system font list, not through `public/Nunito_Sans`. So the cards use a system sans rather than the
 * site's typeface; matching it would mean shipping a text-to-path step for two lines of copy.
 */

// 1.91:1, the ratio Open Graph asks for. 1200x630 is the size every scraper caches at full width.
const W = 1200;
const H = 630;

const OUT_DIR = "public/og";
const AVATAR = "public/images/me.jpeg";
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";

const BG = "#0b0b0b"; // --background in the dark theme
const FG = "#fafafa";
const MUTED = "#a1a1aa";
const ACCENT = "#3b82f6";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The card for `/`, `/b` and anything without art of its own: avatar, name, one line of what I do. */
async function siteCard() {
  const size = 220;
  const avatar = await sharp(AVATAR)
    .resize(size, size, { fit: "cover" })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="40" ry="40" fill="#fff"/></svg>`,
        ),
        blend: "dest-in",
      },
    ])
    .png()
    .toBuffer();

  // Faint dot grid, the same texture the site's background effect draws.
  const dots = Array.from({ length: 8 }, (_, row) =>
    Array.from(
      { length: 15 },
      (_, col) => `<circle cx="${60 + col * 80}" cy="${55 + row * 80}" r="1.5" fill="#ffffff" />`,
    ).join(""),
  ).join("");

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g opacity="0.10">${dots}</g>
  <rect x="0" y="0" width="${W}" height="8" fill="${ACCENT}"/>
  <g font-family="${FONT}">
    <text x="350" y="272" font-size="78" font-weight="700" fill="${FG}" letter-spacing="-2">Dan Olekh</text>
    <text x="350" y="326" font-size="34" font-weight="400" fill="${MUTED}">Software engineer</text>
    <text x="90" y="546" font-size="26" font-weight="600" fill="${ACCENT}">danolekh.com</text>
    <text x="278" y="546" font-size="26" font-weight="400" fill="${MUTED}">case studies · writing · TypeScript</text>
  </g>
</svg>`;

  mkdirSync("public", { recursive: true });
  await sharp(Buffer.from(svg))
    .composite([{ input: avatar, left: 90, top: 180 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile("public/og.jpg");
  console.log("Generated: public/og.jpg");
}

/* A case study's card is its cover art, cropped to 1.91:1 with the title and my name burned into a
 * bottom band — the cover already reads as the project, the band tells a scroller whose work it is. */
async function projectCard(
  slug: string,
  title: string,
  cover: string,
  kind = "Case study",
  out = slug,
) {
  const art = await sharp(`public${cover}`).resize(W, H, { fit: "cover" }).toBuffer();
  // Post titles run long; bold Helvetica averages ~0.56em a character, so shrink to fit the band.
  const size = Math.min(62, Math.floor((W - 128) / (title.length * 0.56)));

  const band = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}" stop-opacity="0"/>
      <stop offset="0.55" stop-color="${BG}" stop-opacity="0.82"/>
      <stop offset="1" stop-color="${BG}" stop-opacity="0.97"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${H - 240}" width="${W}" height="240" fill="url(#fade)"/>
  <g font-family="${FONT}">
    <text x="64" y="${H - 92}" font-size="${size}" font-weight="700" fill="${FG}" letter-spacing="-1.5">${escapeXml(title)}</text>
    <text x="64" y="${H - 44}" font-size="27" font-weight="400" fill="${MUTED}">${kind} · Dan Olekh · danolekh.com</text>
  </g>
</svg>`;

  mkdirSync(OUT_DIR, { recursive: true });
  await sharp(art)
    .composite([{ input: Buffer.from(band) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(`${OUT_DIR}/${out}.jpg`);
  console.log(`Generated: ${OUT_DIR}/${out}.jpg`);
}

async function main() {
  await siteCard();
  for (const p of projects) {
    if (!p.internal) continue;
    await projectCard(p.slug, p.title, p.cover);
  }
  // Markdown with its own `cover` in frontmatter: unlisted case studies (/og/<slug>.jpg) and posts
  // (/og/b-<slug>.jpg). A post's explicit `image` still wins at render time.
  const listed = new Set(projects.map((p) => p.slug));
  for (const [dir, kind, prefix] of [
    ["src/content/p", "Case study", ""],
    ["src/content/b", "Writing", "b-"],
  ] as const) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const slug = file.slice(0, -3);
      const { data } = matter(readFileSync(`${dir}/${file}`, "utf8"));
      if (typeof data.cover !== "string" || data.draft === true || listed.has(slug)) continue;
      await projectCard(slug, String(data.title ?? slug), data.cover, kind, `${prefix}${slug}`);
    }
  }
  console.log("Done!");
}

main();
