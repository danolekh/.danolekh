import { cn } from "@/lib/utils";

/* Shared shell so every embedded block reads as one system: dashed border, card surface, small
 * uppercase heading. Lives in its own module because both the portfolio blocks and the hydraulics
 * blocks need it, and having either own it would make the registry import circular. */
export function BlockShell({
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
