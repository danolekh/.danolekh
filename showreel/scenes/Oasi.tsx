import { useRef } from "react";

import oasiDesktop from "../assets/oasi-desktop.webp";
import oasiPhone from "../assets/oasi-phone.webp";
import { frameOf, useFrame } from "../lib/stage";
import { at, ease, hash, keys, mix, pulse, seg } from "../lib/time";

/* Bars 2 and 3: Oasi Kadir, the anchor proof. The new build (nuovo.oasikadir.it) swings in on a
 * desktop and a phone while a Lighthouse gauge counts the mobile score to 69, glitches, and climbs
 * to 99 in Lighthouse's own colours. Then the load time, the 5.0 review and the client's words.
 * Numbers from ~/growth/case-studies/oasi-kadir.md; the quote is verbatim. */

const R = 118;
const C = 2 * Math.PI * R;
const RING = { x: 330, y: 352 };

const rating = (score: number) => (score >= 90 ? "#3fce3f" : score >= 50 ? "#fab219" : "#e46a6a");

const T = {
  in: at(1),
  first: at(1, 1),
  glitch: at(1, 1.5),
  climb: at(1, 2),
  top: at(1, 3),
  out: at(2) - 0.16,
  proof: at(2),
  strike: at(2, 0.5),
  after: at(2, 1),
  stars: at(2, 1.5),
  quote: at(2, 2),
  end: at(3) - 0.1,
};

const QUOTE = "He treated the project like it was his own.".split(" ");
const STARS = Array.from({ length: 5 }, (_, i) => T.stars + i * (0.46875 / 4));

/** The mobile score on the gauge at time `t`. */
export const scoreAt = (t: number) =>
  keys(t, [
    [T.in, 0],
    [T.first, 69, ease.outCubic],
    [T.climb, 69],
    [T.top, 99, ease.inOutQuart],
  ]);
/** For the soundtrack (audio.ts). */
export const OASI_CUES = { ...T, starTimes: STARS };

export function Oasi() {
  const speed = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const arc = useRef<SVGCircleElement>(null);
  const score = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const bloom = useRef<HTMLDivElement>(null);
  const sparks = useRef<SVGGElement>(null);
  const caption = useRef<HTMLDivElement>(null);
  const devices = useRef<HTMLDivElement>(null);
  const browser = useRef<HTMLDivElement>(null);
  const phone = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLImageElement>(null);

  const proof = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLSpanElement>(null);
  const strike = useRef<HTMLSpanElement>(null);
  const arrow = useRef<HTMLSpanElement>(null);
  const after = useRef<HTMLSpanElement>(null);
  const stars = useRef<(HTMLSpanElement | null)[]>([]);
  const five = useRef<HTMLSpanElement>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const cite = useRef<HTMLDivElement>(null);

  useFrame((t) => {
    // ——— The gauge ———
    speed.current!.style.visibility = t >= T.in - 0.01 && t < T.proof + 0.1 ? "visible" : "hidden";
    const value = scoreAt(t);
    const shown = Math.round(value);
    const colour = rating(shown);
    arc.current!.style.strokeDashoffset = String(C * (1 - value / 100));
    arc.current!.style.stroke = colour;
    score.current!.textContent = String(shown);
    score.current!.style.color = colour;
    tag.current!.textContent = t >= T.top ? "after" : t >= T.first ? "before" : "mobile";
    tag.current!.style.color = t >= T.top ? "#3fce3f" : "var(--muted)";

    // The glitch at 69: channels split, the ring jumps a few pixels, three frames at a time.
    const g = t >= T.glitch && t < T.glitch + 0.1;
    const f = frameOf(t);
    const jx = g ? (hash(f) - 0.5) * 16 : 0;
    score.current!.style.textShadow = g ? `${-4 + jx / 4}px 0 #ff2a55, ${4 - jx / 4}px 0 #22d3ee` : "none";

    const enter = ease.outExpo(seg(t, T.in, T.in + 0.55));
    const exit = ease.inExpo(seg(t, T.out, T.proof + 0.06));
    ring.current!.style.transform = `translate(${mix(-140, 0, enter) - exit * 260 + jx}px, 0) scale(${mix(0.7, 1, enter) * (1 - exit * 0.3)})`;
    ring.current!.style.opacity = String(seg(t, T.in, T.in + 0.12) * (1 - exit));
    caption.current!.style.opacity = String(seg(t, T.in + 0.15, T.in + 0.4) * (1 - exit));
    caption.current!.style.transform = `translateY(${mix(14, 0, ease.outExpo(seg(t, T.in + 0.15, T.in + 0.6)))}px)`;

    const b = pulse(t, T.top, 0.7);
    bloom.current!.style.opacity = String(b * 0.95);
    bloom.current!.style.transform = `translate(-50%, -50%) scale(${mix(1.7, 0.6, b)})`;
    const s = seg(t, T.top, T.top + 0.45);
    sparks.current!.style.opacity = String(s > 0 && s < 1 ? 1 - s : 0);
    sparks.current!.style.transform = `scale(${mix(0.9, 1.35, ease.outExpo(s))})`;

    // ——— The build, on a desktop and a phone ———
    const d = ease.outExpo(seg(t, T.in, T.in + 0.6));
    const dp = ease.outExpo(seg(t, T.in + 0.07, T.in + 0.7));
    const dx = ease.inExpo(seg(t, T.out - 0.05, T.proof + 0.08));
    browser.current!.style.transform = `translateX(${mix(420, 0, d) + dx * 700}px) rotateY(${mix(-42, -14, d)}deg) rotateX(4deg)`;
    browser.current!.style.opacity = String(seg(t, T.in, T.in + 0.1));
    phone.current!.style.transform = `translateX(${mix(560, 0, dp) + dx * 820}px) translateZ(60px) rotateY(${mix(-50, -20, dp)}deg) rotateX(3deg)`;
    phone.current!.style.opacity = String(seg(t, T.in + 0.07, T.in + 0.17));
    devices.current!.style.filter = dx > 0 ? `blur(${dx * 14}px)` : "none";
    scroll.current!.style.transform = `translateY(${-keys(t, [
      [T.in + 0.3, 0],
      [T.out, 430, ease.inOutCubic],
    ])}px)`;

    // ——— The proof ———
    proof.current!.style.visibility = t >= T.proof - 0.02 && t < at(3) + 0.12 ? "visible" : "hidden";
    const l = ease.outExpo(seg(t, T.proof, T.proof + 0.4));
    label.current!.style.opacity = String(l);
    label.current!.style.transform = `translateY(${mix(10, 0, l)}px)`;
    const slam = ease.outExpo(seg(t, T.proof, T.proof + 0.35));
    before.current!.style.opacity = String(seg(t, T.proof, T.proof + 0.05) * mix(1, 0.42, seg(t, T.strike, T.strike + 0.2)));
    before.current!.style.transform = `scale(${mix(1.45, 1, slam)})`;
    before.current!.style.filter = slam < 1 ? `blur(${mix(12, 0, slam)}px)` : "none";
    strike.current!.style.transform = `scaleX(${ease.outExpo(seg(t, T.strike, T.strike + 0.25))})`;
    const a = ease.outExpo(seg(t, T.after, T.after + 0.4));
    arrow.current!.style.opacity = String(seg(t, T.after, T.after + 0.08));
    arrow.current!.style.transform = `translateX(${mix(-40, 0, a)}px)`;
    after.current!.style.opacity = String(seg(t, T.after + 0.03, T.after + 0.1));
    after.current!.style.transform = `translateX(${mix(-70, 0, a)}px)`;
    after.current!.style.filter = a < 1 ? `blur(${mix(10, 0, a)}px)` : "none";

    stars.current.forEach((el, i) => {
      if (!el) return;
      const s0 = STARS[i]!;
      const p = seg(t, s0, s0 + 0.3);
      el.style.opacity = String(seg(t, s0, s0 + 0.04));
      el.style.transform = `scale(${ease.outBack(p, 3)}) rotate(${mix(-40, 0, ease.outExpo(p))}deg)`;
    });
    const fp = ease.outExpo(seg(t, T.stars + 0.47, T.stars + 0.8));
    five.current!.style.opacity = String(fp);
    five.current!.style.transform = `translateX(${mix(-16, 0, fp)}px)`;
    words.current.forEach((el, i) => {
      if (!el) return;
      const w0 = T.quote + i * 0.034;
      const p = ease.outExpo(seg(t, w0, w0 + 0.45));
      el.style.opacity = String(p);
      el.style.transform = `translateY(${mix(22, 0, p)}px)`;
      el.style.filter = p < 1 ? `blur(${mix(8, 0, p)}px)` : "none";
    });
    cite.current!.style.opacity = String(seg(t, T.quote + 0.35, T.quote + 0.6));

    // Out with the whip: everything slides left and smears.
    const whip = ease.inExpo(seg(t, T.end - 0.12, at(3) + 0.06));
    proof.current!.style.transform = `translateX(${-whip * 900}px)`;
    proof.current!.style.filter = whip > 0 ? `url(#whip-out)` : "none";
    document.getElementById("whip-out-blur")?.setAttribute("stdDeviation", `${(whip * 40).toFixed(1)} 0`);
  });

  return (
    <div className="layer">
      {/* Bar 2 */}
      <div ref={speed} className="layer" style={{ visibility: "hidden" }}>
        <div ref={devices} className="layer" style={{ perspective: 1400, perspectiveOrigin: "70% 50%" }}>
          <div
            ref={browser}
            className="browser"
            style={{ left: 600, top: 142, width: 600, transformStyle: "preserve-3d", opacity: 0 }}
          >
            <header>
              <span />
              <span />
              <span />
              <em>nuovo.oasikadir.it</em>
            </header>
            <img src={oasiDesktop} style={{ display: "block", width: 600 }} alt="" />
          </div>
          <div ref={phone} className="phone" style={{ left: 1030, top: 240, width: 190, height: 400, opacity: 0 }}>
            <div>
              <img ref={scroll} src={oasiPhone} alt="" />
            </div>
          </div>
        </div>

        <div
          ref={bloom}
          className="abs"
          style={{
            left: RING.x,
            top: RING.y,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgb(63 206 63 / 0.55), rgb(63 206 63 / 0.12) 45%, transparent 70%)",
            opacity: 0,
          }}
        />
        <div ref={ring} className="abs" style={{ left: RING.x - 150, top: RING.y - 150, width: 300, height: 300 }}>
          <svg width="300" height="300" viewBox="0 0 300 300" style={{ position: "absolute", overflow: "visible" }}>
            <circle cx="150" cy="150" r={R} fill="rgb(255 255 255 / 0.03)" stroke="rgb(255 255 255 / 0.09)" strokeWidth="12" />
            <circle
              ref={arc}
              cx="150"
              cy="150"
              r={R}
              fill="none"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C}
              transform="rotate(-90 150 150)"
            />
            <g ref={sparks} style={{ transformOrigin: "150px 150px", opacity: 0 }}>
              {Array.from({ length: 14 }, (_, i) => {
                const a = (i / 14) * Math.PI * 2;
                return (
                  <line
                    key={i}
                    x1={150 + Math.cos(a) * 140}
                    y1={150 + Math.sin(a) * 140}
                    x2={150 + Math.cos(a) * (158 + (i % 2) * 10)}
                    y2={150 + Math.sin(a) * (158 + (i % 2) * 10)}
                    stroke="#3fce3f"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          </svg>
          <div
            ref={score}
            className="abs num"
            style={{ inset: 0, display: "grid", placeItems: "center", fontSize: 104, fontWeight: 900, letterSpacing: "-0.04em", paddingBottom: 14 }}
          />
          <div
            ref={tag}
            className="abs label"
            style={{ left: 0, right: 0, top: 196, textAlign: "center", fontSize: 13, letterSpacing: "0.3em" }}
          />
        </div>
        <div ref={caption} className="abs" style={{ left: RING.x - 200, width: 400, top: 128, textAlign: "center" }}>
          <div className="label" style={{ color: "var(--ink)" }}>
            Mobile PageSpeed
          </div>
          <div style={{ position: "absolute", top: 400, left: 0, right: 0, fontSize: 21, fontWeight: 800 }}>
            Oasi Kadir <span style={{ color: "var(--dim)" }}>·</span>{" "}
            <span style={{ color: "var(--muted)", fontWeight: 600 }}>Astro + Strapi</span>
          </div>
        </div>
      </div>

      {/* Bar 3 */}
      <div ref={proof} className="layer" style={{ visibility: "hidden" }}>
        <div ref={label} className="abs label" style={{ left: 92, top: 132, color: "var(--ink)" }}>
          Load time on mobile
        </div>
        <div
          className="abs"
          style={{ left: 86, top: 160, display: "flex", alignItems: "baseline", gap: 30, fontSize: 132, fontWeight: 1000, letterSpacing: "-0.045em", lineHeight: 1.05, whiteSpace: "nowrap" }}
        >
          <span ref={before} className="num" style={{ position: "relative", display: "inline-block", transformOrigin: "left center" }}>
            16 s
            <span
              ref={strike}
              className="abs"
              style={{ left: -8, right: -8, top: "50%", height: 9, marginTop: -2, borderRadius: 5, background: "#e46a6a", transformOrigin: "left", transform: "scaleX(0)" }}
            />
          </span>
          <span ref={arrow} style={{ display: "inline-block", color: "var(--dim)", fontWeight: 600, fontSize: 96 }}>
            →
          </span>
          <span ref={after} className="num" style={{ display: "inline-block", color: "#3fce3f" }}>
            under 2 s
          </span>
        </div>

        <div className="abs" style={{ left: 92, top: 368, display: "flex", alignItems: "center", gap: 6 }}>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              ref={(e) => void (stars.current[i] = e)}
              style={{ display: "inline-block", fontSize: 38, lineHeight: 1, color: "#fab219", opacity: 0, textShadow: "0 0 18px rgb(250 178 25 / 0.5)" }}
            >
              ★
            </span>
          ))}
          <span ref={five} style={{ marginLeft: 14, fontSize: 30, fontWeight: 900, opacity: 0 }}>
            5.0 <span style={{ fontWeight: 600, color: "var(--muted)", fontSize: 22 }}>client review</span>
          </span>
        </div>
        <div
          className="abs"
          style={{ left: 90, top: 430, width: 1000, fontSize: 46, fontWeight: 700, fontStyle: "italic", letterSpacing: "-0.02em", lineHeight: 1.15 }}
        >
          {QUOTE.map((w, i) => (
            <span key={i} ref={(e) => void (words.current[i] = e)} style={{ display: "inline-block", marginRight: "0.26em", opacity: 0 }}>
              {i === 0 ? "“" : ""}
              {w}
              {i === QUOTE.length - 1 ? "”" : ""}
            </span>
          ))}
        </div>
        <div ref={cite} className="abs label" style={{ left: 92, top: 510, opacity: 0 }}>
          Oasi Kadir · Upwork review
        </div>
      </div>
    </div>
  );
}
