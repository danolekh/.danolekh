import { useEffect, useRef, useState } from "react";

/* The call debugger itself (debugger.danolekh.com), live in a pitch page: as wide as the site's
 * column (the root layout clips at max-w-6xl), wider than the text, opened
 * zoomed at the finding that matters to the reader, in this site's theme. Full screen enlarges it;
 * on a phone, where it wouldn't fit and Safari has no element full screen, it's a picture that
 * opens it in a new tab. Embedded via ```demo:debugger with the moment as props. */
export default function DebuggerEmbed({
  call,
  finding,
  turn,
  t,
  from,
  to,
  image,
}: {
  call: string;
  finding?: string;
  turn?: string;
  t?: number;
  from?: number;
  to?: number;
  /** Shown on a phone in place of the debugger. */
  image?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">();
  const [canFull, setCanFull] = useState(false);
  useEffect(() => {
    // Read once: the debugger takes a theme for the visit, and switching it would reload the call.
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setCanFull(document.fullscreenEnabled === true);
  }, []);

  const moment = new URLSearchParams();
  for (const [key, value] of Object.entries({ finding, turn, t, from, to }))
    if (value !== undefined) moment.set(key, String(value));
  const link = `https://debugger.danolekh.com/call/${call}/?${moment}`;

  return (
    <figure className="not-prose relative left-1/2 my-10 w-[min(1152px,calc(100vw-2rem))] -translate-x-1/2">
      <div
        ref={frame}
        className="hidden h-[min(760px,80vh)] overflow-hidden rounded-xl border bg-card md:block [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
      >
        {theme ? (
          <iframe
            src={`${link}&theme=${theme}`}
            title="The call debugger, on a synthetic call"
            allow="clipboard-write; fullscreen"
            loading="lazy"
            className="size-full"
          />
        ) : null}
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener"
        className="block overflow-hidden rounded-xl border md:hidden"
      >
        {image ? <img src={image} alt="The call debugger, opened at this moment" className="w-full" /> : null}
        <span className="block px-4 py-3 text-sm font-medium">Open the debugger ↗</span>
      </a>
      <figcaption className="mt-3 hidden flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground md:flex">
        <span>The real debugger, on a synthetic call. Press play, zoom with Ctrl/⌘ and scroll, and ? shows every key.</span>
        <span className="flex gap-4">
          {canFull ? (
            <button
              type="button"
              onClick={() => void frame.current?.requestFullscreen()}
              className="hidden font-medium text-foreground underline-offset-4 hover:underline md:inline"
            >
              Full screen
            </button>
          ) : null}
          <a
            href={link}
            target="_blank"
            rel="noopener"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Open in a new tab ↗
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
