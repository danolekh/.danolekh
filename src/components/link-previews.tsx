import { useEffect, useRef, useState, type ReactNode } from "react";
import { PreviewCard } from "@base-ui/react/preview-card";
import { PreviewVideo } from "@/components/cover-video";
import { Cover } from "@/components/project-cover";
import type { LinkPreview } from "@/lib/content/previews";
import { cn } from "@/lib/utils";

/* Hover a link to another page of the site, inside a post or a case study, and a card shows what's
 * there: its hero clip playing (the same cut as the project grid's hover preview) or its cover,
 * with the title and a line about it.
 *
 * The prose is marked HTML set with dangerouslySetInnerHTML, so its links aren't React elements a
 * PreviewCard.Trigger could wrap. Instead one Base UI preview card per page is opened by hand:
 * events delegated from the wrapper find the hovered `a[data-preview]` (the server marked the links
 * that have a preview, see src/lib/content/previews.ts), and the card is anchored to it.
 *
 * It's for a mouse and for keyboard focus. On touch a link just navigates, as Base UI recommends:
 * the card is a visual extra, so it's hidden from screen readers and the page it previews carries
 * everything itself. */

const OPEN_DELAY = 450;
const CLOSE_DELAY = 200;

type Shown = { preview: LinkPreview; anchor: HTMLAnchorElement; line: number };

/** The line of a wrapped link nearest to a point, so the card sits over the part being hovered. */
function lineAt(a: HTMLAnchorElement, y: number | null): number {
  const rects = [...a.getClientRects()];
  if (y === null || rects.length < 2) return 0;
  let best = 0;
  rects.forEach((r, i) => {
    if (
      Math.abs(r.top + r.height / 2 - y) < Math.abs(rects[best]!.top + rects[best]!.height / 2 - y)
    )
      best = i;
  });
  return best;
}

export function LinkPreviews({
  previews,
  children,
}: {
  previews: Record<string, LinkPreview>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // What's open (or about to be), read by the event handlers without re-binding them.
  const live = useRef({ open: false, anchor: null as HTMLAnchorElement | null });

  useEffect(() => {
    const root = ref.current;
    if (!root || !Object.keys(previews).length) return;
    const linkOf = (target: EventTarget | null) =>
      target instanceof Element ? target.closest<HTMLAnchorElement>("a[data-preview]") : null;

    const show = (a: HTMLAnchorElement, y: number | null, delay: number) => {
      const preview = previews[a.dataset.preview ?? ""];
      if (!preview) return;
      clearTimeout(timer.current);
      live.current.anchor = a;
      const go = () => {
        setShown({ preview, anchor: a, line: lineAt(a, y) });
        setOpen(true);
        live.current.open = true;
      };
      // From one link straight to the next, the card follows at once.
      if (live.current.open) go();
      else timer.current = setTimeout(go, delay);
    };
    const hide = () => {
      clearTimeout(timer.current);
      live.current.anchor = null;
      timer.current = setTimeout(() => {
        setOpen(false);
        live.current.open = false;
      }, CLOSE_DELAY);
    };

    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const a = linkOf(e.target);
      if (a && a !== live.current.anchor) show(a, e.clientY, OPEN_DELAY);
    };
    const out = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const a = linkOf(e.target);
      if (a && !(e.relatedTarget instanceof Node && a.contains(e.relatedTarget))) hide();
    };
    // Keyboard focus only: a click focuses the link too, and that shouldn't pop a card.
    const focusIn = (e: FocusEvent) => {
      const a = linkOf(e.target);
      if (a?.matches(":focus-visible")) show(a, null, 0);
    };
    const focusOut = (e: FocusEvent) => {
      if (linkOf(e.target)) hide();
    };
    root.addEventListener("pointerover", over);
    root.addEventListener("pointerout", out);
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);
    return () => {
      clearTimeout(timer.current);
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointerout", out);
      root.removeEventListener("focusin", focusIn);
      root.removeEventListener("focusout", focusOut);
    };
  }, [previews]);

  // A wrapped link has one box per line; the card anchors to the one that was hovered, read live
  // so it follows the page as it scrolls.
  const anchor = shown && {
    contextElement: shown.anchor,
    getBoundingClientRect: () =>
      shown.anchor.getClientRects()[shown.line] ?? shown.anchor.getBoundingClientRect(),
  };

  return (
    <div ref={ref}>
      {children}
      <PreviewCard.Root
        open={open}
        onOpenChange={(next) => {
          if (next) return;
          clearTimeout(timer.current);
          setOpen(false);
          live.current = { open: false, anchor: null };
        }}
      >
        <PreviewCard.Portal>
          <PreviewCard.Positioner
            anchor={anchor}
            side="top"
            sideOffset={10}
            collisionPadding={12}
            className="z-50"
          >
            <PreviewCard.Popup
              aria-hidden
              onPointerEnter={() => clearTimeout(timer.current)}
              onPointerLeave={() => {
                timer.current = setTimeout(() => {
                  setOpen(false);
                  live.current = { open: false, anchor: null };
                }, CLOSE_DELAY);
              }}
              className={cn(
                "w-80 origin-(--transform-origin) overflow-hidden bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none",
                "duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
              )}
            >
              {shown ? <Card preview={shown.preview} active={open} /> : null}
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    </div>
  );
}

function Card({ preview, active }: { preview: LinkPreview; active: boolean }) {
  const art = preview.cover
    ? { title: preview.title, cover: preview.cover, coverLight: preview.coverLight }
    : null;
  const media = "aspect-video w-full object-cover";
  return (
    <a href={preview.href} tabIndex={-1} className="block no-underline">
      {art ? (
        <div className="relative aspect-video overflow-hidden border-b border-dashed border-border bg-muted">
          {preview.video ? (
            <PreviewVideo
              art={art}
              video={{ src: preview.video, srcLight: preview.videoLight }}
              active={active}
              className={media}
              sizes="320px"
            />
          ) : (
            <Cover art={art} className={media} sizes="320px" />
          )}
        </div>
      ) : null}
      <div className="space-y-1 p-3">
        <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
          {preview.kind}
        </div>
        <div className="leading-snug font-medium">{preview.title}</div>
        {preview.description ? (
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {preview.description}
          </p>
        ) : null}
        <div className="pt-1 font-mono text-[11px] text-muted-foreground/80">→ {preview.href}</div>
      </div>
    </a>
  );
}
