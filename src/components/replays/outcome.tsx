import { IconSkull, IconTrophy } from "@tabler/icons-react";
import { formatRunTime, type RunOutcome } from "@/lib/replays/meta";
import { cn } from "@/lib/utils";

/** How a run went, in the same words on the watch page header and the runs list: "Win 46:07.123",
 *  "scapelawg died at 31:10", "Abandoned at 0:30", "live". */
export function Outcome({ outcome, className }: { outcome: RunOutcome; className?: string }) {
  const base = cn(
    "inline-flex max-w-full items-center gap-1.5 text-sm whitespace-nowrap",
    className,
  );
  switch (outcome.kind) {
    case "live":
      return (
        <span className={cn(base, "font-medium text-red-600 dark:text-red-400")}>
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-current" />
          live
        </span>
      );
    case "win":
      return (
        <span className={cn(base, "text-foreground")}>
          <IconTrophy className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          Win
          {outcome.timeMs !== null && (
            <span className="font-mono tabular-nums">{formatRunTime(outcome.timeMs, 3)}</span>
          )}
        </span>
      );
    case "death":
      return (
        <span className={cn(base, "text-foreground")}>
          <IconSkull className="size-4 shrink-0 text-destructive" />
          {/* A long name gives way before "died at" does. */}
          <span className="flex min-w-0">
            <span className="truncate">{outcome.name}</span>
            <span className="whitespace-pre"> died at</span>
          </span>
          <span className="font-mono tabular-nums">{formatRunTime(outcome.timeMs, 0)}</span>
        </span>
      );
    case "ended":
      return (
        <span className={cn(base, "text-muted-foreground")}>
          {outcome.result === "abandoned" ? "Abandoned" : "Failed"}
          {outcome.timeMs !== null && (
            <>
              {" "}
              at <span className="font-mono tabular-nums">{formatRunTime(outcome.timeMs, 0)}</span>
            </>
          )}
        </span>
      );
  }
}
