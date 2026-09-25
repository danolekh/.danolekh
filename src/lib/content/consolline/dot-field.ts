/* The halftone dot field from consolline.com (src/scripts/blocks/dot-field.js): a halftone plate,
 * redrawn dot by dot so a pointer can push it about.
 *
 * The trick the whole file rests on: the plate's own mip chain is a coverage map. One texel of level
 * log2(pitch) covers exactly one cell of the lattice, so a trilinear fetch at that level returns the
 * ink in that cell, and the dot that belongs there is the disc of the same area. Nothing is traced
 * or shipped alongside the picture — the picture already says where its dots are and how big.
 *
 * Here the lattice is pinned to the poster's box: it has the plate's aspect, and its box inside the
 * host is where the plate lands, so the canvas and the still it replaces line up at every breakpoint.
 * Loaded with a dynamic import from the case-study block, so only /p/consolline ever requests it. */

export type DotFieldConfig = {
  /** The halftone plate the dots are read from; its mip chain is the coverage map. */
  texture: string;
  source: { width: number; height: number };
  /** Lattice pitch and a known dot centre, in the source file's pixels; angle of the screen. */
  lattice: { pitch: number; angle: number; dotX: number; dotY: number };
  /** r+g+b of a solid dot, over 255 — what full coverage reads as. */
  ink: number;
  cull: number;
  color: [number, number, number];
  /** What a dot turns toward as the wake lifts it: brighter on a dark ground, deeper on a light one. */
  liftColor: [number, number, number];
  alpha: number;
  push: number;
  glow: number;
  lift: number;
};

const RIPPLES = 8;
/* the long side of the touch texture; the short side follows the band's aspect */
const TRAIL = 64;
const MAX_AGE = 64;

const VERT = `#version 300 es
  void main() {
    vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
    gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
  }`;

/* Device pixels, GL origin bottom left; both textures are uploaded flipped, so a fragment's own
   coordinate indexes the trail and the plate directly. The 3x3 sweep lets a dot leave its cell, and
   the branch that skips the neighbours when nothing moves keeps the still part of the field to one
   cell per fragment. uAxis turns the lattice (the map is a screen at 45 degrees). */
const FRAG = `#version 300 es
  precision highp float;
  #define RIPPLES ${RIPPLES}
  const float PI = 3.14159265;

  uniform sampler2D uMap;
  uniform sampler2D uTrail;
  uniform vec2  uRes;
  uniform vec4  uPlate;
  uniform vec2  uOrigin;
  uniform vec2  uPhase;
  uniform vec2  uAxis;
  uniform float uPitch;
  uniform float uLod;
  uniform float uInk;
  uniform float uCull;
  uniform vec3  uColor;
  uniform vec3  uLiftColor;
  uniform float uAlpha;
  uniform float uPush;
  uniform float uGlow;
  uniform float uLift;
  uniform float uTime;
  uniform vec3  uRipple[RIPPLES];

  out vec4 fragColor;

  vec2 turn(vec2 p)   { return vec2(dot(p, uAxis), dot(p, vec2(-uAxis.y, uAxis.x))); }
  vec2 unturn(vec2 q) { return q.x * uAxis + q.y * vec2(-uAxis.y, uAxis.x); }

  void main() {
    vec2 frag = gl_FragCoord.xy;

    /* The trail writes every channel through one alpha, so red and green come back multiplied by
       the intensity blue carries; dividing it back out is what keeps an idle cell from reading as
       a pull to the lower left. */
    vec4 tr = texture(uTrail, frag / uRes);
    float lift = tr.b;
    vec2 dir = lift > 0.004 ? (tr.rg / lift) * 2.0 - 1.0 : vec2(0.0);
    vec2 push = dir * lift;

    for (int i = 0; i < RIPPLES; ++i) {
      if (uRipple[i].z < 0.0) continue;
      float t = uTime - uRipple[i].z;
      vec2 d = frag - uRipple[i].xy;
      float r = length(d);
      float ring = exp(-pow((r - 34.0 * uPitch * t) / (2.4 * uPitch), 2.0));
      float a = ring * exp(-1.15 * t);
      push += (d / max(r, 1.0)) * a;
      lift = max(lift, a);
    }

    vec2 shift = push * uPush * uPitch;
    float span = length(push) < 0.012 ? 0.0 : 1.0;

    vec2 cell = floor((turn(frag - uOrigin) - uPhase) / uPitch + 0.5);
    float mask = 0.0;

    for (int j = -1; j <= 1; ++j) {
      for (int i = -1; i <= 1; ++i) {
        if (abs(float(i)) > span || abs(float(j)) > span) continue;

        vec2 home = uOrigin + unturn((cell + vec2(float(i), float(j))) * uPitch + uPhase);
        vec2 uv = (home - uPlate.xy) / uPlate.zw;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) continue;

        float cov = dot(textureLod(uMap, uv, uLod).rgb, vec3(1.0)) * uInk;
        if (cov < uCull) continue;

        float rad = uPitch * sqrt(cov / PI) * (1.0 + lift * uGlow);
        float d = length(frag - (home + shift));
        /* pixel coverage, capped at the disc's whole area so sub-pixel dots keep their real ink */
        float a = clamp(rad - d + 0.5, 0.0, 1.0);
        mask = max(mask, min(a, PI * rad * rad));
      }
    }

    vec3 rgb = mix(uColor, uLiftColor, min(lift * uLift, 1.0));
    float ink = mask * uAlpha;
    fragColor = vec4(rgb * ink, ink);
  }`;

type Point = { x: number; y: number; ux: number; uy: number; force: number; age: number };

/* Matching the touch texture's aspect to the band's keeps a trail texel square on screen. */
function trailSize(w: number, h: number): [number, number] {
  const short = Math.max(8, Math.round((TRAIL * Math.min(w, h)) / Math.max(w, h)));
  return w >= h ? [TRAIL, short] : [short, TRAIL];
}

/** Returns a disposer, or null when WebGL2 is unavailable (the poster simply stays). */
export function mountDotField(
  host: HTMLElement,
  canvas: HTMLCanvasElement,
  plate: HTMLElement,
  config: DotFieldConfig,
  onLive: () => void,
): (() => void) | null {
  const { source, lattice, ink, cull, color, liftColor, alpha, push, glow, lift } = config;
  const LOD = Math.log2(lattice.pitch);
  const AXIS_X = Math.cos((lattice.angle * Math.PI) / 180);
  const AXIS_Y = Math.sin((lattice.angle * Math.PI) / 180);
  const coarse = window.matchMedia("(pointer: coarse)");

  const context = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  const trailContext = document.createElement("canvas").getContext("2d");
  if (!context || !trailContext) return null;
  /* rebound so the narrowing holds inside the hoisted functions below */
  const gl: WebGL2RenderingContext = context;
  const tctx: CanvasRenderingContext2D = trailContext;
  const trailCanvas = tctx.canvas;

  function compile(type: number, src: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const U = {
    res: uniform("uRes"),
    plate: uniform("uPlate"),
    origin: uniform("uOrigin"),
    phase: uniform("uPhase"),
    pitch: uniform("uPitch"),
    time: uniform("uTime"),
    ripple: uniform("uRipple"),
  };
  gl.uniform1i(uniform("uMap"), 0);
  gl.uniform1i(uniform("uTrail"), 1);
  gl.uniform2f(uniform("uAxis"), AXIS_X, AXIS_Y);
  gl.uniform1f(uniform("uLod"), LOD);
  gl.uniform1f(uniform("uInk"), 1 / ink);
  gl.uniform1f(uniform("uCull"), cull);
  gl.uniform3f(uniform("uColor"), color[0] / 255, color[1] / 255, color[2] / 255);
  gl.uniform3f(uniform("uLiftColor"), liftColor[0] / 255, liftColor[1] / 255, liftColor[2] / 255);
  gl.uniform1f(uniform("uAlpha"), alpha);
  gl.uniform1f(uniform("uPush"), push);
  gl.uniform1f(uniform("uGlow"), glow);
  gl.uniform1f(uniform("uLift"), lift);

  /* The touch texture: points drawn as blurred discs through the shadow, offset off-canvas so only
     the shadow lands — the blur is the falloff, for one arc() per point. */
  let [trailW, trailH] = [TRAIL, TRAIL];
  trailCanvas.width = trailW;
  trailCanvas.height = trailH;
  let radius = TRAIL * (coarse.matches ? 0.16 : 0.11);

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const trailTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, trailTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);

  const controller = new AbortController();
  const { signal } = controller;

  let map: WebGLTexture | null = null;
  let raf = 0;
  let near = false;
  let live = false;
  let dirty = true;
  let disposed = false;
  let started = 0;
  let lastMove = -Infinity;
  let lastRipple = -Infinity;
  let width = 0;
  let height = 0;

  const points: Point[] = [];
  let pen: { x: number; y: number } | null = null;
  let penSource = "";

  const ripples = new Float32Array(RIPPLES * 3);
  for (let i = 0; i < RIPPLES; i++) ripples[i * 3 + 2] = -1;
  let ripplePen = 0;

  const image = new Image();
  image.decoding = "async";
  image.addEventListener(
    "load",
    () => {
      if (disposed) return;
      map = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, map);
      /* Premultiplied on the way in, so ink reads off rgb alone whatever sits under transparency. */
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      /* the mip chain is the coverage map; trilinear lets the shader ask between two levels */
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      started = performance.now();
      schedule();
    },
    { signal },
  );
  /* No error branch: a plate that will not load never starts the loop, and the poster stays. */
  image.src = config.texture;

  function trailAdd(x: number, y: number, pointer: string, force?: number) {
    if (pointer !== penSource) {
      penSource = pointer;
      pen = null;
    }
    if (!pen) {
      pen = { x, y };
      return;
    }
    const nx = x - pen.x;
    const ny = y - pen.y;
    pen = { x, y };
    /* direction in trail texels, so a diagonal drag over a non-square band goes where the cursor did */
    const dx = nx * trailW;
    const dy = ny * trailH;
    const d = Math.hypot(dx, dy);
    if (!d) return;
    const dd = nx * nx + ny * ny;
    points.push({
      x,
      y,
      ux: dx / d,
      uy: dy / d,
      force: force === undefined ? Math.min(dd * 10000, 1) : force,
      age: 0,
    });
  }

  function trailDraw(p: Point) {
    const rise = MAX_AGE * 0.3;
    const intensity =
      p.force *
      (p.age < rise
        ? Math.sin(((p.age / rise) * Math.PI) / 2)
        : (1 - (p.age - rise) / (MAX_AGE - rise)) * (1 + (p.age - rise) / (MAX_AGE - rise)));
    const offset = TRAIL * 5;
    tctx.shadowOffsetX = offset;
    tctx.shadowOffsetY = offset;
    tctx.shadowBlur = radius;
    tctx.shadowColor = `rgba(${((p.ux + 1) / 2) * 255},${((p.uy + 1) / 2) * 255},255,${0.85 * intensity})`;
    tctx.beginPath();
    tctx.fillStyle = "rgba(255,0,0,1)";
    tctx.arc(p.x * trailW - offset, (1 - p.y) * trailH - offset, radius, 0, Math.PI * 2);
    tctx.fill();
  }

  function trailStep() {
    tctx.fillStyle = "black";
    tctx.fillRect(0, 0, trailW, trailH);
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i]!;
      /* a point keeps coasting the way it was going, slowing as it ages */
      const step = ((p.force * (1 - p.age / MAX_AGE)) / MAX_AGE) * TRAIL;
      p.x += (p.ux * step) / trailW;
      p.y += (p.uy * step) / trailH;
      p.age++;
      if (p.age > MAX_AGE) points.splice(i, 1);
    }
    for (const p of points) trailDraw(p);
  }

  function addRipple(x: number, y: number, time: number) {
    const slot = (ripplePen++ % RIPPLES) * 3;
    ripples[slot] = x * canvas.width;
    ripples[slot + 1] = y * canvas.height;
    ripples[slot + 2] = time;
  }

  /* dpr capped at 2 (1.5 on touch) and by a fragment budget, never below 1: the dots are small
     enough that undersampling shows as crawl */
  function measure(): boolean {
    const cssW = host.clientWidth;
    const cssH = host.clientHeight;
    if (!cssW || !cssH) return false;

    const cap = Math.min(window.devicePixelRatio || 1, coarse.matches ? 1.5 : 2);
    const dpr = Math.max(1, Math.min(cap, Math.sqrt(3.2e6 / (cssW * cssH))));
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    if (w !== width || h !== height) {
      width = canvas.width = w;
      height = canvas.height = h;
      gl.viewport(0, 0, w, h);
      const [tw, th] = trailSize(w, h);
      if (tw !== trailW || th !== trailH) {
        trailW = trailCanvas.width = tw;
        trailH = trailCanvas.height = th;
        radius = Math.max(tw, th) * (coarse.matches ? 0.16 : 0.11);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, trailTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
      }
    }

    /* Where the poster actually lands inside the host, transforms included. The <img> keeps the
       file's own aspect, so one scale carries the pitch, the anchor dot and the extent alike. */
    const hostBox = host.getBoundingClientRect();
    const plateBox = plate.getBoundingClientRect();
    if (!plateBox.width || !plateBox.height || !hostBox.width) return false;
    /* getBoundingClientRect is in layout px, clientWidth ignores transforms on ancestors; the ratio
       folds any zoom on the page back into CSS px of the host */
    const k = cssW / hostBox.width;
    const pw = plateBox.width * k;
    const ph = plateBox.height * k;
    const px = (plateBox.left - hostBox.left) * k;
    const py = (plateBox.top - hostBox.top) * k;
    const scale = pw / source.width;

    const cell = lattice.pitch * scale * dpr;
    const x = px * dpr;
    const y = (cssH - py - ph) * dpr;
    const dx = lattice.dotX * scale * dpr;
    const dy = (source.height - lattice.dotY) * scale * dpr;
    const wrap = (v: number) => ((v % cell) + cell) % cell;

    gl.uniform2f(U.res, w, h);
    gl.uniform4f(U.plate, x, y, pw * dpr, ph * dpr);
    gl.uniform2f(U.origin, x, y);
    gl.uniform2f(U.phase, wrap(dx * AXIS_X + dy * AXIS_Y), wrap(dy * AXIS_X - dx * AXIS_Y));
    gl.uniform1f(U.pitch, cell);
    dirty = false;
    return true;
  }

  /* Nothing hovers a phone, so an unattended pointer wanders the plate on out-of-phase sines and
     drops a ripple every few seconds; it gives way as soon as a real pointer moves and comes back
     about a second after it stops. */
  function ambient(time: number) {
    const gain = Math.min(1, Math.max(0, (time - lastMove - 1.2) / 0.9));
    if (gain <= 0) return;
    trailAdd(
      0.5 + 0.33 * Math.sin(time * 0.19) + 0.11 * Math.sin(time * 0.47 + 1.3),
      0.52 + 0.2 * Math.cos(time * 0.15) + 0.08 * Math.cos(time * 0.53 + 0.7),
      "ambient",
      gain * 0.5,
    );
    if (gain > 0.85 && time - lastRipple > 4.5) {
      lastRipple = time;
      addRipple(0.5 + 0.3 * Math.sin(time * 0.37), 0.5 + 0.24 * Math.cos(time * 0.29), time);
    }
  }

  function frame(stamp: number) {
    raf = 0;
    if (dirty && !measure()) {
      schedule();
      return;
    }
    const time = (stamp - started) / 1000;
    ambient(time);
    trailStep();

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, trailTex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
    gl.uniform1f(U.time, time);
    gl.uniform3fv(U.ripple, ripples);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (!live) {
      live = true;
      onLive();
    }
    schedule();
  }

  function schedule() {
    if (raf || !map || !near || document.hidden || disposed) return;
    raf = window.requestAnimationFrame(frame);
  }

  function stop() {
    if (!raf) return;
    window.cancelAnimationFrame(raf);
    raf = 0;
  }

  const clock = () => (started ? (performance.now() - started) / 1000 : 0);

  /* local to the canvas, normalised, y up: the units the trail and the shader already use */
  function at(event: { clientX: number; clientY: number }) {
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    return {
      x: (event.clientX - box.left) / box.width,
      y: 1 - (event.clientY - box.top) / box.height,
    };
  }

  /* Pointer events cancel the moment the browser decides a swipe is a scroll, so the finger gets
     its own touchmove pass. Every listener is passive: the field must never block scrolling. */
  host.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      const p = at(event);
      if (!p) return;
      lastMove = clock();
      trailAdd(p.x, p.y, "pointer");
    },
    { passive: true, signal },
  );
  host.addEventListener(
    "touchmove",
    (event) => {
      const touch = event.touches[0];
      const p = touch && at(touch);
      if (!p) return;
      lastMove = clock();
      trailAdd(p.x, p.y, "touch");
    },
    { passive: true, signal },
  );
  host.addEventListener(
    "pointerdown",
    (event) => {
      const p = at(event);
      if (!p) return;
      lastMove = clock();
      addRipple(p.x, p.y, clock());
    },
    { passive: true, signal },
  );
  const drop = () => {
    pen = null;
  };
  for (const type of ["pointerleave", "pointercancel", "touchend", "touchcancel"]) {
    host.addEventListener(type, drop, { passive: true, signal });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      near = entries.some((entry) => entry.isIntersecting);
      if (near) schedule();
      else stop();
    },
    { rootMargin: "100px 0px" },
  );
  observer.observe(host);

  const remeasure = () => {
    dirty = true;
    schedule();
  };
  const resizeObserver = new ResizeObserver(remeasure);
  resizeObserver.observe(host);
  window.addEventListener("resize", remeasure, { signal });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : schedule()), {
    signal,
  });

  /* WEBGL_lose_context is the only prompt way to hand the GPU memory back; the GC is not. */
  return () => {
    disposed = true;
    stop();
    controller.abort();
    observer.disconnect();
    resizeObserver.disconnect();
    if (map) gl.deleteTexture(map);
    gl.deleteTexture(trailTex);
    gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
