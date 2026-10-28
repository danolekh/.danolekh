import { useEffect, useState } from "react";
import {
  IconCheck,
  IconFlag,
  IconLink,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconSkull,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  eventTitle,
  formatRunTime,
  toTimeParam,
  type RunEvent,
  type RunMeta,
} from "@/lib/replays/meta";
import { cn } from "@/lib/utils";
import { useRunTime, useSync, useSyncState } from "./sync-context";

// The slider's thumb is 12 px and sits inside the track's ends ("edge" alignment).
const THUMB = 12;
const at = (fraction: number) => `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${fraction})`;

/** The in-game timer: gold "IGT", white digits, tenths. */
function RunClock({ seconds, className }: { seconds: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 whitespace-nowrap", className)}>
      <span className="font-mono text-[0.7em] font-bold text-amber-600 dark:text-amber-400">
        IGT
      </span>
      <span className="font-mono tabular-nums">{formatRunTime(seconds * 1000)}</span>
    </span>
  );
}

export function Timeline({ meta, fallbackEnd }: { meta: RunMeta; fallbackEnd: number }) {
  const group = useSync();
  const time = useRunTime();
  const playing = useSyncState((s) => s.playing);
  const waiting = useSyncState((s) => s.waiting);
  const rate = useSyncState((s) => s.rate);
  const end = useSyncState((s) => s.end) ?? fallbackEnd;
  const [scrub, setScrub] = useState<number | null>(null);
  const shown = Math.min(scrub ?? time, end || 0);
  const live = meta.result === "running";
  const events = meta.events.filter((e) => e.t / 1000 <= end + 0.5);
  let currentIndex = -1;
  events.forEach((e, i) => {
    if (e.t / 1000 <= shown + 0.05) currentIndex = i;
  });

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => group.toggle()}
          aria-label={playing ? "Pause every view" : "Play every view"}
          className="shrink-0"
        >
          {playing ? <IconPlayerPauseFilled /> : <IconPlayerPlayFilled />}
        </Button>
        <RunClock seconds={shown} className="text-base sm:text-lg" />

        <div className="relative min-w-0 flex-1">
          <Slider
            aria-label="Run time"
            min={0}
            max={Math.max(end, 0.1)}
            step={0.1}
            value={[shown]}
            onValueChange={(value) =>
              setScrub(Array.isArray(value) ? (value[0] ?? 0) : (value as number))
            }
            onValueCommitted={(value) => {
              group.seek(Array.isArray(value) ? (value[0] ?? 0) : (value as number));
              setScrub(null);
            }}
            className="py-3 **:data-[slot=slider-range]:bg-foreground **:data-[slot=slider-thumb]:border-foreground"
          />
          {end > 0 &&
            events.map((event, index) => (
              <Marker key={`${event.t}-${index}`} event={event} left={at(event.t / 1000 / end)} />
            ))}
        </div>

        <span className="hidden shrink-0 font-mono text-xs text-muted-foreground tabular-nums sm:inline">
          {formatRunTime(end * 1000)}
        </span>
        {live && (
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            <span className="size-1.5 animate-pulse rounded-full bg-current" />
            <span className="hidden sm:inline">live</span>
          </span>
        )}
        {rate !== 1 && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {rate}x
          </span>
        )}
        <ShareButton seconds={shown} />
      </div>

      <div className="flex min-h-6 items-center gap-1 overflow-x-auto pl-1 [scrollbar-width:none]">
        {waiting ? (
          <span className="shrink-0 pr-2 text-xs text-muted-foreground">
            Waiting for every view to load…
          </span>
        ) : null}
        {events.map((event, index) => (
          <button
            key={`${event.t}-${index}`}
            type="button"
            onClick={() => group.seek(event.t / 1000)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 px-1.5 py-0.5 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              index === currentIndex && "text-foreground",
              event.type === "death" && "text-destructive hover:text-destructive",
            )}
          >
            {event.type === "death" ? (
              <IconSkull className="size-3.5" />
            ) : (
              <IconFlag className="size-3.5" />
            )}
            <span className="font-mono tabular-nums">{formatRunTime(event.t, 0)}</span>
            <span>{eventTitle(event)}</span>
            {event.type === "split" && event.by ? (
              <span className="text-muted-foreground/70">{event.by}</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function Marker({ event, left }: { event: RunEvent; left: string }) {
  const group = useSync();
  const label = `${eventTitle(event)}${event.type === "split" && event.by ? ` · ${event.by}` : ""} · ${formatRunTime(event.t, 0)}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            onClick={() => group.seek(event.t / 1000)}
            className="group/marker absolute top-1/2 grid h-5 w-3 -translate-x-1/2 -translate-y-1/2 place-items-center"
            style={{ left }}
          />
        }
      >
        <span
          className={cn(
            "block h-3 w-0.5 transition-transform group-hover/marker:scale-y-150",
            event.type === "death" ? "bg-destructive" : "bg-foreground/55 dark:bg-foreground/60",
          )}
        />
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

function ShareButton({ seconds }: { seconds: number }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(id);
  }, [copied]);
  const label = copied ? "Link copied" : `Copy a link to ${formatRunTime(seconds * 1000, 0)}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            className="shrink-0"
            onClick={() => {
              // Written by hand: URLSearchParams would turn 15:00 into 15%3A00.
              const url = `${window.location.origin}${window.location.pathname}?t=${toTimeParam(seconds)}`;
              void navigator.clipboard?.writeText(url).then(() => setCopied(true));
            }}
          />
        }
      >
        {copied ? <IconCheck /> : <IconLink />}
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
