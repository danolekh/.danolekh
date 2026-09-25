import { useRef, useState } from "react";
import { motion } from "motion/react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/* A number you change by dragging across it, the way design tools scrub a value: every few
 * pixels is one step, Shift makes the steps five times bigger. It is the control itself, a
 * role="slider" with the usual keys, so there's no separate track: a thin rail appears under it
 * while you scrub, to show where the value sits in its range. */

const PX_PER_STEP = 6;

export function ScrubNumber({
  value,
  onChange,
  min,
  max,
  step,
  format,
  label,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  label: string;
  className?: string;
}) {
  const [scrubbing, setScrubbing] = useState(false);
  const start = useRef({ x: 0, value });
  const clamp = (v: number) => Math.max(min, Math.min(max, Math.round(v / step) * step));
  const set = (v: number) => {
    const next = clamp(v);
    if (next !== value) onChange(next);
  };

  const end = (e: React.PointerEvent) => {
    if (!scrubbing) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.style.removeProperty("cursor");
    setScrubbing(false);
  };

  return (
    <span className={cn("relative inline-flex flex-col items-end", className)}>
      <motion.span
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        className="group inline-flex cursor-ew-resize touch-none select-none items-center gap-0.5 rounded-md px-1 text-sm font-medium tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-[#fbf315]"
        animate={{ scale: scrubbing ? 1.06 : 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          start.current = { x: e.clientX, value };
          document.body.style.cursor = "ew-resize";
          setScrubbing(true);
        }}
        onPointerMove={(e) => {
          if (!scrubbing) return;
          const steps = Math.round((e.clientX - start.current.x) / PX_PER_STEP);
          set(start.current.value + steps * step * (e.shiftKey ? 5 : 1));
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={(e) => {
          const big = step * 5;
          const moves: Record<string, number> = {
            ArrowLeft: -(e.shiftKey ? big : step),
            ArrowDown: -(e.shiftKey ? big : step),
            ArrowRight: e.shiftKey ? big : step,
            ArrowUp: e.shiftKey ? big : step,
            PageDown: -big,
            PageUp: big,
          };
          if (e.key in moves) set(value + moves[e.key]);
          else if (e.key === "Home") set(min);
          else if (e.key === "End") set(max);
          else return;
          e.preventDefault();
        }}
      >
        <IconChevronLeft
          className={cn(
            "size-3.5 opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-50",
            scrubbing && "opacity-70",
          )}
          aria-hidden
        />
        <span className="inline-block min-w-[7ch] text-right underline decoration-muted-foreground/60 decoration-dotted underline-offset-4">
          {format(value)}
        </span>
        <IconChevronRight
          className={cn(
            "size-3.5 opacity-0 transition-opacity group-hover:opacity-50 group-focus-visible:opacity-50",
            scrubbing && "opacity-70",
          )}
          aria-hidden
        />
      </motion.span>
      {/* Where the value sits in its range, only while scrubbing. */}
      <motion.span
        className="absolute -bottom-2 right-1 left-1 h-0.5 overflow-hidden rounded-full bg-muted"
        initial={false}
        animate={{ opacity: scrubbing ? 1 : 0 }}
        aria-hidden
      >
        <motion.span
          className="block h-full origin-left rounded-full bg-[#fbf315]"
          initial={false}
          animate={{ scaleX: (value - min) / (max - min) }}
          transition={{ type: "spring", stiffness: 500, damping: 40 }}
        />
      </motion.span>
    </span>
  );
}
