import { AnimatePresence, motion, useMotionValueEvent, useTransform, type MotionValue } from "motion/react";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { HowGlobe } from "./how-globe";

// One stage for the three steps, in a fixed 720x560 space, scaled to fit. The page inside it is the
// EmpireOneCX prototype with its real measurements (a 1440x1024 board), one and the same element in the
// design tool and on the live site. Nothing plays by itself: the whole story is one timeline tied to the
// scrollbar, so it reads the same at any scrolling speed, in both directions.

const STAGE_W = 720;
const STAGE_H = 560;
const BAR_H = 48;
const BOARD_W = 1440;
const BOARD_H = 1024;
const SOFT = { type: "spring", duration: 0.5, bounce: 0 } as const;
const BLUE = "#3b82f6";
const ACCENT = "#a52dd6";

export type Step = 0 | 1 | 2;

/** Where each step's part of the scroll ends, as a share of the whole section. */
export const STEP_ENDS = [0.4, 0.76, 1] as const;

// The film, as shares of the same scroll. Each moment plays, then holds so it can be read.
const TALK: [number, number] = [0, 0.26];
const HANDOVER: [number, number] = [0.35, 0.45];
const WORK: [number, number] = [0.45, 0.72];
const BUILD: [number, number] = [0.78, 0.92];

// The open call, in stage pixels.
const CARD_W = 420;
const CARD_H = 212;
const CARD_X = (STAGE_W - CARD_W) / 2;
const CARD_Y = (STAGE_H - CARD_H) / 2;

// Tool layout, in stage pixels.
const TABS_H = 38;
const LEFT_W = 112;
const RAIL_W = 32;
const RIGHT_W = 124;

type Cam = { x: number; y: number; s: number };
const TOOL: Cam = { x: 154, y: 145, s: 0.3 };
const FULL: Cam = { x: 0, y: BAR_H, s: 0.5 };
const toStage = (x: number, y: number): [number, number] => [TOOL.x + x * TOOL.s, TOOL.y + y * TOOL.s];

const LINE_1 = "Powered by AI.";
const LINE_2 = "Perfected by humans.";
const COMMENT = "Love the globe.";

// ------------------------------------------------------------------ the design step

const PIN = toStage(1090, 720);
// Where the cursor's tip lands on the gradient swatch in the Fill panel.
const SWATCH: [number, number] = [STAGE_W - RIGHT_W + 51, 242];
const CURSOR_START: [number, number] = [STAGE_W - 60, STAGE_H - 50];
const OFFSTAGE: [number, number] = [STAGE_W + 40, 90];
// In board pixels, measured from the text it selects.
const SEL_PAD_X = 28;
const SEL_PAD_Y = 6;
const SEL_HEAD2 = [218, 290, 1008, 120] as const;

// ------------------------------------------------------------------ small parts

function Cursor({ x, y, opacity, name, color }: { x: MotionValue<number>; y: MotionValue<number>; opacity: MotionValue<number>; name: string; color: string }) {
  return (
    <motion.div className="pointer-events-none absolute top-0 left-0 z-40" style={{ x, y, opacity }}>
      <svg viewBox="0 0 24 24" width="20" height="20">
        <path d="M5 3l14 8.5-6.2 1.6L9.6 19z" fill={color} stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      <span className="absolute top-4 left-4 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-white" style={{ background: color }}>
        {name}
      </span>
    </motion.div>
  );
}

function Tick({ className = "size-3.5", color = "currentColor", drawn }: { className?: string; color?: string; drawn?: MotionValue<number> }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <motion.path d="M3 8.5l3.2 3.2L13 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={drawn ? { pathLength: drawn } : undefined} />
    </svg>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-1 rounded bg-neutral-100 px-1.5 py-1 text-[10px] tabular-nums">
      <span className="text-neutral-400">{label}</span>
      <span className="truncate text-neutral-700">{value}</span>
    </div>
  );
}

const SITE_FONT: CSSProperties = { fontFamily: '"Inter Tight Variable", sans-serif' };
const GRADIENT: CSSProperties = {
  backgroundImage: "linear-gradient(90deg, rgb(122,118,255) 0%, rgb(203,70,250) 50%, rgb(254,136,28) 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

// ------------------------------------------------------------------ the call

const NOTES = ["How the business runs", "What's slowing it down", "What to build first"];

function Note({ text, index, talk }: { text: string; index: number; talk: MotionValue<number> }) {
  const from = 0.34 + index * 0.2;
  const opacity = useTransform(talk, [from, from + 0.14], [0, 1]);
  const y = useTransform(talk, [from, from + 0.14], [8, 0]);
  const drawn = useTransform(talk, [from + 0.04, from + 0.2], [0, 1]);
  return (
    <motion.li className="flex h-5 items-center gap-2" style={{ opacity, y }}>
      <Tick drawn={drawn} />
      {text}
    </motion.li>
  );
}

/** The call: a small pill that opens up as you scroll. Then the window grows out from behind it. */
function Call({ talk, h }: { talk: MotionValue<number>; h: MotionValue<number> }) {
  const width = useTransform(talk, [0, 0.3], [290, CARD_W]);
  const height = useTransform(talk, [0, 0.3], [56, CARD_H]);
  const borderRadius = useTransform(talk, [0, 0.3], [28, 24]);
  const row = useTransform(talk, [0, 0.3], [266, 396]);
  // The card's content hands over to the window as it opens.
  const opacity = useTransform(h, [0.05, 0.4], [1, 0]);

  return (
    <motion.div
      className="absolute z-30 overflow-hidden bg-white text-neutral-900 shadow-[0_24px_60px_rgba(0,0,0,0.2)]"
      style={{ left: STAGE_W / 2, top: STAGE_H / 2, x: "-50%", y: "-50%", width, height, borderRadius, opacity }}
    >
      <div className="absolute top-0 left-0 w-[420px] p-3">
        <motion.div className="flex items-center gap-3" style={{ width: row }}>
          <img src="/images/me.jpeg" alt="" className="size-8 rounded-full object-cover" />
          <div className="leading-tight">
            <p className="text-sm font-semibold whitespace-nowrap">Call with Dan</p>
            <p className="text-xs whitespace-nowrap text-neutral-500">About your business</p>
          </div>
          <div className="ml-auto flex h-5 items-center gap-0.5 pr-2" aria-hidden="true">
            {[0.5, 1, 0.7, 0.9, 0.4].map((bar, i) => (
              <span key={i} className="w-0.5 rounded-full bg-neutral-900" style={{ height: 16 * bar }} />
            ))}
          </div>
        </motion.div>
        <ul className="mt-4 grid gap-2.5 border-t border-neutral-200 px-1 pt-4 text-sm text-neutral-700" style={{ width: 396 }}>
          {NOTES.map((note, i) => (
            <Note key={note} text={note} index={i} talk={talk} />
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

// ------------------------------------------------------------------ the tool around the page

function Tool({ see, progress }: { see: MotionValue<number>; progress: MotionValue<number> }) {
  // The tool makes way for the page in the first half of the scroll.
  const [selected, setSelected] = useState(false);
  useMotionValueEvent(see, "change", (v) => setSelected(v > 0.04 && v < 0.5));
  const swatchRing = useTransform(see, [0.23, 0.26], [`0 0 0 0px ${BLUE}`, `0 0 0 2px ${BLUE}`]);
  const tabsY = useTransform(progress, [0, 0.55], [0, -TABS_H]);
  const leftX = useTransform(progress, [0, 0.55], [0, -(LEFT_W + RAIL_W)]);
  const rightX = useTransform(progress, [0, 0.55], [0, RIGHT_W]);
  const sel = selected ? SEL_HEAD2 : null;
  const layers = ["Nav", "Eyebrow", "Headline", "Subhead", "Buttons", "Frame", "Globe"];
  return (
    <div className="absolute top-0 left-0 overflow-hidden" style={{ width: STAGE_W, height: STAGE_H }}>
      <div className="absolute inset-0 bg-[#f4f4f3]" />
      <motion.div className="absolute inset-x-0 top-0 flex items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-3 text-[11px]" style={{ height: TABS_H, y: tabsY }}>
        <span className="mr-2 flex gap-1" aria-hidden="true">
          <span className="size-2 rounded-full bg-neutral-300" />
          <span className="size-2 rounded-full bg-neutral-300" />
          <span className="size-2 rounded-full bg-neutral-300" />
        </span>
        <span className="rounded bg-white px-2 py-1 font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">EmpireOneCX</span>
        <span className="ml-auto text-neutral-400">Paper</span>
      </motion.div>
      <motion.div className="absolute bottom-0 left-0 border-r border-neutral-200 bg-neutral-50 p-3 text-[11px]" style={{ top: TABS_H, width: LEFT_W, x: leftX }}>
        <p className="mb-2 font-medium text-neutral-500">Layers</p>
        <ul className="grid gap-1.5 text-neutral-700">
          {layers.map((name) => (
            <li key={name} className="truncate">
              {name}
            </li>
          ))}
        </ul>
        <p className="absolute top-[250px] left-3 font-medium text-neutral-500">Components</p>
        <div className="absolute top-[272px] left-3 flex w-22 items-center gap-1.5 rounded bg-white px-1.5 py-1.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
          <span className="size-3.5 rounded-full border border-dotted" style={{ borderColor: ACCENT }} />
          Globe
        </div>
      </motion.div>
      <motion.div className="absolute bottom-0 flex flex-col items-center gap-2 border-r border-neutral-200 bg-white pt-3 text-neutral-500" style={{ top: TABS_H, left: LEFT_W, width: RAIL_W, x: leftX }}>
        <span className="flex size-6 items-center justify-center rounded text-white" style={{ background: BLUE }}>
          <svg viewBox="0 0 24 24" className="size-3.5">
            <path d="M5 3l14 8.5-6.2 1.6L9.6 19z" fill="currentColor" />
          </svg>
        </span>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="1.5" />
        </svg>
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M5 6V4h14v2M12 4v16M9 20h6" />
        </svg>
      </motion.div>
      <motion.div className="absolute right-0 bottom-0 grid content-start gap-2 border-l border-neutral-200 bg-neutral-50 p-3 text-[11px]" style={{ top: TABS_H, width: RIGHT_W, x: rightX }}>
        <p className="font-medium text-neutral-500">Layout</p>
        <div className="grid grid-cols-2 gap-1">
          <Field label="X" value={sel ? sel[0] : "-"} />
          <Field label="Y" value={sel ? sel[1] : "-"} />
          <Field label="W" value={sel ? sel[2] : "-"} />
          <Field label="H" value={sel ? sel[3] : "-"} />
        </div>
        <p className="mt-2 font-medium text-neutral-500">Type</p>
        <Field label="Aa" value="Inter Tight 104" />
        <p className="mt-2 font-medium text-neutral-500">Fill</p>
        <div className="mt-1 flex gap-1.5">
          <span className="size-6 rounded bg-neutral-900" />
          <motion.span className="size-6 rounded" style={{ background: "linear-gradient(90deg,rgb(122,118,255),rgb(203,70,250),rgb(254,136,28))", boxShadow: swatchRing }} />
        </div>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------ the page's layers

function Sheet({ clip, children }: { clip?: boolean; children: ReactNode }) {
  return <div className={`pointer-events-none absolute inset-0 ${clip ? "overflow-hidden" : ""}`}>{children}</div>;
}

function Handle({ style }: { style: CSSProperties }) {
  return <span className="absolute size-5 bg-white" style={{ ...style, boxShadow: `0 0 0 5px ${BLUE}` }} />;
}

function Page({ see, spinning, progress }: { see: MotionValue<number>; spinning: boolean; progress: MotionValue<number> }) {
  const gradient = useTransform(see, [0.25, 0.36], [0, 1]);
  const selection = useTransform(see, [0.02, 0.06, 0.46, 0.5], [0, 1, 1, 0]);
  const x = useTransform(progress, [0, 1], [TOOL.x, FULL.x]);
  const y = useTransform(progress, [0, 1], [TOOL.y, FULL.y]);
  const scale = useTransform(progress, [0, 1], [TOOL.s, FULL.s]);

  return (
    <div className="absolute inset-0">
      <motion.div className="absolute top-0 left-0" style={{ width: BOARD_W, height: BOARD_H, x, y, scale, originX: 0, originY: 0 }}>
      <Sheet clip>
        <div className="absolute inset-0 bg-[#eeedeb]" />
      </Sheet>
      <Sheet>
        <div className="absolute" style={{ ...SITE_FONT, left: 130, top: 658, width: 1180, height: 366, borderTop: "1px solid #cfccc7", borderLeft: "1px solid #cfccc7", borderRight: "1px solid #cfccc7", background: "rgba(255,255,255,0.22)" }}>
          <span className="absolute -top-1 -left-1 size-2 border border-neutral-400 bg-[#eeedeb]" />
          <span className="absolute -top-1 -right-1 size-2 border border-neutral-400 bg-[#eeedeb]" />
          <p className="absolute top-4 left-5 flex items-center gap-2 text-[13.5px] text-[#5d5b63]">
            <span className="rounded border border-[#cfccc7] bg-white px-2 py-0.5 text-[11px] tracking-[0.08em] text-[#1b1a1f] uppercase">Live</span>
            12:18 PM in Toronto
          </p>
          <p className="absolute top-4 right-5 flex gap-3.5 text-[13px] text-[#5d5b63]">
            <span>Day shift</span>
            <span>Night shift</span>
          </p>
        </div>
      </Sheet>
      <Sheet clip>
        <HowGlobe spinning={spinning} />
      </Sheet>
      <Sheet>
        <div className="absolute flex items-center rounded-full bg-white pr-2 pl-6 shadow-[0_2px_4px_rgba(0,0,0,0.05),0_12px_30px_rgba(0,0,0,0.07)]" style={{ ...SITE_FONT, left: 130, top: 14, width: 1180, height: 64 }}>
          <img src="/work/empire-logo.png" alt="" style={{ height: 28, width: 134, objectFit: "contain" }} />
          <span className="ml-auto flex items-center gap-[30px] text-base text-[#5d5b63]">
            <span>Solutions</span>
            <span>Pricing</span>
            <span>Case studies</span>
            <span>Careers</span>
            <span className="ml-[8px] rounded-full bg-[#1b1a1f] px-5 py-3 font-medium text-white">Book a call</span>
          </span>
        </div>
      </Sheet>
      <Sheet>
        <p className="absolute inset-x-0 flex items-center justify-center gap-2 text-sm font-medium text-[#5d5b63]" style={{ ...SITE_FONT, top: 150 }}>
          <span className="h-0.5 w-[18px] rounded-full" style={{ background: "linear-gradient(90deg,#7a76ff,#cb46fa)" }} />
          AI-Assisted Customer Experience & BPO Solutions
        </p>
      </Sheet>
      <Sheet>
        <div className="absolute inset-x-0 text-center text-[104px] leading-[102px] font-medium tracking-[-5.2px] text-[#1b1a1f]" style={{ ...SITE_FONT, top: 194 }}>
          <p style={{ height: 102 }}>{LINE_1}</p>
          <p style={{ height: 102 }}>
            <span className="relative inline-block">
              {LINE_2}
              {/* A little wider than the line: the tight tracking would clip the full stop. */}
              <motion.span className="absolute top-0 -right-3 -bottom-3 left-0 pr-3 text-left whitespace-nowrap" style={{ ...GRADIENT, opacity: gradient }}>
                {LINE_2}
              </motion.span>
              {/* The selection hangs off the text itself, with room for its handles. */}
              <motion.span className="absolute" style={{ top: -SEL_PAD_Y, bottom: -SEL_PAD_Y - 6, left: -SEL_PAD_X, right: -SEL_PAD_X - 3, boxShadow: `0 0 0 5px ${BLUE}`, opacity: selection }}>
                <Handle style={{ top: -10, left: -10 }} />
                <Handle style={{ top: -10, right: -10 }} />
                <Handle style={{ bottom: -10, left: -10 }} />
                <Handle style={{ bottom: -10, right: -10 }} />
              </motion.span>
            </span>
          </p>
        </div>
      </Sheet>
      <Sheet>
        <p className="absolute text-center text-[22px] leading-[30.8px] text-[#5d5b63]" style={{ ...SITE_FONT, left: 478, top: 422, width: 483 }}>
          Secure, scalable CX and BPO teams across 11 countries, so your customers get an answer at any hour.
        </p>
      </Sheet>
      <Sheet>
        <div className="absolute flex gap-2.5 text-base font-medium" style={{ ...SITE_FONT, left: 522, top: 548 }}>
          <span className="flex h-[54px] items-center rounded-full bg-[#1b1a1f] px-[26px] text-white">Book a 30 minute call</span>
          <span className="flex h-[54px] items-center rounded-full bg-white px-[26px] text-[#1b1a1f]">Estimate your team</span>
        </div>
      </Sheet>
      </motion.div>

    </div>
  );
}

function BrowserBar({ onDomain, progress }: { onDomain: boolean; progress: MotionValue<number> }) {
  const url = onDomain ? "yourbusiness.com" : "staging.yourbusiness.com";
  const y = useTransform(progress, [0.3, 0.8], [-BAR_H, 0]);
  const opacity = useTransform(progress, [0.3, 0.6], [0, 1]);
  return (
    <motion.div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 border-b border-neutral-200 bg-white px-4" style={{ height: BAR_H, y, opacity }}>
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="size-2.5 rounded-full bg-neutral-300" />
        <span className="size-2.5 rounded-full bg-neutral-300" />
      </span>
      <span className="ml-3 flex h-7 min-w-56 items-center gap-1.5 overflow-hidden rounded-full bg-neutral-100 px-3 text-xs text-neutral-700">
        {onDomain && <Tick className="size-3 shrink-0" color="#16a34a" />}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={url} initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }} transition={SOFT}>
            {url}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.div>
  );
}

function People({ see, progress }: { see: MotionValue<number>; progress: MotionValue<number> }) {
  // Dan goes to the swatch.
  const danX = useTransform(see, [0.04, 0.24], [CURSOR_START[0], SWATCH[0]]);
  const danY = useTransform(see, [0.04, 0.24], [CURSOR_START[1], SWATCH[1]]);
  // The client comes in from outside the window and leaves a comment.
  const guestX = useTransform(see, [0.5, 0.66], [OFFSTAGE[0], PIN[0]]);
  const guestY = useTransform(see, [0.5, 0.66], [OFFSTAGE[1], PIN[1]]);
  const visible = useTransform(progress, [0, 0.12], [1, 0]);
  const composerOpacity = useTransform(see, [0.66, 0.71], [0, 1]);
  const composerScale = useTransform(see, [0.66, 0.73], [0.7, 1]);
  const both = useTransform([composerOpacity, visible], ([a, b]) => (a as number) * (b as number));
  const comment = useTransform(see, [0.71, 0.86], [0, COMMENT.length], { clamp: true });
  const typed = useTransform(comment, (n) => COMMENT.slice(0, Math.round(n)));
  const send = useTransform(see, [0.86, 0.88, 0.92, 0.95], ["#d4d4d4", BLUE, BLUE, "#16a34a"]);
  const arrow = useTransform(see, [0.92, 0.94], [1, 0]);
  const sent = useTransform(see, [0.92, 0.96], [0, 1]);
  return (
    <>
      <Cursor x={danX} y={danY} opacity={visible} name="Dan" color={BLUE} />
      <Cursor x={guestX} y={guestY} opacity={visible} name="You" color="#16a34a" />
      <motion.div
        className="pointer-events-none absolute z-30 flex min-w-30 items-center justify-between gap-2 bg-white py-1.5 pr-1.5 pl-3 text-xs font-medium text-neutral-900 shadow-[0_2px_6px_rgba(0,0,0,0.12),0_12px_28px_rgba(0,0,0,0.14)]"
        style={{ right: RIGHT_W + 12, top: PIN[1] + 30, borderRadius: 16, originX: 1, originY: 0, opacity: both, scale: composerScale }}
      >
        <motion.span className="whitespace-nowrap">{typed}</motion.span>
        <motion.span className="relative flex size-5 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: send }}>
          <motion.svg viewBox="0 0 16 16" className="absolute size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: arrow }}>
            <path d="M8 13V3M4 7l4-4 4 4" />
          </motion.svg>
          <Tick className="absolute size-3" drawn={sent} />
        </motion.span>
      </motion.div>
    </>
  );
}

// ------------------------------------------------------------------ the stage

export function HowStage({ scroll }: { scroll: MotionValue<number> }) {
  const [scale, setScale] = useState(0);
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / STAGE_W);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // One timeline; the second step opens with the handover from call to tool.
  const talk = useTransform(scroll, TALK, [0, 1]);
  const h = useTransform(scroll, HANDOVER, [0, 1]);
  const work = useTransform(scroll, WORK, [0, 1]);
  const progress = useTransform(scroll, BUILD, [0, 1]);

  // The window opens from the card's own size and corners, so the two read as one object changing shape.
  const shellLeft = useTransform(h, [0, 0.8], [CARD_X, 0]);
  const shellTop = useTransform(h, [0, 0.8], [CARD_Y, 0]);
  const shellWidth = useTransform(h, [0, 0.8], [CARD_W, STAGE_W]);
  const shellHeight = useTransform(h, [0, 0.8], [CARD_H, STAGE_H]);
  const shellRadius = useTransform(h, [0, 0.8], [24, 14]);
  const innerX = useTransform(shellLeft, (v) => -v);
  const innerY = useTransform(shellTop, (v) => -v);
  const shellOpacity = useTransform(h, [0, 0.01], [0, 1]);
  const contentOpacity = useTransform(h, [0.25, 0.75], [0, 1]);

  const [spinning, setSpinning] = useState(false);
  const [onDomain, setOnDomain] = useState(false);
  useMotionValueEvent(progress, "change", (p) => {
    // The page comes alive once it has landed in the browser.
    setSpinning(p > 0.9);
    setOnDomain(p > 0.97);
  });

  return (
    <div ref={frame} aria-hidden="true" className="relative w-full" style={{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }}>
      <div className="absolute top-0 left-0" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "0 0", visibility: scale ? "visible" : "hidden" }}>
        <motion.div
          className="absolute overflow-hidden bg-[#f4f4f3] text-neutral-900 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_60px_rgba(0,0,0,0.12)]"
          style={{ left: shellLeft, top: shellTop, width: shellWidth, height: shellHeight, borderRadius: shellRadius, opacity: shellOpacity }}
        >
          <motion.div className="absolute top-0 left-0" style={{ width: STAGE_W, height: STAGE_H, x: innerX, y: innerY, opacity: contentOpacity }}>
            <Tool see={work} progress={progress} />
            <Page see={work} spinning={spinning} progress={progress} />
            <BrowserBar onDomain={onDomain} progress={progress} />
            <People see={work} progress={progress} />
          </motion.div>
        </motion.div>
        <Call talk={talk} h={h} />
      </div>
    </div>
  );
}
