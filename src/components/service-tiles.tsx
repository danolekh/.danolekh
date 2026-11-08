import { Link } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";

// What I build, as four things, each showing itself working. The numbers and proof are real; the little
// interfaces are drawings of the idea, not screenshots.

const CSS = `
.service-tiles[data-playing="false"] * { animation-play-state: paused !important; }
@keyframes lab-pop { 0%, 6% { opacity: 0; transform: translateY(8px) scale(.97) } 14%, 88% { opacity: 1; transform: none } 96%, 100% { opacity: 0; transform: translateY(-4px) } }
.lab-pop { animation: lab-pop 6s cubic-bezier(.22,1,.36,1) infinite both; }
@keyframes lab-scan { 0%, 100% { background: #e5e5e5 } 20%, 40% { background: #171717 } }
.lab-scan { animation: lab-scan 3s ease-in-out infinite; }
@keyframes lab-grow { 0%, 100% { transform: scaleY(.85) } 50% { transform: scaleY(1) } }
.lab-grow { animation: lab-grow 3s ease-in-out infinite; }
@keyframes lab-lang { 0%, 22% { transform: translateX(0) } 25%, 47% { transform: translateX(32px) } 50%, 72% { transform: translateX(64px) } 75%, 97% { transform: translateX(96px) } 100% { transform: translateX(0) } }
.lab-lang { animation: lab-lang 8s cubic-bezier(.65,0,.35,1) infinite; }
@keyframes lab-pick { 0%, 8% { background: transparent; color: #a3a3a3 } 14%, 88% { background: #171717; color: #fff } 96%, 100% { background: transparent; color: #a3a3a3 } }
.lab-pick { animation: lab-pick 6s ease-out infinite both; }
@media (prefers-reduced-motion: reduce) { .lab-pop, .lab-scan, .lab-grow, .lab-lang, .lab-pick { animation: none } }
`;

function ReadsPapers() {
  return (
      <div className="flex size-full items-center justify-center gap-6 bg-neutral-100 p-8">
        <div className="grid w-2/5 gap-2 rounded-lg bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
          {[90, 70, 84, 60, 76].map((w, i) => (
            <span key={i} className="lab-scan h-2 rounded-full bg-neutral-200" style={{ width: `${w}%`, animationDelay: `${i * 0.4}s` }} />
          ))}
        </div>
        <div className="grid w-2/5 gap-2">
          {["Question 1", "Question 2", "Question 3"].map((q, i) => (
            <span key={q} className="lab-pop rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white" style={{ animationDelay: `${0.6 + i * 0.5}s` }}>
              {q}
            </span>
          ))}
        </div>
      </div>
    );
}

function Tile({ title, what, proof, children }: { title: string; what: string; proof: ReactNode; children: ReactNode }) {
  return (
    <li className="flex flex-col overflow-hidden rounded-2xl bg-neutral-100/80">
      <div className="relative h-[220px] overflow-hidden">{children}</div>
      <div className="p-6 pt-5">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-base text-pretty text-neutral-600">{what}</p>
        <p className="mt-3 text-sm text-neutral-500">{proof}</p>
      </div>
    </li>
  );
}

export function ServiceTiles() {
  const list = useRef<HTMLUListElement>(null);
  // The little scenes only run while they're on screen.
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.playing = entry?.isIntersecting ? "true" : "false";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <ul ref={list} className="service-tiles mt-12 grid gap-4 min-[800px]:grid-cols-2">
      <style>{CSS}</style>
      <Tile title="Websites and stores" what="Fast on a phone, in as many languages as you need, with an admin your team can run." proof={<><Link to="/p/$project" params={{ project: "consolline" }} className="underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 hover:text-neutral-900">Consolline, 4 languages</Link>. <Link to="/p/$project" params={{ project: "sportmagaz" }} className="underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 hover:text-neutral-900">SportMagaz, 2,000+ products</Link>.</>}>
        <div className="absolute inset-x-8 top-8 rounded-t-xl bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <span className="h-2.5 w-20 rounded-full bg-neutral-900" />
            <span className="relative flex h-7 w-[132px] rounded-full bg-neutral-100 p-0.5 text-xs font-medium">
              <span className="lab-lang absolute top-0.5 bottom-0.5 left-0.5 w-8 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]" />
              {["UK", "EN", "PL", "RU"].map((l) => (
                <span key={l} className="relative z-10 flex w-8 items-center justify-center">
                  {l}
                </span>
              ))}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <span key={i} className="lab-pop aspect-square rounded-lg bg-neutral-200" style={{ animationDelay: `${i * 0.25}s` }} />
            ))}
          </div>
        </div>
      </Tile>
      <Tile title="Booking and ordering" what="Real availability and online changes, landing in the tools you already use." proof={<><Link to="/p/$project" params={{ project: "oasi-kadir" }} className="underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 hover:text-neutral-900">Oasi Kadir, hotel and restaurant</Link>.</>}>
        <div className="absolute inset-x-8 top-8 rounded-t-xl bg-white p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_16px_40px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 21 }, (_, i) => (
              <span key={i} className={`flex aspect-square items-center justify-center rounded-md text-xs tabular-nums ${i >= 9 && i <= 12 ? "lab-pick text-neutral-900" : "text-neutral-400"}`} style={i >= 9 && i <= 12 ? { animationDelay: `${(i - 9) * 0.28}s` } : undefined}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </Tile>
      <Tile title="Web apps and AI" what="Accounts, payments and the backend, plus document reading and assistants tested on your data." proof="Quextro, reads exam papers, used by UK teachers.">
        <ReadsPapers />
      </Tile>
      <Tile title="Tools and rescue" what="The sync and the report nobody wants to do by hand, or a stalled build that I take over and fix." proof={<><Link to="/p/$project" params={{ project: "sportmagaz" }} className="underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 hover:text-neutral-900">SportMagaz, order alerts</Link>. <Link to="/p/$project" params={{ project: "oasi-kadir" }} className="underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 hover:text-neutral-900">Oasi Kadir, rebuilt with no source</Link>.</>}>
        <div className="absolute inset-x-8 top-7 grid gap-2">
          {["Mobile score 69 → 99", "Page load 16 s → under 2 s", "New order, sent to Telegram"].map((t, i) => (
            <span key={t} className="lab-pop flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.06)]" style={{ animationDelay: `${i * 0.6}s` }}>
              {t}
              <span className="size-2 rounded-full bg-green-600" />
            </span>
          ))}
        </div>
      </Tile>
    </ul>
  );
}
