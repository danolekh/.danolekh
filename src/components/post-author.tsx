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
      className={cn("group flex min-w-0 items-center", compact ? "gap-2" : "gap-3", className)}
    >
      <img
        src="/images/me-face.jpg"
        alt="Dan Olekh"
        width={compact ? 28 : 44}
        height={compact ? 28 : 44}
        className={cn(
          "face shrink-0 rounded-full object-cover ring-[1.5px] ring-current",
          compact ? "size-7" : "size-11",
        )}
      />
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={cn(
            "display truncate leading-none group-hover:text-signal",
            compact ? "text-[18px]" : "text-[22px]",
          )}
        >
          Dan Olekh
        </span>
        {!compact && <span className="label mt-1 truncate opacity-80">Software engineer</span>}
      </span>
    </Link>
  );
}
