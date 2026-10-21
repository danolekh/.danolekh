import sharp from "sharp";
import { writeFileSync } from "node:fs";

/* The site icon is the brand mark: the registration dot printed twice, a little off (`.mark` in
 * danolekh-brand/brand.css). A blue disc top-left, a pink disc bottom-right; where they overlap the
 * inks multiply to plum.
 *
 *   bun run scripts/generate-icon.ts
 *
 * The overlap is drawn as its own shape instead of with mix-blend-mode, so librsvg (sharp) and every
 * browser's favicon renderer print the same three colours.
 */

const PAPER = "#eaebdc";
const BLUE = "#2d4b8f";
const PINK = "#c8497f";
const PLUM = "#231547"; // blue × pink

/** The mark in a box at (x, y) of side `s`; each disc is `k` of the box. The brand draws 82%; tab
 *  icons use a little less, because at 16px the plum overlap otherwise swallows both crescents. */
function mark(x: number, y: number, s: number, k: number, id = "m"): string {
  const r = (s * k) / 2;
  const [bx, by] = [x + r, y + r];
  const [px, py] = [x + s - r, y + s - r];
  return [
    `<clipPath id="${id}"><circle cx="${bx}" cy="${by}" r="${r}"/></clipPath>`,
    `<circle cx="${bx}" cy="${by}" r="${r}" fill="${BLUE}"/>`,
    `<circle cx="${px}" cy="${py}" r="${r}" fill="${PINK}"/>`,
    `<circle cx="${px}" cy="${py}" r="${r}" fill="${PLUM}" clip-path="url(#${id})"/>`,
  ].join("");
}

const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`;

/** The mark on a paper plate. `radius` 0 is full bleed, for icons the OS rounds itself. */
function plated(size: number, inset: number, k: number, radius: number): string {
  const plate = `<rect width="${size}" height="${size}" rx="${size * radius}" fill="${PAPER}"/>`;
  return svg(size, plate + mark(inset, inset, size - inset * 2, k));
}

/* favicon.svg: the bare mark on a light tab bar. On a dark one the blue and plum sink into the
 * chrome, so it gets the paper plate (the browser's colour scheme, not the site's theme toggle). */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    .plate { display: none }
    @media (prefers-color-scheme: dark) {
      .plate { display: inline }
      .bare { display: none }
    }
  </style>
  <g class="bare">${mark(0.5, 0.5, 31, 0.78, "a")}</g>
  <g class="plate"><rect width="32" height="32" rx="7" fill="${PAPER}"/>${mark(3, 3, 26, 0.78, "b")}</g>
</svg>
`;

// PNGs can't follow the colour scheme, so the tab sizes always carry the plate.
const pngs = [
  { name: "favicon-16x16.png", body: plated(16, 1.5, 0.78, 0.22) },
  { name: "favicon-32x32.png", body: plated(32, 3, 0.78, 0.22) },
  // iOS rounds the corners itself and fills transparency with black, so this one is full bleed.
  { name: "apple-touch-icon.png", body: plated(180, 38, 0.82, 0) },
  { name: "android-chrome-192x192.png", body: plated(192, 40, 0.82, 0.22) },
  { name: "android-chrome-512x512.png", body: plated(512, 108, 0.82, 0.22) },
];

async function main() {
  writeFileSync("public/favicon.svg", favicon);
  console.log("Generated: public/favicon.svg");
  for (const { name, body } of pngs) {
    await sharp(Buffer.from(body)).png({ compressionLevel: 9 }).toFile(`public/${name}`);
    console.log(`Generated: public/${name}`);
  }
}

main();
