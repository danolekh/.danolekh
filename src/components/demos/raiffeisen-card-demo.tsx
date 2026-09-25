import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Switch } from "@base-ui/react/switch";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { IconCopy, IconEye, IconEyeOff, IconRotate, IconSnowflake } from "@tabler/icons-react";
import { type CardBackground, shaderBackground } from "@danolekh/cardstock";
import { ShaderLibrary } from "@danolekh/cardstock/shader";
import { CardSwiper } from "@/components/card-carousel";
import { PaymentCard } from "@/components/payment-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CardMeta } from "./raiffeisen-card/card-meta";
import { ScrubNumber } from "./raiffeisen-card/scrub-number";
import { RB_SHADERS } from "./raiffeisen-card/shaders";

/* Playground for the Raiffeisen card concept, embedded in /b/raiffeisen via ```demo:raiffeisen-card.
 * The cards are cardstock (@danolekh/cardstock, its registry's payment card and swiper), each
 * painted with a live shader in Raiffeisen's colours: four of our own, from quiet yellow plastic up
 * to a premium moiré, and two of the library's presets recoloured to the brand's green and
 * porcelain. Every card on the page shares one WebGL context. The controls are Base UI primitives
 * and the limit is a scrubbable number, all usable from a keyboard and a screen reader. */

const SPENT = 842;

const DEMO = {
  number: "4821 5903 2716 4822",
  holder: "Max Mustermann",
  expiry: "09/29",
  securityCode: "731",
};

type Design = CardBackground & { label: string; color: string };
const rb = (shader: string, label: string, color: string, tone: "dark" | "light", ink: string): Design => ({
  type: "shader",
  shader,
  label,
  color,
  tone,
  ink,
});

const DESIGNS: Design[] = [
  rb("rb/classic", "Classic", "#fbf315", "light", "#161616"),
  rb("rb/gable", "Gold", "#1a1810", "dark", "#fbf315"),
  rb("rb/arrows", "Business", "#23211d", "dark", "#f4f1e8"),
  {
    ...shaderBackground("silk", {
      color: "#057a2f",
      tone: "dark",
      ink: "#ffffff",
      params: { colors: ["#03561f", "#057a2f", "#16a64c", "#fbf315"], turbulence: 0.55 },
    }),
    label: "Green",
    color: "#057a2f",
  },
  {
    ...shaderBackground("liquid-metal", {
      color: "#e6e8ee",
      tone: "light",
      ink: "#161616",
      params: { tint: "#eceef5", bands: 2.6 },
    }),
    label: "Porcelain",
    color: "#e6e8ee",
  },
  rb("rb/premium", "Premium", "#0b0a08", "dark", "#f1dfa6"),
];

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

export function RaiffeisenCardDemo() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  // Each design is its own card, so each keeps its own freeze.
  const [frozenCards, setFrozenCards] = useState<ReadonlySet<number>>(new Set());
  const frozen = frozenCards.has(index);
  const [revealed, setRevealed] = useState(false);
  const [limit, setLimit] = useState(1200);
  const [copied, setCopied] = useState(false);
  const design = DESIGNS[index]!;

  const choose = (i: number) => {
    setIndex(i);
    setFlipped(false);
    setRevealed(false);
  };
  const freeze = (on: boolean) => {
    setFrozenCards((cards) => {
      const next = new Set(cards);
      if (on) next.add(index);
      else next.delete(index);
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
    <ShaderLibrary shaders={RB_SHADERS}>
      <div className="not-prose my-8 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
        {/* The backdrop glow takes the colour of the card in the middle. */}
        <div
          className="relative flex min-h-[320px] flex-col items-center justify-center gap-4 px-6 py-10 transition-[background] duration-500 sm:py-14"
          style={{
            background: `radial-gradient(ellipse at top, color-mix(in srgb, ${design.color} 22%, transparent), transparent 60%)`,
          }}
        >
          <CardSwiper index={index} onIndexChange={choose} labels={DESIGNS.map((d) => d.label)} tabs={false}>
            {(i, active) => (
              <PaymentCard
                {...DEMO}
                brand="cardstock"
                background={DESIGNS[i]}
                active={active}
                flipped={active && flipped}
                onFlippedChange={active ? setFlipped : undefined}
                revealed={active && revealed}
                onRevealedChange={setRevealed}
                frozen={frozenCards.has(i)}
                onFrozenChange={(on) => (active ? freeze(on) : undefined)}
                spent={SPENT}
                limit={limit}
              />
            )}
          </CardSwiper>
          <CardMeta spent={SPENT} limit={limit} frozen={frozen} />
        </div>

        <div className="space-y-5 border-t border-dashed border-border p-5 sm:p-6">
          <Row label="Card">
            <ToggleGroup
              value={[String(index)]}
              onValueChange={(v) => v[0] && choose(Number(v[0]))}
              className="flex flex-wrap gap-1.5"
              aria-label="Card design"
            >
              {DESIGNS.map((d, i) => (
                <Toggle
                  key={d.label}
                  value={String(i)}
                  className="rounded-full border border-border px-3 py-1 text-sm transition-colors hover:text-foreground data-[pressed]:border-foreground data-[pressed]:bg-foreground data-[pressed]:text-background"
                >
                  <span className="inline-flex items-center gap-1">
                    {d.label}
                    {frozenCards.has(i) && (
                      <IconSnowflake className="size-3.5 opacity-70" aria-label="gesperrt" />
                    )}
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
              <Switch.Root
                checked={frozen}
                onCheckedChange={freeze}
                aria-label="Freeze card"
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted p-0.5 transition-colors data-[checked]:border-transparent data-[checked]:bg-[#fbf315] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fbf315]"
              >
                <Switch.Thumb className="size-[18px] rounded-full bg-white shadow transition-transform duration-200 data-[checked]:translate-x-5" />
              </Switch.Root>
            </span>
          </Row>

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
                    className="pointer-events-none absolute -top-9 left-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background"
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
    </ShaderLibrary>
  );
}
