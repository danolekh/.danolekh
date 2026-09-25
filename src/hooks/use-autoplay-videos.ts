import { useEffect } from "react";

/**
 * Starts `<video autoplay>` elements that come from markdown HTML.
 *
 * The browser's own autoplay isn't reliable for these: the article HTML is inserted more than once
 * while the page hydrates, and a video that is replaced mid-start stays paused (Chrome sometimes
 * reports a decode error for it). After the page settles, this mutes and plays each one, and
 * retries once if it errored.
 */
export function useAutoplayVideos(key: unknown) {
  useEffect(() => {
    const start = (video: HTMLVideoElement) => {
      video.muted = true;
      video.play().catch(() => {});
    };
    const videos = [...document.querySelectorAll<HTMLVideoElement>("article video[autoplay]")];
    const retries = new WeakSet<HTMLVideoElement>();
    const onError = (e: Event) => {
      const video = e.currentTarget as HTMLVideoElement;
      if (retries.has(video)) return;
      retries.add(video);
      video.load();
      start(video);
    };
    for (const video of videos) {
      video.addEventListener("error", onError);
      if (video.error) onError({ currentTarget: video } as unknown as Event);
      else if (video.paused) start(video);
    }
    return () => videos.forEach((v) => v.removeEventListener("error", onError));
  }, [key]);
}
