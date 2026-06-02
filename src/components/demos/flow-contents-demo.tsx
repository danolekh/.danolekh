import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconCheck, IconExternalLink, IconSearch } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SAMPLES, hostOf, type FlowMatch, type FlowResult } from "@/lib/demos/flow-contents";
import { resolveFlowDemo } from "@/lib/demos/flow-contents-resolve";

type Status = "idle" | "loading" | "done" | "error";

export function FlowContentsDemo() {
  const [selected, setSelected] = useState(SAMPLES[0]?.id ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<FlowResult | null>(null);

  const reset = (id: string) => {
    setSelected(id);
    setStatus("idle");
    setResult(null);
  };

  const run = async () => {
    if (!selected) return;
    setStatus("loading");
    setResult(null);
    try {
      const r = await resolveFlowDemo({ data: { sampleId: selected } });
      setResult(r);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold text-foreground">Try it — photo → the exact retailer page</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a detected item. The server runs Google Lens on the crop and resolves the real product URL
          + price, live — ranked by retailer domain, price, and exact-match confidence.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex flex-wrap gap-3">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => reset(s.id)}
              aria-pressed={selected === s.id}
              className={cn(
                "relative h-20 w-20 overflow-hidden rounded-lg border bg-muted transition",
                selected === s.id
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-foreground/30",
              )}
              title={s.label}
            >
              <img src={s.imageUrl} alt={s.label} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={run} disabled={status === "loading" || !selected} size="sm">
            <IconSearch />
            {status === "loading" ? "Resolving…" : "Resolve exact URL"}
          </Button>
          <span className="text-xs text-muted-foreground">
            {SAMPLES.find((s) => s.id === selected)?.label}
          </span>
        </div>

        <AnimatePresence mode="wait">
          {status === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-28 animate-pulse rounded-xl border border-border bg-muted/40"
            />
          )}

          {status === "error" && (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-destructive"
            >
              Couldn’t resolve that one — try another sample.
            </motion.p>
          )}

          {status === "done" && result && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-medium text-muted-foreground">Today’s pipeline returns</div>
                <div className="mt-1 truncate font-mono text-xs text-muted-foreground line-through">
                  {result.aggregatorExample}
                </div>
              </div>

              {result.chosen ? (
                <ResultCard match={result.chosen} highlight />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No confident retailer match — the pipeline would keep the existing value and flag it for review.
                </p>
              )}

              {result.matches.slice(1).map((m, i) => (
                <ResultCard key={i} match={m} />
              ))}

              <div className="text-[11px] text-muted-foreground">
                {result.source === "live" ? "Live Google Lens" : "Cached sample"} · top match highlighted, ranked
                by retailer domain + price + exact match
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultCard({ match, highlight }: { match: FlowMatch; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-3",
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-background",
      )}
    >
      {match.thumbnail ? (
        <img src={match.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {match.title || hostOf(match.link)}
          </span>
          {match.exactMatch && <IconCheck className="size-4 shrink-0 text-primary" />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{match.source}</span>
          {match.price && (
            <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{match.price}</span>
          )}
        </div>
        <a
          href={match.link}
          target="_blank"
          rel="noreferrer"
          className="mt-1 flex items-center gap-1 font-mono text-xs text-primary hover:underline"
        >
          <IconExternalLink className="size-3 shrink-0" />
          <span className="truncate">{match.link}</span>
        </a>
      </div>
    </div>
  );
}
