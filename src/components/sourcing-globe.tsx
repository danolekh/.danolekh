import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import createGlobe, { type Marker } from "cobe";
import { Tabs } from "@base-ui/react/tabs";
import { useTheme } from "next-themes";
import {
  IconExternalLink,
  IconFocusCentered,
  IconMapPin,
  IconMinus,
  IconPlus,
} from "@tabler/icons-react";
import { Flag, countryName } from "@/components/flag";
import { SpecTable, VerdictBadge } from "@/components/sourcing-ui";
import {
  type Item,
  type Kind,
  type Site,
  formatEur,
  itemsForGlobe,
  itemsWithoutSite,
} from "@/data/hydraulics";
import { usePrefersReducedMotion } from "@/lib/use-heavy-effects";
import { cn } from "@/lib/utils";

/* Where every part in the post is actually made, on a globe.
 *
 * Design constraint that shaped everything below: the list is the product, the globe is decoration.
 * The list renders on the server, works with no JS, no WebGL and no CSS anchor positioning, and is
 * the thing screen readers and search engines see. The globe layers on top for browsers that can
 * take it. Selecting an item works identically through either surface.
 *
 * cobe v2 has no internal animation loop — it draws only when `update()` is called — so idle cost is
 * zero and the rotation is entirely ours to schedule. That is what makes it cheap enough to run on
 * every device, unlike the full-screen shader behind `useHeavyEffectsAllowed`: the loop already
 * stops on hover and off screen, and under reduced motion it stops spinning altogether.
 *
 * If WebGL is missing entirely `createGlobe` throws, so it is guarded — a broken globe must never
 * take the page down with it, and the list underneath is the real content anyway.
 */

// Rotation speed in radians per frame, and how fast the globe eases toward a selected marker.
const SPIN_PER_FRAME = 0.0025;
const EASE = 0.08;

// Tilt is clamped just short of the poles: past them the globe flips and the drag inverts.
const MAX_THETA = Math.PI / 2 - 0.15;

// Zoom range. cobe takes a `scale` ratio and recomputes its marker anchors from it, so the badges
// track the globe for free. 1 is "fits the canvas"; past ~4 the dot map looks sparse, because
// mapSamples is fixed at creation and cannot be raised through update().
const MIN_SCALE = 1;
const MAX_SCALE = 4;

/* Wheel zoom tuning.
 *
 * A trackpad pinch reaches the page as a wheel event with `ctrlKey` set and very fine deltas —
 * often single digits per event — while a mouse wheel sends coarse notches. One sensitivity cannot
 * serve both, which is why the first attempt at 0.0015 felt like nothing under a pinch.
 *
 * `deltaMode` matters just as much: some browsers report lines or pages rather than pixels, and a
 * delta of "3 lines" treated as 3 pixels is a hundredth of the intended movement. */
const PINCH_SENSITIVITY = 0.012;
const DELTA_MODE_TO_PX = [1, 16, 100]; // pixel, line, page
// One event should never move more than a step; some drivers emit very large single deltas.
const MAX_DELTA_PER_EVENT = 60;

function wheelDeltaPx(e: WheelEvent): number {
  const unit = DELTA_MODE_TO_PX[e.deltaMode] ?? 1;
  return clamp(e.deltaY * unit, -MAX_DELTA_PER_EVENT, MAX_DELTA_PER_EVENT);
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const MARKER_SIZE = 0.045;
const MARKER_SIZE_SELECTED = 0.09;

/** cobe's own recipe for turning a coordinate into the phi/theta that brings it to the front. */
function locationToAngles(lat: number, lng: number): [number, number] {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

const ROLE_MARKER_RGB = {
  // Amber for what the customer asked for, teal for what we found instead.
  original: [0.98, 0.62, 0.13] as [number, number, number],
  alternative: [0.11, 0.76, 0.65] as [number, number, number],
};

const SITE_KIND_LABEL: Record<Site["kind"], string> = {
  plant: "завод",
  hq: "штаб-квартира",
  division: "дивизион",
};

/** One pin per site, so a brand with three plants shows three. */
type Pin = { key: string; item: Item; site: Site };

export function SourcingGlobe({ title, caption }: { title?: string; caption?: string }) {
  const allPins = useMemo<Pin[]>(
    () =>
      itemsForGlobe().flatMap((item) =>
        item.sites.map((site, i) => ({ key: `${item.id}-${i}`, item, site })),
      ),
    [],
  );

  /* Both positions on one globe put a Bulgarian motor plant next to an Italian valve plant with
   * nothing to tell them apart, and a twelve-row list mixing the two. One tab per position keeps
   * each map answering a single question. The globe itself is shared — a second WebGL context
   * just to switch tabs would be waste — so it filters rather than remounts. */
  const [kind, setKind] = useState<Kind>("valve");
  const pins = useMemo(() => allPins.filter((p) => p.item.kind === kind), [allPins, kind]);
  const orphans = useMemo(() => itemsWithoutSite().filter((i) => i.kind === kind), [kind]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = pins.find((p) => p.key === selectedKey) ?? null;

  const { resolvedTheme } = useTheme();
  const reducedMotion = usePrefersReducedMotion();
  // Set only if createGlobe throws — then the canvas is dropped and the list carries on alone.
  const [globeFailed, setGlobeFailed] = useState(false);

  // Anchor positioning is what lets a real button sit over a marker. Chromium and Safari 26 have it,
  // Firefox does not yet — there the globe simply carries no floating labels and the list drives.
  const [anchorsSupported, setAnchorsSupported] = useState(false);
  useEffect(() => {
    setAnchorsSupported(
      typeof CSS !== "undefined" && typeof CSS.supports === "function"
        ? CSS.supports("position-anchor: --a")
        : false,
    );
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  /* Europe puts five plants inside a few hundred kilometres, so at globe scale their labels land on
   * top of each other and none of them can be read. Badges that would overlap collapse to a dot;
   * clicking a dot selects that pin, and a selected pin always keeps its label. Where there is room
   * nothing collapses, so the common case stays fully labelled. */
  const badgeRefs = useRef(new Map<string, HTMLButtonElement | null>());
  const labelSize = useRef(new Map<string, { w: number; h: number }>());
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  // Loop state lives in refs: the animation frame must not resubscribe on every render.
  const phi = useRef(0);
  const theta = useRef(0.25);
  const target = useRef<[number, number] | null>(null);
  const dragging = useRef(false);
  const paused = useRef(false);
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  // Read by the animation loop, which must not resubscribe every time the selection changes.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedKey;

  const scale = useRef(1);
  const [zoom, setZoom] = useState(1); // mirrors `scale` so the buttons can disable at the limits
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number; phi: number; theta: number } | null>(null);

  const focusSite = useCallback((site: Site) => {
    const angles = locationToAngles(site.lat, site.lng);
    angles[1] = clamp(angles[1], -MAX_THETA, MAX_THETA);
    if (reducedRef.current) {
      // No travelling animation when the reader asked for less motion — just be there.
      [phi.current, theta.current] = angles;
      target.current = null;
    } else {
      target.current = angles;
    }
  }, []);

  const changeKind = useCallback((next: string) => {
    setKind(next === "motor" ? "motor" : "valve");
    setSelectedKey(null);
  }, []);

  const select = useCallback(
    (pin: Pin | null) => {
      setSelectedKey(pin?.key ?? null);
      if (pin) focusSite(pin.site);
    },
    [focusSite],
  );

  useEffect(() => {
    if (!anchorsSupported) return;

    const resolve = () => {
      const placed: { l: number; r: number; t: number; b: number }[] = [];
      const next = new Set<string>();
      // Selected first — it must never be the one that loses its label — then the order the pins
      // already carry, which is originals, then recommended, then the rest.
      const keys = pins.map((pin) => pin.key);
      const order = selectedKey ? [selectedKey, ...keys.filter((k) => k !== selectedKey)] : keys;

      for (const key of order) {
        const el = badgeRefs.current.get(key);
        if (!el) continue;

        // offsetWidth is a layout value, so it survives the scale(0) that hides a badge behind the
        // globe — getBoundingClientRect would report zero there and poison the cache.
        let size = labelSize.current.get(key);
        if (!size || size.w === 0) {
          size = { w: el.offsetWidth, h: el.offsetHeight };
          if (size.w > 0) labelSize.current.set(key, size);
        }

        // Behind the globe: invisible, so it cannot collide with anything.
        if (Number.parseFloat(getComputedStyle(el).opacity) <= 0.5) continue;

        // `origin-bottom` plus `left: anchor(center)` puts the anchor at the bottom centre, which
        // is also where the rect collapses to when scaled — so this holds in either state.
        const rect = el.getBoundingClientRect();
        const ax = rect.left + rect.width / 2;
        const ay = rect.bottom;
        const box = { l: ax - size.w / 2, r: ax + size.w / 2, t: ay - size.h, b: ay };

        const overlaps = placed.some(
          (o) => box.l < o.r && box.r > o.l && box.t < o.b && box.b > o.t,
        );
        if (overlaps && key !== selectedKey) next.add(key);
        else placed.push(box);
      }

      setCollapsed((prev) =>
        prev.size === next.size && [...next].every((k) => prev.has(k)) ? prev : next,
      );
    };

    resolve();
    // Cheap enough to poll: a handful of rect reads while the globe turns.
    const id = window.setInterval(resolve, 150);
    return () => window.clearInterval(id);
  }, [anchorsSupported, pins, selectedKey]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onWheel = (e: WheelEvent) => {
      const pinching = e.ctrlKey || e.metaKey;
      // A plain wheel over the globe is the reader scrolling the article. Hijacking that to zoom a
      // figure embedded mid-post is hostile, so only a pinch (or ctrl+wheel) zooms; the buttons
      // cover everyone else.
      if (!pinching) return;
      e.preventDefault();
      applyZoomRef.current(scale.current * Math.exp(-wheelDeltaPx(e) * PINCH_SENSITIVITY));
    };

    /* Safari on macOS delivers pinches as gesture events carrying an absolute scale rather than as
     * ctrl+wheel, so it needs its own path or pinch does nothing there at all. */
    let gestureBase = 1;
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureBase = scale.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const factor = (e as Event & { scale?: number }).scale;
      if (factor) applyZoomRef.current(gestureBase * factor);
    };

    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("gesturestart", onGestureStart as EventListener);
    wrap.addEventListener("gesturechange", onGestureChange as EventListener);
    return () => {
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("gesturestart", onGestureStart as EventListener);
      wrap.removeEventListener("gesturechange", onGestureChange as EventListener);
    };
  }, []);

  const applyZoom = useCallback((next: number) => {
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
    if (clamped === scale.current) return;
    scale.current = clamped;
    dirty.current = true;
    setZoom(clamped);
  }, []);

  // The wheel listener binds once; route through a ref so it always calls the live callback.
  const applyZoomRef = useRef(applyZoom);
  applyZoomRef.current = applyZoom;

  const markers = useMemo<Marker[]>(
    () =>
      pins.map((pin) => ({
        location: [pin.site.lat, pin.site.lng],
        size: pin.key === selectedKey ? MARKER_SIZE_SELECTED : MARKER_SIZE,
        color: ROLE_MARKER_RGB[pin.item.role],
        id: pin.key,
      })),
    [pins, selectedKey],
  );

  const markersRef = useRef(markers);
  // Idle frames skip the draw call, so a change that only affects what is drawn — selecting a pin
  // resizes its marker — has to ask for one explicitly.
  const dirty = useRef(true);
  useEffect(() => {
    markersRef.current = markers;
    dirty.current = true;
  }, [markers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap || globeFailed) return;

    const dark = resolvedTheme === "dark";
    let size = wrap.clientWidth || 1;
    let raf = 0;
    let visible = true;

    let globe: ReturnType<typeof createGlobe>;
    try {
      globe = createGlobe(canvas, {
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        width: size * 2,
        height: size * 2,
        phi: phi.current,
        theta: theta.current,
        dark: dark ? 1 : 0,
        diffuse: dark ? 1.2 : 1.6,
        mapSamples: 12_000,
        mapBrightness: dark ? 5 : 8,
        baseColor: dark ? [0.24, 0.24, 0.27] : [0.85, 0.85, 0.88],
        markerColor: ROLE_MARKER_RGB.alternative,
        glowColor: dark ? [0.15, 0.15, 0.18] : [1, 1, 1],
        markerElevation: 0.02,
        scale: scale.current,
        markers: markersRef.current,
        // Ask for the efficient GPU. Deliberately no `failIfMajorPerformanceCaveat`: this globe is
        // meant to render everywhere, and that flag fails on exactly the low-end hardware we want it on.
        context: { powerPreference: "low-power" },
      });
    } catch {
      setGlobeFailed(true);
      return;
    }

    const draw = () => {
      const t = target.current;
      if (t) {
        // Ease toward the selected marker, taking the short way round the sphere.
        const dPhi = ((t[0] - phi.current + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        phi.current += dPhi * EASE;
        theta.current += (t[1] - theta.current) * EASE;
        if (Math.abs(dPhi) < 0.002) target.current = null;
      } else if (
        !dragging.current &&
        !paused.current &&
        !reducedRef.current &&
        // A selected pin holds still: spinning away from what the reader just picked, and out
        // from under its open detail panel, undoes the selection they made.
        !selectedRef.current
      ) {
        phi.current += SPIN_PER_FRAME;
      } else if (!t && !dragging.current && !dirty.current) {
        // Nothing moving and nothing changed: keep the loop alive but skip the draw, which is the
        // only real cost.
        raf = requestAnimationFrame(draw);
        return;
      }
      dirty.current = false;

      globe.update({
        phi: phi.current,
        theta: theta.current,
        scale: scale.current,
        width: size * 2,
        height: size * 2,
        markers: markersRef.current,
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      size = wrap.clientWidth || 1;
      dirty.current = true;
    });
    ro.observe(wrap);

    // Nothing to draw while scrolled away.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === visible) return;
      visible = entry.isIntersecting;
      if (visible) raf = requestAnimationFrame(draw);
      else cancelAnimationFrame(raf);
    });
    io.observe(wrap);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      globe.destroy();
    };
  }, [globeFailed, resolvedTheme]);

  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as Element).setPointerCapture?.(e.pointerId);

    if (pointers.current.size === 2) {
      // Second finger down: switch from spinning to pinching, and drop the spin anchor so the
      // globe doesn't lurch when the first finger moves as part of the pinch.
      const [a, b] = [...pointers.current.values()];
      pinchStart.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: scale.current };
      dragging.current = false;
      pointerStart.current = null;
      return;
    }

    dragging.current = true;
    target.current = null;
    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      phi: phi.current,
      theta: theta.current,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const pinch = pinchStart.current;
    if (pointers.current.size === 2 && pinch && pinch.dist > 0) {
      const [a, b] = [...pointers.current.values()];
      applyZoom((pinch.scale * Math.hypot(a.x - b.x, a.y - b.y)) / pinch.dist);
      return;
    }

    const start = pointerStart.current;
    if (!dragging.current || !start || !wrapRef.current) return;
    const box = wrapRef.current;
    const width = box.clientWidth || 1;
    const height = box.clientHeight || 1;
    // A full drag across the box is a full turn horizontally and half a turn vertically. Dividing
    // by the zoom keeps the felt speed constant: zoomed in, the same swipe covers less ground.
    phi.current = start.phi + ((e.clientX - start.x) / width / scale.current) * Math.PI * 2;
    theta.current = clamp(
      start.theta + ((e.clientY - start.y) / height / scale.current) * Math.PI,
      -MAX_THETA,
      MAX_THETA,
    );
  };

  const endDrag = (e?: React.PointerEvent) => {
    if (e) pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    dragging.current = false;
    pointerStart.current = null;
  };

  return (
    <section className="not-prose border border-dashed bg-card/60 p-4">
      {title ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
      ) : null}

      <Tabs.Root value={kind} onValueChange={changeKind} className="mt-3">
        <Tabs.List className="flex flex-wrap gap-1 border-b border-dashed">
          {(["valve", "motor"] as const).map((k) => (
            <Tabs.Tab
              key={k}
              value={k}
              className={cn(
                "-mb-px cursor-pointer rounded-t border-b-2 border-transparent px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                "text-muted-foreground hover:text-foreground",
                "data-[selected]:border-primary data-[selected]:font-medium data-[selected]:text-foreground",
              )}
            >
              {k === "valve" ? "Гидрораспределитель" : "Гидромотор"}
              <span className="ml-1.5 tabular-nums opacity-60">
                {allPins.filter((pin) => pin.item.kind === k).length}
              </span>
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* ── Globe ─────────────────────────────────────────────────────────── */}
          {!globeFailed ? (
            <div
              ref={wrapRef}
              className="relative mx-auto aspect-square w-full touch-pan-y overflow-hidden select-none lg:sticky lg:top-12 lg:self-start"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerLeave={() => {
                endDrag();
                paused.current = false;
              }}
              onPointerEnter={() => {
                paused.current = true;
              }}
            >
              <canvas
                ref={canvasRef}
                className="h-full w-full cursor-grab active:cursor-grabbing"
              />

              <div
                // Stop the press from also grabbing the globe underneath.
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-1 bottom-1 z-40 flex flex-col overflow-hidden rounded-md border border-dashed bg-background/75 backdrop-blur"
              >
                <ZoomButton
                  label="Приблизить"
                  disabled={zoom >= MAX_SCALE}
                  onClick={() => applyZoom(scale.current * 1.6)}
                >
                  <IconPlus className="size-3.5" aria-hidden />
                </ZoomButton>
                <ZoomButton
                  label="Отдалить"
                  disabled={zoom <= MIN_SCALE}
                  onClick={() => applyZoom(scale.current / 1.6)}
                >
                  <IconMinus className="size-3.5" aria-hidden />
                </ZoomButton>
                <ZoomButton
                  label="Сбросить масштаб"
                  disabled={zoom === 1}
                  onClick={() => applyZoom(1)}
                >
                  <IconFocusCentered className="size-3.5" aria-hidden />
                </ZoomButton>
              </div>

              {anchorsSupported
                ? pins.map((pin) => {
                    const isCollapsed = collapsed.has(pin.key) && pin.key !== selectedKey;
                    const original = pin.item.role === "original";
                    return (
                      <button
                        key={pin.key}
                        type="button"
                        ref={(el) => {
                          badgeRefs.current.set(pin.key, el);
                        }}
                        onClick={() => select(pin)}
                        title={isCollapsed ? `${pin.item.brand} · ${pin.site.city}` : undefined}
                        aria-label={isCollapsed ? `${pin.item.brand}, ${pin.site.city}` : undefined}
                        // The 1px anchor cobe places for this marker id drives both position and
                        // visibility; scale 0 while behind the globe also removes the hit area.
                        style={
                          {
                            positionAnchor: `--cobe-${pin.key}`,
                            "--v": `var(--cobe-visible-${pin.key}, 0)`,
                          } as React.CSSProperties
                        }
                        className={cn(
                          "absolute bottom-[anchor(top)] left-[anchor(center)] -translate-x-1/2 -translate-y-1",
                          // Dots sit under labels; otherwise a neighbour's dot lands on top of a
                          // label and eats the text, since same-z siblings fall back to DOM order.
                          isCollapsed ? "z-10" : "z-20",
                          "origin-bottom scale-[var(--v)] opacity-[var(--v)] transition-[scale,opacity] duration-200",
                          "rounded-full border shadow-sm backdrop-blur-sm",
                          isCollapsed
                            ? "size-3.5 border-2 bg-background/60"
                            : "flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
                          original
                            ? "border-amber-500/60 bg-amber-500/15 text-amber-900 dark:text-amber-200"
                            : "border-teal-500/60 bg-teal-500/15 text-teal-900 dark:text-teal-200",
                          pin.key === selectedKey && "z-30 ring-2 ring-foreground/30",
                        )}
                      >
                        {isCollapsed ? null : (
                          <>
                            <Flag cc={pin.site.cc} />
                            {pin.item.brand}
                          </>
                        )}
                      </button>
                    );
                  })
                : null}
            </div>
          ) : (
            <div className="mx-auto flex aspect-square w-full items-center justify-center rounded-full border border-dashed text-center text-xs text-muted-foreground">
              <span className="max-w-40">Глобус недоступен — в браузере нет WebGL</span>
            </div>
          )}

          {/* ── The list: primary interaction, works everywhere ───────────────── */}
          <Tabs.Panel value={kind} className="min-w-0">
            <ul className="divide-y divide-dashed">
              {pins.map((pin) => {
                const isSelected = pin.key === selectedKey;
                return (
                  <li key={pin.key}>
                    <button
                      type="button"
                      onClick={() => select(isSelected ? null : pin)}
                      aria-expanded={isSelected}
                      className={cn(
                        "flex w-full items-center gap-2 py-2 text-left text-sm transition-colors hover:bg-foreground/5",
                        pin.item.verdict === "ruled-out" && "opacity-60",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          pin.item.role === "original" ? "bg-amber-500" : "bg-teal-500",
                        )}
                      />
                      <Flag cc={pin.site.cc} />
                      <span className="min-w-0 flex-1">
                        <span className="font-medium">{pin.item.brand}</span>
                        <span className="text-muted-foreground"> · {pin.site.city}</span>
                      </span>
                      {pin.item.price ? (
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatEur(pin.item.price.eur)}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">цены нет</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {orphans.length > 0 ? (
              <p className="mt-3 border-t border-dashed pt-3 text-xs text-muted-foreground">
                Без пина на карте — место производства установить не удалось:{" "}
                {orphans.map((o) => o.brand).join(", ")}.
              </p>
            ) : null}
          </Tabs.Panel>
        </div>
      </Tabs.Root>

      {/* ── Detail for the selected pin ──────────────────────────────────────── */}
      {selected ? <PinDetail pin={selected} /> : null}

      <p className="mt-4 border-t border-dashed pt-3 text-xs text-muted-foreground">
        {caption ??
          "Вкладки — по позициям спецификации. Оригиналы янтарным, альтернативы бирюзовым. Тяните, чтобы вращать; пинчем, ctrl+колесом или кнопками — приближайте. Налезающие подписи сворачиваются в точки: нажмите, чтобы раскрыть и развернуть глобус к площадке."}
      </p>
    </section>
  );
}

function PinDetail({ pin }: { pin: Pin }) {
  const { item, site } = pin;
  return (
    <article className="mt-6 border-t border-dashed pt-4">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h4 className="text-base font-semibold">
          {item.brand} {item.part}
        </h4>
        <VerdictBadge verdict={item.verdict} />
        {item.material ? (
          <code className="text-xs text-muted-foreground">{item.material}</code>
        ) : null}
      </header>

      <p className="mt-2 text-sm text-muted-foreground">{item.takeaway}</p>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Row label="Площадка">
          <span className="inline-flex items-center gap-1.5">
            <IconMapPin className="size-3.5 text-muted-foreground" aria-hidden />
            <Flag cc={site.cc} />
            {site.city}, {countryName(site.cc)}
            <span className="text-xs text-muted-foreground">
              ({SITE_KIND_LABEL[site.kind]}
              {site.confidence === "estimate" ? ", по данным производителя" : ""})
            </span>
          </span>
        </Row>
        {item.owner ? <Row label="Владелец">{item.owner}</Row> : null}
        {item.price ? (
          <Row label="Цена за шт, без НДС">
            <span className="font-medium">{formatEur(item.price.eur)}</span>{" "}
            <span className="text-xs text-muted-foreground">— {item.price.source}</span>
          </Row>
        ) : null}
        {item.lead ? <Row label="Срок">{item.lead}</Row> : null}
        {item.stock ? <Row label="Наличие">{item.stock}</Row> : null}
        {item.sites.length > 1 ? (
          <Row label="Другие площадки">
            {item.sites
              .filter((s) => s.city !== site.city)
              .map((s) => s.city)
              .join(" · ")}
          </Row>
        ) : null}
      </dl>

      {item.price?.note ? (
        <p className="mt-2 text-xs text-muted-foreground">{item.price.note}</p>
      ) : null}

      {item.specs ? (
        <SpecTable rows={item.specs} candidateLabel={item.brand} className="mt-4" />
      ) : null}

      {item.sources.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {item.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {s.label}
                <IconExternalLink className="size-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
