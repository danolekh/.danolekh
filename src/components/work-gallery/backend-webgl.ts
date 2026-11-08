// The gallery on WebGL2, for browsers without WebGPU. Same picture as backend-webgpu.ts; the vertex
// maths there and here must match.

import { LAYER_H, LAYER_W, MAX_INSTANCES, buildGrid, type Backend, type Frame } from "./backend";

const VERTEX = `#version 300 es
in vec2 grid;
in float theta;
in float rowY;
in float layer;
in float flatten;
uniform vec2 res;
uniform float focal, shiftY, eye, radius, span, height;
out vec2 vUv;
out float vFade;
flat out int vLayer;

vec3 project(float t, float y) {
  float d = max(eye + radius * cos(t), 0.4);
  return vec3(focal * radius * sin(t) / d, shiftY + focal * y / d, d);
}

void main() {
  float at = theta + (grid.x - 0.5) * span;
  float y = rowY + (0.5 - grid.y) * height;
  vec3 curved = project(at, y);

  // Flattened: the same card as a plain rectangle, centred where it is now, about to leave for its page.
  vec3 c = project(theta, rowY);
  float w = focal * radius * span / c.z;
  vec2 flatPos = vec2(c.x + (grid.x - 0.5) * w, c.y + (0.5 - grid.y) * w * 0.625);
  vec2 p = mix(curved.xy, flatPos, flatten);
  float cw = mix(curved.z, 1.0, flatten);

  gl_Position = vec4(p / (res * 0.5) * cw, 0.0, cw);
  vUv = grid;
  vFade = mix(smoothstep(1.55, 0.92, abs(at)), 1.0, flatten);
  vLayer = int(layer);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 vUv;
in float vFade;
flat in int vLayer;
uniform sampler2DArray clips;
out vec4 color;

float roundedBox(vec2 p, vec2 half_, float r) {
  vec2 q = abs(p) - half_ + vec2(r);
  return length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  vec2 size = vec2(${LAYER_W}.0, ${LAYER_H}.0);
  vec2 p = (vUv - vec2(0.5)) * size;
  float sd = roundedBox(p, size * 0.5, 30.0);
  float aa = max(fwidth(sd), 0.01);
  float inside = 1.0 - smoothstep(-aa, aa, sd);

  // Four taps a quarter pixel apart: the clip is usually drawn smaller than it is stored.
  vec2 dx = dFdx(vUv) * 0.25;
  vec2 dy = dFdy(vUv) * 0.25;
  float l = float(vLayer);
  vec4 tex = (
    texture(clips, vec3(vUv + dx + dy, l)) +
    texture(clips, vec3(vUv - dx + dy, l)) +
    texture(clips, vec3(vUv + dx - dy, l)) +
    texture(clips, vec3(vUv - dx - dy, l))
  ) * 0.25;

  // Soft contact shadow, zero well before the quad ends so no straight edge ever shows.
  float lift = clamp(1.0 - max(sd, 0.0) / 62.0, 0.0, 1.0);
  float shadow = lift * lift * lift * 0.14;
  float a = inside + (1.0 - inside) * shadow;
  color = vec4(tex.rgb * inside, a) * vFade;
}`;

export function createWebGl(canvas: HTMLCanvasElement, layers: number, onLost: () => void): Backend | null {
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "low-power" });
  if (!gl) return null;
  let alive = true;
  const handleLost = () => {
    if (alive) onLost();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader failed");
    return shader;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link failed");
  gl.useProgram(program);

  const texture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, LAYER_W, LAYER_H, layers);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // Until a poster arrives a card is the page's own quiet grey instead of black.
  const blank = new Uint8Array(LAYER_W * LAYER_H * 4 * layers);
  for (let i = 0; i < blank.length; i += 4) {
    blank[i] = 0xe7;
    blank[i + 1] = 0xe5;
    blank[i + 2] = 0xe1;
    blank[i + 3] = 0xff;
  }
  gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, LAYER_W, LAYER_H, layers, gl.RGBA, gl.UNSIGNED_BYTE, blank);

  const { verts, idx } = buildGrid();
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const gridAt = gl.getAttribLocation(program, "grid");
  gl.enableVertexAttribArray(gridAt);
  gl.vertexAttribPointer(gridAt, 2, gl.FLOAT, false, 0, 0);

  const instanceBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuf);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * 16, gl.DYNAMIC_DRAW);
  ["theta", "rowY", "layer", "flatten"].forEach((name, i) => {
    const at = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 1, gl.FLOAT, false, 16, i * 4);
    gl.vertexAttribDivisor(at, 1);
  });
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const uRes = u("res");
  const uFocal = u("focal");
  const uShift = u("shiftY");
  const uEye = u("eye");
  const uRadius = u("radius");
  const uSpan = u("span");
  const uHeight = u("height");
  gl.uniform1i(u("clips"), 0);

  return {
    kind: "webgl2",
    draw: (frame: Frame) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, frame.width, frame.height);
      gl.uniform1f(uFocal, frame.focal);
      gl.uniform1f(uShift, frame.shiftY);
      gl.uniform1f(uEye, frame.eye);
      gl.uniform1f(uRadius, frame.radius);
      gl.uniform1f(uSpan, frame.span);
      gl.uniform1f(uHeight, frame.cardHeight);
      gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.instances, 0, frame.count * 4);
      gl.drawElementsInstanced(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0, frame.count);
    },
    upload: (layer, source) => {
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, LAYER_W, LAYER_H, 1, gl.RGBA, gl.UNSIGNED_BYTE, source);
    },
    destroy: () => {
      alive = false;
      canvas.removeEventListener("webglcontextlost", handleLost);
    },
  };
}
