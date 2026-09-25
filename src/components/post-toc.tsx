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
 * Links are plain `#id` anchors, so they work before hydration and without JS; the scroll check
 * only adds the highlight. Sticky positioning is the caller's job, not this component's.
 */

// A heading is current once it has scrolled above this line: 30% down the screen, at most 120px.
const lineY = () => Math.min(window.innerHeight * 0.3, 120);

/* Which heading the reader is in, from positions rather than intersection events.
 *
 * The old IntersectionObserver band only fired when a heading crossed the top fifth of the screen,
 * so two things went wrong: a scroll that started while images were still loading (headings moving
 * under it) left the highlight stale, and headings near the end never reached the band, so the
 * last one could not become current. Now every check asks "which is the last heading above the
 * line?", and the bottom of the page always selects the last heading.
 */
function useActiveHeading(entries: TocEntry[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const headings = entries
      .map((e) => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    const check = () => {
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      let current: HTMLElement | null = null;
      if (atBottom && window.scrollY > 0) current = headings[headings.length - 1];
      else {
        const line = lineY();
        for (const h of headings) {
          if (h.getBoundingClientRect().top <= line) current = h;
          else break;
        }
      }
      setActiveId(current?.id ?? null);
    };

    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        check();
      });
    };

    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    // Images, fonts and embeds that load after the first paint move the headings.
    const ro = new ResizeObserver(schedule);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      ro.disconnect();
    };
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
          <span className="min-w-0 truncate">{active?.text ?? "Contents"}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-[70svh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto">
          {entries.map((e) => (
            <DropdownMenuItem
              key={e.id}
              render={
                <a href={`#${e.id}`}>
                  <span
                    className={cn(
                      "block whitespace-normal leading-snug",
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
    <nav aria-label="Contents" className={className}>
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Contents
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
