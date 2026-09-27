import { useRef } from "react";

import { useFrame } from "../lib/stage";
import { at, ease, mix, seg } from "../lib/time";

/* Bar 8: the closing card. The name has flown back from the corner (scenes/Name.tsx); around it the
 * photo, the title, the site and the city, and one line of proof. It holds from about 14.2 s, and
 * the poster is taken from here. */

const IN = at(7);
/** For the soundtrack (audio.ts). */
export const LOCKUP_CUES = { nameLands: at(7) + 0.34, photo: IN + 0.3, chips: [IN + 0.55, IN + 0.67] };

export function Lockup() {
  const root = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const proof = useRef<HTMLDivElement>(null);

  useFrame((t) => {
    root.current!.style.visibility = t >= IN ? "visible" : "hidden";
    const pp = seg(t, IN + 0.3, IN + 0.72);
    photo.current!.style.transform = `translateX(-50%) scale(${ease.outBack(pp, 2)})`;
    photo.current!.style.opacity = String(seg(t, IN + 0.3, IN + 0.38));
    photo.current!.style.filter = pp < 1 ? `blur(${mix(10, 0, ease.outExpo(pp))}px)` : "none";

    const tp = ease.outExpo(seg(t, IN + 0.4, IN + 0.85));
    title.current!.style.opacity = String(tp);
    title.current!.style.transform = `translateY(${mix(16, 0, tp)}px)`;
    title.current!.style.letterSpacing = `${mix(0.08, -0.01, tp)}em`;

    chips.current.forEach((el, i) => {
      if (!el) return;
      const s = IN + 0.55 + i * 0.12;
      const p = seg(t, s, s + 0.4);
      el.style.opacity = String(seg(t, s, s + 0.06));
      el.style.transform = `translateY(${mix(14, 0, ease.outExpo(p))}px) scale(${ease.outBack(p, 2)})`;
    });
    const rp = ease.outExpo(seg(t, IN + 0.85, IN + 1.3));
    proof.current!.style.opacity = String(rp);
    proof.current!.style.transform = `translateY(${mix(10, 0, rp)}px)`;
  });

  return (
    <div ref={root} className="layer" style={{ visibility: "hidden", zIndex: 44 }}>
      <div
        ref={photo}
        className="abs"
        style={{
          left: 640,
          top: 184,
          width: 112,
          height: 112,
          borderRadius: 28,
          overflow: "hidden",
          border: "1.5px solid rgb(255 255 255 / 0.2)",
          boxShadow: "0 20px 50px -18px rgb(59 130 246 / 0.6)",
          transformOrigin: "center bottom",
        }}
      >
        <img src="/images/me.jpeg" alt="" style={{ width: "100%", height: "100%", display: "block", objectFit: "cover" }} />
      </div>
      <div
        ref={title}
        className="abs"
        style={{ left: 0, right: 0, top: 424, textAlign: "center", fontSize: 28, fontWeight: 700, color: "var(--muted)" }}
      >
        Full-stack TypeScript engineer
      </div>
      <div className="abs" style={{ left: 0, right: 0, top: 484, display: "flex", justifyContent: "center", gap: 12 }}>
        <div
          ref={(e) => void (chips.current[0] = e)}
          className="chip"
          style={{ position: "relative", background: "var(--blue)", borderColor: "transparent", color: "#fff", padding: "10px 18px" }}
        >
          danolekh.com
        </div>
        <div ref={(e) => void (chips.current[1] = e)} className="chip" style={{ position: "relative", padding: "10px 18px" }}>
          Vienna, Austria
        </div>
      </div>
      <div
        ref={proof}
        className="abs label"
        style={{ left: 0, right: 0, top: 574, textAlign: "center", fontSize: 12, letterSpacing: "0.2em" }}
      >
        PageSpeed 69 → 99 · 5.0 client review · open source on npm
      </div>
    </div>
  );
}
