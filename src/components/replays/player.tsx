import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import MuxVideo from "@mux/mux-video-react";
import { addChapters } from "@mux/playback-core";
// Mux's playback-core lists hls.js renditions on `video.videoRenditions` (the quality menu) via
// this polyfill, which mux-video bundles and the React <video> doesn't. Without it, Safari, which
// has native `videoTracks` but no `addVideoTrack`, breaks hls.js mid-setup and never plays.
import "media-tracks/polyfill";
import { IconLoader2, IconPlayerPlayFilled } from "@tabler/icons-react";
import {
  MediaPlayer,
  MediaPlayerControls,
  MediaPlayerControlsOverlay,
  MediaPlayerError,
  MediaPlayerFullscreen,
  MediaPlayerPiP,
  MediaPlayerPlay,
  MediaPlayerSeek,
  MediaPlayerSeekBackward,
  MediaPlayerSeekForward,
  MediaPlayerSettings,
  MediaPlayerTime,
  MediaPlayerVideo,
  MediaPlayerVolume,
} from "@/components/ui/media-player";
import {
  formatRunTime,
  playerAvailableUntil,
  type ChapterCue,
  type RunPlayer,
} from "@/lib/replays/meta";
import { useSync, useSyncState } from "./sync-context";

/* Every player is rendered once, into a detached <div> (its host), and the layouts only move that
 * host into whichever panel shows it. Switching who's big, reordering, or rotating a phone across
 * the breakpoint then moves a playing <video> instead of mounting a new one, so nothing reloads
 * or falls out of sync. */

export function createHost() {
  const host = document.createElement("div");
  host.className = "absolute inset-0";
  return host;
}

/** Where a player's host is shown. */
export function PlayerSlot({ host }: { host: HTMLDivElement | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || !host) return;
    box.appendChild(host);
    return () => {
      if (host.parentNode === box) box.removeChild(host);
    };
  }, [host]);
  return <div ref={ref} className="absolute inset-0" />;
}

export function PlayerView({
  player,
  startAt,
  audible,
  chapters,
  showStart,
}: {
  player: RunPlayer;
  startAt: number;
  audible: boolean;
  /** The run's splits and death, as chapters on the seek bar. */
  chapters: ChapterCue[];
  /** The big play button, until the first play. */
  showStart: boolean;
}) {
  const group = useSync();
  const videoRef = useRef<HTMLVideoElement>(null);
  const until = playerAvailableUntil(player);
  // No segment rendered yet: nothing to load, only the "rendering…" card.
  const src = player.hls && until > 0 ? player.hls : undefined;
  const status = useSyncState((s) => s.players[player.name]);
  const playing = useSyncState((s) => s.playing);
  const rendering = player.status === "rendering" && (status === "unavailable" || !src);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;
    return group.attach(player.name, media, until);
    // `until` changes are passed on below; re-attaching would reset the video's sync state.
  }, [group, player.name]);

  useEffect(() => group.setAvailableUntil(player.name, until), [group, player.name, until]);

  // Chapters go into the src-less chapters track playback-core keeps on the video: a <track src>
  // would hold Safari's readyState at HAVE_CURRENT_DATA until it loads, and from a blob it never
  // does. Flipping the mode makes the TextTrackList fire `change`, which media-chrome re-reads.
  useEffect(() => {
    const media = videoRef.current;
    if (!media || chapters.length === 0) return;
    let live = true;
    void addChapters(media, chapters).then((track) => {
      if (!live) return;
      track.mode = "disabled";
      track.mode = "hidden";
    });
    return () => {
      live = false;
    };
  }, [chapters]);

  // The big panel speaks, the side panels don't; each keeps its own controls after that.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = !audible;
  }, [audible]);

  return (
    <MediaPlayer
      autoHide
      label={`${player.name}'s point of view`}
      className="@container/player size-full bg-black [&_video]:size-full [&_video]:object-contain"
    >
      <MediaPlayerVideo
        ref={videoRef}
        playsInline
        render={
          <MuxVideo
            src={src}
            startTime={startAt}
            preload="auto"
            // hls.js wherever it runs (Safari too): one behaviour to keep in sync, the quality
            // menu everywhere, and no native live-edge jumps on playlists still being rendered.
            preferPlayback="mse"
            poster={player.poster ?? undefined}
            // Side panels are small: no need to pull 1080p into a 300 px tile.
            capRenditionToPlayerSize
            disableTracking
            disableCookies
          />
        }
      />
      <MediaPlayerError />

      {rendering ? (
        <div
          role="status"
          className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center gap-1 bg-black/80 text-center text-white"
        >
          <p className="text-sm font-medium">
            rendering…
            {player.segmentsDone !== null && player.segmentsTotal !== null
              ? ` ${player.segmentsDone}/${player.segmentsTotal} segments`
              : null}
          </p>
          {until > 0 && (
            <p className="text-xs text-white/60">
              ready up to <span className="tabular-nums">{formatRunTime(until * 1000, 0)}</span>
            </p>
          )}
        </div>
      ) : playing && (status === "buffering" || status === "loading") ? (
        <div
          role="status"
          aria-label="Buffering"
          className="pointer-events-none absolute inset-0 z-40 grid place-items-center"
        >
          <IconLoader2 className="size-10 animate-spin stroke-[1.5] text-white/90 drop-shadow" />
        </div>
      ) : null}

      {showStart && !rendering && (
        <button
          type="button"
          onClick={() => group.play()}
          aria-label="Play every view"
          className="absolute inset-0 z-40 m-auto grid size-16 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
        >
          <IconPlayerPlayFilled className="size-7" />
        </button>
      )}

      <MediaPlayerControls className="flex-col items-stretch gap-1.5 px-2 pb-1.5">
        <MediaPlayerControlsOverlay className="from-black/70" />
        <MediaPlayerSeek />
        <div className="flex w-full items-center gap-0.5">
          <div className="flex min-w-0 flex-1 items-center gap-0.5">
            <MediaPlayerPlay />
            <MediaPlayerSeekBackward className="hidden @md/player:inline-flex" />
            <MediaPlayerSeekForward className="hidden @md/player:inline-flex" />
            <MediaPlayerVolume expandable />
            <MediaPlayerTime className="hidden text-xs @sm/player:flex" />
          </div>
          <div className="flex items-center gap-0.5">
            <MediaPlayerSettings />
            <MediaPlayerPiP className="hidden @xs/player:inline-flex" />
            <MediaPlayerFullscreen />
          </div>
        </div>
      </MediaPlayerControls>
    </MediaPlayer>
  );
}

const JUSTIFY = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;
const ITEMS = { start: "items-start", center: "items-center", end: "items-end" } as const;

/** A 16:9 box as large as fits in its panel, leaning towards `x`/`y` when there's room left. */
export function FitBox({
  children,
  className,
  x = "center",
  y = "center",
}: {
  children: ReactNode;
  className?: string;
  x?: "start" | "center" | "end";
  y?: "start" | "center" | "end";
}) {
  return (
    <div className="relative size-full" style={{ containerType: "size" }}>
      <div className={`absolute inset-0 flex ${JUSTIFY[x]} ${ITEMS[y]}`}>
        <div
          className={className}
          style={{ width: "min(100cqw, calc(100cqh * 16 / 9))", aspectRatio: "16 / 9" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
