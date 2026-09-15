import type { CountryCode } from "@/data/hydraulics";
import { cn } from "@/lib/utils";

/* Inline country flags, drawn rather than fetched.
 *
 * Emoji flags were the obvious shortcut and the wrong one: Chrome on Windows has no flag glyphs and
 * renders the regional-indicator pair as bare letters ("DE"), so a third of visitors would see
 * something different from everyone else. An icon font or flagcdn means an extra network dependency
 * for nine tiny shapes. So they live here as paths.
 *
 * All of them share a 3:2 viewBox so a row of flags lines up, even where the real proportions
 * differ — at 16px nobody is measuring, but a ragged row is visible immediately.
 */

const FLAGS: Record<CountryCode, { name: string; render: () => React.ReactNode }> = {
  de: {
    name: "Германия",
    render: () => (
      <>
        <rect width="30" height="6.67" fill="#000" />
        <rect y="6.67" width="30" height="6.66" fill="#D00" />
        <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
      </>
    ),
  },
  bg: {
    name: "Болгария",
    render: () => (
      <>
        <rect width="30" height="6.67" fill="#fff" />
        <rect y="6.67" width="30" height="6.66" fill="#00966E" />
        <rect y="13.33" width="30" height="6.67" fill="#D62612" />
      </>
    ),
  },
  it: {
    name: "Италия",
    render: () => (
      <>
        <rect width="10" height="20" fill="#009246" />
        <rect x="10" width="10" height="20" fill="#F1F2F1" />
        <rect x="20" width="10" height="20" fill="#CE2B37" />
      </>
    ),
  },
  cz: {
    name: "Чехия",
    render: () => (
      <>
        <rect width="30" height="10" fill="#fff" />
        <rect y="10" width="30" height="10" fill="#D7141A" />
        <path d="M0 0l15 10L0 20z" fill="#11457E" />
      </>
    ),
  },
  pl: {
    name: "Польша",
    render: () => (
      <>
        <rect width="30" height="10" fill="#fff" />
        <rect y="10" width="30" height="10" fill="#DC143C" />
      </>
    ),
  },
  jp: {
    name: "Япония",
    render: () => (
      <>
        <rect width="30" height="20" fill="#fff" />
        <circle cx="15" cy="10" r="6" fill="#BC002D" />
      </>
    ),
  },
  cn: {
    name: "Китай",
    render: () => (
      <>
        <rect width="30" height="20" fill="#EE1C25" />
        <path d="M5 2.5l1.18 3.63-3.09-2.24h3.82L3.82 6.13z" fill="#FF0" />
        <circle cx="10.5" cy="2.2" r="0.9" fill="#FF0" />
        <circle cx="12.6" cy="4.5" r="0.9" fill="#FF0" />
        <circle cx="12.6" cy="7.6" r="0.9" fill="#FF0" />
        <circle cx="10.5" cy="9.7" r="0.9" fill="#FF0" />
      </>
    ),
  },
  tw: {
    name: "Тайвань",
    render: () => (
      <>
        <rect width="30" height="20" fill="#FE0000" />
        <rect width="15" height="10" fill="#000095" />
        <circle cx="7.5" cy="5" r="3.6" fill="#fff" />
        <circle cx="7.5" cy="5" r="2.2" fill="#000095" />
      </>
    ),
  },
  us: {
    name: "США",
    render: () => (
      <>
        <rect width="30" height="20" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => (
          <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
        ))}
        <rect width="13" height={(20 / 13) * 7} fill="#3C3B6E" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle key={`${row}-${col}`} cx={2 + col * 3} cy={2 + row * 3.4} r="0.7" fill="#fff" />
          )),
        )}
      </>
    ),
  },
};

export function Flag({
  cc,
  className,
  labelled = false,
}: {
  cc: CountryCode;
  className?: string;
  /** Expose the country name to assistive tech. Leave false when adjacent text already names it. */
  labelled?: boolean;
}) {
  const flag = FLAGS[cc];
  if (!flag) return null;

  return (
    <svg
      viewBox="0 0 30 20"
      className={cn(
        "inline-block h-[0.85em] w-[1.275em] shrink-0 rounded-[1px] align-[-0.1em] ring-1 ring-foreground/15",
        className,
      )}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? flag.name : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
    >
      {flag.render()}
    </svg>
  );
}

export function countryName(cc: CountryCode): string {
  return FLAGS[cc]?.name ?? cc.toUpperCase();
}
