import { defineShader } from "@danolekh/gl";

/* A synthetic OCT B-scan through the macula, drawn per pixel: no image goes in. The retina is a
 * stack of layers measured up from Bruch's membrane, so fluid under or inside it lifts everything
 * above, as it does in a real scan:
 * - PED lifts the RPE off Bruch's membrane in a dome;
 * - SRF opens a dark lens between the photoreceptor tips and the RPE;
 * - IRF swells a band above the outer nuclear layer and fills it with dark cysts.
 * The inputs are each fluid's size, 0..~1.2 (the square root of its volume over a reference, so a
 * trace of fluid still shows), and `seg`, 0..1, the segmentation fading in over the grey.
 *
 * The speckle is multiplicative and log-compressed, the way an OCT display shows it, and is anchored
 * to the tissue, so it rides up with the layers instead of the tissue sliding under a fixed grain.
 * Constants are in units of the canvas height (y down from the top), x across the scan 0..1. */

export const SCAN_INPUTS = ["irf", "srf", "ped", "seg"] as const;

export const fluidScan = defineShader({
  id: "lab/fluid-scan",
  label: "OCT B-scan",
  description: "A synthetic macular OCT B-scan with intraretinal, subretinal and sub-RPE fluid.",
  inputs: SCAN_INPUTS,
  params: {
    irfColor: { type: "color", default: "#e0262b" },
    srfColor: { type: "color", default: "#f2b705" },
    pedColor: { type: "color", default: "#1f7ae0" },
    /** The segmentation's opacity over the grey. */
    fill: { type: "float", default: 0.82, min: 0, max: 1 },
  },
  credit: "Dan Olekh",
  license: "MIT",
  source: /* glsl */ `
// pcg2d (Jarzynski & Olano, "Hash Functions for GPU Rendering", 2020): stable at any coordinate.
uvec2 pcg2d(uvec2 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> 16u;
  v.x += v.y * 1664525u; v.y += v.x * 1664525u;
  v ^= v >> 16u;
  return v;
}
float hash(vec2 cell) {
  uvec2 h = pcg2d(uvec2(ivec2(cell) + 65536));
  return float(h.x) / 4294967295.0;
}

// Fully developed speckle is exponential in intensity; between grains it's interpolated.
float expo(vec2 c) { return -log(max(hash(c), 1e-4)); }
float speckle(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = expo(i), b = expo(i + vec2(1.0, 0.0)), c = expo(i + vec2(0.0, 1.0)), d = expo(i + vec2(1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float vnoise(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Distance to the nearest of a jittered grid of points (Worley): round vessel lumens.
float worley(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 8.0;
  for (int y = -1; y <= 1; y++)
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(x, y);
      vec2 c = o + 0.15 + 0.7 * vec2(hash(i + o), hash(i + o + 31.7));
      d = min(d, length(c - f));
    }
  return d;
}

float bump(float x, float c, float w, float p) {
  float d = (x - c) / w;
  return pow(max(0.0, 1.0 - d * d), p);
}
float gauss(float x, float c, float w) {
  float d = (x - c) / w;
  return exp(-d * d);
}

// Each fluid's height over the scan.
float liftAt(float x) { return 0.11 * uIrf * bump(x, 0.5, 0.17, 1.0); }
float srfAt(float x) { return 0.042 * uSrf * bump(x, 0.5, 0.2, 1.6); }
float pedAt(float x) { return 0.06 * uPed * bump(x, 0.525, 0.12, 0.85); }

float bruchAt(float x) {
  float d = x - 0.5;
  return 0.665 - 0.13 * d * d + 0.035 * d;
}

// A layer's thickness wanders a little along the scan.
float vary(float x, float k) { return 0.88 + 0.24 * vnoise(vec2(x * 7.0 + k * 13.7, k * 3.1)); }

struct Stack {
  float ilm, gcl, ipl, inl, opl, band, onl, elmT, elm, ez, os, iz, tips, rpeT, rpe, bruch;
};

// The layers' tops, measured up from Bruch's membrane. The inner layers thin to nothing at the
// fovea; the nerve fibre layer thickens toward the disc, off the right edge.
Stack stackAt(float x) {
  Stack s;
  float pit = 1.0 - 0.96 * gauss(x, 0.5, 0.08);
  // The ganglion cells and inner nuclear layer heap up on either side of the pit.
  float rim = 0.75 + 0.55 * gauss(abs(x - 0.5), 0.14, 0.09);
  float nasal = smoothstep(0.45, 1.0, x);
  s.bruch = bruchAt(x);
  s.rpe = s.bruch - pedAt(x);
  s.rpeT = s.rpe - 0.014;
  s.tips = s.rpeT - srfAt(x);
  s.iz = s.tips - 0.007;
  s.os = s.iz - 0.01;
  s.ez = s.os - 0.009;
  s.elm = s.ez - 0.012;
  s.elmT = s.elm - 0.004;
  s.onl = s.elmT - (0.06 + 0.035 * gauss(x, 0.5, 0.11)) * vary(x, 1.0);
  s.band = s.onl - liftAt(x);
  s.opl = s.band - (0.005 + 0.016 * pit) * vary(x, 2.0);
  s.inl = s.opl - 0.026 * pit * rim * vary(x, 3.0);
  s.ipl = s.inl - 0.028 * pit * vary(x, 4.0);
  s.gcl = s.ipl - 0.03 * pit * rim * vary(x, 5.0);
  s.ilm = s.gcl - (0.008 + 0.05 * nasal + 0.014 * (1.0 - nasal)) * pit * vary(x, 6.0);
  return s;
}

// The cysts: x offset from the fovea, size, the IRF at which it opens, and width over height;
// then where each sits in the swollen band (-1 top, 1 bottom).
const int CYSTS = 18;
const vec4 CYST_A[CYSTS] = vec4[](
  vec4(-0.022, 1.00, 0.00, 1.25), vec4(0.030, 0.96, 0.04, 1.1), vec4(-0.070, 0.84, 0.08, 0.95),
  vec4(0.078, 0.86, 0.12, 1.0), vec4(-0.112, 0.70, 0.18, 0.85), vec4(0.122, 0.68, 0.2, 0.9),
  vec4(-0.150, 0.52, 0.32, 0.8), vec4(0.160, 0.50, 0.34, 0.8), vec4(0.194, 0.34, 0.5, 0.75),
  vec4(-0.186, 0.34, 0.54, 0.75), vec4(-0.046, 0.40, 0.26, 0.9), vec4(0.054, 0.38, 0.3, 0.9),
  vec4(0.100, 0.32, 0.42, 0.85), vec4(-0.092, 0.30, 0.44, 0.85), vec4(0.004, 0.30, 0.36, 0.9),
  vec4(0.140, 0.26, 0.56, 0.8), vec4(-0.132, 0.26, 0.6, 0.8), vec4(-0.008, 0.22, 0.64, 0.8)
);
const float CYST_Y[CYSTS] = float[](0.1, 0.16, 0.2, 0.12, 0.24, 0.18, 0.3, 0.26, 0.34, 0.3,
  -0.84, -0.86, -0.8, -0.82, -0.9, -0.78, -0.76, 0.92);

// The swollen band's top and bottom alone: what a cyst needs of the stack, without the inner layers.
vec2 bandAt(float x) {
  float onl = bruchAt(x) - pedAt(x) - 0.014 - srfAt(x) - 0.038 - 0.004
    - (0.06 + 0.035 * gauss(x, 0.5, 0.11)) * vary(x, 1.0);
  return vec2(onl - liftAt(x), onl);
}

// Signed distance to the nearest cyst, in canvas heights.
float cysts(float x, float y, float aspect) {
  float d = 1.0;
  for (int i = 0; i < CYSTS; i++) {
    vec4 c = CYST_A[i];
    float grow = smoothstep(c.z, c.z + 0.4, uIrf);
    if (grow <= 0.0) continue;
    float cx = 0.5 + c.x;
    vec2 band = bandAt(cx);
    float hb = (band.y - band.x) * 0.5;
    float ry = hb * 0.94 * c.y * grow;
    if (ry < 1e-4) continue;
    float rx = ry * c.w;
    float cy = band.x + hb + CYST_Y[i] * (hb - ry);
    if (abs(x - cx) * aspect > rx + 0.01) continue;
    vec2 p = vec2((x - cx) * aspect, y - cy) / vec2(rx, ry);
    d = min(d, (length(p) - 1.0) * min(rx, ry));
  }
  // Ragged walls, not drawn circles.
  return d + 0.0035 * (vnoise(vec2(x * aspect, y) * 90.0) - 0.5);
}

void main() {
  // Framed a little closer than the layer constants: zoomed about the RPE.
  const float ZOOM = 1.16;
  vec2 uv = gl_FragCoord.xy / uResolution;
  float x = uv.x;
  float y = 0.67 + (1.0 - uv.y - 0.7) / ZOOM;
  float aspect = uResolution.x / uResolution.y / ZOOM;
  float px = 1.0 / uResolution.y / ZOOM;
  // Speckle grains about 2 by 1.2 CSS pixels: stretched across, as an OCT shows them.
  vec2 grain = uResolution / uPixelRatio / vec2(2.0, 1.2) * vec2(1.0, ZOOM);

  Stack s = stackAt(x);
  float edge = max(1.2 * px, 0.0022);
  float aa = 1.1 * px;
  #define AT(b) smoothstep((b) - edge, (b) + edge, y)

  // The choroid: bright stroma around dark vessels, small ones under Bruch's membrane and large
  // ones deeper, fading with depth.
  float deep = y - s.bruch;
  vec2 cp = vec2(x * aspect, deep);
  cp += 0.012 * (vec2(vnoise(cp * 40.0), vnoise(cp * 40.0 + 9.1)) - 0.5);
  float sattler = smoothstep(0.18, 0.5, worley(cp / vec2(0.034, 0.024) + vec2(3.0, 0.0)));
  float haller = smoothstep(0.22, 0.56, worley(cp / vec2(0.085, 0.05) + vec2(11.0, 0.35)));
  float stroma = mix(sattler, haller, smoothstep(0.03, 0.075, deep));
  float choroid = mix(0.2, 0.58, stroma) * exp(-max(0.0, deep - 0.012) / 0.07);
  float choroidBottom = s.bruch + 0.16 + 0.015 * sin(x * 9.0 + 1.3);

  // How bright each layer shows on the display (log scale already), top down.
  float b = 0.035;
  b = mix(b, 0.8, AT(s.ilm));
  b = mix(b, 0.44, AT(s.gcl));
  b = mix(b, 0.62, AT(s.ipl));
  b = mix(b, 0.3, AT(s.inl));
  b = mix(b, 0.6, AT(s.opl));
  b = mix(b, 0.3, AT(s.band));
  b = mix(b, 0.22, AT(s.onl));
  b = mix(b, 0.42, AT(s.elmT));
  b = mix(b, 0.3, AT(s.elm));
  b = mix(b, 0.86, AT(s.ez));
  b = mix(b, 0.42, AT(s.os));
  b = mix(b, 0.56, AT(s.iz));
  b = mix(b, 0.05, AT(s.tips));
  b = mix(b, 0.96, AT(s.rpeT));
  b = mix(b, 0.17, AT(s.rpe));
  b = mix(b, 0.74, AT(s.bruch));
  b = mix(b, choroid, AT(s.bruch + 0.006));
  b = mix(b, 0.04, smoothstep(choroidBottom - 0.025, choroidBottom + 0.025, y));

  // Retinal vessels in the inner layers: a bright cross-section and a shadow under it.
  const vec3 VESSELS[4] = vec3[](vec3(0.17, 0.009, 0.4), vec3(0.268, 0.006, 0.7), vec3(0.79, 0.01, 0.5), vec3(0.905, 0.007, 0.3));
  for (int i = 0; i < 4; i++) {
    vec3 v = VESSELS[i];
    if (abs(x - v.x) * aspect > v.y * 2.0) continue;
    Stack at = stackAt(v.x);
    float cy = mix(at.ilm, at.ipl, v.z) + v.y;
    float d = length(vec2((x - v.x) * aspect, y - cy)) - v.y;
    b = mix(b, 0.82, 1.0 - smoothstep(-edge, edge, d));
    float under = smoothstep(cy, cy + 2.0 * v.y, y) * (1.0 - smoothstep(v.y * 0.4, v.y * 1.6, abs(x - v.x) * aspect));
    b *= 1.0 - 0.38 * under;
  }

  // IRF: dark cysts in the swollen band.
  float dc = uIrf > 0.001 && y > s.band - 0.04 && y < s.onl + 0.03 ? cysts(x, y, aspect) : 1.0;
  float irf = 1.0 - smoothstep(-aa, aa, dc);
  b = mix(b, 0.04, irf);

  // Speckle, in the log domain: about the same spread at every level, a little more in bright
  // tissue. The grain rides with the tissue: the inner retina with the ILM, the outer with the RPE.
  float anchor = y < s.ilm - 0.01 ? 0.0 : (y < s.onl ? s.ilm : (y < s.bruch ? s.rpeT : s.bruch));
  vec2 q = vec2(x * grain.x, (y - anchor + 0.5) * grain.y);
  float n = log(max(0.62 * speckle(q) + 0.38 * speckle(q * 1.63 + 17.3), 1e-3)) + 0.3;
  // A-scans differ a little in brightness: faint vertical streaks.
  b *= 0.94 + 0.12 * vnoise(vec2(x * grain.x * 0.35, 0.5));
  float fine = hash(floor(gl_FragCoord.xy)) - 0.5;
  float g = clamp(b + (0.05 + 0.13 * b) * n + 0.03 * fine, 0.0, 1.0);
  vec3 col = vec3(g);

  // The segmentation over the grey.
  float srf = AT(s.tips) * (1.0 - AT(s.rpeT)) * step(0.0005, srfAt(x));
  float ped = AT(s.rpe) * (1.0 - AT(s.bruch)) * step(0.0005, pedAt(x));
  float k = uSeg * uFill;
  col = mix(col, uPedColor, ped * k);
  col = mix(col, uSrfColor, srf * k);
  col = mix(col, uIrfColor, irf * k);

  fragColor = vec4(col, 1.0);
}
`,
});
