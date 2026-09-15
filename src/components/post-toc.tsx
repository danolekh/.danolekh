import { useEffect, useState } from "react";
import { IconListSearch } from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TocEntry } from "@/lib/content/p";
import { cn } from "@/lib/utils";

/* Contents rail for long case studies, in two shapes — the split shadcn uses in their docs.
 *
 *   list      → the sidebar on wide screens, where there is margin to spare;
 *   dropdown  → a compact trigger for everything narrower, so the contents are not desktop-only.
 *
 * Links are plain `#id` anchors, so they work before hydration and without JS; the observer only
 * adds the highlight. Sticky positioning is the caller's job, not this component's.
 */

// Same band shadcn uses: a heading counts as current while it sits in the top fifth of the screen.
const ROOT_MARGIN = "0% 0% -80% 0%";

function useActiveHeading(entries: TocEntry[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const elements = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Track the set of headings currently in the band and take the first in document order.
    // Picking "whichever fired last" flickers between neighbours when several cross at once.
    const inBand = new Set<string>();
    const io = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) inBand.add(r.target.id);
          else inBand.delete(r.target.id);
        }
        const first = entries.find((e) => inBand.has(e.id));
        if (first) setActiveId(first.id);
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );
    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [entries]);

  return activeId;
}

export function PostToc({
  entries,
  variant = "list",
  className,
}: {
  entries: TocEntry[];
  variant?: "list" | "dropdown";
  className?: string;
}) {
  const activeId = useActiveHeading(entries);

  if (entries.length < 3) return null;

  if (variant === "dropdown") {
    const active = entries.find((e) => e.id === activeId);
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "inline-flex max-w-full items-center gap-2 rounded-md border border-dashed px-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground",
            className,
          )}
        >
          <IconListSearch className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{active?.text ?? "Содержание"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-[70svh] w-70 overflow-y-auto">
          {entries.map((e) => (
            <DropdownMenuItem
              key={e.id}
              render={
                <a href={`#${e.id}`}>
                  <span
                    className={cn(
                      "block truncate",
                      e.level === 3 && "pl-3 text-xs text-muted-foreground",
                      e.id === activeId && "font-medium text-primary",
                    )}
                  >
                    {e.text}
                  </span>
                </a>
              }
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <nav aria-label="Содержание" className={className}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Содержание
      </p>
      <ul className="space-y-1 border-l border-dashed text-sm">
        {entries.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              aria-current={e.id === activeId ? "location" : undefined}
              className={cn(
                "-ml-px block border-l py-0.5 transition-colors",
                e.level === 2 ? "pl-3 font-medium" : "pl-6 text-[13px]",
                e.id === activeId
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {e.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
