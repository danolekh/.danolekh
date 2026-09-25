import { chromium } from "playwright";
import sharp from "sharp";

/* Stills for the two live Consolline blocks on /p/consolline, one per theme, rendered by the blocks
 * themselves so a poster is always exactly the first frame it hands over to.
 *
 *   pnpm dev   # in another terminal
 *   bun run scripts/capture-consolline-posters.ts [base-url]
 *
 * Each block's stage is pinned to the poster's own size (600x600 CSS px for the globe, the plate's
 * 1026x577.5 for the halftone field) at DPR 2, and the host is screenshotted on its first live frame.
 * The globe runs under reduced motion so it sits at its resting angle; the field doesn't mount under
 * reduced motion, but its first frames are at rest anyway (the ambient wander starts at 1.2 s). */

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "public/images/p/consolline";

/* Per block: the halftone stage is fixed to the top left, so it must not be pinned while the globe,
   further down the page, is the one being shot. */
const PIN = {
  globe: `
    [data-capture="globe"] { width: 600px !important; height: 600px !important; aspect-ratio: auto !important; }
    [data-capture] canvas { transition: none !important; }
    [data-capture] img { visibility: hidden !important; }`,
  halftone: `
    [data-capture="halftone"] {
      position: fixed !important; left: 0; top: 0; z-index: 9999;
      width: 1026px !important; height: 577.5px !important; aspect-ratio: auto !important;
    }
    [data-capture="halftone"] > div { inset: 0 !important; width: 100% !important; translate: none !important; }
    [data-capture] canvas { transition: none !important; }
    [data-capture] img { visibility: hidden !important; }`,
};

async function capture(mode: "light" | "dark") {
  const browser = await chromium.launch();
  for (const block of ["globe", "halftone"] as const) {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
      deviceScaleFactor: 2,
      reducedMotion: block === "globe" ? "reduce" : "no-preference",
    });
    await page.addInitScript((theme) => {
      localStorage.setItem("theme", theme);
      // A globe under reduced motion draws once; keep that frame around for the screenshot.
      const getContext = HTMLCanvasElement.prototype.getContext as (...args: unknown[]) => unknown;
      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        type: string,
        attrs?: object,
      ) {
        return getContext.call(this, type, { ...attrs, preserveDrawingBuffer: true });
      } as typeof HTMLCanvasElement.prototype.getContext;
    }, mode);
    await page.goto(`${BASE}/p/consolline`, { waitUntil: "networkidle" });
    await page.addStyleTag({ content: PIN[block] });

    const host = page.locator(`[data-capture="${block}"]`);
    await host.scrollIntoViewIfNeeded();
    await host.locator("canvas:not(.opacity-0)").waitFor({ state: "attached", timeout: 20_000 });
    // The fade-in is switched off above; two frames is enough to be past the handover, and well
    // inside the field's first 1.2 s at rest.
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
    );

    const png = await host.screenshot();
    const name = `${block === "globe" ? "globe" : "halftone"}-poster${mode === "light" ? "-light" : ""}`;
    // Exact poster size (a fractional host height can add a row), and the light globe's fine
    // lattice on a pale ground is all high frequency, so it gets a little less quality.
    const [w, h] = block === "globe" ? [1200, 1200] : [2052, 1155];
    await sharp(png)
      .resize(w, h, { fit: "cover" })
      .webp({ quality: mode === "light" && block === "globe" ? 78 : 88 })
      .toFile(`${OUT}/${name}.webp`);
    console.log(`${OUT}/${name}.webp`);
    await page.close();
  }
  await browser.close();
}

const modes = (process.argv[3]?.split(",") ?? ["light", "dark"]) as ("light" | "dark")[];
for (const mode of modes) await capture(mode);
