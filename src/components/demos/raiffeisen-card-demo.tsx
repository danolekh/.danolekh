import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "motion/react";
import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { IconCopy, IconEye, IconEyeOff, IconRotate, IconSnowflake } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardCarousel } from "./raiffeisen-card/card-carousel";
import {
  CardMeta,
  DEMO,
  RaiffeisenCard,
  VARIANTS,
  type CardVariant,
} from "./raiffeisen-card/raiffeisen-card";
import { ScrubNumber } from "./raiffeisen-card/scrub-number";

/* Playground for the Raiffeisen card concept, embedded in /b/raiffeisen via ```demo:raiffeisen-card.
 * The designs swipe in a carousel, with the pills as tabs for it; the switches are Base UI
 * primitives and the limit is a scrubbable number, all usable from a keyboard and a screen reader. */

const SPENT = 842;
const KEYS = Object.keys(VARIANTS) as CardVariant[];
const eur = (n: number) =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/** Two labels in one grid cell, the hidden one invisible, so the button keeps the wider width. */
function StableLabel({ on, yes, no }: { on: boolean; yes: string; no: string }) {
  return (
    <span className="grid">
      <span className={cn("[grid-area:1/1]", !on && "invisible")}>{yes}</span>
      <span className={cn("[grid-area:1/1]", on && "invisible")}>{no}</span>
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function Toggler({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted p-0.5 transition-colors data-[checked]:border-transparent data-[checked]:bg-[#fbf315] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbf315]"
    >
      <Switch.Thumb className="size-[18px] rounded-full bg-white shadow transition-transform duration-200 data-[checked]:translate-x-5" />
    </Switch.Root>
  );
}

export function RaiffeisenCardDemo() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Each design is its own card, so each keeps its own freeze.
  const [frozenCards, setFrozenCards] = useState<ReadonlySet<CardVariant>>(new Set());
  const frozen = frozenCards.has(KEYS[index]);
  const [revealed, setRevealed] = useState(false);
  const [tilt, setTilt] = useState(true);
  const [limit, setLimit] = useState(1200);
  const [copied, setCopied] = useState(false);

  // The backdrop glow takes the colour of the card in the middle, blending as you swipe.
  const position = useMotionValue(0);
  const glowColor = useTransform(
    position,
    KEYS.map((_, i) => i),
    KEYS.map((k) => VARIANTS[k].stops[1][0]),
  );
  const glow = useMotionTemplate`radial-gradient(ellipse at top, color-mix(in srgb, ${glowColor} 22%, transparent), transparent 60%)`;

  const choose = (i: number) => {
    setIndex(i);
    setFlipped(false);
    setRevealed(false);
  };
  const freeze = (on: boolean) => {
    setFrozenCards((cards) => {
      const next = new Set(cards);
      if (on) next.add(KEYS[index]);
      else next.delete(KEYS[index]);
      return next;
    });
    if (on) setRevealed(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(DEMO.number.replace(/\s/g, ""));
    } catch {
      /* clipboard blocked: the bubble still confirms the action in the demo */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="not-prose my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <motion.div
        className="relative flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-10 sm:py-14"
        style={{ background: glow }}
      >
        <CardCarousel
          index={index}
          onIndexChange={choose}
          labels={KEYS.map((k) => VARIANTS[k].label)}
          progress={position}
        >
          {(i, active) => (
            <RaiffeisenCard
              variant={KEYS[i]}
              active={active}
              tilt={tilt}
              flipped={flipped}
              onFlip={() => (active ? setFlipped((f) => !f) : choose(i))}
              frozen={frozenCards.has(KEYS[i])}
              revealed={revealed}
              spent={SPENT}
              limit={limit}
            />
          )}
        </CardCarousel>
        <CardMeta spent={SPENT} limit={limit} frozen={frozen} />
      </motion.div>

      <div className="space-y-5 border-t border-dashed border-border p-5 sm:p-6">
        <Row label="Card">
          <ToggleGroup
            value={[KEYS[index]]}
            onValueChange={(v) => v[0] && choose(KEYS.indexOf(v[0] as CardVariant))}
            className="flex flex-wrap gap-1.5"
            aria-label="Card design"
          >
            {KEYS.map((key) => (
              <Toggle
                key={key}
                value={key}
                className="rounded-full border border-border px-3 py-1 text-sm transition-colors hover:text-foreground data-[pressed]:border-foreground data-[pressed]:bg-foreground data-[pressed]:text-background"
              >
                <span className="inline-flex items-center gap-1">
                  {VARIANTS[key].label}
                  {frozenCards.has(key) && <IconSnowflake className="size-3.5 opacity-70" aria-label="gesperrt" />}
                </span>
              </Toggle>
            ))}
          </ToggleGroup>
        </Row>

        <Row label="Freeze card">
          <span className="flex items-center gap-2.5">
            <span className="grid text-xs text-muted-foreground" aria-hidden>
              <span className={cn("[grid-area:1/1] text-right", frozen && "invisible")}>Aktiv</span>
              <span
                className={cn(
                  "[grid-area:1/1] text-right font-medium text-sky-700 dark:text-sky-300",
                  !frozen && "invisible",
                )}
              >
                Gesperrt
              </span>
            </span>
            <Toggler checked={frozen} onChange={freeze} label="Freeze card" />
          </span>
        </Row>

        {/* Tilt only exists with a mouse or trackpad, so the switch is hidden on touch screens. */}
        <div className="[@media(hover:none)]:hidden">
          <Row label="Tilt on hover">
            <Toggler checked={tilt} onChange={setTilt} label="Tilt on hover" />
          </Row>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Monthly limit <span className="text-xs opacity-70">· drag the number</span>
          </span>
          <ScrubNumber
            value={limit}
            onChange={setLimit}
            min={900}
            max={3000}
            step={50}
            format={eur}
            label="Monthly limit"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" onClick={() => setFlipped((f) => !f)}>
            <IconRotate />
            <StableLabel on={flipped} yes="Front" no="Back" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setRevealed((r) => !r)}
            aria-pressed={revealed}
            disabled={frozen}
            title={frozen ? "Karte ist gesperrt" : undefined}
          >
            {revealed ? <IconEyeOff /> : <IconEye />}
            <StableLabel on={revealed} yes="Hide details" no="Show details" />
          </Button>
          <div className="relative">
            <Button variant="outline" onClick={copy} disabled={!revealed || frozen}>
              <IconCopy />
              Copy number
            </Button>
            <AnimatePresence>
              {copied && (
                <motion.span
                  role="status"
                  className={cn(
                    "pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background",
                  )}
                  initial={{ opacity: 0, y: 6, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, y: 6, x: "-50%" }}
                >
                  Kopiert
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
