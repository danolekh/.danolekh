import type { SpecRow, Verdict } from "@/data/hydraulics";
import { cn } from "@/lib/utils";

/* The interchange table — original against candidate, row by row. Shared by the globe's detail
 * panel, the spec-match block and the candidate tabs, which were each growing their own copy. */

const MATCH = {
  yes: { sign: "✓", label: "совпадает", cls: "text-emerald-600 dark:text-emerald-400" },
  partial: { sign: "~", label: "частично", cls: "text-amber-600 dark:text-amber-400" },
  no: { sign: "✕", label: "не совпадает", cls: "text-red-600 dark:text-red-400" },
} as const;

export function MatchMark({ match }: { match: SpecRow["match"] }) {
  const m = MATCH[match];
  return (
    <span className={cn("font-semibold", m.cls)}>
      {m.sign}
      <span className="sr-only"> {m.label}</span>
    </span>
  );
}

export function SpecTable({
  rows,
  candidateLabel,
  className,
}: {
  rows: SpecRow[];
  candidateLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="py-1 pr-4 font-medium">Параметр</th>
            <th className="py-1 pr-4 font-medium">Оригинал</th>
            <th className="py-1 pr-4 font-medium">{candidateLabel}</th>
            <th className="py-1 font-medium">
              <span className="sr-only">Совпадение</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed">
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-2 pr-4 align-top">{row.label}</td>
              <td className="py-2 pr-4 align-top text-muted-foreground">{row.original}</td>
              <td className="py-2 pr-4 align-top">{row.candidate}</td>
              <td className="py-2 align-top">
                <MatchMark match={row.match} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** How many rows matched, for a one-line summary above the table. */
export function matchCount(rows: SpecRow[]): { yes: number; total: number } {
  return { yes: rows.filter((r) => r.match === "yes").length, total: rows.length };
}

// ── verdict badge ──────────────────────────────────────────────────────────────

const VERDICT_LABEL: Record<Verdict, string> = {
  baseline: "оригинал",
  recommended: "рекомендуется",
  viable: "рабочий вариант",
  overkill: "класс выше",
  unverified: "не подтверждён",
  "ruled-out": "отпадает",
};

const VERDICT_STYLE: Record<Verdict, string> = {
  baseline: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  recommended: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  viable: "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  overkill: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  unverified: "border-foreground/20 bg-foreground/5 text-muted-foreground",
  "ruled-out": "border-foreground/15 bg-foreground/5 text-muted-foreground",
};

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        VERDICT_STYLE[verdict],
        className,
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}
