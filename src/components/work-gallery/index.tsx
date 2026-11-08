import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { pageCover, startFlight, takeReturn, type Flight, type Rect } from "./flight";
import { createRenderer, type Hit, type Renderer } from "./renderer";
import { work, type WorkItem } from "./projects";

/** Rows on a wide screen. */
const ROWS = 2;

// Idle drift, radians per second. Each row goes its own way.
const DRIFT = [0.022, -0.016, 0.019];
const FRICTION = 3.2;
const FLATTEN_MS = 240;
// Card corners, as a share of the card's width (30 of 960 in the shader).
const cardRadius = (width: number) => width * 0.03125;

type Mode = "pending" | "gpu" | "plain";

/**
 * The curved gallery. `topRowCenter` is where the first row's middle card sits, in pixels from the
 * top of the canvas: the side cards rise above it, which is why the heading stays narrow.
 * WebGPU when the browser has it, WebGL2 otherwise, the same picture either way. With reduced motion,
 * or with neither, it is a row of plain cards.
 */
export function WorkGallery({ topRowCenter, narrowHeight }: { topRowCenter: number; narrowHeight: number }) {
  const [mode, setMode] = useState<Mode>("pending");
  const [fallbackReason, setFallbackReason] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const targetRef = useRef<(number | null)[]>([null, null, null]);
  // Coming back from a card's page: a plain image of the card stands in until the canvas is ready.
  const [back, setBack] = useState<Flight | null>(() => (typeof window === "undefined" ? null : takeReturn()));
  // Its identity changes with the location; the canvas must not be rebuilt for that.
  const navigateFn = useNavigate();
  const navigateRef = useRef(navigateFn);
  navigateRef.current = navigateFn;

  useEffect(() => {
    const fallBack = (reason: string) => {
      // One line in the console and on the element, so "why is it flat?" has an answer.
      console.info(`Work gallery: plain row (${reason})`);
      setFallbackReason(reason);
      setMode("plain");
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      fallBack("reduced motion");
      return;
    }
    const canvas = canvasRef.current!;
    const root = rootRef.current!;
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    createRenderer(canvas, work, () => fallBack("GPU device lost"))
      .then((r) => {
        if (disposed) {
          r?.destroy();
          return;
        }
        if (!r) {
          fallBack("no WebGPU or WebGL2");
          return;
        }
        rendererRef.current = r;
        root.dataset.backend = r.kind;
        setMode("gpu");

        const fit = () => {
          const width = root.clientWidth;
          const narrow = width < 700;
          // Wide: as tall as the rows need at this width, plus room for the fade at the bottom.
          const wideHeight = r.heightFor(width, ROWS, topRowCenter) + 72;
          if (!narrow) root.parentElement?.style.setProperty("--gallery-height", `${wideHeight}px`);
          else root.parentElement?.style.removeProperty("--gallery-height");
          r.setLayout({
            rows: narrow ? 1 : ROWS,
            width,
            height: narrow ? narrowHeight : wideHeight,
            dpr: Math.min(devicePixelRatio || 1, 2),
            topRowCenter: narrow ? narrowHeight / 2 : topRowCenter,
          });
          r.draw();
        };
        fit();
        back?.spins.forEach((spin, row) => r.setSpin(row, spin));
        const ro = new ResizeObserver(fit);
        ro.observe(root);

        // Posters first, so nothing waits on a video; clips join once the page has settled.
        work.forEach(async (item, layer) => {
          const blob = await (await fetch(item.poster)).blob();
          const bmp = await createImageBitmap(blob, { resizeWidth: 960, resizeHeight: 600 });
          if (!disposed) r.upload(layer, bmp);
          bmp.close();
        });

        const videos: (HTMLVideoElement | null)[] = [];
        const startVideos = () => {
          work.forEach((item, layer) => {
            if (!item.video) return;
            const v = document.createElement("video");
            v.muted = true;
            v.loop = true;
            v.playsInline = true;
            v.preload = "auto";
            v.src = item.video;
            videos[layer] = v;
          });
        };
        const idle = window.setTimeout(startVideos, 900);

        const pump = () => {
          videos.forEach((v, layer) => {
            if (!v) return;
            const wanted = r.isLayerVisible(layer) && inView;
            if (wanted && v.paused) void v.play().catch(() => {});
            if (!wanted && !v.paused) v.pause();
            if (wanted && v.readyState >= 2 && lastTime[layer] !== v.currentTime) {
              lastTime[layer] = v.currentTime;
              r.upload(layer, v);
            }
          });
        };
        const lastTime: number[] = [];

        // Drag state, one row at a time.
        let drag: { row: number; id: number; x: number; y: number; moved: number; lastX: number; lastT: number } | null = null;
        const velocity = [0, 0, 0];
        let hover: Hit | null = null;
        let inView = true;
        // Held still while a card is on its way out or back.
        let opening = back !== null;

        let last = performance.now();
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!inView || document.hidden) return;
          r.spins().forEach((spin, row) => {
            const target = targetRef.current[row];
            if (typeof target === "number") {
              const next = spin + (target - spin) * (1 - Math.exp(-dt * 7));
              r.setSpin(row, next);
              if (Math.abs(target - next) < 0.0005) targetRef.current[row] = null;
              return;
            }
            if (drag?.row === row || opening) return;
            const paused = hover?.row === row;
            const rest = paused ? 0 : (DRIFT[row] ?? 0);
            velocity[row] = rest + (velocity[row]! - rest) * Math.exp(-dt * FRICTION);
            r.setSpin(row, spin + velocity[row]! * dt);
          });
          pump();
          r.draw();
        };
        raf = requestAnimationFrame(frame);

        const local = (e: PointerEvent) => {
          const b = canvas.getBoundingClientRect();
          return { x: e.clientX - b.left, y: e.clientY - b.top };
        };
        const onDown = (e: PointerEvent) => {
          const p = local(e);
          const row = r.rowAt(p.x, p.y);
          if (row === null) return;
          drag = { row, id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, lastX: e.clientX, lastT: e.timeStamp };
          velocity[row] = 0;
          targetRef.current[row] = null;
          canvas.setPointerCapture(e.pointerId);
          canvas.style.cursor = "grabbing";
        };
        const onMove = (e: PointerEvent) => {
          if (drag && e.pointerId === drag.id) {
            const dx = e.clientX - drag.lastX;
            const dt = Math.max(1, e.timeStamp - drag.lastT) / 1000;
            const dTheta = dx / r.pxPerRadian();
            r.setSpin(drag.row, r.spins()[drag.row]! + dTheta);
            velocity[drag.row] = velocity[drag.row]! * 0.6 + (dTheta / dt) * 0.4;
            drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
            drag.lastX = e.clientX;
            drag.lastT = e.timeStamp;
            return;
          }
          const p = local(e);
          hover = r.hitTest(p.x, p.y);
          canvas.style.cursor = hover ? "grab" : "";
        };
        const onUp = (e: PointerEvent) => {
          if (!drag || e.pointerId !== drag.id) return;
          const wasClick = drag.moved < 6;
          const row = drag.row;
          drag = null;
          canvas.style.cursor = "";
          if (e.type === "pointercancel") return;
          if (wasClick) {
            velocity[row] = 0;
            const p = local(e);
            const hit = r.hitTest(p.x, p.y);
            if (hit) open(hit);
          }
        };
        const onLeave = () => {
          hover = null;
        };

        const open = (hit: Hit) => {
          if (hit.item.external) {
            window.open(hit.item.href, "_blank", "noopener");
            return;
          }
          if (!document.startViewTransition) {
            void navigateRef.current({ to: hit.item.href });
            return;
          }
          opening = true;
          // The card straightens out, then a plain image of it takes over and flies to its page.
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / FLATTEN_MS);
            r.setFlatten({ row: hit.row, slot: hit.slot, t: 1 - Math.pow(1 - t, 3) });
            if (t < 1) {
              requestAnimationFrame(step);
              return;
            }
            fly(hit);
          };
          requestAnimationFrame(step);
        };

        const fly = (hit: Hit) => {
          const rect: Rect = r.flatRect(hit.row, hit.slot);
          const b = canvas.getBoundingClientRect();
          startFlight({
            galleryPath: location.pathname,
            href: hit.item.href,
            row: hit.row,
            slot: hit.slot,
            spins: [...r.spins()],
            rect,
            poster: hit.item.poster,
          });
          const ghost = document.createElement("img");
          ghost.src = hit.item.poster;
          ghost.alt = "";
          ghost.style.cssText = `position:fixed;left:${b.left + rect.x}px;top:${b.top + rect.y}px;width:${rect.width}px;height:${rect.height}px;border-radius:${cardRadius(rect.width)}px;object-fit:cover;z-index:50;view-transition-name:work-card`;
          document.body.appendChild(ghost);
          ghost.decode().finally(() => {
            const vt = document.startViewTransition(async () => {
              ghost.remove();
              await navigateRef.current({ to: hit.item.href });
              const cover = pageCover();
              if (cover) cover.style.viewTransitionName = "work-card";
            });
            vt.finished.finally(() => {
              pageCover()?.style.removeProperty("view-transition-name");
              opening = false;
              r.setFlatten(null);
            });
          });
        };

        // Home again: once the flight has landed and the card's poster is in, the stand-in leaves
        // and the flat card bends back into its row.
        let landing = 0;
        if (back) {
          r.setFlatten({ row: back.row, slot: back.slot, t: 1 });
          r.draw();
          landing = window.setTimeout(() => {
            setBack(null);
            const start = performance.now();
            const bend = (now: number) => {
              const t = Math.min(1, (now - start) / FLATTEN_MS);
              r.setFlatten({ row: back.row, slot: back.slot, t: Math.pow(1 - t, 3) });
              if (t < 1) {
                requestAnimationFrame(bend);
                return;
              }
              r.setFlatten(null);
              opening = false;
            };
            requestAnimationFrame(bend);
          }, 750);
        }

        const onKey = (e: KeyboardEvent) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          const dir = e.key === "ArrowLeft" ? 1 : -1;
          r.spins().forEach((spin, row) => {
            targetRef.current[row] = (targetRef.current[row] ?? spin) + dir * r.span;
          });
        };

        const onFocusIn = (e: FocusEvent) => {
          const layer = Number((e.target as HTMLElement).dataset.layer);
          if (Number.isNaN(layer)) return;
          targetRef.current[0] = r.spinToCentre(0, layer);
        };

        const io = new IntersectionObserver(([entry]) => {
          inView = entry?.isIntersecting ?? true;
          if (!inView) pump();
          last = performance.now();
        });
        io.observe(root);

        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);
        canvas.addEventListener("pointerleave", onLeave);
        root.addEventListener("keydown", onKey);
        root.addEventListener("focusin", onFocusIn);

        cleanup = () => {
          cancelAnimationFrame(raf);
          clearTimeout(idle);
          clearTimeout(landing);
          ro.disconnect();
          io.disconnect();
          canvas.removeEventListener("pointerdown", onDown);
          canvas.removeEventListener("pointermove", onMove);
          canvas.removeEventListener("pointerup", onUp);
          canvas.removeEventListener("pointercancel", onUp);
          canvas.removeEventListener("pointerleave", onLeave);
          root.removeEventListener("keydown", onKey);
          root.removeEventListener("focusin", onFocusIn);
          videos.forEach((v) => {
            if (v) {
              v.pause();
              v.removeAttribute("src");
              v.load();
            }
          });
          r.destroy();
        };
      })
      .catch((error: unknown) => fallBack(`error: ${String(error)}`));

    return () => {
      disposed = true;
      cleanup();
    };
    // `back` is only read on mount; clearing it must not rebuild the canvas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrowHeight, topRowCenter]);

  if (mode === "plain") return <PlainRow reason={fallbackReason} />;

  return (
    <div
      ref={rootRef}
      id="work"
      className="relative mt-12 h-(--gallery-height) scroll-mt-24 overflow-hidden min-[700px]:absolute min-[700px]:inset-x-0 min-[700px]:top-0 min-[700px]:mt-0"
      aria-roledescription="carousel"
      aria-label="Selected work"
    >
      <canvas ref={canvasRef} className="block w-full touch-pan-y select-none" aria-hidden="true" style={{ height: "var(--gallery-height)", maskImage: "var(--gallery-mask)" }} />
      {back && (
        <img
          src={back.poster}
          alt=""
          className="absolute z-10 object-cover"
          style={{
            left: back.rect.x,
            top: back.rect.y,
            width: back.rect.width,
            height: back.rect.height,
            borderRadius: cardRadius(back.rect.width),
            viewTransitionName: "work-card",
          }}
        />
      )}
      <p className="sr-only">Drag a row to spin it, or use the left and right arrow keys. Select a card to open it.</p>
      {/* The canvas can't be tabbed through; these can, and focusing one brings its card round. */}
      <ul className="sr-only">
        {work.map((item, layer) => (
          <li key={item.slug}>
            <a
              href={item.href}
              data-layer={layer}
              {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
              className="focus:not-sr-only focus:fixed focus:bottom-6 focus:left-6 focus:z-50 focus:rounded-full focus:bg-black focus:px-4 focus:py-2 focus:text-sm focus:text-white"
            >
              {item.title}, {item.tag.toLowerCase()}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Sits in the page's flow under the hero text: a swipeable row on phones, a grid on wide screens,
// where a mouse has nothing to swipe with. Clips still play unless motion is turned off.
function PlainRow({ reason }: { reason: string }) {
  const still = reason === "reduced motion";
  return (
    <div
      id="work"
      data-fallback={reason}
      className="relative z-10 mx-auto mt-12 flex max-w-6xl scroll-mt-24 snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-12 [scrollbar-width:none] min-[700px]:grid min-[700px]:grid-cols-2 min-[700px]:overflow-visible lg:grid-cols-3"
    >
      {work.map((item) => (
        <PlainCard key={item.slug} item={item} still={still} />
      ))}
    </div>
  );
}

function PlainCard({ item, still }: { item: WorkItem; still: boolean }) {
  return (
    <a
      href={item.href}
      {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
      aria-label={`${item.title}, ${item.tag.toLowerCase()}`}
      className="relative aspect-[8/5] w-[78vw] max-w-120 shrink-0 snap-center overflow-hidden rounded-2xl bg-neutral-200 min-[700px]:w-auto min-[700px]:max-w-none"
    >
      {item.video && !still ? (
        <video src={item.video} poster={item.poster} autoPlay muted loop playsInline className="size-full object-cover" />
      ) : (
        <img src={item.poster} alt="" loading="lazy" className="size-full object-cover" />
      )}
    </a>
  );
}
