// Rows of cards on the inside of a cylinder. The eye sits inside the cylinder, below the rows, so each
// row bends up into a smile and the cards grow towards the sides. The hit test is the same maths as the
// vertex shaders: a ray from the eye to the cylinder wall. Drawing is WebGPU, or WebGL2 without it.

import { createWebGl } from "./backend-webgl";
import { createWebGpu } from "./backend-webgpu";
import { MAX_INSTANCES, type Backend } from "./backend";
import type { WorkItem } from "./projects";

const SLOTS = 12; // cards around the ring; the list repeats, each row starts somewhere else
const SPAN = (Math.PI * 2) / SLOTS;
const GAP = 0.012; // share of the slot left empty between two cards, in radians
const CARD_SPAN = SPAN - GAP;

export type Layout = { rows: number; width: number; height: number; dpr: number; topRowCenter: number };

export type Hit = { row: number; slot: number; item: WorkItem };

const wrapAngle = (a: number) => {
  const t = (a + Math.PI) % (Math.PI * 2);
  return (t < 0 ? t + Math.PI * 2 : t) - Math.PI;
};

export async function createRenderer(canvas: HTMLCanvasElement, items: WorkItem[], onLost: () => void) {
  // WebGPU can fail before it touches the canvas, so WebGL2 can still take the same canvas after it.
  let backend: Backend | null = null;
  if ("gpu" in navigator) {
    backend = await createWebGpu(canvas, items.length, onLost).catch(() => null);
  }
  backend ??= createWebGl(canvas, items.length, onLost);
  if (!backend) return null;
  const gfx = backend;

  const instanceData = new Float32Array(MAX_INSTANCES * 4);

  // Camera: lens-shifted, so verticals stay vertical and only the rows bend.
  const R = 7.2;
  const EYE = 2.6;
  const FAR = R + EYE;
  const CARD_H = R * CARD_SPAN * 0.625;
  const ROW_STEP = CARD_H + R * GAP;

  let layout: Layout = { rows: 3, width: 1, height: 1, dpr: 1, topRowCenter: 0 };
  let focal = 1;
  let shiftY = 0;
  let rowYs: number[] = [];
  let spins: number[] = [];

  /** Canvas height that shows every row in full at this width: the lowest row's middle card is the lowest thing drawn. */
  const heightFor = (width: number, rows: number, topRowCenter: number) => {
    const share = width < 700 ? 0.78 : width < 1100 ? 0.42 : 0.34;
    const f = (share * width * FAR) / (R * SPAN);
    return Math.ceil(topRowCenter + (f * ((rows - 1) * ROW_STEP + CARD_H / 2)) / FAR);
  };

  const setLayout = (next: Layout) => {
    layout = next;
    canvas.width = Math.round(next.width * next.dpr);
    canvas.height = Math.round(next.height * next.dpr);
    // The centre card takes this share of the page's width.
    const share = next.width < 700 ? 0.78 : next.width < 1100 ? 0.42 : 0.34;
    focal = (share * next.width * FAR) / (R * SPAN);
    // Rows above the eye bend up; the lowest row stays above it too, so none of them lies flat.
    const lowest = 0.95;
    rowYs = Array.from({ length: next.rows }, (_, i) => lowest + (next.rows - 1 - i) * ROW_STEP);
    const top = rowYs[0] ?? 0;
    shiftY = next.height / 2 - next.topRowCenter - (focal * top) / FAR;
    if (spins.length !== next.rows) {
      spins = Array.from({ length: next.rows }, (_, i) => spins[i] ?? 0);
    }
  };

  const itemIndex = (row: number, slot: number) => {
    const n = items.length;
    return (((slot + row * 2) % n) + n) % n;
  };

  /** Which card is under this point (CSS pixels, canvas space)? */
  const hitTest = (x: number, y: number): Hit | null => {
    const dx = (x - layout.width / 2) / focal;
    const dy = (layout.height / 2 - y - shiftY) / focal;
    // Ray (dx, dy, t) from the eye, in "distance along the view axis" units, meets the wall where
    // x² + (t - eye)² = R²; the far hit is the one on the wall we look at.
    const a = dx * dx + 1;
    const b = -2 * EYE;
    const c = EYE * EYE - R * R;
    const t = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    const wx = dx * t;
    const wy = dy * t;
    const theta = Math.atan2(wx, t - EYE);
    for (let row = 0; row < layout.rows; row++) {
      if (Math.abs(wy - rowYs[row]!) > CARD_H / 2) continue;
      const local = (theta - spins[row]!) / SPAN;
      const slot = Math.round(local);
      if (Math.abs(local - slot) * SPAN > CARD_SPAN / 2) return null;
      return { row, slot, item: items[itemIndex(row, slot)]! };
    }
    return null;
  };

  /** Which row is at this height, card or gap? */
  const rowAt = (x: number, y: number): number | null => {
    const hit = hitTest(x, y);
    return hit ? hit.row : null;
  };

  const pxPerRadian = () => (focal * R) / FAR;

  const visibleLayers = new Set<number>();
  let flatten: { row: number; slot: number; t: number } | null = null;

  const draw = () => {
    const live: [number, number, number, number][] = [];
    visibleLayers.clear();
    for (let row = 0; row < layout.rows; row++) {
      for (let slot = 0; slot < SLOTS; slot++) {
        const theta = wrapAngle(slot * SPAN + spins[row]!);
        if (Math.abs(theta) > 1.75) continue;
        const layer = itemIndex(row, slot);
        // Slots wrap around the ring, and the wrapped index has to name the same item as the hit test.
        const flat = flatten && flatten.row === row && wrapSlot(flatten.slot) === slot ? flatten.t : 0;
        live.push([theta, rowYs[row]!, layer, flat]);
        visibleLayers.add(layer);
      }
    }
    // Far cards first, so the near ones and their shadows land on top.
    live.sort((p, q) => p[3] - q[3] || Math.abs(p[0]) - Math.abs(q[0]));
    live.forEach((e, i) => instanceData.set(e, i * 4));
    gfx.draw({
      width: layout.width,
      height: layout.height,
      focal,
      shiftY,
      eye: EYE,
      radius: R,
      span: CARD_SPAN,
      cardHeight: CARD_H,
      instances: instanceData,
      count: live.length,
    });
  };

  const wrapSlot = (slot: number) => ((slot % SLOTS) + SLOTS) % SLOTS;

  /** The card's plain rectangle once flattened, in CSS pixels of the canvas. */
  const flatRect = (row: number, slot: number) => {
    const theta = wrapAngle(wrapSlot(slot) * SPAN + spins[row]!);
    const d = EYE + R * Math.cos(theta);
    const w = (focal * R * CARD_SPAN) / d;
    const h = w * 0.625;
    const cx = layout.width / 2 + (focal * R * Math.sin(theta)) / d;
    const cy = layout.height / 2 - shiftY - (focal * rowYs[row]!) / d;
    return { x: cx - w / 2, y: cy - h / 2, width: w, height: h };
  };

  return {
    heightFor,
    setLayout,
    draw,
    hitTest,
    rowAt,
    pxPerRadian,
    flatRect,
    span: SPAN,
    spins: () => spins,
    setSpin: (row: number, value: number) => {
      spins[row] = value;
    },
    setFlatten: (value: { row: number; slot: number; t: number } | null) => {
      flatten = value;
    },
    isLayerVisible: (layer: number) => visibleLayers.has(layer),
    /** The spin that brings this item to the middle of this row. */
    spinToCentre: (row: number, layer: number) => {
      let best = 0;
      let bestDist = Infinity;
      for (let slot = 0; slot < SLOTS; slot++) {
        if (itemIndex(row, slot) !== layer) continue;
        const delta = wrapAngle(-(slot * SPAN) - spins[row]!);
        if (Math.abs(delta) < bestDist) {
          bestDist = Math.abs(delta);
          best = delta;
        }
      }
      return spins[row]! + best;
    },
    upload: gfx.upload,
    kind: gfx.kind,
    destroy: gfx.destroy,
  };
}

export type Renderer = NonNullable<Awaited<ReturnType<typeof createRenderer>>>;
