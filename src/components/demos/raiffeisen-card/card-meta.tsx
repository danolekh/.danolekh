import { useEffect, useRef, useState } from "react";
import { animate, motion } from "motion/react";
import { IconSnowflake } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/* The line under the card: what's spent against the limit, counting to new values, and the frozen
 * status, which is said here next to the card rather than on it. */

const eur = (n: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/** A number that counts to its new value instead of jumping. */
function Counting({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  // Where the count stands now, so a new value mid-count (a scrub) carries on from there.
  const at = useRef(value);
  useEffect(() => {
    const controls = animate(at.current, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => ((at.current = v), setShown(Math.round(v))),
    });
    return () => controls.stop();
  }, [value]);
  return <span className="tabular-nums">{eur(shown)}</span>;
}

export function CardMeta({
  spent,
  limit,
  frozen,
  className,
}: {
  spent: number;
  limit: number;
  frozen: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[380px] items-baseline justify-between gap-3 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="grid" aria-live="polite">
        <motion.span
          className="[grid-area:1/1]"
          initial={false}
          animate={{ opacity: frozen ? 0 : 1, y: frozen ? -4 : 0 }}
          aria-hidden={frozen}
        >
          This month
        </motion.span>
        <motion.span
          className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-sky-700 [grid-area:1/1] dark:text-sky-300"
          initial={false}
          animate={{ opacity: frozen ? 1 : 0, y: frozen ? 0 : 4 }}
          aria-hidden={!frozen}
        >
          <IconSnowflake className="size-[1.05em]" aria-hidden />
          Karte gesperrt<span className="hidden sm:inline"> · Zahlungen pausiert</span>
        </motion.span>
      </span>
      <span className="whitespace-nowrap">
        <Counting value={spent} /> of <Counting value={limit} />
      </span>
    </div>
  );
}
