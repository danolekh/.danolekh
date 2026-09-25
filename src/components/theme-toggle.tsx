import { useTheme } from "next-themes";
import { IconMoon, IconSun } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* Light ↔ dark switch, pinned to the bottom-right corner on every route.
 *
 * The default stays "system"; the first click stores an explicit choice. Both icons are in the
 * markup and the `.dark` class on <html> picks one, so the prerendered HTML is already right and
 * nothing waits on a mounted flag (same trick as the project covers).
 *
 * Where the browser supports it, the new theme is revealed as a circle growing out of the button.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  const toggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || reduceMotion) {
      setTheme(next);
      return;
    }

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

    const transition = document.startViewTransition(() => {
      // next-themes applies the class from an effect, which may land after the snapshot is taken;
      // set it here so the "new" snapshot is already in the new theme. The effect then no-ops.
      const root = document.documentElement;
      root.classList.toggle("dark", next === "dark");
      root.classList.toggle("light", next === "light");
      root.style.colorScheme = next;
      setTheme(next);
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 450,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    });
  };

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={toggle}
      aria-label="Toggle colour theme"
      title="Toggle colour theme"
      className={cn(
        "rounded-full border-border bg-background/75 shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <IconMoon className="dark:hidden" />
      <IconSun className="hidden dark:block" />
    </Button>
  );
}
