import { useEffect } from "react";

/**
 * Starts `<video autoplay>` elements that come from markdown HTML.
 *
 * The browser's own autoplay isn't reliable for these: the article HTML is inserted more than once
 * while the page hydrates, and a video that is replaced mid-start stays paused (Chrome sometimes
 * reports a decode error for it). After the page settles, this mutes and plays each one, and
 * retries once if it errored.
 *
 * A post can carry a light and a dark cut of the same clip, one hidden by the theme class
 * (`dark:hidden` / `hidden dark:block`). Only the one on show plays; the other is paused, so it
 * doesn't download, and they swap when the theme changes.
 */
export function useAutoplayVideos(key: unknown) {
  useEffect(() => {
    const start = (video: HTMLVideoElement) => {
      video.muted = true;
      video.play().catch(() => {});
    };
    const shown = (video: HTMLVideoElement) => getComputedStyle(video).display !== "none";
    const videos = [...document.querySelectorAll<HTMLVideoElement>("article video[autoplay]")];
    const retries = new WeakSet<HTMLVideoElement>();
    const onError = (e: Event) => {
      const video = e.currentTarget as HTMLVideoElement;
      if (retries.has(video) || !shown(video)) return;
      retries.add(video);
      video.load();
      start(video);
    };
    const sync = () => {
      for (const video of videos) {
        if (!shown(video)) video.pause();
        else if (video.error) onError({ currentTarget: video } as unknown as Event);
        else if (video.paused) start(video);
      }
    };
    for (const video of videos) video.addEventListener("error", onError);
    sync();
    // next-themes switches the theme by the class on <html>.
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      theme.disconnect();
      videos.forEach((v) => v.removeEventListener("error", onError));
    };
  }, [key]);
}
