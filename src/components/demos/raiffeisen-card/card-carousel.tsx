import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "motion/react";

/* Swiping between cards, after the monobank app: the track follows the finger 1:1, rubber-bands
 * at the ends, and a release snaps to the nearest card on a spring that carries the finger's
 * speed, so a flick moves one card even when the drag was short. Neighbours stand turned away and
 * a little back, as if lying in space, and straighten as they come to the middle; everything is
 * derived from the one `x`, so a drag and a snap draw the same frames.
 *
 * monobank publishes none of its numbers; these are tuned by hand.
 *
 * It's an APG carousel: a region with arrow keys and slides labelled "n von N". Slides that aren't
 * current are hidden from assistive tech but stay clickable, so a tap on a neighbour brings it to
 * the middle; the card inside takes itself out of the Tab order (RaiffeisenCard `active`).
 */

const GAP = 20;
const TURN = 24; // deg a neighbour is turned away
const SHRINK = 0.1;
const SINK = 60; // px a neighbour sits back
const FLICK = 500; // px/s that counts as a flick
const SPRING = { type: "spring", stiffness: 320, damping: 34 } as const;

export function CardCarousel({
  index,
  onIndexChange,
  labels,
  progress,
  children,
}: {
  index: number;
  onIndexChange: (i: number) => void;
  /** One per slide, read out as "2 von 4: Premium". */
  labels: string[];
  /** Receives the fractional position (0 = first card), for anything that should follow the swipe. */
  progress?: MotionValue<number>;
  children: (i: number, active: boolean) => React.ReactNode;
}) {
  const count = labels.length;
  const reduced = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const step = width + GAP;
  const x = useMotionValue(0);
  const dragged = useRef(false);
  const indexRef = useRef(index);

  useLayoutEffect(() => {
    const el = viewport.current!;
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    setWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  // A new width puts the track straight on the current card.
  useLayoutEffect(() => {
    if (step > GAP) x.jump(-indexRef.current * step);
  }, [step, x]);

  // An index from outside (the tabs, the keys, a snap) glides there, carrying any fling speed.
  const velocity = useRef(0);
  useEffect(() => {
    indexRef.current = index;
    if (step <= GAP) return;
    const controls = animate(
      x,
      -index * step,
      reduced ? { duration: 0.2, ease: "easeOut" } : { ...SPRING, velocity: velocity.current },
    );
    velocity.current = 0;
    return () => controls.stop();
  }, [index, step, reduced, x]);

  useEffect(() => {
    if (!progress) return;
    const sync = (v: number) => progress.set(step > GAP ? -v / step : index);
    sync(x.get());
    return x.on("change", sync);
  }, [progress, step, x, index]);

  const onDragEnd = (_: unknown, { offset, velocity: v }: PanInfo) => {
    const projected = -(x.get() + v.x * 0.2) / step;
    let target = Math.round(projected);
    if (target === index && Math.abs(v.x) > FLICK && Math.abs(offset.x) > 4)
      target = index - Math.sign(v.x);
    target = Math.max(0, Math.min(count - 1, Math.max(index - 1, Math.min(index + 1, target))));
    velocity.current = v.x;
    if (target === index) {
      // Same card: the effect won't run, so settle back here.
      animate(x, -index * step, { ...SPRING, velocity: v.x });
      velocity.current = 0;
    } else onIndexChange(target);
  };

  const go = (i: number) => onIndexChange(Math.max(0, Math.min(count - 1, i)));

  return (
    <div
      ref={viewport}
      role="region"
      aria-roledescription="carousel"
      aria-label="Kartendesign"
      className="relative mx-auto w-full max-w-[380px] [perspective:1200px]"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        else if (e.key === "ArrowRight") go(index + 1);
        else return;
        e.preventDefault();
      }}
    >
      {/* The first card keeps the track in the flow, so the viewport gets its height. */}
      <motion.div
        className="relative cursor-grab touch-pan-y [transform-style:preserve-3d] active:cursor-grabbing"
        style={{ x }}
        drag={step > GAP ? "x" : false}
        dragConstraints={{ left: -(count - 1) * step, right: 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragStart={() => (dragged.current = false)}
        onDrag={(_, { offset }) => {
          if (Math.abs(offset.x) > 4) dragged.current = true;
        }}
        onDragEnd={onDragEnd}
        // A drag ends with a click on whatever was under the finger; that click isn't a tap.
        onClickCapture={(e) => {
          if (!dragged.current) return;
          dragged.current = false;
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {labels.map((label, i) => (
          <Slide
            key={i}
            i={i}
            x={x}
            step={step}
            reduced={!!reduced}
            active={i === index}
            label={`${i + 1} von ${count}: ${label}`}
          >
            {children(i, i === index)}
          </Slide>
        ))}
      </motion.div>
    </div>
  );
}

function Slide({
  i,
  x,
  step,
  reduced,
  active,
  label,
  children,
}: {
  i: number;
  x: MotionValue<number>;
  step: number;
  reduced: boolean;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  // Signed distance from the middle, in cards: 0 in the middle, 1 one card to the right.
  const d = useTransform(x, (v) => (step > GAP ? (v + i * step) / step : i));
  const near = useTransform(d, (v) => Math.min(Math.abs(v), 1));
  const rotateY = useTransform(d, (v) => (reduced ? 0 : Math.max(-1, Math.min(1, v)) * -TURN));
  const scale = useTransform(near, (n) => (reduced ? 1 : 1 - SHRINK * n));
  const z = useTransform(near, (n) => (reduced ? 0 : -SINK * n));
  const opacity = useTransform(near, (n) => 1 - 0.4 * n);

  return (
    <motion.div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={!active}
      className={i === 0 ? "relative" : "absolute top-0 w-full"}
      style={{ left: i * step, rotateY, scale, z, opacity, transformStyle: "preserve-3d" }}
    >
      {children}
    </motion.div>
  );
}
