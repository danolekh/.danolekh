import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* HTML for the share cards, in the riso look (danolekh-brand: brand.css, "Out in the world").
 * Chromium renders them, because the type is Archivo's width axis and SVG-through-sharp can only
 * use system fonts. Every asset is a path on disk; generate-og.ts serves them to the page from
 * ORIGIN, so a card is plain HTML with no base64 and no file:// rules to fight. */

export const W = 1200;
export const H = 630;
export const ORIGIN = "https://og.local";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const url = (path: string) => `${ORIGIN}${encodeURI(resolve(ROOT, path))}`;

/** First file that exists: the package (the canonical copy), then the site's own copy of it. */
function find(...paths: string[]): string {
  const hit = paths.find((p) => existsSync(p));
  if (!hit) throw new Error(`None of these exist: ${paths.join(", ")}`);
  return hit;
}
function fontsource(file: string): string {
  try {
    return createRequire(import.meta.url).resolve(`@fontsource-variable/archivo/files/${file}`);
  } catch {
    return "";
  }
}

// Archivo with the width axis (62–125) and weights 100–900; it has no Cyrillic, so Nunito Sans (full
// variable TTF, which keeps its own width axis) prints any Cyrillic in a title.
const ARCHIVO = find(
  fontsource("archivo-latin-wdth-normal.woff2"),
  `${ROOT}/public/fonts/archivo-latin.woff2`,
);
const ARCHIVO_EXT = find(
  fontsource("archivo-latin-ext-wdth-normal.woff2"),
  `${ROOT}/public/fonts/archivo-latin-ext.woff2`,
);
const NUNITO = `${ROOT}/public/Nunito_Sans/NunitoSans-VariableFont_YTLC,opsz,wdth,wght.ttf`;
const GRAIN = `${ROOT}/scripts/og/grain.png`;
const FACE = `${ROOT}/public/images/me.jpeg`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const BASE = /* css */ `
@font-face {
  font-family: "Archivo";
  src: url("${url(ARCHIVO)}") format("woff2");
  font-weight: 100 900;
  font-stretch: 62% 125%;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308,
    U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: "Archivo";
  src: url("${url(ARCHIVO_EXT)}") format("woff2");
  font-weight: 100 900;
  font-stretch: 62% 125%;
  unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308,
    U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113,
    U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: "Nunito Sans";
  src: url("${url(NUNITO)}") format("truetype");
  font-weight: 200 1000;
  font-stretch: 75% 125%;
}

:root {
  --stock: #f4f3ee;
  --paper: #eaebdc;
  --blue: #2d4b8f;
  --pink: #c8497f;
  --plum: #231547;
}
* { box-sizing: border-box; margin: 0; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body {
  position: relative;
  background: var(--paper);
  color: var(--blue);
  font-family: "Archivo", "Nunito Sans", sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
/* Paper grain, printed in the blue ink over everything, as on the site. */
body::after {
  content: "";
  position: absolute;
  inset: 0;
  background: url("${url(GRAIN)}") 0 0 / 192px 192px;
  opacity: 0.45;
  pointer-events: none;
}

.display {
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  line-height: 0.84;
  letter-spacing: -0.005em;
}
.label {
  font-stretch: 115%;
  font-weight: 700;
  font-size: 19px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
}

/* ● ——→ LABEL */
.kicker { display: flex; align-items: center; gap: 16px; }
.kicker .dot { width: 18px; height: 18px; border-radius: 50%; background: var(--blue); flex: none; }
.kicker svg { width: 84px; height: 12px; flex: none; color: var(--pink); }

/* Four registration dots around anything worth looking at. */
.reg { position: absolute; }
.reg > i { position: absolute; width: 13px; height: 13px; border-radius: 50%; background: var(--blue); }
.reg > i:nth-of-type(1) { left: 14px; top: 14px; }
.reg > i:nth-of-type(2) { right: 14px; top: 14px; }
.reg > i:nth-of-type(3) { left: 14px; bottom: 14px; }
.reg > i:nth-of-type(4) { right: 14px; bottom: 14px; }

/* The mark: the registration dot, printed twice and slightly off. */
.mark { --s: 44px; position: relative; width: var(--s); height: var(--s); flex: none; isolation: isolate; }
.mark::before, .mark::after {
  content: "";
  position: absolute;
  width: 82%;
  height: 82%;
  border-radius: 50%;
  mix-blend-mode: multiply;
}
.mark::before { right: 0; bottom: 0; background: var(--pink); }
.mark::after { left: 0; top: 0; background: var(--blue); }
`;

const ARROW = `<svg viewBox="0 0 80 8" preserveAspectRatio="none"><path d="M0 4H78M72 .6L78.6 4L72 7.4" fill="none" stroke="currentColor" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
const kicker = (text: string) =>
  `<div class="kicker"><i class="dot"></i>${ARROW}<span class="label">${esc(text)}</span></div>`;
const regDots = `<i></i><i></i><i></i><i></i>`;

/* Shrinks each [data-fit] element until it fits its parent: no word wider than the box, no more
 * than data-lines lines, no taller than the box. Then flags anything that still spills out, so a
 * new title that can't fit fails loudly instead of shipping clipped. */
const FIT = /* js */ `
<script>
(async () => {
  await document.fonts.ready;
  const unfit = [];
  for (const el of document.querySelectorAll("[data-fit]")) {
    const box = el.parentElement;
    const lines = Number(el.dataset.lines || 3);
    const lh = parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize);
    // data-baseline: sit the last line's baseline on that element's bottom edge. A zero-height
    // inline-block marks the baseline, glued to the last word so it can't wrap onto a line alone.
    const anchor = el.dataset.baseline && document.querySelector(el.dataset.baseline);
    const probe = document.createElement("span");
    if (anchor) {
      const words = el.textContent.trim().split(/\\s+/);
      const tail = document.createElement("span");
      tail.style.whiteSpace = "nowrap";
      tail.textContent = words.pop();
      probe.style.cssText = "display: inline-block; width: 0; height: 0";
      tail.append(probe);
      el.textContent = words.length ? words.join(" ") + " " : "";
      el.append(tail);
    }
    const fits = (size) => {
      el.style.fontSize = size + "px";
      if (anchor) {
        const below = el.getBoundingClientRect().bottom - probe.getBoundingClientRect().bottom;
        const pad = box.getBoundingClientRect().bottom - anchor.getBoundingClientRect().bottom - below;
        box.style.paddingBottom = Math.max(0, pad) + "px";
      }
      const h = el.getBoundingClientRect().height;
      return el.scrollWidth <= box.clientWidth && Math.round(h / (size * lh)) <= lines && h <= box.clientHeight;
    };
    let size = Number(el.dataset.max);
    while (size > Number(el.dataset.min) && !fits(size)) size -= 1;
    if (!fits(size)) unfit.push(el);
    el.dataset.size = size;
  }
  const spill = [...unfit, ...document.querySelectorAll(".label")].filter((el) => {
    const r = el.getBoundingClientRect();
    return unfit.includes(el) || el.scrollWidth > el.clientWidth + 1 || r.left < 0 || r.right > ${W} || r.top < 0 || r.bottom > ${H};
  });
  document.body.dataset.spill = spill.map((el) => el.textContent.trim()).join(" | ");
  document.body.dataset.ready = "1";
})();
</script>`;

const page = (css: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${BASE}${css}</style></head><body>${body}${FIT}</body></html>`;

/* ── The site card: /, /b and anything without art of its own ─────────────────────────────── */

const SITE_CSS = /* css */ `
/* The portrait prints as a smooth blue duotone (never dots): blue shadows, paper light. */
.portrait { left: 44px; top: 44px; width: 542px; height: 542px; padding: 42px; }
.portrait img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; filter: url(#duo-face); }
.site .kicker { position: absolute; left: 640px; top: 74px; gap: 14px; }
.site .kicker svg { width: 56px; }
.site .name { position: absolute; left: 632px; top: 150px; width: 520px; height: 360px; }
.site .name h1 { font-size: 214px; }
.site .name span { display: block; }
.site .name .o { color: var(--pink); mix-blend-mode: multiply; }
.site .foot { position: absolute; left: 640px; right: 56px; bottom: 74px; display: flex; align-items: center; justify-content: space-between; }
`;

export function siteCard(): string {
  return page(
    SITE_CSS,
    `<svg width="0" height="0" style="position:absolute">
  <filter id="duo-face" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0"/>
    <feComponentTransfer>
      <feFuncR type="gamma" amplitude="1" exponent="0.8" offset="0"/>
      <feFuncG type="gamma" amplitude="1" exponent="0.8" offset="0"/>
      <feFuncB type="gamma" amplitude="1" exponent="0.8" offset="0"/>
    </feComponentTransfer>
    <feComponentTransfer>
      <feFuncR type="table" tableValues="0.176 0.584 0.918"/>
      <feFuncG type="table" tableValues="0.294 0.639 0.922"/>
      <feFuncB type="table" tableValues="0.561 0.727 0.863"/>
    </feComponentTransfer>
  </filter>
</svg>
<main class="site">
  <figure class="reg portrait">${regDots}<img src="${url(FACE)}" alt=""></figure>
  ${kicker("Software engineer · Vienna")}
  <div class="name"><h1 class="display"><span>Dan</span><span class="o">Olekh</span></h1></div>
  <div class="foot"><span class="label">danolekh.com</span><span class="mark"></span></div>
</main>`,
  );
}

/* ── A page's card: its cover art on paper, the title in display type ──────────────────────── */

const WORK_CSS = /* css */ `
.text { position: absolute; left: 56px; top: 60px; bottom: 56px; width: 452px; display: flex; flex-direction: column; }
/* The title stands on the art's bottom edge (data-baseline), so the two columns share one line. */
.slot { flex: 1; display: flex; align-items: flex-end; padding-top: 24px; min-height: 0; }
/* A touch more leading than the brand's 0.84: at card sizes a Q's tail would land in the next line. */
.title { width: 100%; line-height: 0.92; text-wrap: balance; overflow-wrap: normal; }
.foot { display: flex; align-items: center; gap: 16px; }
.art { right: 44px; top: 50%; translate: 0 -50%; width: 640px; padding: 40px; }
.art img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; box-shadow: 0 0 0 1.5px rgb(45 75 143 / 0.18); }
`;

export function workCard({
  title,
  kind,
  art,
}: {
  title: string;
  kind: string;
  art: string;
}): string {
  return page(
    WORK_CSS,
    `<main class="work">
  <div class="text">
    ${kicker(`${kind} · Dan Olekh`)}
    <div class="slot"><h1 class="title display" data-fit data-baseline=".art img" data-max="112" data-min="34" data-lines="3">${esc(title)}</h1></div>
    <div class="foot"><span class="mark"></span><span class="label">danolekh.com</span></div>
  </div>
  <figure class="reg art">${regDots}<img src="${url(`public${art}`)}" alt=""></figure>
</main>`,
  );
}
