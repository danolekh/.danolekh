import "@fontsource/poppins/400.css";
import "@fontsource/poppins/500.css";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { FluidVisits, type Visit } from "@/components/fluid-visits/fluid-visits";

/* The concept, for RetInSight (retinsight.com). Two looks: theirs (their green and Poppins, the
 * report's fluid colours) and the site's (its shadcn tokens as they are, square corners, its type).
 * One eye with wet AMD through a year and a half of treat-and-extend: three monthly visits drain
 * it, the gaps grow to 12 weeks, the fluid comes back, and it drains again. The history, the
 * volumes and the scan are synthetic. Not affiliated with RetInSight.
 *
 * It plays the visits forward and back on its own, ending where it started, until someone
 * touches it. */

/** Weeks from the first visit, and the 6 mm volumes in nL. */
const HISTORY: [weeks: number, irf: number, srf: number, ped: number][] = [
  [0, 262.4, 148.1, 118.6],
  [4, 96.3, 41.2, 92.5],
  [8, 18.7, 6.1, 78.2],
  [12, 2.1, 0, 71.4],
  [18, 0.6, 0, 68.3],
  [26, 1.4, 0.3, 70.1],
  [36, 4.8, 2.2, 74.6],
  [48, 141.5, 63.4, 96.2],
  [52, 22.3, 4.1, 81.7],
  [58, 1.9, 0, 73.3],
  [66, 0.8, 0, 70.4],
  [76, 1.2, 0, 69.5],
];
const FIRST = Date.UTC(2024, 11, 2);
export const VISITS: Visit[] = HISTORY.map(([weeks, irf, srf, ped]) => ({
  date: new Date(FIRST + weeks * 7 * 86_400_000).toISOString().slice(0, 10),
  irf,
  srf,
  ped,
}));

const STEP_MS = 620;
const HOLD_MS = 900;

/** Forward through the visits, then back, while nobody has touched the demo. */
function usePingPong(count: number, enabled: boolean) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(enabled);
  const dir = useRef(1);
  useEffect(() => setPlaying(enabled), [enabled]);
  useEffect(() => {
    if (!playing) return;
    const at = index;
    const end = (dir.current > 0 && at === count - 1) || (dir.current < 0 && at === 0);
    const t = setTimeout(
      () => {
        if (end) dir.current = -dir.current;
        setIndex(at + dir.current);
      },
      end || at === 0 ? HOLD_MS : STEP_MS,
    );
    return () => clearTimeout(t);
  }, [index, playing, count]);
  return { index, setIndex, stop: () => setPlaying(false) };
}

export default function FluidVisitsDemo({ look = "retinsight" }: { look?: "retinsight" | "site" }) {
  const reduce = useReducedMotion();
  const { index, setIndex, stop } = usePingPong(VISITS.length, !reduce);
  return (
    <div data-slot="retinsight-demo" data-look={look} className="ri-demo">
      <style href="retinsight-demo" precedence="default">
        {CSS}
      </style>
      <div className="ri-stage" onPointerDownCapture={stop} onKeyDownCapture={stop}>
        <FluidVisits
          visits={VISITS}
          value={reduce ? undefined : index}
          defaultValue={0}
          onValueChange={setIndex}
          className="ri-card"
        />
      </div>
      <p className="ri-note">
        {look === "retinsight" ? "A design concept in RetInSight's style" : "A design concept for RetInSight"}, not
        affiliated. The scan and the volumes are synthetic.
      </p>
    </div>
  );
}

const CSS = `
.ri-demo[data-look=retinsight],.ri-demo[data-look=retinsight] *{font-family:Poppins,ui-sans-serif,system-ui,sans-serif}
.ri-demo[data-look=retinsight]{--primary:#3aaa35;--ring:#3aaa35}
.ri-demo[data-look=retinsight] .ri-stage{border-radius:16px;background:#f2f5f7;padding:clamp(12px,3vw,28px)}
.ri-demo[data-look=retinsight] .ri-card{border-radius:16px;background:#fff;padding:clamp(12px,2.4vw,20px);box-shadow:0 1px 2px rgb(25 25 24 / .06),0 8px 24px -12px rgb(25 25 24 / .18);--foreground:#191918;--muted-foreground:#5a6c7b;--border:#e0e6ea;--background:#fff;--muted:#f0f4f7}
.dark .ri-demo[data-look=retinsight] .ri-stage{background:#121211}
.dark .ri-demo[data-look=retinsight] .ri-card{background:#191918;box-shadow:inset 0 0 0 1px rgb(255 255 255 / .07);--foreground:#f2f5f7;--muted-foreground:#9aa8b3;--border:rgb(255 255 255 / .1);--background:#191918;--muted:#232322}
/* The site's look: its own tokens, square corners, and its type (the page's). */
.ri-demo[data-look=site] .ri-card{border:1px solid var(--border);padding:clamp(12px,2.4vw,20px)}
.ri-demo[data-look=site] [data-slot=fluid-visits-scan],.ri-demo[data-look=site] [aria-pressed] > span,.ri-demo[data-look=site] [aria-pressed] > span > span{border-radius:0}
.ri-note{margin:12px 2px 0;font-size:12px;color:#71717a}
.dark .ri-note{color:#a1a1aa}
`;
