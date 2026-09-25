import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { IconPlayerPauseFilled, IconPlayerPlayFilled } from "@tabler/icons-react";
import { Cover, type CoverArt } from "@/components/project-cover";
import { cn } from "@/lib/utils";

/* Video over a cover. The prerendered page has only the cover (both theme cuts, as `Cover` does),
 * and the <video> is added on the client over it: it fades in once it is actually playing, so there
 * is no flash, and it downloads nothing until it plays. The poster is the video's first frame, so
 * the fade has nothing to jump.
 *
 * Motion is the viewer's call: with reduced motion or Save-Data nothing plays and the cover stays.
 */

/** A clip in the dark cut, and optionally a light one; like `cover` / `coverLight`. */
export type VideoCut = { src: string; srcLight?: string | null };

type NavigatorWithHints = Navigator & { connection?: { saveData?: boolean } };

/** `false` until mounted, and while the viewer asks for reduced motion or less data. */
function useVideoAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setAllowed(!mq.matches && !(navigator as NavigatorWithHints).connection?.saveData);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return allowed;
}

/** The cut for the theme the page is showing; `undefined` until next-themes knows it. */
function useThemedSrc(video: VideoCut): string | undefined {
  const { resolvedTheme } = useTheme();
  if (!resolvedTheme) return undefined;
  return resolvedTheme === "light" && video.srcLight ? video.srcLight : video.src;
}

type CoverProps = { art: CoverArt; video: VideoCut; className?: string; sizes?: string; priority?: boolean };

const VIDEO =
  "pointer-events-none absolute inset-0 size-full object-cover transition-opacity duration-300 ease-out";

/** A cover that plays its clip while `active`, like a preview on hover; it rewinds when it stops. */
export function PreviewVideo({ art, video, active, className, sizes, priority }: CoverProps & { active: boolean }) {
  const allowed = useVideoAllowed();
  const src = useThemedSrc(video);
  const ref = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);
  const on = active && allowed && src !== undefined;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (on) {
      el.play().catch(() => {});
      return;
    }
    el.pause();
    setShown(false);
    // Back to the first frame, which is the cover, so the next preview starts from the top.
    if (el.currentTime) el.currentTime = 0;
  }, [on, src]);

  return (
    <div data-slot="cover-video" className="relative">
      <Cover art={art} className={className} sizes={sizes} priority={priority} />
      {src ? (
        <video
          ref={ref}
          src={src}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden
          tabIndex={-1}
          onPlaying={() => setShown(true)}
          className={cn(VIDEO, shown && on ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </div>
  );
}

// One preview plays at a time on touch screens: the card that most recently came into view.
let playing: { stop: () => void } | null = null;

/** When a project card's preview plays: after a moment of hover or on keyboard focus with a mouse,
 * and while the card is well in view on a touch screen. Spread `props` on the card. */
export function useCardPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(hover: hover)").matches) return;
    const me = { stop: () => setActive(false) };
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (playing !== me) playing?.stop();
          playing = me;
          setActive(true);
        } else {
          if (playing === me) playing = null;
          setActive(false);
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (playing === me) playing = null;
    };
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  const hover = (on: boolean) => {
    clearTimeout(timer.current);
    // A short wait, as on YouTube, so a pointer passing over the grid doesn't start every card.
    if (on) timer.current = setTimeout(() => setActive(true), 250);
    else setActive(false);
  };

  return {
    active,
    props: {
      ref,
      onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && hover(true),
      onPointerLeave: (e: React.PointerEvent) => e.pointerType === "mouse" && hover(false),
      onFocus: (e: React.FocusEvent) => {
        if ((e.target as HTMLElement).matches(":focus-visible")) setActive(true);
      },
      onBlur: () => setActive(false),
    },
  };
}

/** A hero that plays its clip on a loop, muted, while it's on screen, with a button to pause it. */
export function HeroVideo({ art, video, className, sizes, priority }: CoverProps) {
  const allowed = useVideoAllowed();
  const src = useThemedSrc(video);
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [shown, setShown] = useState(false);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const on = allowed && src !== undefined && !paused && visible;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (on) el.play().catch(() => {});
    else el.pause();
  }, [on, src]);

  return (
    <div ref={box} data-slot="cover-video" className="relative">
      <Cover art={art} className={className} sizes={sizes} priority={priority} />
      {src && allowed ? (
        <>
          <video
            ref={ref}
            src={src}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden
            tabIndex={-1}
            onPlaying={() => setShown(true)}
            className={cn(VIDEO, "border border-dashed", shown ? "opacity-100" : "opacity-0")}
          />
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play the video" : "Pause the video"}
            className="absolute right-3 bottom-3 grid size-8 place-items-center rounded-full bg-background/80 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur transition-opacity hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {paused ? <IconPlayerPlayFilled className="size-4" /> : <IconPlayerPauseFilled className="size-4" />}
          </button>
        </>
      ) : null}
    </div>
  );
}
