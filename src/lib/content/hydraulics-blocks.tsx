import { SourcingGlobe } from "@/components/sourcing-globe";
import { Tabs } from "@base-ui/react/tabs";
import { Flag } from "@/components/flag";
import { SpecTable, VerdictBadge, matchCount } from "@/components/sourcing-ui";
import { BlockShell } from "@/lib/content/block-shell";
import {
  ITEMS,
  type Item,
  type Kind,
  ORDER_QTY,
  baselineFor,
  itemsByLead,
  optionsFor,
  formatEur,
  getItem,
  pricedByKind,
  priceLow,
} from "@/data/hydraulics";
import { useState } from "react";
import { cn } from "@/lib/utils";

/* Blocks specific to the hydraulics sourcing post. Unlike the portfolio blocks, these take almost
 * no props: their data lives in src/data/hydraulics.ts so the globe, the bars and the verdict card
 * can't drift apart. A fence passes at most a title, a caption and which position to show. */

const eur0 = (n: number) => `€${Math.round(n).toLocaleString("ru-RU")}`;
const pct = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(Math.round(n))} %`;

// ── globe: where every part is made ────────────────────────────────────────────

export function GlobeBlock(props: { title?: string; caption?: string }) {
  return <SourcingGlobe title={props.title ?? "Где это делают"} caption={props.caption} />;
}

// ── verdict: the bottom line, so it isn't buried on line 443 ───────────────────

export function VerdictBlock(props: { title?: string; caption?: string }) {
  const valveBase = baselineFor("valve");
  const motorBase = baselineFor("motor");
  const valvePick = getItem("atos-dkzor-teb");
  if (!valvePick) return null;

  const basePrice = (priceLow(valveBase) ?? 0) + (priceLow(motorBase) ?? 0);
  const pickPrice = (priceLow(valvePick) ?? 0) + (priceLow(motorBase) ?? 0);
  const baseTotal = basePrice * ORDER_QTY;
  const pickTotal = pickPrice * ORDER_QTY;
  const saving = baseTotal - pickTotal;

  return (
    <BlockShell
      title={props.title ?? "Итог"}
      caption={
        props.caption ??
        "Экономия целиком приходит от клапана. Мотор менять невыгодно: M+S сам оказался ценовым оптимумом."
      }
      className="border-emerald-500/40 bg-emerald-500/[0.04]"
    >
      <p className="text-sm">
        Менять <strong>клапан</strong>, мотор оставить:{" "}
        <strong>
          {valvePick.brand} {valvePick.part}
        </strong>{" "}
        вместо {valveBase.brand} плюс {motorBase.brand} {motorBase.part} как есть.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat value={eur0(baseTotal)} label={`Оригиналы, ${ORDER_QTY}+${ORDER_QTY} шт`} muted />
        <Stat value={eur0(pickTotal)} label="Рекомендуемая комбинация" />
        <Stat value={eur0(saving)} label="Экономия" accent />
        <Stat value={pct(-(saving / baseTotal) * 100)} label="К стоимости заказа" accent />
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Не подтверждено: соответствие символа золотника <code>W</code> золотникам Atos. Это
        единственное, что может сломать замену, и снимается одним запросом дистрибьютору.
      </p>
    </BlockShell>
  );
}

function Stat({
  value,
  label,
  accent,
  muted,
}: {
  value: string;
  label: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "text-2xl leading-none font-semibold tabular-nums",
          accent && "text-emerald-600 dark:text-emerald-400",
          muted && "text-muted-foreground line-through decoration-1",
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ── price-bars: every priced option against the original ───────────────────────

export function PriceBarsBlock(props: { kind?: Kind; title?: string; caption?: string }) {
  const kind = props.kind === "motor" ? "motor" : "valve";
  const items = pricedByKind(kind);
  const base = items[0];
  const basePrice = priceLow(base) ?? 0;
  const max = Math.max(...items.map((i) => priceLow(i) ?? 0));

  return (
    <BlockShell
      title={props.title ?? (kind === "valve" ? "Цена за клапан" : "Цена за мотор")}
      caption={
        props.caption ??
        "Цена за штуку без НДС. Розница разных стран — дилерская нетто будет ниже по всем позициям."
      }
    >
      <ul className="space-y-3">
        {items.map((item) => {
          const price = priceLow(item) ?? 0;
          const delta = basePrice ? ((price - basePrice) / basePrice) * 100 : 0;
          const isBase = item === base;
          const cheaper = price < basePrice;
          return (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span
                  className={cn(
                    "truncate",
                    item.verdict === "ruled-out" && "text-muted-foreground",
                  )}
                >
                  <span className="font-medium">{item.brand}</span>{" "}
                  <span className="text-xs text-muted-foreground">{item.part}</span>
                </span>
                <span className="shrink-0 tabular-nums">
                  {item.price ? formatEur(item.price.eur) : "—"}
                  {!isBase ? (
                    <span
                      className={cn(
                        "ml-2 text-xs",
                        cheaper
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {pct(delta)}
                    </span>
                  ) : (
                    <span className="ml-2 text-xs text-muted-foreground">оригинал</span>
                  )}
                </span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-foreground/8">
                <div
                  className={cn(
                    "h-full rounded-full",
                    isBase ? "bg-amber-500" : cheaper ? "bg-emerald-500" : "bg-sky-500",
                    item.verdict === "ruled-out" && "bg-foreground/25",
                  )}
                  style={{ width: `${max ? (price / max) * 100 : 0}%` }}
                />
              </div>
              {item.verdict === "ruled-out" ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.takeaway}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </BlockShell>
  );
}

// ── money-split: which position actually carries the order ─────────────────────

export function MoneySplitBlock(props: { title?: string; caption?: string }) {
  const valve = baselineFor("valve");
  const motor = baselineFor("motor");
  const v = (priceLow(valve) ?? 0) * ORDER_QTY;
  const m = (priceLow(motor) ?? 0) * ORDER_QTY;
  const total = v + m;
  const share = (n: number) => Math.round((n / total) * 100);

  return (
    <BlockShell
      title={props.title ?? "Где лежат деньги заказа"}
      caption={
        props.caption ??
        "Поэтому торговать мотор бессмысленно: весь возможный выигрыш там — порядка €100 на партию, и упирается он в 4-процентную маржу завода."
      }
    >
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        <div
          className="flex items-center justify-center bg-amber-500/85 text-xs font-medium text-amber-950"
          style={{ width: `${share(v)}%` }}
        >
          {share(v)} %
        </div>
        <div
          className="flex items-center justify-center bg-teal-500/85 text-xs font-medium text-teal-950"
          style={{ width: `${share(m)}%` }}
        >
          {share(m)} %
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 text-xs">
        <Legend color="bg-amber-500" label={`${valve.brand} ×${ORDER_QTY}`} value={eur0(v)} />
        <Legend color="bg-teal-500" label={`${motor.brand} ×${ORDER_QTY}`} value={eur0(m)} />
      </div>
    </BlockShell>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 rounded-full", color)} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </span>
  );
}

// ── spec-match: the interchange table, as the technical core it is ─────────────

export function SpecMatchBlock(props: { item?: string; title?: string; caption?: string }) {
  const item: Item | undefined = props.item ? getItem(props.item) : undefined;
  if (!item?.specs) return null;
  const { yes, total } = matchCount(item.specs);

  return (
    <BlockShell
      title={props.title ?? `Совпадение: ${item.brand} ${item.part}`}
      caption={props.caption}
    >
      <p className="mb-3 text-sm">
        Совпало <strong>{yes}</strong> из <strong>{total}</strong> параметров.{" "}
        <span className="text-muted-foreground">{item.takeaway}</span>
      </p>
      <SpecTable rows={item.specs} candidateLabel={item.brand} />
    </BlockShell>
  );
}

// ── candidates: one tab per alternative, instead of five stacked subsections ────

export function CandidatesBlock(props: {
  kind?: Kind;
  /** Ids to leave out — used where a candidate already has its own prose section. */
  exclude?: string[];
  title?: string;
  caption?: string;
}) {
  const kind: Kind = props.kind === "motor" ? "motor" : "valve";
  const skip = new Set(props.exclude ?? []);
  const items = ITEMS.filter((i) => i.kind === kind && i.role === "alternative" && !skip.has(i.id));
  if (items.length === 0) return null;

  return (
    <BlockShell
      title={props.title ?? (kind === "valve" ? "Кандидаты: клапан" : "Кандидаты: мотор")}
      caption={props.caption}
    >
      <Tabs.Root defaultValue={items[0].id}>
        <Tabs.List className="relative flex flex-wrap gap-1 border-b border-dashed">
          {items.map((i) => (
            <Tabs.Tab
              key={i.id}
              value={i.id}
              className={cn(
                "-mb-px cursor-pointer rounded-t border-b-2 border-transparent px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors",
                "text-muted-foreground hover:text-foreground",
                "data-[selected]:border-primary data-[selected]:text-foreground data-[selected]:font-medium",
              )}
            >
              {i.brand}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {items.map((item) => (
          <Tabs.Panel key={item.id} value={item.id} className="pt-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h4 className="text-sm font-semibold">{item.part}</h4>
              <VerdictBadge verdict={item.verdict} />
              {item.sites[0] ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Flag cc={item.sites[0].cc} />
                  {item.sites[0].city}
                </span>
              ) : null}
            </div>

            <p className="mt-2 text-sm text-muted-foreground">{item.takeaway}</p>

            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <Field label="Цена за шт">
                {item.price ? formatEur(item.price.eur) : "публичной нет"}
              </Field>
              {item.lead ? <Field label="Срок">{item.lead}</Field> : null}
              {item.stock ? <Field label="Наличие">{item.stock}</Field> : null}
            </dl>

            {item.specs ? (
              <SpecTable rows={item.specs} candidateLabel={item.brand} className="mt-4" />
            ) : null}
          </Tabs.Panel>
        ))}
      </Tabs.Root>
    </BlockShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

// ── lead-time: the temporal story on one axis ──────────────────────────────────

export function LeadTimeBlock(props: { title?: string; caption?: string }) {
  const items = itemsByLead();
  const max = Math.max(...items.map((i) => i.leadWeeks![1]));
  const ticks = [0, 4, 8, 16, Math.ceil(max)];

  return (
    <BlockShell
      title={props.title ?? "Сроки поставки"}
      caption={
        props.caption ??
        "Недели. Полоса — разброс между «со склада» и «с завода» у одной и той же позиции."
      }
    >
      <ul className="space-y-3">
        {items.map((item) => {
          const [lo, hi] = item.leadWeeks!;
          const left = (lo / max) * 100;
          const width = Math.max(((hi - lo) / max) * 100, 1.5);
          return (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">
                  <span className="font-medium">{item.brand}</span>{" "}
                  <span className="text-xs text-muted-foreground">{item.part}</span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {item.lead}
                </span>
              </div>
              <div className="relative mt-1 h-2 w-full rounded-full bg-foreground/8">
                <div
                  className={cn(
                    "absolute inset-y-0 rounded-full",
                    item.role === "original" ? "bg-amber-500" : "bg-teal-500",
                  )}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-between text-[10px] tabular-nums text-muted-foreground">
        {ticks.map((t) => (
          <span key={t}>{t === 0 ? "0" : `${t} нед`}</span>
        ))}
      </div>
    </BlockShell>
  );
}

// ── cost-calc: pick a combination, see what the order costs ────────────────────

export function CostCalcBlock(props: { title?: string; caption?: string }) {
  const valves = optionsFor("valve");
  const motors = optionsFor("motor");
  const [valveId, setValveId] = useState(valves[0].id);
  const [motorId, setMotorId] = useState(motors[0].id);

  const valve = valves.find((v) => v.id === valveId) ?? valves[0];
  const motor = motors.find((m) => m.id === motorId) ?? motors[0];

  const baseline = ((priceLow(valves[0]) ?? 0) + (priceLow(motors[0]) ?? 0)) * ORDER_QTY;
  const total = ((priceLow(valve) ?? 0) + (priceLow(motor) ?? 0)) * ORDER_QTY;
  const delta = total - baseline;

  return (
    <BlockShell
      title={props.title ?? "Посчитать комбинацию"}
      caption={
        props.caption ??
        "Цены розничные и из разных стран; дилерская нетто будет ниже по всем позициям, но пропорции сохранятся."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Picker label="Клапан ×6" items={valves} value={valveId} onChange={setValveId} />
        <Picker label="Мотор ×6" items={motors} value={motorId} onChange={setMotorId} />
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-dashed pt-4">
        <span className="text-3xl font-semibold tabular-nums">{eur0(total)}</span>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            delta === 0
              ? "text-muted-foreground"
              : delta < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
          )}
        >
          {delta === 0
            ? "= оригиналы"
            : `${delta < 0 ? "−" : "+"}${eur0(Math.abs(delta)).slice(1)} к оригиналам (${pct((delta / baseline) * 100)})`}
        </span>
      </div>

      {valve.verdict === "ruled-out" || motor.verdict === "ruled-out" ? (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          В комбинацию попала позиция, признанная непригодной. Цена посчитана, но брать её нельзя.
        </p>
      ) : null}
    </BlockShell>
  );
}

function Picker({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: Item[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p
        className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground"
        id={`lbl-${label}`}
      >
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={`lbl-${label}`} className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            role="radio"
            aria-checked={i.id === value}
            onClick={() => onChange(i.id)}
            className={cn(
              "cursor-pointer rounded-full border px-2.5 py-1 text-xs transition-colors",
              i.id === value
                ? "border-primary bg-primary/10 font-medium text-foreground"
                : "border-dashed text-muted-foreground hover:text-foreground",
            )}
          >
            {i.brand}
            <span className="ml-1.5 tabular-nums opacity-70">
              {i.price ? formatEur(i.price.eur) : "—"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
