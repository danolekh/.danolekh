import { useEffect, useRef, useState } from "react";

import { Backdrop } from "./fx/Backdrop";
import { Camera, Flash, Grain, Halftone } from "./fx/Finish";
import { Hud } from "./fx/Hud";
import { schedule } from "./audio";
import { control, mode, mounted } from "./lib/stage";
import { at, BARS, DURATION, FPS } from "./lib/time";
import { Cardstock } from "./scenes/Cardstock";
import { Consolline } from "./scenes/Consolline";
import { Lockup } from "./scenes/Lockup";
import { Name } from "./scenes/Name";
import { Oasi } from "./scenes/Oasi";
import { Sportmagaz } from "./scenes/Sportmagaz";
import { Systems } from "./scenes/Systems";

/* Dan Olekh's 15-second showreel, as a page: eight bars at 128 BPM, filmed frame by frame by
 * cardstock's recorder. Bar by bar: the name; Oasi Kadir's PageSpeed 69 to 99; the load time and the
 * review; SportMagaz; consolline.com's WebGL; cardstock; the backend and the stack; the closing
 * card. Every claim on screen comes from ~/growth/me and the case studies. */

export function Showreel() {
  useEffect(mounted, []);
  return (
    <>
      <div className="stage">
        <Backdrop />
        <Camera>
          <Oasi />
          <Sportmagaz />
          <Consolline />
          <Cardstock />
          <Systems />
          <Lockup />
          <Name />
        </Camera>
        <Hud />
        <Halftone />
        <Flash />
        <Grain />
        {/* Directional blur for the whip pans: stdDeviation "x 0" smears along x only. */}
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <filter id="whip-out" x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur id="whip-out-blur" stdDeviation="0 0" />
          </filter>
          <filter id="whip-in" x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur id="whip-in-blur" stdDeviation="0 0" />
          </filter>
        </svg>
      </div>
      {mode === "play" && <Scrubber />}
    </>
  );
}

function Scrubber() {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(control.playing);
  const last = useRef(0);
  useEffect(
    () =>
      control.onTick((now, p) => {
        if (Math.abs(now - last.current) < 1 / 30 && p === playing) return;
        last.current = now;
        setT(now);
        setPlaying(p);
      }),
    [playing],
  );
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        if (control.playing) control.pause();
        else control.play();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        control.pause();
        control.seek(t + (e.key === "ArrowRight" ? 1 : -1) / FPS);
      } else if (/^[1-8]$/.test(e.key)) control.seek(at(Number(e.key) - 1));
      else if (e.key === "a") {
        // From the top with the soundtrack, both started a moment from now.
        const ctx = new AudioContext();
        const lead = 0.15;
        schedule(ctx, ctx.currentTime + lead);
        control.pause();
        control.seek(0);
        setTimeout(() => control.play(), lead * 1000);
        setTimeout(() => void ctx.close(), (DURATION + lead + 0.5) * 1000);
      }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [t]);
  return (
    <div className="scrubber">
      <button onClick={() => (control.playing ? control.pause() : control.play())}>{playing ? "pause" : "play"}</button>
      <input
        type="range"
        min={0}
        max={DURATION}
        step={1 / FPS}
        value={t}
        onChange={(e) => control.seek(Number(e.target.value))}
      />
      <span className="num">
        {t.toFixed(3)}s · bar {Math.min(BARS, Math.floor(t / (DURATION / BARS)) + 1)}
      </span>
    </div>
  );
}
