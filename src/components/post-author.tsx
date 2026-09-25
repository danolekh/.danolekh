import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/* The way back out of a case study, sitting wherever the contents rail does.
 *
 *   rail → above the sticky sidebar on wide screens: avatar, name, what I do;
 *   bar  → the compact form for the sticky top bar below xl, next to the contents dropdown.
 *
 * It replaces the old "Back home" button at the top of the article: that one scrolled away, this
 * one stays put, and it doubles as an internal link home with my name as the anchor text.
 */
export function PostAuthor({
  variant = "rail",
  className,
}: {
  variant?: "rail" | "bar";
  className?: string;
}) {
  const compact = variant === "bar";

  return (
    <Link
      to="/"
      aria-label="Dan Olekh — back to the home page"
      className={cn(
        "group flex min-w-0 items-center transition-colors",
        compact ? "gap-2" : "gap-2.5",
        className,
      )}
    >
      <img
        src="/images/me.jpeg"
        alt="Dan Olekh"
        width={compact ? 28 : 40}
        height={compact ? 28 : 40}
        className={cn(
          "shrink-0 rounded-lg object-cover shadow-sm ring-1 ring-border transition-transform group-hover:scale-105",
          compact ? "size-7" : "size-10",
        )}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-foreground/90 group-hover:text-primary">
          Dan Olekh
        </span>
        {!compact && (
          <span className="truncate text-xs text-muted-foreground">Software engineer</span>
        )}
      </span>
    </Link>
  );
}
