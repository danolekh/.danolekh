/// <reference types="@webgpu/types" />
// The gallery on WebGPU. Same picture as backend-webgl.ts; the vertex maths there and here must match.

import { LAYER_H, LAYER_W, MAX_INSTANCES, buildGrid, type Backend, type Frame } from "./backend";

const WGSL = /* wgsl */ `
struct U {
  res: vec2f,
  focal: f32,
  shiftY: f32,
  eye: f32,
  radius: f32,
  span: f32,
  height: f32,
}
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var clips: texture_2d_array<f32>;

struct V {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) fade: f32,
  @location(2) @interpolate(flat) layer: i32,
}

fn screen(theta: f32, y: f32) -> vec3f {
  let d = max(u.eye + u.radius * cos(theta), 0.4);
  return vec3f(u.focal * u.radius * sin(theta) / d, u.shiftY + u.focal * y / d, d);
}

@vertex fn vs(
  @location(0) grid: vec2f,
  @location(1) theta: f32,
  @location(2) rowY: f32,
  @location(3) layer: f32,
  @location(4) flatten: f32,
) -> V {
  let at = theta + (grid.x - 0.5) * u.span;
  let y = rowY + (0.5 - grid.y) * u.height;
  let curved = screen(at, y);

  // Flattened: the same card as a plain rectangle, centred where it is now, about to leave for its page.
  let c = screen(theta, rowY);
  let w = u.focal * u.radius * u.span / c.z;
  let flatPos = vec2f(c.x + (grid.x - 0.5) * w, c.y + (0.5 - grid.y) * w * 0.625);
  let p = mix(curved.xy, flatPos, flatten);
  let cw = mix(curved.z, 1.0, flatten);

  var out: V;
  out.pos = vec4f(p / (u.res * 0.5) * cw, 0.0, cw);
  out.uv = grid;
  out.fade = mix(smoothstep(1.55, 0.92, abs(at)), 1.0, flatten);
  out.layer = i32(layer);
  return out;
}

fn roundedBox(p: vec2f, half: vec2f, r: f32) -> f32 {
  let q = abs(p) - half + vec2f(r);
  return length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

@fragment fn fs(v: V) -> @location(0) vec4f {
  let size = vec2f(${LAYER_W}.0, ${LAYER_H}.0);
  let p = (v.uv - vec2f(0.5)) * size;
  let sd = roundedBox(p, size * 0.5, 30.0);
  let aa = max(fwidth(sd), 0.01);
  let inside = 1.0 - smoothstep(-aa, aa, sd);

  // Four taps a quarter pixel apart: the clip is usually drawn smaller than it is stored.
  let dx = dpdx(v.uv) * 0.25;
  let dy = dpdy(v.uv) * 0.25;
  let tex = (
    textureSample(clips, samp, v.uv + dx + dy, v.layer) +
    textureSample(clips, samp, v.uv - dx + dy, v.layer) +
    textureSample(clips, samp, v.uv + dx - dy, v.layer) +
    textureSample(clips, samp, v.uv - dx - dy, v.layer)
  ) * 0.25;

  let rgb = tex.rgb;
  // Soft contact shadow, zero well before the quad ends so no straight edge ever shows.
  let lift = clamp(1.0 - max(sd, 0.0) / 62.0, 0.0, 1.0);
  let shadow = lift * lift * lift * 0.14;
  let a = inside + (1.0 - inside) * shadow;
  return vec4f(rgb * inside, a) * v.fade;
}
`;

export async function createWebGpu(canvas: HTMLCanvasElement, layers: number, onLost: () => void): Promise<Backend | null> {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "low-power" });
  if (!adapter) return null;
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext("webgpu");
  if (!ctx) return null;
  let alive = true;
  device.lost.then(() => {
    if (alive) onLost();
  });

  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: "premultiplied" });

  const clips = device.createTexture({
    size: [LAYER_W, LAYER_H, layers],
    format: "rgba8unorm",
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });
  // Until a poster arrives a card is the page's own quiet grey instead of black.
  const blank = new OffscreenCanvas(4, 4);
  const blankCtx = blank.getContext("2d")!;
  blankCtx.fillStyle = "#e7e5e1";
  blankCtx.fillRect(0, 0, 4, 4);
  for (let i = 0; i < layers; i++) {
    device.queue.copyExternalImageToTexture({ source: blank }, { texture: clips, origin: [0, 0, i] }, [4, 4]);
  }

  const { verts, idx } = buildGrid();
  const vertexBuf = device.createBuffer({ size: verts.byteLength, usage: GPUBufferUsage.VERTEX, mappedAtCreation: true });
  new Float32Array(vertexBuf.getMappedRange()).set(verts);
  vertexBuf.unmap();
  const indexBuf = device.createBuffer({ size: idx.byteLength, usage: GPUBufferUsage.INDEX, mappedAtCreation: true });
  new Uint16Array(indexBuf.getMappedRange()).set(idx);
  indexBuf.unmap();

  const instanceBuf = device.createBuffer({ size: MAX_INSTANCES * 16, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
  const uniformData = new Float32Array(8);
  const uniformBuf = device.createBuffer({ size: uniformData.byteLength, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });

  const module = device.createShaderModule({ code: WGSL });
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs",
      buffers: [
        { arrayStride: 8, attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }] },
        {
          arrayStride: 16,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "float32" },
            { shaderLocation: 2, offset: 4, format: "float32" },
            { shaderLocation: 3, offset: 8, format: "float32" },
            { shaderLocation: 4, offset: 12, format: "float32" },
          ],
        },
      ],
    },
    fragment: {
      module,
      entryPoint: "fs",
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
          },
        },
      ],
    },
    primitive: { topology: "triangle-list" },
  });
  const bind = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniformBuf } },
      { binding: 1, resource: device.createSampler({ minFilter: "linear", magFilter: "linear" }) },
      { binding: 2, resource: clips.createView({ dimension: "2d-array" }) },
    ],
  });

  return {
    kind: "webgpu",
    draw: (frame: Frame) => {
      uniformData.set([frame.width, frame.height, frame.focal, frame.shiftY, frame.eye, frame.radius, frame.span, frame.cardHeight]);
      device.queue.writeBuffer(uniformBuf, 0, uniformData);
      device.queue.writeBuffer(instanceBuf, 0, frame.instances, 0, frame.count * 4);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: ctx.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.setVertexBuffer(0, vertexBuf);
      pass.setVertexBuffer(1, instanceBuf);
      pass.setIndexBuffer(indexBuf, "uint16");
      pass.drawIndexed(idx.length, frame.count);
      pass.end();
      device.queue.submit([encoder.finish()]);
    },
    upload: (layer, source) => {
      device.queue.copyExternalImageToTexture({ source }, { texture: clips, origin: [0, 0, layer] }, [LAYER_W, LAYER_H]);
    },
    destroy: () => {
      alive = false;
      device.destroy();
    },
  };
}

