import { useEffect, useRef, useState } from "react";

import { useFrame, useWaitFor } from "../lib/stage";
import { at, ease, mix, seg } from "../lib/time";

/* Bar 4: SportMagaz, a store and its own admin CMS that Dan built alone. The storefront's
 * product-photo morph (a view transition, filmed from the live site for the case study) plays
 * frame by frame in a browser window, the admin's product table and lobby fan out behind it, and
 * the numbers land on the beats. Figures from ~/growth/me/experience.md. */

const MORPH = Object.values(
  import.meta.glob<string>("../assets/morph/*.jpg", { eager: true, query: "?url", import: "default" }),
).sort();

const IN = at(3) - 0.1;
const OUT = at(4);
const CHIPS = [
  { at: at(3, 1), value: "2,000+", text: "products in the admin" },
  { at: at(3, 2), value: "65", text: "merged PRs" },
  { at: at(3, 2.5), value: "12", text: "shared packages" },
];

/** For the soundtrack (audio.ts). */
export const SPORTMAGAZ_CUES = { chips: CHIPS.map((c) => c.at), fan: at(3, 0.3) };

export function Sportmagaz() {
  const root = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const stack = useRef<(HTMLDivElement | null)[]>([]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pill = useRef<HTMLDivElement>(null);
  const frames = useRef<ImageBitmap[]>([]);
  const drawn = useRef(-1);
  const [decoded, setDecoded] = useState(false);
  useWaitFor("morph", decoded);

  // Every frame of the clip decoded up front, so drawing one is instant and exact.
  useEffect(() => {
    void Promise.all(MORPH.map((src) => fetch(src).then((r) => r.blob()).then((b) => createImageBitmap(b)))).then(
      (bitmaps) => {
        frames.current = bitmaps;
        drawn.current = -1;
        setDecoded(true);
      },
    );
  }, []);

  useFrame((t) => {
    root.current!.style.visibility = t >= IN && t < OUT + 0.02 ? "visible" : "hidden";

    // In on the whip: from the right, smeared along x.
    const w = ease.outExpo(seg(t, IN, IN + 0.42));
    root.current!.style.transform = `translateX(${(1 - w) * 900}px)`;
    root.current!.style.filter = w < 1 && w > 0 ? "url(#whip-in)" : "none";
    if (t >= IN && t < IN + 0.45)
      document.getElementById("whip-in-blur")?.setAttribute("stdDeviation", `${((1 - w) * 40).toFixed(1)} 0`);

    const tp = ease.outExpo(seg(t, IN + 0.08, IN + 0.6));
    title.current!.style.opacity = String(tp);
    title.current!.style.transform = `translateY(${mix(18, 0, tp)}px)`;

    chips.current.forEach((el, i) => {
      if (!el) return;
      const p = ease.outExpo(seg(t, CHIPS[i]!.at, CHIPS[i]!.at + 0.4));
      el.style.opacity = String(seg(t, CHIPS[i]!.at, CHIPS[i]!.at + 0.06));
      el.style.transform = `translateX(${mix(-30, 0, p)}px) scale(${mix(1.15, 1, p)})`;
    });

    // The windows start stacked and fan out, then keep drifting apart a little.
    const fan = ease.outExpo(seg(t, at(3, 0.3), at(3, 1.6)));
    const drift = seg(t, at(3), OUT);
    const spots = [
      { x: -170, y: -150, z: -260, r: -6 },
      { x: -95, y: -70, z: -130, r: -3 },
      { x: 0, y: 0, z: 0, r: 0 },
    ];
    stack.current.forEach((el, i) => {
      if (!el) return;
      const s = spots[i]!;
      const k = fan + drift * 0.18;
      el.style.transform = `translate3d(${s.x * k}px, ${s.y * k}px, ${s.z * k}px) rotateZ(${s.r * k}deg)`;
    });

    // The clip: 2 s of the (2.5x slowed) recording over 1.5 s.
    const bitmaps = frames.current;
    if (bitmaps.length) {
      const i = Math.min(bitmaps.length - 1, Math.floor(seg(t, at(3, 0.55), at(3, 3.8)) * bitmaps.length));
      if (i !== drawn.current) {
        const c = canvas.current!;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bitmaps[i]!, 0, 0, c.width, c.height);
        drawn.current = i;
      }
    }
    const pp = ease.outBack(seg(t, at(3, 1.5), at(3, 1.9)), 2.5);
    pill.current!.style.transform = `scale(${pp})`;
  });

  return (
    <div ref={root} className="layer" style={{ visibility: "hidden" }}>
      <div ref={title} className="abs" style={{ left: 92, top: 108 }}>
        <div style={{ fontSize: 58, fontWeight: 1000, letterSpacing: "-0.04em", lineHeight: 1 }}>sportmagaz.com.ua</div>
        <div style={{ marginTop: 14, fontSize: 21, fontWeight: 650, color: "var(--muted)" }}>
          A store and its own admin CMS, built solo
        </div>
      </div>

      {CHIPS.map((c, i) => (
        <div
          key={c.value}
          ref={(e) => void (chips.current[i] = e)}
          className="chip"
          style={{ left: 92, top: 268 + i * 62, opacity: 0, transformOrigin: "left center" }}
        >
          <i style={{ background: "var(--sport)" }} />
          <b className="num">{c.value}</b>
          <span style={{ color: "var(--muted)", fontWeight: 600 }}>{c.text}</span>
        </div>
      ))}

      <div className="layer" style={{ perspective: 1600, perspectiveOrigin: "80% 40%" }}>
        <div
          className="abs"
          style={{ left: 600, top: 236, width: 600, height: 380, transformStyle: "preserve-3d", transform: "rotateY(-14deg) rotateX(5deg)" }}
        >
          {[
            { src: "/images/p/sportmagaz/cms-lobby.webp", host: "cms.sportmagaz.com.ua" },
            { src: "/images/p/sportmagaz/cms-products.webp", host: "cms.sportmagaz.com.ua" },
          ].map((w, i) => (
            <div
              key={i}
              ref={(e) => void (stack.current[i] = e)}
              className="browser"
              style={{ left: 0, top: 0, width: 600, filter: `brightness(${0.72 + i * 0.14})` }}
            >
              <header>
                <span />
                <span />
                <span />
                <em>{w.host}</em>
              </header>
              <img src={w.src} alt="" style={{ display: "block", width: 600 }} />
            </div>
          ))}
          <div ref={(e) => void (stack.current[2] = e)} className="browser" style={{ left: 0, top: 0, width: 600 }}>
            <header>
              <span />
              <span />
              <span />
              <em>sportmagaz.com.ua</em>
            </header>
            <canvas ref={canvas} width={922} height={536} style={{ display: "block", width: 600, height: 349, background: "#fff" }} />
            <div
              ref={pill}
              className="abs mono"
              style={{
                left: 14,
                bottom: 14,
                padding: "6px 11px",
                borderRadius: 999,
                background: "#161616",
                color: "var(--sport)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.04em",
                transformOrigin: "left center",
                boxShadow: "0 8px 20px -8px rgb(0 0 0 / 0.6)",
              }}
            >
              view transition
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
