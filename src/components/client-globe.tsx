import { useEffect, useRef } from "react";

// A whole dot globe in the page's ink, with the clients' faces on it. Asked to, it turns to one of them and
// darkens the land around them. Grab it and it spins, with a throw, then drifts back to the clients.

const D = Math.PI / 180;
const INK = "#171717";

const vec = (lat: number, lon: number): [number, number, number] => [
  Math.cos(lat * D) * Math.sin(lon * D),
  Math.sin(lat * D),
  Math.cos(lat * D) * Math.cos(lon * D),
];

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type GlobePin = {
  lat: number;
  lon: number;
  avatar: string;
  place: string;
  /** Pins this close would hide each other: at rest they sit side by side, like a stack of avatars. */
  dx?: number;
  dy?: number;
};

// A spring that settles without overshoot, for a globe that has weight.
class Spring {
  v = 0;
  constructor(public x: number) {}
  to(target: number, dt: number, k = 26) {
    const c = 2 * Math.sqrt(k);
    this.v += (k * (target - this.x) - c * this.v) * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

export function ClientGlobe({ pins, active }: { pins: GlobePin[]; active: number | null }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pinEls = useRef<(HTMLDivElement | null)[]>([]);
  const wanted = useRef(active);
  wanted.current = active;

  useEffect(() => {
    const el = canvas.current;
    const host = box.current;
    const ctx = el?.getContext("2d");
    if (!el || !host || !ctx) return;
    let raf = 0;
    let stop = false;
    let visible = false;
    let started = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Grabbing the globe: how far the pointer moved since the last frame, and the throw it leaves behind.
    const drag = { on: false, id: 0, x: 0, y: 0, dx: 0, dy: 0, vLon: 0, vLat: 0, until: 0, card: null as number | null };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      drag.on = true;
      drag.id = e.pointerId;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.dx = drag.dy = 0;
      host.setPointerCapture(e.pointerId);
      host.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (!drag.on || e.pointerId !== drag.id) return;
      drag.dx += e.clientX - drag.x;
      drag.dy += e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag.on || e.pointerId !== drag.id) return;
      drag.on = false;
      drag.until = performance.now() + 2600;
      drag.card = wanted.current;
      host.style.cursor = "";
    };
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onUp);
    let w = 0;
    let h = 0;
    const fit = () => {
      w = host.clientWidth;
      h = host.clientHeight;
      const dpr = Math.min(2, devicePixelRatio || 1);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    const begin = () => {
      started = true;
      void import("@/lib/globe-land").then(({ GLOBE }) => {
        if (stop) return;
        const raw = Uint8Array.from(atob(GLOBE.bits), (c) => c.charCodeAt(0));
        const GA = Math.PI * (3 - Math.sqrt(5));
        const pts: number[] = [];
        for (let i = 0; i < GLOBE.N; i++) {
          if (!(raw[i >> 3]! & (1 << (i & 7)))) continue;
          const y = 1 - (2 * (i + 0.5)) / GLOBE.N;
          const r = Math.sqrt(1 - y * y);
          const a = i * GA;
          pts.push(r * Math.sin(a), y, r * Math.cos(a));
        }
        const P = new Float32Array(pts);
        const n = P.length / 3;

        // The land around each pin: the dots that light up, and how strongly.
        const regions = pins.map((pin) => {
          const c = vec(pin.lat, pin.lon);
          const list: [number, number][] = [];
          for (let i = 0; i < n; i++) {
            const d = P[i * 3]! * c[0] + P[i * 3 + 1]! * c[1] + P[i * 3 + 2]! * c[2];
            const glow = smooth(Math.cos(9 * D), Math.cos(2.5 * D), d);
            if (glow > 0) list.push([i, glow]);
          }
          return list;
        });
        const pinVecs = pins.map((p) => vec(p.lat, p.lon));
        const graticule: [number, number, number][][] = [];
        for (let lo = -180; lo < 180; lo += 20) {
          const line: [number, number, number][] = [];
          for (let la = -80; la <= 80; la += 4) line.push(vec(la, lo));
          graticule.push(line);
        }
        for (let la = -60; la <= 75; la += 15) {
          const line: [number, number, number][] = [];
          for (let lo = -180; lo <= 180; lo += 4) line.push(vec(la, lo));
          graticule.push(line);
        }

        const REST_LON = 10;
        const REST_LAT = 24;
        const lon = new Spring(REST_LON);
        const lat = new Spring(REST_LAT);
        const zoom = new Spring(0);
        const focus = pins.map(() => new Spring(0));
        let idle = 0;
        let last = performance.now();

        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          const dt = Math.min(0.033, (now - last) / 1000);
          last = now;
          if (!visible) return;
          const on = wanted.current;
          const pin = on === null ? null : pins[on];
          if (!pin && !reduced) idle += dt;
          // The clients are all in one part of the world, so at rest it sways instead of spinning away from them.
          const restLon = REST_LON + (reduced ? 0 : 26 * Math.sin(idle * 0.14));
          const tLon = pin ? pin.lon : restLon;
          const tLat = pin ? pin.lat - 12 : REST_LAT;
          const tZoom = pin ? 1 : 0;
          const degPerPx = 57.3 / (Math.min(w, h) * 0.46);
          // The spring takes the short way round, however far the globe was spun.
          lon.x = tLon + ((((lon.x - tLon + 180) % 360) + 360) % 360) - 180;
          const clampLat = (v: number) => Math.max(-55, Math.min(75, v));
          if (drag.on) {
            const dLon = -drag.dx * degPerPx;
            const dLat = drag.dy * degPerPx;
            drag.dx = drag.dy = 0;
            lon.x += dLon;
            lat.x = clampLat(lat.x + dLat);
            if (dt > 0) {
              drag.vLon += (dLon / dt - drag.vLon) * 0.4;
              drag.vLat += (dLat / dt - drag.vLat) * 0.4;
            }
            lon.v = lat.v = 0;
            zoom.to(tZoom, dt, 18);
          } else if (now < drag.until && on === drag.card) {
            // Thrown: it coasts and slows down, then rests a moment where you left it.
            const decay = Math.exp(-dt * 2.4);
            drag.vLon *= decay;
            drag.vLat *= decay;
            if (!reduced) {
              lon.x += drag.vLon * dt;
              lat.x = clampLat(lat.x + drag.vLat * dt);
            }
            lon.v = lat.v = 0;
            zoom.to(tZoom, dt, 18);
          } else if (reduced) {
            lon.x = tLon;
            lat.x = tLat;
            zoom.x = tZoom;
          } else {
            lon.to(tLon, dt, pin ? 22 : 16);
            lat.to(tLat, dt, pin ? 22 : 16);
            zoom.to(tZoom, dt, 18);
          }
          focus.forEach((f, i) => {
            const target = on === i ? 1 : 0;
            if (reduced) f.x = target;
            else f.to(target, dt, 60);
          });
          const anyFocus = Math.min(1, Math.max(0, ...focus.map((f) => f.x)));

          const m = Math.min(w, h);
          // The whole globe stays in the frame, turned or not.
          const R = m * (0.45 + 0.03 * zoom.x);
          const cx = w / 2;
          const cy = h / 2;
          const tilt = lat.x * D;
          const ct = Math.cos(tilt);
          const st = Math.sin(tilt);
          const cl = Math.cos(-lon.x * D);
          const sl = Math.sin(-lon.x * D);
          const view = (x: number, y: number, z: number) => {
            const x1 = x * cl + z * sl;
            const z1 = -x * sl + z * cl;
            return [x1, y * ct - z1 * st, y * st + z1 * ct] as const;
          };

          ctx.clearRect(0, 0, w, h);

          ctx.lineWidth = 1;
          ctx.strokeStyle = INK;
          ctx.globalAlpha = 0.14;
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 0.06;
          ctx.beginPath();
          for (const line of graticule) {
            let pen = false;
            for (const p of line) {
              const v = view(p[0], p[1], p[2]);
              if (v[2] < 0) {
                pen = false;
                continue;
              }
              const sx = cx + R * v[0];
              const sy = cy - R * v[1];
              if (pen) ctx.lineTo(sx, sy);
              else ctx.moveTo(sx, sy);
              pen = true;
            }
          }
          ctx.stroke();

          // Land in six alpha steps: six fills a frame instead of thousands.
          const base = Math.max(1.5, R / 110);
          const paths = Array.from({ length: 6 }, () => new Path2D());
          for (let i = 0; i < n; i++) {
            const v = view(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!);
            if (v[2] <= 0.02) continue;
            const sx = cx + R * v[0];
            const sy = cy - R * v[1];
            if (sy > h + 2 || sy < -2) continue;
            const r = (base * (0.5 + 0.5 * v[2])) / 2;
            const b = Math.min(5, (v[2] * 6) | 0);
            paths[b]!.moveTo(sx + r, sy);
            paths[b]!.arc(sx, sy, r, 0, 6.283);
          }
          ctx.fillStyle = INK;
          const dim = 1 - 0.6 * anyFocus;
          paths.forEach((path, b) => {
            ctx.globalAlpha = 0.62 * (0.3 + 0.7 * ((b + 0.5) / 6)) * dim;
            ctx.fill(path);
          });

          // The region around the client.
          focus.forEach((f, i) => {
            if (f.x < 0.01) return;
            ctx.fillStyle = INK;
            for (const [index, glow] of regions[i]!) {
              const v = view(P[index * 3]!, P[index * 3 + 1]!, P[index * 3 + 2]!);
              if (v[2] <= 0.02) continue;
              ctx.globalAlpha = Math.min(1, f.x) * glow;
              ctx.beginPath();
              ctx.arc(cx + R * v[0], cy - R * v[1], base * 0.72, 0, 6.283);
              ctx.fill();
            }
          });

          // The pins, in DOM so faces and labels stay sharp.
          pinVecs.forEach((c, i) => {
            const v = view(c[0], c[1], c[2]);
            const f = Math.min(1, Math.max(0, focus[i]!.x));
            const sx = cx + R * v[0];
            const sy = cy - R * v[1];
            const front = smooth(0.08, 0.28, v[2]);
            if (front > 0) {
              ctx.fillStyle = INK;
              ctx.globalAlpha = front * (1 - anyFocus + f);
              ctx.beginPath();
              ctx.arc(sx, sy, 2.5, 0, 6.283);
              ctx.fill();
              if (f > 0.01) {
                const pulse = reduced ? 0.5 : (now / 1800) % 1;
                ctx.strokeStyle = INK;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = front * f * (1 - pulse);
                ctx.beginPath();
                ctx.arc(sx, sy, 6 + pulse * 26, 0, 6.283);
                ctx.stroke();
              }
            }
            const pinEl = pinEls.current[i];
            if (pinEl) {
              const apart = 1 - anyFocus;
              const dx = (pins[i]!.dx ?? 0) * apart;
              const dy = (pins[i]!.dy ?? 0) * apart;
              pinEl.style.transform = `translate3d(${(sx + dx).toFixed(1)}px,${(sy + dy).toFixed(1)}px,0)`;
              pinEl.style.opacity = (front * Math.min(1, apart + f)).toFixed(3);
            }
          });
          ctx.globalAlpha = 1;
        };
        raf = requestAnimationFrame(frame);
      });
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible && !started) begin();
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(host);

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onUp);
    };
  }, [pins]);

  return (
    <div ref={box} aria-hidden="true" className="relative cursor-grab touch-pan-y overflow-hidden select-none">
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      {pins.map((pin, i) => (
        <div key={pin.place} ref={(node) => void (pinEls.current[i] = node)} className="pointer-events-none absolute top-0 left-0 opacity-0 will-change-transform" style={{ zIndex: active === i ? 2 : 1 }}>
          <img
            src={pin.avatar}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            draggable={false}
            className={`absolute -top-12 -left-[18px] size-9 max-w-none rounded-full bg-white object-cover shadow-[0_0_0_2px_#fff,0_6px_16px_rgba(0,0,0,0.22)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${active === i ? "scale-125" : "scale-100"}`}
          />
          <p
            className={`absolute -top-[86px] left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium whitespace-nowrap text-white transition-[opacity,translate] duration-300 ease-out ${active === i ? "opacity-100" : "translate-y-1 opacity-0"}`}
          >
            {pin.place}
          </p>
        </div>
      ))}
    </div>
  );
}
