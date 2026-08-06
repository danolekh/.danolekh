import { useEffect } from "react";

/* Custom OS-style cursor, reverse-engineered from micka.design.
 *
 * Two shapes: a classic arrow (everything) and a pointing hand (interactive elements).
 * Two themes: filled black + white outline on dark, filled white + black outline on light.
 * Two press states: on mousedown both shapes render ~10% smaller, which reads as a click.
 *
 * The arrow goes on `documentElement.style.cursor` so it inherits everywhere; the hand goes in an
 * injected `<style>` because `:hover`-style targeting of interactive elements can't be expressed as
 * an inline style. The style tag is re-written (rather than toggled) on every state change so there
 * is only ever one source of truth for the pressed/theme combination.
 */

const ARROW_PATH = "M1 1l0 19.2 5.5-5.3 3.6 8.1 2.9-1.3-3.6-8.1H17z";
const HAND_PATH =
  "M6.5 0C5.67 0 5 .67 5 1.5V9.27l-.87-.87C3.37 7.64 2.22 7.51 1.46 8.05.58 8.67.46 9.85 1.22 10.78l4.03 4.97C6.09 16.77 7.47 17.5 9 17.5h2.5c2.76 0 5-2.24 5-5V8.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5V8c0-.83-.67-1.5-1.5-1.5S10.5 7.17 10.5 8v-.5c0-.83-.67-1.5-1.5-1.5S7.5 6.67 7.5 7.5v-6C7.5.67 7.33 0 6.5 0z";

const STYLE_ID = "custom-cursor-style";

const POINTER_SELECTOR =
  'a, button, [role="button"], input[type="submit"], input[type="button"], select, label[for], .cursor-pointer';

/** Builds a `cursor` value from an inline SVG data URL. Sizes shrink on press; the viewBox stays
 *  fixed so the artwork scales rather than crops. */
function svgCursor(opts: {
  path: string;
  viewBox: string;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  hotspotX: number;
  hotspotY: number;
  fallback: string;
}) {
  const svg = `%3Csvg xmlns='http://www.w3.org/2000/svg' width='${opts.width}' height='${opts.height}' viewBox='${opts.viewBox}'%3E%3Cpath d='${opts.path}' fill='${opts.fill}' stroke='${opts.stroke}' stroke-width='${opts.strokeWidth}'/%3E%3C/svg%3E`;
  return `url("data:image/svg+xml,${svg}") ${opts.hotspotX} ${opts.hotspotY}, ${opts.fallback}`;
}

function arrowCursor(dark: boolean, pressed: boolean) {
  return svgCursor({
    path: ARROW_PATH,
    viewBox: "0 0 20 24",
    width: pressed ? 18 : 20,
    height: pressed ? 22 : 24,
    fill: dark ? "black" : "white",
    stroke: dark ? "white" : "black",
    strokeWidth: dark ? 1.5 : 1.2,
    hotspotX: 1,
    hotspotY: 1,
    fallback: "auto",
  });
}

function handCursor(dark: boolean, pressed: boolean) {
  return svgCursor({
    path: HAND_PATH,
    viewBox: "0 0 17 22",
    width: pressed ? 15 : 17,
    height: pressed ? 20 : 22,
    fill: dark ? "black" : "white",
    stroke: dark ? "white" : "black",
    strokeWidth: dark ? 1.2 : 1,
    // Hotspot tracks the fingertip, so it moves in with the smaller pressed artwork.
    hotspotX: pressed ? 5 : 6,
    hotspotY: 0,
    fallback: "pointer",
  });
}

function applyCursor(pressed: boolean) {
  const root = document.documentElement;
  const dark = root.classList.contains("dark");

  root.style.cursor = arrowCursor(dark, pressed);

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  // `!important` so utility classes like `cursor-default` on a button can't win.
  style.textContent = `${POINTER_SELECTOR} { cursor: ${handCursor(dark, pressed)} !important; }`;
}

export function CustomCursor() {
  useEffect(() => {
    applyCursor(false);

    // next-themes swaps the `dark` class on <html> after mount and on every theme change, so watch
    // the attribute instead of subscribing to the theme hook (keeps this component dependency-free).
    const observer = new MutationObserver(() => applyCursor(false));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const onDown = () => applyCursor(true);
    const onUp = () => applyCursor(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("mouseup", onUp);

    return () => {
      observer.disconnect();
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("mouseup", onUp);
      document.documentElement.style.cursor = "";
      document.getElementById(STYLE_ID)?.remove();
    };
  }, []);

  return null;
}

export default CustomCursor;
