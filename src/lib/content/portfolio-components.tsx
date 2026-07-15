import type { ComponentType } from "react";
import { IconArrowNarrowRight, IconQuote } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

// Registry of bespoke, in-theme achievement blocks embeddable in a case study via a
// ```block:<name> fenced block (see src/lib/content/p.ts). Every block takes JSON-serializable
// props supplied inline in the markdown, so the real data lives next to the prose that frames it.
const PORTFOLIO_BLOCKS: Record<string, ComponentType<Record<string, unknown>>> = {
  metrics: MetricsBlock as ComponentType<Record<string, unknown>>,
  "before-after": BeforeAfterBlock as ComponentType<Record<string, unknown>>,
  pipeline: PipelineBlock as ComponentType<Record<string, unknown>>,
  "build-cache": BuildCacheBlock as ComponentType<Record<string, unknown>>,
  stack: StackBlock as ComponentType<Record<string, unknown>>,
  "stat-row": StatRowBlock as ComponentType<Record<string, unknown>>,
  feedback: FeedbackBlock as ComponentType<Record<string, unknown>>,
};

export function PortfolioBlock({
  name,
  props,
}: {
  name: string;
  props: Record<string, unknown>;
}) {
  const Component = PORTFOLIO_BLOCKS[name];
  if (!Component) return null;
  return <Component {...props} />;
}

// Shared shell so every block reads as one system: dashed border, card surface, small heading.
function BlockShell({
  title,
  caption,
  children,
  className,
}: {
  title?: string;
  caption?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-dashed bg-card/60 p-4 not-prose", className)}>
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      ) : null}
      <div className={cn(title && "mt-3")}>{children}</div>
      {caption ? <p className="mt-3 text-xs text-muted-foreground">{caption}</p> : null}
    </section>
  );
}

// ── metrics: Core Web Vitals grid ──────────────────────────────────────────────
// Each tile self-rates against the Web Vitals thresholds and shows a status word (never
// color-alone — the label carries the meaning, the color reinforces it).

type Rating = "good" | "needs-improvement" | "poor";

type MetricSpec = {
  key: string;
  label: string;
  unit: "ms" | "s" | "score" | "";
  good: number;
  ni: number; // upper bound of "needs improvement"; above this is poor
};

// Thresholds per web.dev Core Web Vitals + Lighthouse (lower is better for all of these).
const METRIC_SPECS: Record<string, MetricSpec> = {
  lcp: { key: "lcp", label: "LCP", unit: "s", good: 2.5, ni: 4 },
  inp: { key: "inp", label: "INP", unit: "ms", good: 200, ni: 500 },
  cls: { key: "cls", label: "CLS", unit: "", good: 0.1, ni: 0.25 },
  fcp: { key: "fcp", label: "FCP", unit: "s", good: 1.8, ni: 3 },
  tbt: { key: "tbt", label: "TBT", unit: "ms", good: 200, ni: 600 },
};

function rate(value: number, spec: MetricSpec): Rating {
  if (value <= spec.good) return "good";
  if (value <= spec.ni) return "needs-improvement";
  return "poor";
}

const RATING_CLASS: Record<Rating, string> = {
  good: "text-[#0ca30c] dark:text-[#3fce3f]",
  "needs-improvement": "text-[#c98a10] dark:text-[#fab219]",
  poor: "text-[#d03b3b] dark:text-[#e46a6a]",
};

const RATING_LABEL: Record<Rating, string> = {
  good: "Good",
  "needs-improvement": "Needs work",
  poor: "Poor",
};

function formatMetric(value: number, unit: MetricSpec["unit"]): string {
  if (unit === "s") return `${value.toFixed(value < 10 ? 1 : 0)}s`;
  if (unit === "ms") return `${Math.round(value)}ms`;
  if (unit === "") return value.toFixed(2);
  return String(value);
}

function MetricsBlock(props: {
  title?: string;
  caption?: string;
  score?: number; // 0-100 Lighthouse-style performance score
  metrics?: Record<string, number>; // { lcp: 1.2, inp: 90, cls: 0.01, fcp: 0.9, tbt: 40 }
}) {
  const metrics = props.metrics ?? {};
  const entries = Object.keys(METRIC_SPECS)
    .filter((k) => typeof metrics[k] === "number")
    .map((k) => ({ spec: METRIC_SPECS[k], value: metrics[k] }));

  const scoreRating: Rating | null =
    typeof props.score === "number"
      ? props.score >= 90
        ? "good"
        : props.score >= 50
          ? "needs-improvement"
          : "poor"
      : null;

  return (
    <BlockShell title={props.title ?? "Performance"} caption={props.caption}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {typeof props.score === "number" && scoreRating ? (
          <div className="col-span-2 flex flex-col justify-between border border-dashed p-3 sm:col-span-1 sm:row-span-2">
            <span className="text-xs text-muted-foreground">Performance score</span>
            <span className={cn("text-5xl font-semibold leading-none", RATING_CLASS[scoreRating])}>
              {Math.round(props.score)}
            </span>
            <span className={cn("text-xs font-medium", RATING_CLASS[scoreRating])}>
              {RATING_LABEL[scoreRating]}
            </span>
          </div>
        ) : null}
        {entries.map(({ spec, value }) => {
          const r = rate(value, spec);
          return (
            <div key={spec.key} className="flex flex-col gap-0.5 border border-dashed p-3">
              <span className="text-xs text-muted-foreground">{spec.label}</span>
              <span className={cn("text-2xl font-semibold leading-none", RATING_CLASS[r])}>
                {formatMetric(value, spec.unit)}
              </span>
              <span className={cn("text-[0.7rem] font-medium", RATING_CLASS[r])}>
                {RATING_LABEL[r]}
              </span>
            </div>
          );
        })}
      </div>
    </BlockShell>
  );
}

// ── before-after: old site vs new, row by row ──────────────────────────────────
// Each row carries a label and an old/new value with an explicit rating so the color reinforces
// (never carries) the meaning. Old values typically rate "poor", new "good".
function BeforeAfterBlock(props: {
  title?: string;
  caption?: string;
  oldLabel?: string;
  newLabel?: string;
  rows?: {
    label: string;
    old: string;
    new: string;
    oldRating?: Rating;
    newRating?: Rating;
  }[];
}) {
  const rows = props.rows ?? [];
  return (
    <BlockShell title={props.title ?? "Before / after"} caption={props.caption}>
      <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 gap-y-3 text-sm">
        <span />
        <span className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {props.oldLabel ?? "Before"}
        </span>
        <span className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {props.newLabel ?? "After"}
        </span>
        {rows.map((row, i) => (
          <div key={i} className="contents">
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "text-right tabular-nums line-through decoration-muted-foreground/40",
                row.oldRating ? RATING_CLASS[row.oldRating] : "text-foreground",
              )}
            >
              {row.old}
            </span>
            <span
              className={cn(
                "text-right font-semibold tabular-nums",
                row.newRating ? RATING_CLASS[row.newRating] : "text-foreground",
              )}
            >
              {row.new}
            </span>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

// ── pipeline: CMS → live flow ──────────────────────────────────────────────────
function PipelineBlock(props: {
  title?: string;
  caption?: string;
  time?: string; // e.g. "~3 min"
  steps?: string[];
}) {
  const steps = props.steps ?? [
    "Editor hits Publish",
    "Strapi webhook",
    "Cloudflare deploy",
    "Static rebuild",
    "Live",
  ];
  return (
    <BlockShell title={props.title ?? "CMS → live"} caption={props.caption}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="border border-dashed px-2 py-1 text-xs">{step}</span>
            {i < steps.length - 1 ? (
              <IconArrowNarrowRight className="size-4 text-muted-foreground" />
            ) : null}
          </div>
        ))}
      </div>
      {props.time ? (
        <p className="mt-3 text-sm">
          <span className="text-muted-foreground">End to end: </span>
          <span className="font-semibold">{props.time}</span>
        </p>
      ) : null}
    </BlockShell>
  );
}

// ── build-cache: before/after bar ──────────────────────────────────────────────
function BuildCacheBlock(props: {
  title?: string;
  caption?: string;
  cold?: number; // minutes
  warm?: number; // minutes
  why?: string;
}) {
  const cold = props.cold ?? 8;
  const warm = props.warm ?? 2.5;
  const warmPct = Math.max(6, Math.round((warm / cold) * 100));
  return (
    <BlockShell title={props.title ?? "Build time"} caption={props.caption}>
      <div className="space-y-2">
        <BarRow label="Cold" value={`${cold} min`} pct={100} tone="muted" />
        <BarRow label="Warm" value={`~${warm} min`} pct={warmPct} tone="accent" />
      </div>
      {props.why ? <p className="mt-3 text-sm text-muted-foreground">{props.why}</p> : null}
    </BlockShell>
  );
}

function BarRow({
  label,
  value,
  pct,
  tone,
}: {
  label: string;
  value: string;
  pct: number;
  tone: "muted" | "accent";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="h-6 flex-1 bg-muted/40">
        <div
          className={cn("h-full", tone === "accent" ? "bg-primary" : "bg-muted-foreground/40")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-xs font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ── stack: tech chips ──────────────────────────────────────────────────────────
function StackBlock(props: { title?: string; caption?: string; items?: string[] }) {
  const items = props.items ?? [];
  return (
    <BlockShell title={props.title ?? "Stack"} caption={props.caption}>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="border border-dashed px-2 py-0.5 text-xs">
            {item}
          </span>
        ))}
      </div>
    </BlockShell>
  );
}

// ── stat-row: generic labeled numbers ──────────────────────────────────────────
function StatRowBlock(props: {
  title?: string;
  caption?: string;
  stats?: { value: string; label: string }[];
}) {
  const stats = props.stats ?? [];
  return (
    <BlockShell title={props.title} caption={props.caption}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="text-2xl font-semibold leading-none">{s.value}</span>
            <span className="text-xs text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

// ── feedback: client quote ─────────────────────────────────────────────────────
function FeedbackBlock(props: { quote?: string; author?: string; role?: string }) {
  if (!props.quote) return null;
  return (
    <section className="relative border border-dashed bg-card/60 p-5 not-prose">
      <IconQuote className="size-6 text-muted-foreground/40" />
      <blockquote className="mt-2 text-lg font-light italic leading-relaxed">
        {props.quote}
      </blockquote>
      {props.author ? (
        <figcaption className="mt-3 text-sm">
          <span className="font-medium">{props.author}</span>
          {props.role ? <span className="text-muted-foreground"> · {props.role}</span> : null}
        </figcaption>
      ) : null}
    </section>
  );
}

