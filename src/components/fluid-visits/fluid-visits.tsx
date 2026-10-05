"use client";

import { pageScheduler, resolveParams, type SurfaceHandle, type SurfaceStatus } from "@danolekh/gl";
import { RollingNumber } from "@kitlangton/rolling-number/react";
import "@kitlangton/rolling-number/styles.css";
import { scaleLinear, scaleTime } from "d3-scale";
import { line } from "d3-shape";
import { animate, motion, type MotionValue, useMotionValue, useReducedMotion } from "motion/react";
import {
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { fluidScan } from "./scan";

/* An eye's fluid over its visits: a cross-section of the macula above, the three volumes, and the
 * volumes over time below, which is also the control. Dragging along the chart picks the nearest
 * visit; the scan eases to that visit's fluid. The scan is drawn by a shader (./scan), never an
 * image, through @danolekh/gl's shared WebGL2 context. Nothing is drawn between visits: the line
 * runs straight from one measurement to the next. */

export type Fluid = "irf" | "srf" | "ped";

export type Visit = {
  /** ISO date, `"2026-03-17"`. */
  date: string;
  /** Intraretinal fluid, subretinal fluid and pigment epithelial detachment, in nanoliters. */
  irf: number;
  srf: number;
  ped: number;
};

export type FluidVisitsProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue"> & {
  visits: readonly Visit[];
  /** The visit shown, by index. */
  value?: number;
  /** The visit shown first, uncontrolled; the latest by default. */
  defaultValue?: number;
  onValueChange?: (index: number) => void;
  /** Starts with the segmentation over the scan. On by default. */
  defaultSegmentation?: boolean;
  /** For the dates and volumes. */
  locale?: string;
  /** The fluids' colours, as hex or rgb(); the scan, the counts and the chart share them. */
  colors?: Partial<Record<Fluid, string>>;
};

const FLUIDS: readonly { key: Fluid; abbr: string; name: string }[] = [
  { key: "irf", abbr: "IRF", name: "Intraretinal fluid" },
  { key: "srf", abbr: "SRF", name: "Subretinal fluid" },
  { key: "ped", abbr: "PED", name: "Pigment epithelial detachment" },
];

const COLORS: Record<Fluid, string> = { irf: "#e0262b", srf: "#f2b705", ped: "#1f7ae0" };

/** The volume, in nL, at which each fluid fills its part of the scan. The scan sizes each by the
 * square root of volume over this, so a trace still shows. */
const FULL: Record<Fluid, number> = { irf: 300, srf: 160, ped: 130 };
const size = (fluid: Fluid, nl: number) => Math.min(1.25, Math.sqrt(Math.max(0, nl) / FULL[fluid]));

const DAY = 86_400_000;
const SPRING = { type: "spring", bounce: 0, duration: 0.6 } as const;

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

export function FluidVisits({
  visits,
  value,
  defaultValue,
  onValueChange,
  defaultSegmentation = true,
  locale = "en-GB",
  colors,
  className,
  style,
  ...rest
}: FluidVisitsProps) {
  const last = Math.max(0, visits.length - 1);
  const [own, setOwn] = useState(() => defaultValue ?? last);
  const index = Math.min(last, Math.max(0, Math.round(value ?? own)));
  const select = (i: number) => {
    const next = Math.min(last, Math.max(0, i));
    if (next === index) return;
    if (value === undefined) setOwn(next);
    onValueChange?.(next);
  };

  const [segmentation, setSegmentation] = useState(defaultSegmentation);
  const palette = { ...COLORS, ...colors };
  const visit = visits[index];

  const f = useFormats(locale);
  const previous = index > 0 ? visits[index - 1] : undefined;
  const gap = visit && previous ? since(previous.date, visit.date) : null;

  return (
    <div
      data-slot="fluid-visits"
      className={cx("fv-root text-foreground", className)}
      style={
        {
          "--fv-irf": palette.irf,
          "--fv-srf": palette.srf,
          "--fv-ped": palette.ped,
          ...style,
        } as CSSProperties
      }
      {...rest}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-sm tabular-nums">
          <span className="font-medium">{visit ? f.date.format(new Date(visit.date)) : "–"}</span>
          <span className="text-muted-foreground">
            {" · "}
            {gap ? `${gap} after the last visit` : "First visit"}
          </span>
        </p>
        <button
          type="button"
          aria-pressed={segmentation}
          onClick={() => setSegmentation((on) => !on)}
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span
            aria-hidden
            className={cx(
              "relative h-4 w-7 rounded-full transition-colors",
              segmentation ? "bg-primary" : "bg-border",
            )}
          >
            <span
              className={cx(
                "absolute top-0.5 left-0.5 size-3 rounded-full bg-background shadow-sm transition-transform",
                segmentation && "translate-x-3",
              )}
            />
          </span>
          Segmentation
        </button>
      </div>

      <Scan visit={visit} segmentation={segmentation} colors={palette} />

      <dl className="mt-3 grid grid-cols-3 gap-2">
        {FLUIDS.map(({ key, abbr, name }) => {
          const now = visit?.[key] ?? 0;
          const delta = previous ? now - previous[key] : null;
          return (
            <div key={key} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: `var(--fv-${key})` }} />
                <abbr title={name} className="no-underline">
                  {abbr}
                </abbr>
              </dt>
              <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-lg leading-tight font-medium tabular-nums sm:text-xl">
                  <RollingNumber value={now} locales={locale} format={f.volumeOptions} duration={550} />
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">nL</span>
                </span>
                {delta !== null && Math.abs(delta) >= 0.05 ? (
                  <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {delta > 0 ? "↑" : "↓"} {f.volume.format(Math.abs(delta))}
                  </span>
                ) : null}
              </dd>
            </div>
          );
        })}
      </dl>

      <Chart visits={visits} index={index} onSelect={select} formats={f} />
    </div>
  );
}

/** The cross-section at the selected visit. Its fluids ease from visit to visit on springs that
 * the shader reads every frame, so nothing here re-renders while they move. */
function Scan({
  visit,
  segmentation,
  colors,
}: {
  visit: Visit | undefined;
  segmentation: boolean;
  colors: Record<Fluid, string>;
}) {
  const reduce = useReducedMotion();
  const canvas = useRef<HTMLCanvasElement>(null);
  const handle = useRef<SurfaceHandle | null>(null);
  const [status, setStatus] = useState<SurfaceStatus>({ ready: false, playing: false, failed: false });

  const irf = useMotionValue(size("irf", visit?.irf ?? 0));
  const srf = useMotionValue(size("srf", visit?.srf ?? 0));
  const ped = useMotionValue(size("ped", visit?.ped ?? 0));
  const seg = useMotionValue(segmentation ? 1 : 0);

  const uniforms = useMemo(
    () => resolveParams(fluidScan, { irfColor: colors.irf, srfColor: colors.srf, pedColor: colors.ped }),
    [colors.irf, colors.srf, colors.ped],
  );
  const latest = useRef(uniforms);
  latest.current = uniforms;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const h = pageScheduler().add(
      el,
      { definition: fluidScan, uniforms: latest.current, speed: 1, state: "hold", maxDpr: 2, maxPixels: 1_600_000 },
      { values: { irf: () => irf.get(), srf: () => srf.get(), ped: () => ped.get(), seg: () => seg.get() } },
      (s) => setStatus((was) => (was.ready === s.ready && was.failed === s.failed ? was : { ...s })),
    );
    handle.current = h;
    const off = [irf, srf, ped, seg].map((mv) => mv.on("change", () => h.wake()));
    return () => {
      off.forEach((stop) => stop());
      h.remove();
      handle.current = null;
    };
  }, [irf, srf, ped, seg]);

  useEffect(() => {
    handle.current?.update({ uniforms });
  }, [uniforms]);

  useEffect(() => {
    if (!visit) return;
    const to = (mv: MotionValue<number>, v: number) => (reduce ? (mv.stop(), mv.set(v)) : animate(mv, v, SPRING));
    to(irf, size("irf", visit.irf));
    to(srf, size("srf", visit.srf));
    to(ped, size("ped", visit.ped));
  }, [visit, reduce, irf, srf, ped]);

  useEffect(() => {
    if (reduce) seg.set(segmentation ? 1 : 0);
    else animate(seg, segmentation ? 1 : 0, { duration: 0.3, ease: "easeOut" });
  }, [segmentation, reduce, seg]);

  return (
    <div
      data-slot="fluid-visits-scan"
      className="fv-scan relative mt-3 aspect-[2/1] overflow-hidden rounded-lg bg-black sm:aspect-[12/5]"
      role="img"
      aria-label="Cross-section of the macula at this visit"
    >
      <canvas
        ref={canvas}
        aria-hidden
        data-ready={status.ready || undefined}
        className="absolute inset-0 size-full"
        style={{ opacity: status.ready ? 1 : 0, transition: "opacity 400ms ease" }}
      />
      {status.failed ? (
        <p className="absolute inset-0 grid place-items-center p-4 text-center text-sm text-white/60">
          The scan needs WebGL2.
        </p>
      ) : null}
    </div>
  );
}

type Formats = ReturnType<typeof useFormats>;

function useFormats(locale: string) {
  return useMemo(() => {
    const volumeOptions: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
    return {
      volumeOptions,
      volume: new Intl.NumberFormat(locale, volumeOptions),
      date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
      month: new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }),
      year: new Intl.DateTimeFormat(locale, { year: "numeric", timeZone: "UTC" }),
      tick: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    };
  }, [locale]);
}

/** "8 weeks", "10 days". */
function since(from: string, to: string) {
  const days = Math.round((Date.parse(to) - Date.parse(from)) / DAY);
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  const weeks = Math.round(days / 7);
  return `${weeks} weeks`;
}

const M = { top: 12, right: 10, bottom: 22, left: 46 };
const HEIGHT = 128;

/** The volumes over time, and the slider that picks the visit. */
function Chart({
  visits,
  index,
  onSelect,
  formats: f,
}: {
  visits: readonly Visit[];
  index: number;
  onSelect: (i: number) => void;
  formats: Formats;
}) {
  const reduce = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const head = useMotionValue(0);
  const dragging = useRef(false);
  const placedAt = useRef(0);
  const latest = useRef(index);
  latest.current = index;

  const geo = useMemo(() => {
    if (!width || visits.length === 0) return null;
    const times = visits.map((v) => new Date(v.date));
    const x = scaleTime()
      .domain([times[0]!, times.at(-1)!])
      .range([M.left, width - M.right]);
    const top = Math.max(...visits.flatMap((v) => [v.irf, v.srf, v.ped]), 1);
    const y = scaleLinear()
      .domain([0, top])
      .nice(4)
      .range([HEIGHT - M.bottom, M.top]);
    const xs = times.map((t) => x(t));
    const paths = Object.fromEntries(
      FLUIDS.map(({ key }) => [
        key,
        line<Visit>()
          .x((_, i) => xs[i]!)
          .y((v) => y(v[key]))(visits as Visit[]) ?? "",
      ]),
    ) as Record<Fluid, string>;
    // Month labels, none closer than a label's width to the last.
    const months: Date[] = [];
    for (const t of x.ticks(Math.max(2, Math.floor(width / 70))))
      if (!months.length || x(t) - x(months.at(-1)!) >= 72) months.push(t);
    return { x, y, xs, paths, months, yTicks: y.ticks(4) };
  }, [visits, width]);

  // The playhead sits on the selected visit unless a finger holds it.
  useLayoutEffect(() => {
    if (!geo || dragging.current) return;
    const at = geo.xs[index] ?? 0;
    if (reduce || placedAt.current !== width) {
      head.stop();
      head.set(at);
      placedAt.current = width;
    } else animate(head, at, { type: "spring", bounce: 0, duration: 0.45 });
  }, [geo, index, width, reduce, head]);

  const nearest = (px: number) => {
    if (!geo) return 0;
    let best = 0;
    geo.xs.forEach((x, i) => {
      if (Math.abs(x - px) < Math.abs(geo.xs[best]! - px)) best = i;
    });
    return best;
  };
  const follow = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!geo) return;
    const r = e.currentTarget.getBoundingClientRect();
    // In layout px, which the playhead moves in, even under a CSS zoom or scale.
    const px = Math.min(width - M.right, Math.max(M.left, ((e.clientX - r.left) * width) / r.width));
    head.stop();
    head.set(px);
    onSelect(nearest(px));
  };
  const release = () => {
    if (!dragging.current) return;
    dragging.current = false;
    const at = geo?.xs[latest.current] ?? 0;
    if (reduce) head.set(at);
    else animate(head, at, { type: "spring", bounce: 0, duration: 0.35 });
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -3, PageUp: 3 };
    if (e.key in step) onSelect(index + step[e.key]!);
    else if (e.key === "Home") onSelect(0);
    else if (e.key === "End") onSelect(visits.length - 1);
    else return;
    e.preventDefault();
  };

  const visit = visits[index];
  const previous = index > 0 ? visits[index - 1] : undefined;
  const text = visit
    ? `${f.date.format(new Date(visit.date))}${previous ? `, ${since(previous.date, visit.date)} after the last visit` : ""}. ` +
      FLUIDS.map(({ key, abbr }) => `${abbr} ${f.volume.format(visit[key])} nanoliters`).join(", ")
    : "";

  return (
    <div
      ref={box}
      data-slot="fluid-visits-chart"
      role="slider"
      tabIndex={0}
      aria-label="Visit"
      aria-valuemin={1}
      aria-valuemax={visits.length}
      aria-valuenow={index + 1}
      aria-valuetext={text}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        follow(e);
      }}
      onPointerMove={(e) => dragging.current && follow(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      className="relative mt-4 cursor-ew-resize touch-pan-y rounded-md select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      style={{ height: HEIGHT }}
    >
      {geo ? (
        <>
          <svg width={width} height={HEIGHT} className="absolute inset-0 overflow-visible" aria-hidden>
            {geo.yTicks.map((t) => (
              <g key={t}>
                <line
                  x1={M.left}
                  x2={width - M.right}
                  y1={geo.y(t)}
                  y2={geo.y(t)}
                  className="stroke-border"
                  strokeDasharray={t === 0 ? undefined : "2 3"}
                />
                <text
                  x={M.left - 6}
                  y={geo.y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {f.tick.format(t)}
                  {t === geo.yTicks.at(-1) ? " nL" : null}
                </text>
              </g>
            ))}
            {geo.months.map((t, i) => {
              const first = i === 0 || t.getUTCFullYear() !== geo.months[i - 1]!.getUTCFullYear();
              return (
                <text
                  key={+t}
                  x={geo.x(t)}
                  y={HEIGHT - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {first ? `${f.month.format(t)} ${f.year.format(t)}` : f.month.format(t)}
                </text>
              );
            })}
            {geo.xs.map((x, i) => (
              <line
                key={i}
                x1={x}
                x2={x}
                y1={HEIGHT - M.bottom}
                y2={HEIGHT - M.bottom + 4}
                className="stroke-muted-foreground"
                strokeOpacity={0.6}
              />
            ))}
            {FLUIDS.map(({ key }) => (
              <g key={key} style={{ color: `var(--fv-${key})` }}>
                <path d={geo.paths[key]} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
                {visits.map((v, i) => (
                  <circle key={i} cx={geo.xs[i]} cy={geo.y(v[key])} r={1.75} fill="currentColor" />
                ))}
              </g>
            ))}
            {visit
              ? FLUIDS.map(({ key }) => (
                  <circle
                    key={key}
                    cx={geo.xs[index]}
                    cy={geo.y(visit[key])}
                    r={4}
                    fill={`var(--fv-${key})`}
                    className="stroke-background"
                    strokeWidth={2}
                    style={{ transition: reduce ? undefined : "cx 450ms cubic-bezier(.2,.8,.2,1), cy 450ms cubic-bezier(.2,.8,.2,1)" }}
                  />
                ))
              : null}
          </svg>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute w-px bg-primary"
            style={{ x: head, left: 0, top: M.top - 6, height: HEIGHT - M.bottom - M.top + 6 }}
          >
            <span className="absolute -top-1 left-1/2 size-2.5 -translate-x-1/2 rounded-full border-2 border-primary bg-background" />
          </motion.div>
        </>
      ) : null}
    </div>
  );
}

function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}
