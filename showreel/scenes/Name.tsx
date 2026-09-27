import { useRef } from "react";

import { useFrame } from "../lib/stage";
import { at, ease, mix, seg, tween } from "../lib/time";

/* Bar 1, and the name's whole life: a caret types `danolekh`, and on the second beat the letters
 * burst into "Dan Olekh" (weight 200 to 1000, width 125 to 100), a line draws under it and the
 * subtitle rises. On the last beat the name flies into the frame's top-left corner and stays there
 * as the reel's signature; on the last bar it comes back to the centre as the closing card's name. */

const NAME = "Dan Olekh";
const TYPED = "danolekh";
const SIZE = 150;
const BURST = at(0, 1);
const DOCK: [number, number] = [at(0, 3), at(1) - 0.02];
const UNDOCK: [number, number] = [at(7) - 0.12, at(7) + 0.34];
const TYPE: [number, number] = [0.1, 0.38];
/** For the soundtrack (audio.ts). */
export const NAME_CUES = { typeFrom: TYPE[0], typeTo: TYPE[1], chars: TYPED.length, burst: BURST, dock: DOCK, undock: UNDOCK };
/** Where it rests: in the corner at 20px, and in the closing card at 96px. */
const CORNER = { x: 52, y: 37, scale: 20 / SIZE };
export const CLOSING = { y: 318, scale: 92 / SIZE };

export function Name() {
  const term = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const name = useRef<HTMLDivElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const rule = useRef<HTMLDivElement>(null);
  const sub = useRef<HTMLDivElement>(null);
  const words = useRef<(HTMLSpanElement | null)[]>([]);

  useFrame((t) => {
    // The caret blinks on 16ths, then types eight characters in a third of a second.
    const n = Math.ceil(seg(t, ...TYPE) * TYPED.length);
    typed.current!.textContent = TYPED.slice(0, n);
    const typing = t > TYPE[0] && t < TYPE[1] + 0.02;
    caret.current!.style.opacity = typing || Math.floor(t / 0.117) % 2 === 0 ? "1" : "0";
    const out = seg(t, BURST - 0.05, BURST);
    term.current!.style.opacity = String(1 - out);
    term.current!.style.transform = `translate(-50%, -50%) scale(${1 + out * 0.6})`;
    term.current!.style.filter = `blur(${out * 8}px)`;
    term.current!.style.visibility = t < BURST ? "visible" : "hidden";

    // The burst, letter by letter from the middle out.
    letters.current.forEach((el, i) => {
      if (!el) return;
      const delay = Math.abs(i - (NAME.length - 1) / 2) * 0.02;
      const p = seg(t, BURST + delay, BURST + delay + 0.42);
      const e = ease.outExpo(p);
      el.style.opacity = String(seg(t, BURST + delay, BURST + delay + 0.04));
      el.style.fontVariationSettings = `"wght" ${mix(200, 1000, e).toFixed(1)}, "wdth" ${mix(125, 100, e).toFixed(2)}`;
      el.style.transform = `translateY(${mix((i % 2 ? -1 : 1) * 46, 0, ease.outBack(p, 2.2)).toFixed(2)}px) scale(${mix(1.9, 1, e).toFixed(3)})`;
      el.style.filter = p < 1 ? `blur(${mix(16, 0, e).toFixed(2)}px)` : "none";
    });

    // Centred while it's the title, docked in the corner after, and back to the centre at the end.
    const el = name.current!;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const centre = { x: 640 - w / 2, y: 360 - h / 2 - 26, scale: 1 };
    const closing = { x: 640 - (w * CLOSING.scale) / 2, y: CLOSING.y, scale: CLOSING.scale };
    let pos = centre;
    if (t >= DOCK[0] && t < UNDOCK[0]) {
      const p = ease.inOutExpo(seg(t, ...DOCK));
      pos = lerp(centre, CORNER, p);
    } else if (t >= UNDOCK[0]) {
      pos = lerp(CORNER, closing, ease.inOutExpo(seg(t, ...UNDOCK)));
    }
    el.style.transform = `translate(${pos.x.toFixed(2)}px, ${pos.y.toFixed(2)}px) scale(${pos.scale.toFixed(4)})`;
    el.style.visibility = t >= BURST ? "visible" : "hidden";

    // The rule and the subtitle, gone before the name moves.
    const gone = seg(t, at(0, 2.7), at(0, 3.05));
    rule.current!.style.transform = `translateX(-50%) scaleX(${ease.outExpo(seg(t, at(0, 1.3), at(0, 2.1))) * (1 - gone)})`;
    words.current.forEach((w, i) => {
      if (!w) return;
      const s = at(0, 1.55) + i * 0.06;
      const p = ease.outExpo(seg(t, s, s + 0.4));
      w.style.opacity = String(p * (1 - gone));
      w.style.transform = `translateY(${mix(26, 0, p) - gone * 10}px)`;
      w.style.filter = p < 1 ? `blur(${mix(8, 0, p)}px)` : "none";
    });
    sub.current!.style.visibility = t < at(1) ? "visible" : "hidden";

    // A soft glow under the name on the closing card.
    el.style.textShadow =
      t > UNDOCK[0] ? `0 0 ${tween(t, UNDOCK[0], UNDOCK[1] + 0.4, 0, 40)}px rgb(59 130 246 / 0.45)` : "none";
  });

  return (
    <div className="layer" style={{ zIndex: 45 }}>
      <div
        ref={term}
        className="abs mono"
        style={{ left: 640, top: 360, fontSize: 38, fontWeight: 500, whiteSpace: "pre", transformOrigin: "center" }}
      >
        <span style={{ color: "var(--dim)" }}>$ </span>
        <span ref={typed} />
        <span
          ref={caret}
          style={{
            display: "inline-block",
            width: "0.55em",
            height: "1.05em",
            marginLeft: 2,
            verticalAlign: "-0.18em",
            background: "var(--blue)",
          }}
        />
      </div>

      <div
        ref={name}
        className="abs"
        style={{
          left: 0,
          top: 0,
          fontSize: SIZE,
          lineHeight: 1,
          fontWeight: 1000,
          letterSpacing: "-0.035em",
          whiteSpace: "pre",
          transformOrigin: "0 0",
          visibility: "hidden",
        }}
      >
        {[...NAME].map((c, i) => (
          <span
            key={i}
            ref={(e) => void (letters.current[i] = e)}
            style={{ display: "inline-block", transformOrigin: "50% 60%" }}
          >
            {c === " " ? " " : c}
          </span>
        ))}
      </div>

      <div ref={sub}>
        <div
          ref={rule}
          className="abs"
          style={{
            left: 640,
            top: 452,
            width: 460,
            height: 2,
            background: "linear-gradient(90deg, transparent, var(--blue), var(--periwinkle), transparent)",
            transform: "translateX(-50%) scaleX(0)",
          }}
        />
        <div
          className="abs"
          style={{
            left: 0,
            right: 0,
            top: 474,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            fontSize: 30,
            fontWeight: 600,
            color: "var(--muted)",
            letterSpacing: "-0.01em",
          }}
        >
          {["Software", "engineer", "·", "Vienna"].map((w, i) => (
            <span
              key={w}
              ref={(e) => void (words.current[i] = e)}
              style={{ display: "inline-block", opacity: 0, color: w === "·" ? "var(--dim)" : undefined }}
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function lerp(a: { x: number; y: number; scale: number }, b: { x: number; y: number; scale: number }, p: number) {
  return { x: mix(a.x, b.x, p), y: mix(a.y, b.y, p), scale: mix(a.scale, b.scale, p) };
}
