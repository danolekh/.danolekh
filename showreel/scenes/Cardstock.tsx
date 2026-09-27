import { shaderBackground } from "@danolekh/cardstock";
import { useRef, useState } from "react";

import { PaymentCard } from "@/components/payment-card";
import { useFrame, useWaitFor } from "../lib/stage";
import { at, ease, mix, seg } from "../lib/time";

/* Bar 6: cardstock, Dan's open-source card library on npm. The globe gives way to a live
 * cardstock card with a holo-foil shader: the recorder's pointer tilts it and the glare follows,
 * it turns over and back, while the install line types in and the numbers land. Figures from
 * ~/growth/me/experience.md; the version is the one on npm (0.5.1). */

const IN = at(5) - 0.08;
const OUT = at(6);
/** Where the card sits (its centre, for the recorder's pointer) and how big: 380px is the most the
 * registry card grows to, so it's scaled up from there. */
export const CARD = { x: 900, y: 372, width: 380, scale: 1.16 };
const INSTALL = "npm i @danolekh/cardstock";

const HOLO = shaderBackground("holo-foil", { color: "#1b1f2e", tone: "dark", ink: "#f6f3ff", params: { base: "#141a2b", intensity: 1, bands: 3 } });

const CHIPS = [
  { at: at(5, 1), value: "8", text: "shaders, one WebGL context" },
  { at: at(5, 1.5), value: "194", text: "tests" },
  { at: at(5, 2), value: "#558", text: "merged into opentui" },
];
const TYPE: [number, number] = [at(5, 0.15), at(5, 0.8)];
const INSTALLED = at(5, 0.85);
/** Over, then back in time to be the right way up as it leaves (a turn takes about 0.8 s). */
const FLIPS: [number, number] = [at(5, 1.25), at(5, 2.6)];
/** For the soundtrack (audio.ts). */
export const CARDSTOCK_CUES = {
  keys: Array.from({ length: INSTALL.length }, (_, i) => TYPE[0] + ((i + 0.5) / INSTALL.length) * (TYPE[1] - TYPE[0])),
  installed: INSTALLED,
  chips: CHIPS.map((c) => c.at),
  flips: FLIPS,
};

export function Cardstock() {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLDivElement | null)[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [shaderReady, setShaderReady] = useState(false);
  useWaitFor("card", shaderReady);

  useFrame((t) => {
    if (!shaderReady) {
      const c = card.current!.querySelector("[data-slot=card-shader]");
      if (c && (c.hasAttribute("data-ready") || c.hasAttribute("data-failed"))) setShaderReady(true);
    }
    const on = t >= IN - 0.02 && t < OUT;
    // The card stays laid out (its shader keeps its context); off its bar it's only transparent.
    root.current!.style.opacity = on ? "1" : "0";

    // Turned over on the third beat, and back just before it goes.
    const want = t >= FLIPS[0] && t < FLIPS[1];
    if (want !== flipped) setFlipped(want);

    const e = ease.outExpo(seg(t, IN, IN + 0.6));
    // Gone by the downbeat, so bar 7 opens on a clean frame.
    const leave = ease.inCubic(seg(t, OUT - 0.3, OUT - 0.02));
    card.current!.style.transform = `translate(-50%, -50%) perspective(1200px) translateY(${mix(70, 0, e)}px) rotateY(${mix(70, 0, e)}deg) rotateZ(${mix(-10, 0, e) + leave * 8}deg) translateX(${leave * 160}px) scale(${mix(0.45, 1, e) * mix(1, 0.55, leave) * CARD.scale})`;
    card.current!.style.opacity = String(seg(t, IN, IN + 0.1) * (1 - leave));

    const tp = ease.outExpo(seg(t, IN + 0.1, IN + 0.6));
    title.current!.style.opacity = String(tp * (1 - leave));
    title.current!.style.transform = `translateY(${mix(18, 0, tp) - leave * 40}px)`;
    const n = Math.ceil(seg(t, ...TYPE) * INSTALL.length);
    typed.current!.textContent = INSTALL.slice(0, n);
    caret.current!.style.opacity = n < INSTALL.length || Math.floor(t / 0.117) % 2 === 0 ? "1" : "0";
    result.current!.style.opacity = String(seg(t, INSTALLED, INSTALLED + 0.1));

    chips.current.forEach((el, i) => {
      if (!el) return;
      const p = ease.outExpo(seg(t, CHIPS[i]!.at, CHIPS[i]!.at + 0.4));
      el.style.opacity = String(seg(t, CHIPS[i]!.at, CHIPS[i]!.at + 0.06) * (1 - leave));
      el.style.transform = `translateX(${mix(-30, 0, p)}px) scale(${mix(1.15, 1, p)})`;
    });
  });

  return (
    <div ref={root} className="layer" style={{ opacity: 0 }}>
      <div ref={title} className="abs" style={{ left: 92, top: 108 }}>
        <div style={{ fontSize: 58, fontWeight: 1000, letterSpacing: "-0.04em", lineHeight: 1 }}>cardstock</div>
        <div style={{ marginTop: 14, fontSize: 21, fontWeight: 650, color: "var(--muted)" }}>
          Open-source bank-card UI for React
        </div>
        <div
          className="mono"
          style={{
            marginTop: 22,
            padding: "12px 16px",
            width: 420,
            borderRadius: 12,
            background: "rgb(0 0 0 / 0.45)",
            border: "1px solid rgb(255 255 255 / 0.1)",
            fontSize: 16,
            lineHeight: 1.7,
          }}
        >
          <div style={{ whiteSpace: "pre" }}>
            <span style={{ color: "var(--dim)" }}>$ </span>
            <span ref={typed} />
            <span
              ref={caret}
              style={{ display: "inline-block", width: "0.55em", height: "1.1em", verticalAlign: "-0.2em", background: "var(--cardstock)" }}
            />
          </div>
          <div ref={result} style={{ color: "#3fce3f", opacity: 0 }}>
            + @danolekh/cardstock@0.5.1
          </div>
        </div>
      </div>
      {CHIPS.map((c, i) => (
        <div
          key={c.value}
          ref={(e) => void (chips.current[i] = e)}
          className="chip"
          style={{ left: 92, top: 356 + i * 62, opacity: 0, transformOrigin: "left center" }}
        >
          <i style={{ background: "var(--cardstock)" }} />
          <b className="num">{c.value}</b>
          <span style={{ color: "var(--muted)", fontWeight: 600 }}>{c.text}</span>
        </div>
      ))}

      <div
        ref={card}
        className="abs"
        style={{ left: CARD.x, top: CARD.y, width: CARD.width, pointerEvents: "auto", opacity: 0 }}
      >
        <PaymentCard
          number="4821 5903 2716 4822"
          holder="Dan Olekh"
          expiry="09/29"
          securityCode="731"
          background={HOLO}
          spent={842}
          limit={1200}
          flipped={flipped}
          onFlippedChange={setFlipped}
        />
      </div>
    </div>
  );
}
