/* The Consolline globe renderer, ported from consolline.com (src/scripts/globe) for the case study.
 *
 * Structure and land mask are cobe's (https://github.com/shuding/cobe, MIT, Copyright (c) 2021 Shu
 * Ding; the licence sits beside this file as cobe.LICENSE): two triangles covering the canvas, and
 * every fragment intersects a sphere of radius .8 in screen space. The lighting, the lat/lon dot
 * lattice and every look number are fitted to the Figma frame rather than taken from cobe:
 * brightest at the limb instead of the centre, bloom only on land, a disc body one level off the
 * page's ground.
 *
 * Call shape follows cobe's: `createGlobe(canvas, options)` hands back `{ update, destroy }` with no
 * internal loop, so the driver owns the rAF. It returns null when it cannot draw, which leaves the
 * poster up. */

export type GlobeOptions = {
  width: number;
  height: number;
  devicePixelRatio: number;
  phi: number;
  theta: number;
  scale: number;
  offset: [number, number];
  opacity: number;
  rows: number;
  columns: number;
  dotFill: number;
  dotBloom: number;
  mapBrightness: number;
  oceanBrightness: number;
  ambient: number;
  bloom: number;
  limbPower: number;
  limbGain: number;
  limbDirection: number;
  light: [number, number, number];
  whiten: number;
  baseColor: [number, number, number];
  dotColor: [number, number, number];
};

export type Globe = {
  /** True once the land mask is on the GPU; hand over from the poster only after this. */
  readonly ready: boolean;
  update(next: Partial<GlobeOptions>): void;
  destroy(): void;
};

/* Fitted to Figma node 204:29940 read through the REST API: dim lime dots on a body of #111111,
 * brightest at the limb and toward the upper right, with the land dots blooming. */
export const LOOK: Partial<GlobeOptions> = {
  baseColor: [0.067, 0.067, 0.067],
  dotColor: [0.73, 0.93, 0.17],
  mapBrightness: 0.62,
  oceanBrightness: 0.085,
  dotFill: 0.32,
  dotBloom: 3.2,
  ambient: 0.08,
  limbPower: 1.6,
  limbGain: 1.15,
  limbDirection: 0.45,
  light: [0.62, 0.58, 0.53],
  bloom: 0.9,
  whiten: 0.95,
};

/* Lattice density and buffer resolution are the two things worth spending less of on a phone. */
export function quality(small: boolean): Partial<GlobeOptions> {
  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  return small
    ? { devicePixelRatio, rows: 120, columns: 240 }
    : { devicePixelRatio, rows: 160, columns: 320 };
}

const DEFAULTS: GlobeOptions = {
  width: 0,
  height: 0,
  devicePixelRatio: 1,
  phi: 0,
  theta: 0,
  scale: 1,
  offset: [0, 0],
  opacity: 1,
  rows: 128,
  columns: 256,
  dotFill: 0.36,
  dotBloom: 3.2,
  mapBrightness: 1,
  oceanBrightness: 0.16,
  ambient: 0.2,
  bloom: 0.5,
  limbPower: 2.2,
  limbGain: 1.0,
  limbDirection: 0.75,
  light: [0.62, 0.58, 0.53],
  whiten: 0.6,
  baseColor: [0, 0, 0],
  dotColor: [1, 1, 1],
};

/* cobe 2.0.1's land mask: a 256x128 1-bit equirectangular bitmap, white over land. Inline because
 * the globe cannot draw its first frame until it decodes, and a request would sit in front of the
 * handover from the poster. */
const MAP_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAACAAQAAAADMzoqnAAAECklEQVR42u3VsW4jRRzH8d94gzfF4Q0VQaC4vBLTRTp0mze4ggfAPAE5XQEFsGNAVIjwBrmW7h7gJE+giKjyABTZE4g06LKJETdRJvtD65kdz6yduKABiW+TVfzRf2bXYxtcE/59YJCz6YdbgQF6ACSRrwYKYImmh5PbwOewlV3wlQNbAN6SEExjUOO+BU0aCSnxReHABUlK4YFQeJeUT3da8IIkZ6NGoSnFY5KsMoVzMKfECUnqxgPYRArarmUCndHwzIEaQEpg5xVdBXROl8mpAQx5dUgPiHoYAAkg5w3JABR06byGAVgcRGAz5bznj6phBQNRFwyqgdxebH6gshJAesWoFhgYpApAFoG8BIZ/fEhSox5jDjQXmV0Ar5XJfAIrALi3URVs09gHIL4XJCkLC5LH9JWiArABFCSrQjdgkBzRJ0WJeUOSNyQAfJJwUSWUBRlJQ8oGHATACGlBynnzy2kEYLNjrxouigD8BZcgOeVPqh12RtufaCN5wCPVDpvQ9lsIrqndsJtDcWqBCpf4hWN7OdWHBw58FwIaNOU/n1TpMW2DFaD48cmr4185T8NHkpUFX749pQPVdgRKC/DGoQPVeAEKv+WHvY8OOWNTPRp5kHuwSf8wzXtVBKR7YwEH9H3lQUaypUfSATOALyVNu5vZJW31Bnx98nkLfDUWJaz6ixvm+RIQRdl3kmRxxiaDoGnZW4CpPfkaQadlcPim1xOSvETQo7Lv75enVAXJ3xGUlony4KQBBWUM1NiDc6qhyS8RgQs18OCMMtPDaAUIyg0PZkRWDqs+wnKJBTDI1Js6BolegOsKmUxNDBAAKqQyMQmidhegBlLZ+wwKYdv5M/8x1khkb1cgKqP2H+MKyV5vS+whrE8DQDgAlUAoRBX056EElJCjJVACeJBZgNfVp+iCCm4RBWCgKsRxASSA9KgDhDtCiTuMyfHsKXzhC6wNAIjjWb8LKAOA2ctk3FmCOlgKFy8f1N0JJtgsxinYnVAHt4t3gPzZXSCTyCWCQmBT91QE3B5yarSN40dNHYPka4TlDhTUI8zLvl0JSL3vZn6DsCFZOeB2yROEpR68sECQQA++xIGCR2X7DwlEoLRgUrZrqlUg50S1uy43YqDcN6UFBVkhAjWiCV2Q0jgQPdplMKxvBXodcOfAwJYvgdL+1etA1YJJfBcZlQV7sO1i2gHoNiyxtQ5sBsCgWyoxCHiFFd2L5nUTCqMAqGUgsQ9f5kCcCiZgRYkMgMTd5WsB1rTzj0Em14BE4r+QxN1lCEsVur2PoF5Wbg8RJXR4djgvBgauhLywoEZQrt1KKRdVS4CdlJ8qafyP+9KIj/nE/d7kKwH9jgS72e9DV+kvfTWgct4ZyP8Byb8BPG7MaaIIkAQAAAAASUVORK5CYII=";

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

/* `HAS_DERIV` is defined by the loader when fwidth() is available: it fades the lattice to its mean
 * coverage once cells drop below a pixel (moiré otherwise) and antialiases the disc's edge. */
const FRAG = `
precision highp float;

uniform vec2 uResolution;
uniform vec2 uOffset;
uniform vec2 uAngles;
uniform float uScale;
uniform vec2 uLattice;
uniform vec2 uDot;
uniform vec3 uBase;
uniform vec3 uDotColor;
uniform vec4 uLevels;
uniform vec3 uLimb;
uniform vec3 uLight;
uniform float uWhiten;
uniform float uOpacity;
uniform sampler2D uMap;

#define PI 3.141592653589793
#define R2 0.64

#ifdef HAS_DERIV
  #define AA(f) fwidth(f)
#else
  #define AA(f) 0.02
#endif

mat3 spin(float theta, float phi) {
  float ct = cos(theta), st = sin(theta);
  float cp = cos(phi), sp = sin(phi);
  return mat3(cp, sp * st, -sp * ct,
              0.0, ct, st,
              sp, -cp * st, cp * ct);
}

vec2 latlon(vec3 p) {
  return vec2(asin(clamp(p.y, -1.0, 1.0)), atan(p.z, -p.x));
}

vec3 unlatlon(float lat, float lon) {
  float cl = cos(lat);
  return vec3(-cl * cos(lon), sin(lat), cl * sin(lon));
}

/* One dot per lat/lon cell, coloured by the map at the cell's centre so coastlines land on dot
   boundaries instead of cutting dots in half. */
float dots(vec3 p, out float ink, out float skirt) {
  float rows = uLattice.x, cols = uLattice.y;
  vec2 ll = latlon(p);

  float row = (ll.x + PI * 0.5) / PI * rows;
  float col = (ll.y + PI) / (2.0 * PI) * cols;
  float clat = (floor(row) + 0.5) / rows * PI - PI * 0.5;
  float clon = (floor(col) + 0.5) / cols * 2.0 * PI - PI;

  ink = mix(uLevels.y, uLevels.x,
            texture2D(uMap, vec2(clon * 0.5 / PI, -(clat / PI + 0.5))).x);

  float dLat = PI / rows;
  float dLon = 2.0 * PI / cols * cos(clat);
  float r = uDot.x * min(dLat, max(dLon, dLat * 0.18));

  float d = length(p - unlatlon(clat, clon));
  float cover = smoothstep(r, r * 0.35, d);
  skirt = smoothstep(r * uDot.y, r * 0.8, d);

  float sub = clamp(max(AA(row), AA(col)), 0.0, 1.0);
  cover = mix(cover, uDot.x * uDot.x * 1.6, sub);
  skirt = mix(skirt, 0.0, sub);
  return cover;
}

/* Bloom goes as the square of brightness, so it belongs to the land; the tint washes toward white
   as a dot brightens, which is what makes the limb crescent pale while the centre stays lime. */
vec3 shell(vec3 n, mat3 m, float lit) {
  float ink, skirt;
  float cover = dots(n * m, ink, skirt);
  float v = ink * lit;
  vec3 tint = mix(uDotColor, vec3(1.0), clamp(v * uWhiten, 0.0, 1.0));
  return tint * (cover * v + skirt * uLevels.w * v * v);
}

void main() {
  vec2 inv = 1.0 / uResolution;
  vec2 b = (gl_FragCoord.xy * inv * 2.0 - 1.0) / uScale - uOffset * vec2(1.0, -1.0) * inv;
  b.x *= uResolution.x * inv.y;

  float a = dot(b, b);
  float aa = max(AA(a), 1e-5);
  float disc = 1.0 - smoothstep(R2 - aa, R2 + aa, a);
  if (disc <= 0.0) { gl_FragColor = vec4(0.0); return; }

  vec3 front = normalize(vec3(b, sqrt(max(R2 - a, 0.0))));
  vec3 L = normalize(uLight);

  float toward = 0.5 + 0.5 * dot(normalize(b + vec2(1e-6)), normalize(L.xy));
  float lit = uLevels.z
            + uLimb.y * pow(1.0 - front.z, uLimb.x) * mix(1.0 - uLimb.z, 1.0, toward);

  vec3 colour = uBase + shell(front, spin(uAngles.y, uAngles.x), lit);
  gl_FragColor = vec4(colour, 1.0) * disc * uOpacity;
}
`;

const UNIFORMS = [
  "uResolution",
  "uOffset",
  "uAngles",
  "uScale",
  "uLattice",
  "uDot",
  "uBase",
  "uDotColor",
  "uLevels",
  "uLimb",
  "uLight",
  "uWhiten",
  "uOpacity",
  "uMap",
] as const;

type GL = WebGLRenderingContext | WebGL2RenderingContext;

function compile(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

function link(gl: GL, vertSrc: string, fragSrc: string): WebGLProgram | null {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vert || !frag) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
  return null;
}

export function createGlobe(
  canvas: HTMLCanvasElement,
  options: Partial<GlobeOptions> = {},
): Globe | null {
  const o: GlobeOptions = { ...DEFAULTS, ...options };

  const attrs: WebGLContextAttributes = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: true,
    preserveDrawingBuffer: false,
  };
  const gl2 = canvas.getContext("webgl2", attrs);
  const gl: GL | null = gl2 || canvas.getContext("webgl", attrs);
  if (!gl) return null;

  /* fwidth() needs OES_standard_derivatives for a GLSL ES 1.00 source, even on a WebGL2 context;
     the shader carries a constant-width path if the first link fails. */
  if (!gl2) gl.getExtension("OES_standard_derivatives");
  const program =
    link(gl, VERT, `#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIV\n${FRAG}`) ||
    link(gl, VERT, FRAG);
  if (!program) return null;

  const u = {} as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;
  for (const name of UNIFORMS) u[name] = gl.getUniformLocation(program, name);
  const aPos = gl.getAttribLocation(program, "aPos");

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  /* One black texel until the map decodes, so an in-between frame is an unlit sphere. NEAREST both
     ways: the shader samples once per dot cell and filtering would soften the coastlines. */
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array(3));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  let mapped = false;
  let destroyed = false;
  const image = new Image();
  image.onload = () => {
    if (destroyed) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    mapped = true;
    /* The load lands between frames; on a still sphere the next one may never come. */
    render();
  };
  image.src = MAP_URI;

  let bufferW = -1;
  let bufferH = -1;

  function render() {
    if (!gl || destroyed) return;
    const dpr = o.devicePixelRatio;
    const w = Math.max(1, Math.round(o.width * dpr));
    const h = Math.max(1, Math.round(o.height * dpr));
    /* Assigning canvas.width clears the buffer even when the value is unchanged. */
    if (w !== bufferW || h !== bufferH) {
      canvas.width = w;
      canvas.height = h;
      bufferW = w;
      bufferH = h;
    }

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(u.uResolution, w, h);
    gl.uniform2f(u.uOffset, o.offset[0] * dpr, o.offset[1] * dpr);
    gl.uniform2f(u.uAngles, o.phi, o.theta);
    gl.uniform1f(u.uScale, o.scale);
    gl.uniform2f(u.uLattice, o.rows, o.columns);
    gl.uniform2f(u.uDot, o.dotFill, o.dotBloom);
    gl.uniform3fv(u.uBase, o.baseColor);
    gl.uniform3fv(u.uDotColor, o.dotColor);
    gl.uniform4f(u.uLevels, o.mapBrightness, o.oceanBrightness, o.ambient, o.bloom);
    gl.uniform3f(u.uLimb, o.limbPower, o.limbGain, o.limbDirection);
    gl.uniform3fv(u.uLight, o.light);
    gl.uniform1f(u.uWhiten, o.whiten);
    gl.uniform1f(u.uOpacity, o.opacity);
    gl.uniform1i(u.uMap, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  render();

  return {
    get ready() {
      return mapped;
    },
    update(next) {
      Object.assign(o, next);
      render();
    },
    destroy() {
      destroyed = true;
      image.onload = null;
      gl.deleteBuffer(quad);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
