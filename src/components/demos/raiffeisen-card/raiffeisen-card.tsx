import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { IconLock, IconSnowflake } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { FrostLayer } from "./frost-layer";

/* A debit card in the Raiffeisen palette (#fbf315 yellow, the brand's own), built as one
 * component: pointer tilt with a glare that follows the finger, a flip to the back, a "frozen"
 * state where the face turns to frosted glass (a shader, see frost-layer.tsx), a spending bar against the monthly limit, and a number
 * that decodes digit by digit when revealed.
 *
 * Reveal and freeze are each driven by one progress value that walks between 0 and 1, so a click
 * mid-way reverses the animation from where it stands instead of cutting it off.
 *
 * Everything else that moves is a transform or opacity, so it stays on the compositor.
 * Tilt is off for touch and for reduced motion; the flip then cross-fades instead of turning.
 * A frozen card frosts on both faces and keeps its details masked; what the freeze means is said
 * next to the card (CardMeta), not on it.
 * It's a design concept: no bank logo, and the numbers are demo data.
 */

export type CardVariant = "classic" | "premium" | "green" | "porcelain";

type Variant = {
  label: string;
  stops: [color: string, at: number][];
  ink: string;
  sub: string;
  line: string;
  bar: string;
};

export const VARIANTS: Record<CardVariant, Variant> = {
  classic: {
    label: "Classic",
    stops: [
      ["#fffb8f", 0],
      ["#fbf315", 0.42],
      ["#e2db13", 1],
    ],
    ink: "#161616",
    sub: "rgba(22,22,22,0.62)",
    line: "rgba(22,22,22,0.08)",
    bar: "#161616",
  },
  premium: {
    label: "Premium",
    stops: [
      ["#34332f", 0],
      ["#161614", 0.55],
      ["#070706", 1],
    ],
    ink: "#f1dfa6",
    sub: "rgba(241,223,166,0.62)",
    line: "rgba(241,223,166,0.09)",
    bar: "#f1dfa6",
  },
  green: {
    label: "Green",
    stops: [
      ["#16a64c", 0],
      ["#057a2f", 0.52],
      ["#03561f", 1],
    ],
    ink: "#ffffff",
    sub: "rgba(255,255,255,0.7)",
    line: "rgba(255,255,255,0.09)",
    bar: "#fbf315",
  },
  porcelain: {
    label: "Porcelain",
    stops: [
      ["#ffffff", 0],
      ["#eceef5", 0.58],
      ["#d9dce8", 1],
    ],
    ink: "#161616",
    sub: "rgba(22,22,22,0.55)",
    line: "rgba(22,22,22,0.06)",
    bar: "#e2db13",
  },
};

const background = (v: Variant) =>
  `linear-gradient(135deg, ${v.stops.map(([c, at]) => `${c} ${at * 100}%`).join(", ")})`;

// Demo data. The number deliberately fails the Luhn check, so it can't be a real card.
export const DEMO = {
  number: "4821 5903 2716 4822",
  name: "MAX MUSTERMANN",
  expiry: "09/29",
  cvc: "731",
};
// Card numbers keep their last four digits; short codes (the CVC) are hidden completely.
const masked = (n: string) =>
  n.length <= 4 ? "•".repeat(n.length) : n.replace(/\d(?=.{5})/g, "•");

const eur = (n: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/** A number that counts to its new value instead of jumping. */
function Counting({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  // Where the count stands now, so a new value mid-count (a scrub) carries on from there.
  const at = useRef(value);
  useEffect(() => {
    const controls = animate(at.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => ((at.current = v), setShown(Math.round(v))),
    });
    return () => controls.stop();
  }, [value]);
  return <span className="tabular-nums">{eur(shown)}</span>;
}

/** A value that walks to 1 while `on` and back to 0 when not. A change mid-way turns it around
 * from where it is, so the animation it drives reverses instead of restarting. `show` and `hide`
 * are the times for a full walk each way (hiding is quicker, as exits should be). */
type Walk = { show: number; hide: number; ease?: [number, number, number, number] | "linear" };

function useProgress(on: boolean, walk: Walk, instant: boolean) {
  const progress = useMotionValue(on ? 1 : 0);
  const { show, hide, ease = "linear" } = walk;
  useEffect(() => {
    const target = on ? 1 : 0;
    const distance = Math.abs(target - progress.get());
    if (instant || distance === 0) return progress.jump(target);
    const controls = animate(progress, target, { duration: (on ? show : hide) * distance, ease });
    return () => controls.stop();
  }, [on, instant, show, hide, ease, progress]);
  return progress;
}

// The reveal is a state change, not a show: under 300ms and easing out, so the first digits land
// at once and the last ones settle (Emil Kowalski's rules for UI motion). Hiding is quicker still.
const REVEAL: Walk = { show: 0.3, hide: 0.15, ease: [0.23, 1, 0.32, 1] };
const FREEZE: Walk = { show: 0.75, hide: 0.75 };

// Share of the progress each character spends scrambling; the starts are spread across the rest.
const SCRAMBLE = 0.3;
const scrambleDigit = (i: number, step: number) =>
  (Math.imul(i * 131 + step + 7, 2654435761) >>> 0) % 10;

/** The text at a point of the reveal: masked characters flip left to right as `p` rises (right
 * to left as it falls), each passing through a few scrambled digits. The scramble depends only
 * on `p`, so reversing retraces the same digits. */
function decodeAt(text: string, p: number) {
  const hidden = masked(text);
  const changing = [...text].flatMap((ch, i) => (ch !== hidden[i] ? [i] : []));
  const out = [...hidden];
  changing.forEach((i, k) => {
    const start = changing.length > 1 ? (k / (changing.length - 1)) * (1 - SCRAMBLE) : 0;
    const local = (p - start) / SCRAMBLE;
    if (local >= 1) out[i] = text[i];
    else if (local > 0) out[i] = String(scrambleDigit(i, Math.floor(local * 3)));
  });
  return out.join("");
}

/** Each character sits in its own 1ch cell: "•" isn't a digit, and the font it falls back to can
 * be wider or taller, so without cells the line would shift as dots turn into digits. `gap`
 * stands in for letter-spacing, which would spill out of the cells. */
function Decoding({
  text,
  progress,
  gap,
  fade,
}: {
  text: string;
  progress: MotionValue<number>;
  gap: string;
  /** Reduced motion: no scramble, the new text just fades in. */
  fade?: boolean;
}) {
  const [out, setOut] = useState(() => decodeAt(text, progress.get()));
  useEffect(() => setOut(decodeAt(text, progress.get())), [text, progress]);
  useMotionValueEvent(progress, "change", (p) => setOut(decodeAt(text, p)));
  return (
    <motion.span
      key={fade ? out : undefined}
      className="inline-flex align-top"
      style={{ gap }}
      initial={fade ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      {[...out].map((ch, i) => (
        <span
          key={i}
          className="inline-block h-[1em] w-[1ch] overflow-hidden text-center leading-none"
        >
          {ch}
        </span>
      ))}
    </motion.span>
  );
}

function Chip() {
  return (
    <svg viewBox="0 0 48 36" className="w-[13cqw]" aria-hidden>
      <defs>
        <linearGradient id="rc-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e3a1" />
          <stop offset="0.5" stopColor="#c9a24a" />
          <stop offset="1" stopColor="#f0d98c" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="46"
        height="34"
        rx="7"
        fill="url(#rc-chip)"
        stroke="rgba(0,0,0,0.25)"
      />
      <path
        d="M1 12h13M1 24h13M34 12h13M34 24h13M14 1v34M34 1v34M14 18h20"
        stroke="rgba(0,0,0,0.3)"
        fill="none"
      />
    </svg>
  );
}

function Contactless({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-[6.5cqw]"
      aria-hidden
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M8.5 7.5a6 6 0 0 1 0 9" />
      <path d="M12 5a9.5 9.5 0 0 1 0 14" />
      <path d="M15.5 2.5a13 13 0 0 1 0 19" />
    </svg>
  );
}

// Rows of shallow gables: a nod to the pitched-roof shapes in Raiffeisen's identity, not their logo.
function Gables({ color }: { color: string }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 320 202"
      preserveAspectRatio="none"
      aria-hidden
    >
      {Array.from({ length: 7 }, (_, i) => (
        <path
          key={i}
          d={`M-20 ${70 + i * 30} L160 ${20 + i * 30} L340 ${70 + i * 30}`}
          stroke={color}
          strokeWidth="2.5"
          fill="none"
        />
      ))}
    </svg>
  );
}

export function RaiffeisenCard({
  variant = "classic",
  tilt = true,
  flipped = false,
  onFlip,
  frozen = false,
  revealed = false,
  active = true,
  spent = 842,
  limit = 1200,
  className,
}: {
  variant?: CardVariant;
  tilt?: boolean;
  flipped?: boolean;
  onFlip?: () => void;
  frozen?: boolean;
  revealed?: boolean;
  /** False for a card that isn't the focus (a carousel neighbour): no tilt, never flipped or
   * revealed, and a light frost that holds no WebGL context. */
  active?: boolean;
  spent?: number;
  limit?: number;
  className?: string;
}) {
  const v = VARIANTS[variant];
  const reduced = useReducedMotion();
  const [finePointer, setFinePointer] = useState(false);
  useEffect(
    () => setFinePointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches),
    [],
  );
  const tiltOn = active && tilt && finePointer && !reduced;
  const turned = active && flipped;
  // A frozen card never shows its details: freezing re-masks them before the frost closes over.
  const reveal = useProgress(active && revealed && !frozen, REVEAL, !!reduced);
  const freeze = useProgress(frozen, FREEZE, !!reduced);
  const lockOpacity = useTransform(freeze, [0.55, 0.9], [0, 1]);
  const lockScale = useTransform(freeze, [0.55, 0.9], [0.85, 1]);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  // Pointer position in the card, 0..1, smoothed by springs.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 220, damping: 22 });
  const sy = useSpring(py, { stiffness: 220, damping: 22 });
  const rotateY = useTransform(sx, [0, 1], [-12, 12]);
  const rotateX = useTransform(sy, [0, 1], [10, -10]);
  const glareX = useTransform(sx, (x) => `${x * 100}%`);
  const glareY = useTransform(sy, (y) => `${y * 100}%`);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)`;
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 25 });

  const onMove = (e: React.PointerEvent) => {
    if (!tiltOn) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    glareOpacity.set(0);
  };

  const ratio = Math.min(1, spent / Math.max(1, limit));
  const face = "absolute inset-0 overflow-hidden rounded-[4.5%/7%] [backface-visibility:hidden]";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[380px] [container-type:inline-size] [perspective:1100px]",
        className,
      )}
    >
      <motion.button
        type="button"
        onClick={onFlip}
        onPointerMove={onMove}
        onPointerEnter={() => tiltOn && glareOpacity.set(1)}
        onPointerLeave={onLeave}
        aria-label={turned ? "Show the front of the card" : "Show the back of the card"}
        aria-pressed={turned}
        tabIndex={active ? undefined : -1}
        className="relative block aspect-[1.586] w-full cursor-pointer rounded-[4.5%/7%] outline-none focus-visible:ring-2 focus-visible:ring-[#fbf315] focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        style={{
          rotateX: tiltOn ? rotateX : 0,
          rotateY: tiltOn ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
      >
        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d]"
          animate={reduced ? undefined : { rotateY: turned ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 160, damping: 20 }}
        >
          {/* Front */}
          <motion.div
            ref={frontRef}
            className={cn(face, "shadow-[0_24px_50px_-18px_rgba(0,0,0,0.55)]")}
            animate={reduced ? { opacity: turned ? 0 : 1 } : undefined}
          >
            {(Object.keys(VARIANTS) as CardVariant[]).map((key) => (
              <motion.div
                key={key}
                className="absolute inset-0"
                style={{ background: background(VARIANTS[key]) }}
                initial={false}
                animate={{ opacity: key === variant ? 1 : 0 }}
                transition={{ duration: 0.45 }}
              />
            ))}
            <Gables color={v.line} />
            <motion.div
              className="absolute inset-0 text-left"
              initial={false}
              animate={{ color: v.ink }}
              transition={{ duration: 0.45 }}
            >
              <div className="absolute inset-x-[6.5cqw] top-[6cqw] flex items-start justify-between">
                <span className="text-[5.2cqw] font-extrabold leading-none tracking-tight">
                  Raiffeisen
                </span>
                <span
                  className="text-[3cqw] font-semibold uppercase leading-none tracking-[0.18em]"
                  style={{ color: v.sub }}
                >
                  Debit
                </span>
              </div>
              <div className="absolute left-[6.5cqw] top-[22cqw] flex items-center gap-[3cqw]">
                <Chip />
                <Contactless color={v.sub} />
              </div>
              <div className="absolute inset-x-[6.5cqw] top-[37cqw] font-mono text-[5.6cqw] leading-none">
                <Decoding text={DEMO.number} progress={reveal} gap="0.1em" fade={!!reduced} />
              </div>
              <div className="absolute inset-x-[6.5cqw] bottom-[7.5cqw] flex items-end justify-between text-[3.2cqw] font-semibold leading-none tracking-[0.12em]">
                <span>{DEMO.name}</span>
                <span className="text-right">
                  <span
                    className="mb-[1cqw] block text-[2.3cqw] font-medium tracking-[0.14em]"
                    style={{ color: v.sub }}
                  >
                    GÜLTIG BIS
                  </span>
                  {DEMO.expiry}
                </span>
              </div>
            </motion.div>

            {/* Spending against the monthly limit, along the bottom edge. */}
            <div
              className="absolute inset-x-[6.5cqw] bottom-[3.5cqw] h-[1.1cqw] overflow-hidden rounded-full"
              style={{ background: v.line }}
            >
              <motion.div
                className="h-full origin-left rounded-full"
                style={{ background: v.bar }}
                initial={false}
                animate={{ scaleX: ratio }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>

            <motion.div
              data-frost-skip
              className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{ background: glare, opacity: glareOpacity }}
            />

            {/* Frozen: the face turns to frosted glass from the middle out. */}
            <FrostLayer
              progress={freeze}
              faceRef={frontRef}
              stops={v.stops}
              version={`${variant}:${revealed && !frozen}:${ratio}`}
              webgl={active}
            />
          </motion.div>

          {/* Back */}
          <motion.div
            ref={backRef}
            className={cn(
              face,
              !reduced && "[transform:rotateY(180deg)]",
              "shadow-[0_24px_50px_-18px_rgba(0,0,0,0.55)]",
            )}
            animate={reduced ? { opacity: turned ? 1 : 0 } : undefined}
            style={{ background: background(v) }}
          >
            <Gables color={v.line} />
            <div className="absolute inset-x-0 top-[11%] h-[18%] bg-[#111]" />
            <div className="absolute inset-x-[6.5%] top-[40%] flex items-center gap-[4%]">
              <div className="h-[2.1em] flex-1 rounded-[3px] bg-[repeating-linear-gradient(135deg,#f4f4f4_0_6px,#e6e6e6_6px_12px)]" />
              <div className="relative rounded-[3px] bg-white px-[2cqw] py-[1cqw] font-mono text-[3.8cqw] leading-none text-[#161616]">
                <Decoding text={DEMO.cvc} progress={reveal} gap="0.2em" fade={!!reduced} />
                {/* Frozen: a quiet lock on the one field the freeze protects, above the frost. */}
                <motion.span
                  data-frost-skip
                  className="absolute inset-0 z-10 flex items-center justify-center text-[#1d3b5c]"
                  style={{ opacity: lockOpacity, scale: lockScale }}
                  aria-hidden
                >
                  <IconSnowflake className="size-[1.2em]" />
                </motion.span>
              </div>
            </div>
            {/* Above the frost, so the note stays readable on a frozen card. */}
            <p
              data-frost-skip
              className="absolute inset-x-[6.5cqw] bottom-[6cqw] z-10 text-left text-[2.7cqw] leading-snug"
              style={{ color: v.sub }}
            >
              <IconLock className="mr-1 inline size-[1.1em] align-[-0.15em]" aria-hidden />
              Design concept by Dan Olekh. Not a real card, and not affiliated with Raiffeisen.
            </p>

            <FrostLayer
              progress={freeze}
              faceRef={backRef}
              stops={v.stops}
              version={`${variant}:back`}
              webgl={active}
            />
          </motion.div>
        </motion.div>
      </motion.button>
    </div>
  );
}

/** The line under the card: spending against the limit, and the card's state. The state lives
 * here and not on the card, where the frost already shows it. The two labels share one grid
 * cell, so swapping them never moves anything. */
export function CardMeta({
  spent,
  limit,
  frozen,
  className,
}: {
  spent: number;
  limit: number;
  frozen: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[380px] items-baseline justify-between gap-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="grid" aria-live="polite">
        <motion.span
          className="[grid-area:1/1]"
          initial={false}
          animate={{ opacity: frozen ? 0 : 1, y: frozen ? -4 : 0 }}
          aria-hidden={frozen}
        >
          This month
        </motion.span>
        <motion.span
          className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-sky-700 [grid-area:1/1] dark:text-sky-300"
          initial={false}
          animate={{ opacity: frozen ? 1 : 0, y: frozen ? 0 : 4 }}
          aria-hidden={!frozen}
        >
          <IconSnowflake className="size-[1.05em]" aria-hidden />
          Karte gesperrt<span className="hidden sm:inline"> · Zahlungen pausiert</span>
        </motion.span>
      </span>
      <span className="whitespace-nowrap">
        <Counting value={spent} /> of <Counting value={limit} />
      </span>
    </div>
  );
}
