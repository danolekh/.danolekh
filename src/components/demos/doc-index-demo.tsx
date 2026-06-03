import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  IconCheck,
  IconFileText,
  IconLoader2,
  IconSearch,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SAMPLE_DOCS,
  SEARCH_SUGGESTIONS,
  searchDocs,
  splitSnippet,
  type DocResult,
} from "@/lib/demos/doc-index";
import { extractDocIndex } from "@/lib/demos/doc-index-extract";

type Phase = "idle" | "indexing" | "indexed";
type Results = Record<string, DocResult | undefined>;

const COLS = ["Document", "Author", "Addressee", "Date", "Subject"] as const;

export function DocIndexDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<Results>({});
  const [preview, setPreview] = useState<string>("");
  const [query, setQuery] = useState("");

  const run = async () => {
    setPhase("indexing");
    setResults({});
    await Promise.all(
      SAMPLE_DOCS.map(async (doc) => {
        try {
          const r = await extractDocIndex({ data: { docId: doc.id } });
          setResults((prev) => ({ ...prev, [doc.id]: r }));
        } catch {
          // leave the row unresolved; the table simply shows a dash for it
        }
      }),
    );
    setPhase("indexed");
  };

  const hits = useMemo(() => searchDocs(query, results), [query, results]);
  const previewDoc = SAMPLE_DOCS.find((d) => d.id === preview);

  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-foreground">
          Index engineering documents with Claude
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Claude pulls author, addressee, date, and subject from each document, then keyword-search the
          whole set.
        </p>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {/* Source documents */}
        <div className="flex flex-wrap gap-2.5">
          {SAMPLE_DOCS.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setPreview((p) => (p === doc.id ? "" : doc.id))}
              aria-pressed={preview === doc.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left transition",
                preview === doc.id
                  ? "border-foreground/80 ring-2 ring-primary/15"
                  : "border-border hover:border-foreground/30",
              )}
              title={doc.filename}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted">
                <IconFileText className="size-3.5 text-muted-foreground" />
              </span>
              <span className="truncate font-mono text-xs text-foreground">{doc.filename}</span>
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {previewDoc && (
            <motion.pre
              key={previewDoc.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="max-h-44 overflow-auto rounded-lg border border-border bg-muted/30 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground"
            >
              {previewDoc.text}
            </motion.pre>
          )}
        </AnimatePresence>

        {/* Index action */}
        <div className="flex flex-col items-center gap-2 py-1">
          <Button onClick={run} disabled={phase === "indexing"} size="lg" className="rounded-full px-6">
            {phase === "indexing" ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconSparkles />
            )}
            {phase === "indexing" ? "Indexing…" : "Index all with Claude"}
          </Button>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {SAMPLE_DOCS.length} documents · Claude Haiku
          </span>
        </div>

        {/* Results table */}
        {phase !== "idle" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  {COLS.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 text-left text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
                    >
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {SAMPLE_DOCS.map((doc) => {
                  const r = results[doc.id];
                  const loading = phase === "indexing" && !r;
                  return (
                    <tr key={doc.id} className="border-b border-border/60 last:border-0 align-top">
                      <td className="px-3 py-3 font-medium text-foreground">{doc.label}</td>
                      <Cell loading={loading} value={r?.fields.author} />
                      <Cell loading={loading} value={r?.fields.addressee} />
                      <Cell loading={loading} value={r?.fields.date} mono />
                      <Cell loading={loading} value={r?.fields.subject} />
                      <td className="px-3 py-3">
                        {r && <IndexedTag />}
                        {loading && <IconLoader2 className="size-3.5 animate-spin text-muted-foreground" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Keyword search */}
        {phase === "indexed" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 border-t border-border pt-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <IconSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search all documents…"
                  className="h-10 w-full rounded-lg border border-input bg-background pr-9 pl-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <IconX className="size-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {SEARCH_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {query && (
              <div className="text-xs text-muted-foreground">
                {hits.length} of {SAMPLE_DOCS.length} documents match “{query}”
              </div>
            )}

            <div className="space-y-3">
              {hits.map((hit) => {
                const doc = SAMPLE_DOCS.find((d) => d.id === hit.docId)!;
                const fields = results[hit.docId]?.fields;
                const [before, match, after] = splitSnippet(hit.snippet, query);
                return (
                  <div
                    key={hit.docId}
                    className="rounded-xl border border-primary/30 bg-primary/[0.04] p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-muted">
                        <IconFileText className="size-3.5 text-muted-foreground" />
                      </span>
                      <span className="text-sm font-medium text-foreground">{doc.label}</span>
                      <span className="ml-auto">
                        <IndexedTag />
                      </span>
                    </div>
                    {fields && (
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 pl-8 text-xs text-muted-foreground">
                        <span>{fields.author}</span>
                        <span>{fields.addressee}</span>
                        <span className="font-mono">{fields.date}</span>
                      </div>
                    )}
                    <p className="mt-2 pl-8 text-xs leading-relaxed text-muted-foreground">
                      {before}
                      <mark className="rounded bg-primary/15 px-0.5 font-medium text-foreground">
                        {match}
                      </mark>
                      {after}
                    </p>
                  </div>
                );
              })}
              {query && hits.length === 0 && (
                <p className="text-sm text-muted-foreground">No documents match “{query}”.</p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Cell({ value, loading, mono }: { value?: string; loading?: boolean; mono?: boolean }) {
  return (
    <td className={cn("px-3 py-3 text-foreground", mono && "font-mono text-[13px]")}>
      {loading ? (
        <span className="block h-3 w-28 animate-pulse rounded bg-muted" />
      ) : (
        (value ?? <span className="text-muted-foreground">—</span>)
      )}
    </td>
  );
}

function IndexedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <IconCheck className="size-3" />
      indexed
    </span>
  );
}
