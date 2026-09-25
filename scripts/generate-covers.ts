import { chromium, type Page } from "playwright";
import sharp from "sharp";
import { readFileSync } from "node:fs";

/* Hero covers for posts, composed from captures of each post's own UI, in the house style of the
 * case-study covers: a tinted ground with a faint dot grid, a thin inset frame with corner ticks,
 * the captures floating on soft shadows, and one label chip.
 *
 *   pnpm dev   # in another terminal
 *   bun run scripts/generate-covers.ts [slug,slug…] [base-url]
 *
 * For every cover and both themes: open the post with that theme stored, screenshot the named
 * elements (page background made transparent, so rounded corners sit on the cover's ground), then
 * lay them out in an HTML template and screenshot that at 1600x900. Writes
 * public/images/covers/<name>-{light,dark}.webp and the -800 cut next to each.
 *
 * Captures are of the page as a first-time visitor sees it: nothing here triggers a live model or
 * lookup call, so the demos that need one are shown in their ready state. */

const ONLY = process.argv[2]?.split(",").filter(Boolean);
const BASE = process.argv[3] ?? "http://localhost:3000";
const OUT = "public/images/covers";
const W = 1600;
const H = 900;

type Mode = "light" | "dark";

type Shot = {
  path: string;
  selector: string;
  /** Local interactions only (tabs, toggles, previews) — nothing that calls a server. */
  before?: (page: Page) => Promise<void>;
  /** Part of the element, in its own CSS px: x, y, width, height (negative = from the far edge). */
  clip?: { x?: number; y?: number; width?: number; height?: number };
};

type Layer = {
  /** A key of `shots`, a file under /public, or an absolute URL. */
  src: string;
  left: number;
  top: number;
  width: number;
  rotate?: number;
};

type Spec = {
  name: string;
  /** Accent for the ground's glow, per theme. */
  glow: Record<Mode, string>;
  shots: Record<string, Shot>;
  layers: Layer[];
  chip?: { title: string; sub: string; left: number; top: number };
};

const click = (selector: string) => async (page: Page) => {
  await page.locator(selector).first().click();
  await page.waitForTimeout(900);
};

const SPECS: Spec[] = [
  {
    name: "raiffeisen",
    glow: { light: "rgba(250, 230, 0, 0.32)", dark: "rgba(250, 230, 0, 0.12)" },
    shots: {
      demo: { path: "/b/raiffeisen", selector: '[data-demo="raiffeisen-card"]' },
      frozen: {
        path: "/b/raiffeisen",
        selector: '[data-demo="raiffeisen-card"]',
        before: click('[data-demo="raiffeisen-card"] [aria-label="Freeze card"]'),
        clip: { height: 360 },
      },
    },
    layers: [
      { src: "demo", left: 150, top: 120, width: 640 },
      { src: "frozen", left: 830, top: 360, width: 640, rotate: -1.5 },
    ],
    chip: { title: "Tilt · flip · freeze", sub: "React · Motion · Base UI", left: 860, top: 200 },
  },
  {
    name: "hejfish",
    glow: { light: "rgba(0, 170, 200, 0.2)", dark: "rgba(0, 170, 200, 0.12)" },
    shots: {
      preview: {
        path: "/b/hejfish",
        selector: '[data-demo="link-preview"]',
        clip: { x: -376 },
      },
    },
    layers: [
      { src: "/images/b/hejfish/compare-poster.jpg", left: 150, top: 96, width: 676 },
      { src: "preview", left: 900, top: 330, width: 560 },
    ],
    chip: {
      title: "Rendered on the server",
      sub: "Same pages · 0.01–0.05% of pixels differ",
      left: 900,
      top: 220,
    },
  },
  {
    name: "index-documents-with-claude",
    glow: { light: "rgba(217, 119, 87, 0.2)", dark: "rgba(217, 119, 87, 0.1)" },
    shots: {
      demo: {
        path: "/b/index-documents-with-claude",
        selector: '[data-demo="doc-index"]',
        before: click('[data-demo="doc-index"] button:has-text(".pdf")'),
      },
    },
    layers: [{ src: "demo", left: 200, top: 110, width: 880 }],
    chip: {
      title: "Author · addressee · date · subject",
      sub: "Pulled by Claude Haiku, then keyword-searched",
      left: 930,
      top: 640,
    },
  },
  {
    name: "exact-retailer-url-from-a-photo",
    glow: { light: "rgba(59, 130, 246, 0.16)", dark: "rgba(59, 130, 246, 0.1)" },
    shots: {
      demo: { path: "/b/exact-retailer-url-from-a-photo", selector: '[data-demo="flow-contents"]' },
    },
    layers: [
      // The demo's own first sample (Wikimedia Commons), large: the photo is where the flow starts.
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Nintendo-Switch-Console-Docked-wJoyConRB.jpg/960px-Nintendo-Switch-Console-Docked-wJoyConRB.jpg",
        left: 130,
        top: 100,
        width: 620,
      },
      { src: "demo", left: 560, top: 400, width: 900 },
    ],
    chip: {
      title: "Photo → the exact retailer URL",
      sub: "Google Lens on the crop, in one call",
      left: 880,
      top: 190,
    },
  },
  {
    name: "hydraulic-sourcing-rexroth-ms",
    glow: { light: "rgba(20, 184, 166, 0.18)", dark: "rgba(20, 184, 166, 0.1)" },
    shots: {
      globe: {
        path: "/p/hydraulic-sourcing-rexroth-ms",
        selector: '[data-block="globe"]',
        // Down to the end of the supplier list; the block's caption would only collide below.
        clip: { height: 470 },
      },
      verdict: { path: "/p/hydraulic-sourcing-rexroth-ms", selector: '[data-block="verdict"]' },
    },
    layers: [
      { src: "globe", left: 110, top: 90, width: 900 },
      { src: "verdict", left: 720, top: 580, width: 760 },
    ],
    chip: {
      title: "−31 % к стоимости",
      sub: "рекомендуемая комбинация, партия 6+6",
      left: 1120,
      top: 200,
    },
  },
];

/* The page's own backdrop (PixelBlast, the white/black column gradient) and the floating chrome go,
 * so an element shot is the element alone on transparency. */
const TRANSPARENT = `
  html, body { background: transparent !important; }
  body > * .fixed.inset-0, canvas[data-engine], [aria-label="Toggle colour theme"] { display: none !important; }
  main > div { background: none !important; }
  *, *::before, *::after { cursor: none !important; caret-color: transparent !important; }
`;

async function captureShots(
  spec: Spec,
  mode: Mode,
  browser: Awaited<ReturnType<typeof chromium.launch>>,
) {
  const out: Record<string, string> = {};
  for (const [key, shot] of Object.entries(spec.shots)) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 1000 },
      deviceScaleFactor: 2,
      reducedMotion: "reduce",
    });
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), mode);
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: TRANSPARENT });
    const el = page.locator(shot.selector).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    if (shot.before) await shot.before(page);
    await page.mouse.move(0, 0);

    let png: Buffer;
    if (shot.clip) {
      const box = (await el.boundingBox())!;
      const c = shot.clip;
      const x = c.x === undefined ? 0 : c.x < 0 ? box.width + c.x : c.x;
      const y = c.y === undefined ? 0 : c.y < 0 ? box.height + c.y : c.y;
      png = await page.screenshot({
        omitBackground: true,
        clip: {
          x: box.x + x,
          y: box.y + y,
          width: Math.min(c.width ?? box.width - x, box.width - x),
          height: Math.min(c.height ?? box.height - y, box.height - y),
        },
      });
    } else {
      png = await el.screenshot({ omitBackground: true });
    }
    out[key] = `data:image/png;base64,${png.toString("base64")}`;
    await page.close();
  }
  return out;
}

function source(src: string, shots: Record<string, string>) {
  if (shots[src]) return shots[src];
  if (src.startsWith("http")) return src;
  const type = src.endsWith(".jpg") ? "jpeg" : src.split(".").pop();
  return `data:image/${type};base64,${readFileSync(`public${src}`).toString("base64")}`;
}

function template(spec: Spec, mode: Mode, shots: Record<string, string>) {
  const dark = mode === "dark";
  const ground = dark ? "#0b0b0b" : "#f7f7f5";
  const dot = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const rule = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const tick = dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
  const shadow = dark
    ? "0 40px 80px -24px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)"
    : "0 40px 80px -28px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.05)";

  const layers = spec.layers
    .map(
      (l, i) =>
        `<img src="${source(l.src, shots)}" style="position:absolute;left:${l.left}px;top:${l.top}px;width:${l.width}px;z-index:${i + 1};transform:rotate(${l.rotate ?? 0}deg);box-shadow:${shadow};border-radius:10px">`,
    )
    .join("");

  const chip = spec.chip
    ? `<div style="position:absolute;left:${spec.chip.left}px;top:${spec.chip.top}px;z-index:20;padding:16px 22px;background:${dark ? "#141414" : "#fff"};border:1px solid ${rule};box-shadow:${shadow}">
        <div style="font-size:24px;font-weight:700;color:${dark ? "#fafafa" : "#18181b"};letter-spacing:-0.01em">${spec.chip.title}</div>
        <div style="margin-top:4px;font-size:17px;color:${dark ? "#a1a1aa" : "#71717a"}">${spec.chip.sub}</div>
      </div>`
    : "";

  const corner = (x: string, y: string) =>
    `<div style="position:absolute;${x};${y};width:8px;height:8px;background:${tick}"></div>`;

  return `<!doctype html><html><head><style>
    @font-face { font-family: "Nunito Sans"; src: url("${BASE}/fonts/nunito-sans-latin.woff2") format("woff2"); font-weight: 200 1000; }
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; }
    body {
      position: relative; font-family: "Nunito Sans", system-ui, sans-serif; background: ${ground};
      background-image: radial-gradient(ellipse 60% 70% at 62% 50%, ${spec.glow[mode]}, transparent 70%),
        radial-gradient(${dot} 1.2px, transparent 1.3px);
      background-size: 100% 100%, 26px 26px;
    }
    .frame { position: absolute; inset: 40px; border: 1px solid ${rule}; }
  </style></head><body>
    <div class="frame">${corner("left:-4px", "top:-4px")}${corner("right:-4px", "top:-4px")}${corner("left:-4px", "bottom:-4px")}${corner("right:-4px", "bottom:-4px")}</div>
    ${layers}${chip}
  </body></html>`;
}

const browser = await chromium.launch();
for (const spec of SPECS) {
  if (ONLY && !ONLY.includes(spec.name)) continue;
  for (const mode of ["light", "dark"] as const) {
    const shots = await captureShots(spec, mode, browser);
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.setContent(template(spec, mode, shots), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot();
    await page.close();

    const file = `${OUT}/${spec.name}-${mode}`;
    await sharp(png).webp({ quality: 86 }).toFile(`${file}.webp`);
    await sharp(png).resize(800).webp({ quality: 82 }).toFile(`${file}-800.webp`);
    console.log(`${file}.webp`);
  }
}
await browser.close();
