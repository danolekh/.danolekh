import { useEffect, useRef } from "react";

// The EmpireOneCX prototype's globe with its real numbers, in the page's own 1440-wide space. It holds
// still until `spinning` is true: in the design tool it's a picture, on the site it's alive.

const W = 1440;
const H = 1024;
const D = Math.PI / 180;
const ACCENT = "#a52dd6";
const INK = "#1b1a1f";

const vec = (lat: number, lon: number): [number, number, number] => [
  Math.cos(lat * D) * Math.sin(lon * D),
  Math.sin(lat * D),
  Math.cos(lat * D) * Math.cos(lon * D),
];

const HUBS: [number, number][] = [
  [43.7, -79.4],
  [12.1, -86.2],
  [4.7, -74.1],
  [10.5, -66.9],
  [-16.5, -68.1],
  [-25.3, -57.6],
  [33.6, -7.6],
  [-26.2, 28],
  [31.5, 74.3],
  [28.6, 77.2],
  [14.6, 121],
];

function sunVec(date: Date) {
  const day = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 0)) / 864e5;
  const decl = -23.44 * Math.cos((2 * Math.PI * (day + 10)) / 365) * D;
  const lon = -15 * (date.getUTCHours() + date.getUTCMinutes() / 60 - 12) * D;
  return [Math.cos(decl) * Math.sin(lon), Math.sin(decl), Math.cos(decl) * Math.cos(lon)] as const;
}

export function HowGlobe({ spinning }: { spinning: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef(spinning);
  live.current = spinning;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    let stop = false;
    let visible = true;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(([e]) => {
      visible = e?.isIntersecting ?? true;
    });
    io.observe(canvas);

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
      const sun = sunVec(new Date());
      const lit = new Float32Array(n);
      for (let i = 0; i < n; i++) lit[i] = P[i * 3]! * sun[0] + P[i * 3 + 1]! * sun[1] + P[i * 3 + 2]! * sun[2];

      const graticule: (readonly [number, number, number])[][] = [];
      for (let lo = -180; lo < 180; lo += 20) {
        const line = [];
        for (let la = -80; la <= 80; la += 4) line.push(vec(la, lo));
        graticule.push(line);
      }
      for (let la = -60; la <= 75; la += 15) {
        const line = [];
        for (let lo = -180; lo <= 180; lo += 4) line.push(vec(la, lo));
        graticule.push(line);
      }

      canvas.width = W;
      canvas.height = H;

      let lon0 = -62;
      let last = performance.now();
      let speed = 0;

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!visible) return;
        const wanted = live.current && !reduced ? 3.2 : 0;
        speed += (wanted - speed) * Math.min(1, dt * 1.8);
        lon0 += speed * dt;

        // On the site: 1178x679 canvas at (131, 659), R = 0.4 of the width, centre 6% down + R, tilt -6°.
        const R = 471;
        const cx = 720;
        const cy = 1171;
        const tilt = -6 * D;
        const ct = Math.cos(tilt);
        const st = Math.sin(tilt);
        const cl = Math.cos(-lon0 * D);
        const sl = Math.sin(-lon0 * D);
        const view = (x: number, y: number, z: number) => {
          const x1 = x * cl + z * sl;
          const z1 = -x * sl + z * cl;
          return [x1, y * ct - z1 * st, y * st + z1 * ct] as const;
        };
        const project = (lat: number, lo: number) => {
          const [x, y, z] = vec(lat, lo);
          const [a, b, c] = view(x, y, z);
          return { x: cx + a * R, y: cy - b * R, front: c > 0.15 };
        };

        ctx.clearRect(0, 0, W, H);

        ctx.lineWidth = 1;
        ctx.strokeStyle = INK;
        ctx.globalAlpha = 0.16;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.08;
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

        // Land in six alpha steps per colour: 12 fills a frame instead of thousands.
        const base = Math.max(1.6, R / 135);
        for (const day of [false, true]) {
          ctx.fillStyle = day ? ACCENT : INK;
          const paths = Array.from({ length: 6 }, () => new Path2D());
          for (let i = 0; i < n; i++) {
            if (lit[i]! > 0.02 !== day) continue;
            const v = view(P[i * 3]!, P[i * 3 + 1]!, P[i * 3 + 2]!);
            if (v[2] <= 0.02) continue;
            const sx = cx + R * v[0];
            const sy = cy - R * v[1];
            if (sy > H + 2 || sy < -2) continue;
            const r = (base * (0.5 + 0.5 * v[2])) / 2;
            const b = Math.min(5, (v[2] * 6) | 0);
            paths[b]!.moveTo(sx + r, sy);
            paths[b]!.arc(sx, sy, r, 0, 6.283);
          }
          paths.forEach((path, b) => {
            ctx.globalAlpha = (day ? 0.92 : 0.3) * (0.4 + 0.6 * ((b + 0.5) / 6));
            ctx.fill(path);
          });
        }
        ctx.globalAlpha = 1;

        ctx.fillStyle = ACCENT;
        for (const [lat, lo] of HUBS) {
          const p = project(lat, lo);
          if (p.front) ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
        }
      };
      raf = requestAnimationFrame(frame);
    });

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return <canvas ref={ref} width={W} height={H} className="absolute inset-0 size-full" aria-hidden="true" />;
}
