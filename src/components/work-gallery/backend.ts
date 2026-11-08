// What the two drawing backends share: the card grid and the shape of one frame.

export const LAYER_W = 960;
export const LAYER_H = 600;
export const GRID_X = 48;
export const GRID_Y = 8;
export const MARGIN = 0.14; // the quad reaches past the card so the shadow has room
export const MAX_INSTANCES = 48;

export type Frame = {
  width: number;
  height: number;
  focal: number;
  shiftY: number;
  eye: number;
  radius: number;
  span: number;
  cardHeight: number;
  /** theta, row height, layer, flatten: four floats per card. */
  instances: Float32Array<ArrayBuffer>;
  count: number;
};

export type Backend = {
  kind: "webgpu" | "webgl2";
  draw: (frame: Frame) => void;
  upload: (layer: number, source: ImageBitmap | HTMLVideoElement) => void;
  destroy: () => void;
};

/** One strip of quads shared by every card. */
export const buildGrid = () => {
  const verts = new Float32Array((GRID_X + 1) * (GRID_Y + 1) * 2);
  for (let y = 0, k = 0; y <= GRID_Y; y++) {
    for (let x = 0; x <= GRID_X; x++) {
      verts[k++] = -MARGIN + (x / GRID_X) * (1 + MARGIN * 2);
      verts[k++] = -MARGIN + (y / GRID_Y) * (1 + MARGIN * 2);
    }
  }
  const idx = new Uint16Array(GRID_X * GRID_Y * 6);
  for (let y = 0, k = 0; y < GRID_Y; y++) {
    for (let x = 0; x < GRID_X; x++) {
      const a = y * (GRID_X + 1) + x;
      const b = a + 1;
      const c = a + GRID_X + 1;
      const d = c + 1;
      idx.set([a, c, b, b, c, d], k);
      k += 6;
    }
  }
  return { verts, idx };
};
