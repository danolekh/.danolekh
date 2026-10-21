import { Link } from "@tanstack/react-router";
import { siteConfig } from "@/lib/config";

/* The frame every page sits in: the masthead (the mark, my name, the four sections) and the colophon
 * at the foot. The page under the current section gets its name printed in pink. */

const NAV = [
  { to: "/b", label: "Writing" },
  { to: "/lab", label: "Lab" },
  { to: "/feed", label: "Feed" },
  { to: "/resume", label: "Resume" },
] as const;

const CONTACTS = [
  { label: "Email", href: `mailto:${siteConfig.email}` },
  { label: "GitHub", href: siteConfig.links.github },
  { label: "LinkedIn", href: siteConfig.links.linkedin },
  { label: "X", href: siteConfig.links.twitter },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 pt-6 md:px-12 print:hidden">
      <div className="flex w-full items-center justify-between gap-6 border-b-[1.5px] border-foreground pb-4">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Dan Olekh — home">
          <span className="mark" style={{ "--s": "22px" } as React.CSSProperties} aria-hidden />
          <span className="display hidden pt-0.5 text-[26px] leading-none sm:inline">Dan Olekh</span>
        </Link>
        <nav className="label flex gap-5 sm:gap-7">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="transition-none hover:text-signal"
              activeProps={{ className: "text-signal", "aria-current": "page" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 pb-16 pt-24 md:px-12 print:hidden">
      <div className="flex flex-col gap-6 border-t-[1.5px] border-foreground pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="mark" style={{ "--s": "18px" } as React.CSSProperties} aria-hidden />
          <span className="label">Dan Olekh · Software engineer · Vienna</span>
        </div>
        <ul className="label flex flex-wrap gap-x-6 gap-y-2">
          {CONTACTS.map((c) => (
            <li key={c.label}>
              <a href={c.href} className="hover:text-signal">
                {c.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

/* The filter the `.face` class points at: a smooth blue duotone, shadows in the blue ink and the
 * light falling to paper. Kept in the document once so every portrait can use it. */
export function DuotoneFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <filter id="duo-face" colorInterpolationFilters="sRGB">
        <feColorMatrix
          type="matrix"
          values=".2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  .2126 .7152 .0722 0 0  0 0 0 1 0"
        />
        <feComponentTransfer>
          <feFuncR type="gamma" amplitude="1" exponent="0.8" offset="0" />
          <feFuncG type="gamma" amplitude="1" exponent="0.8" offset="0" />
          <feFuncB type="gamma" amplitude="1" exponent="0.8" offset="0" />
        </feComponentTransfer>
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.176 0.584 0.918" />
          <feFuncG type="table" tableValues="0.294 0.639 0.922" />
          <feFuncB type="table" tableValues="0.561 0.727 0.863" />
        </feComponentTransfer>
      </filter>
    </svg>
  );
}

/** The kicker's arrow: a hairline with a small head. */
export function KickerArrow() {
  return (
    <svg viewBox="0 0 80 8" aria-hidden>
      <path d="M0 4H78M72 .6L78.6 4L72 7.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** A section's head: its label, a rule to the edge, and an optional count or note on the right. */
export function SectionHead({ label, note }: { label: string; note?: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <h2 className="label">{label}</h2>
      <span className="h-[1.5px] flex-1 bg-current" aria-hidden />
      {note ? <span className="label">{note}</span> : null}
    </div>
  );
}
