/* Single source of truth for the hydraulics sourcing post.
 *
 * The globe, the price bars, the verdict card and the spec tables all read from here. The numbers
 * used to live inline in each markdown ```block: fence, which meant one price change had to be made
 * in four places — and the four would eventually disagree. Blocks now reference items by `id`.
 *
 * Everything here traces back to the research in src/content/p/hydraulic-sourcing-rexroth-ms.md.
 * Prices are per unit, excluding VAT, in EUR, at the rates recorded in that post (2026-09-01).
 */

export type Role = "original" | "alternative";
export type Kind = "valve" | "motor";

/** How much weight a figure carries. Mirrors the labels used in the post itself. */
export type Confidence = "confirmed" | "dealer" | "estimate";

export type Verdict =
  | "recommended"
  | "viable"
  | "overkill"
  | "ruled-out"
  | "unverified"
  | "baseline";

/** A plant is where it's made; hq/division is a corporate address we could confirm and nothing more.
 *  The distinction matters because a pin on a globe reads as a factual claim about origin. */
export type SiteKind = "plant" | "hq" | "division";

export type CountryCode = "de" | "bg" | "it" | "cz" | "cn" | "us" | "pl" | "jp" | "tw";

export type Site = {
  city: string;
  cc: CountryCode;
  lat: number;
  lng: number;
  kind: SiteKind;
  confidence: Confidence;
};

export type SpecRow = {
  label: string;
  original: string;
  candidate: string;
  match: "yes" | "partial" | "no";
};

export type Price = {
  /** A single figure, or a low/high range where only a range is public. */
  eur: number | [number, number];
  source: string;
  confidence: Confidence;
  note?: string;
};

export type Item = {
  id: string;
  role: Role;
  kind: Kind;
  brand: string;
  /** Current owner, where it isn't the brand — the OMS line is the interesting case. */
  owner?: string;
  part: string;
  material?: string;
  /** Empty when we could not establish where it is made; such an item gets no pin on the globe. */
  sites: Site[];
  price?: Price;
  lead?: string;
  /** Same lead time as a numeric span in weeks, for the timeline. Absent when unknown. */
  leadWeeks?: [number, number];
  stock?: string;
  verdict: Verdict;
  /** One sentence: why this is, or isn't, the answer. */
  takeaway: string;
  specs?: SpecRow[];
  sources: { label: string; url: string }[];
};

export const ITEMS: Item[] = [
  // ── Originals ────────────────────────────────────────────────────────────────
  {
    id: "rexroth-4wree10",
    role: "original",
    kind: "valve",
    brand: "Bosch Rexroth",
    part: "4WREE10W75-22/G24K31/A1V",
    material: "R900927233",
    sites: [
      {
        city: "Lohr am Main",
        cc: "de",
        lat: 49.9906,
        lng: 9.5731,
        kind: "plant",
        confidence: "confirmed",
      },
    ],
    price: {
      eur: 2746.2,
      source: "IAS Components (ES)",
      confidence: "dealer",
      note: "Листовая цена $4 102 у Hydrotech; со склада BuyRexroth $6 066 — премия ~48 % за доступность",
    },
    lead: "5,5 недель – 7 месяцев",
    leadWeeks: [5.5, 28],
    stock: "Единицы: 1 шт (ES), 7 шт (US)",
    verdict: "baseline",
    takeaway:
      "87 % стоимости заказа. Цена и срок здесь — одна переменная: со склада вдвое дороже, с завода дёшево и долго.",
    sources: [
      {
        label: "Bosch Rexroth, карточка R900927233",
        url: "https://www.boschrexroth.com/en/at/p/proportional-directional-valve-r900927233/",
      },
      {
        label: "Hydrotech — List Price",
        url: "https://www.hydrotech.com/product/bosch-rexroth/r900927233",
      },
    ],
  },
  {
    id: "ms-msq315sh",
    role: "original",
    kind: "motor",
    brand: "M+S Hydraulic",
    part: "MSQ315SH",
    sites: [
      {
        city: "Казанлык",
        cc: "bg",
        lat: 42.6195,
        lng: 25.3958,
        kind: "plant",
        confidence: "confirmed",
      },
    ],
    price: {
      eur: 426.65,
      source: "Hydromot (LU)",
      confidence: "dealer",
      note: "Оценка EXW завода — €200–270/шт: операционная маржа M+S всего 4,36 %, скидке взяться негде",
    },
    lead: "~8 недель",
    leadWeeks: [8, 8],
    stock: "Нет ни у одного проверенного дистрибьютора",
    verdict: "baseline",
    takeaway:
      "Сам оказался ценовым оптимумом. Не стокуется именно сочетание квадратного фланца с типоразмером 315.",
    sources: [
      { label: "Hydromot — MSQ315SH", url: "https://www.hydromot.lu/en/MSQ315SH.html" },
      {
        label: "M+S Hydraulic — годовые отчёты",
        url: "https://www.ms-hydraulic.com/index.php?option=com_content&view=category&id=38&lang=en&Itemid=101",
      },
    ],
  },

  // ── Alternatives: valve ──────────────────────────────────────────────────────
  {
    id: "atos-dkzor-teb",
    role: "alternative",
    kind: "valve",
    brand: "Atos",
    part: "DKZOR-TEB-SN-NP-171",
    sites: [
      {
        city: "Sesto Calende",
        cc: "it",
        lat: 45.7276,
        lng: 8.834,
        kind: "plant",
        confidence: "confirmed",
      },
    ],
    price: {
      eur: 1777,
      source: "Hydropress (CZ), 42 915,80 Kč без НДС",
      confidence: "dealer",
      note: "−35 % к Rexroth. В США то же изделие с золотником D5 — $1 450 ≈ €1 251",
    },
    lead: "4 недели",
    leadWeeks: [4, 4],
    verdict: "recommended",
    takeaway:
      "Совпадает по всем критичным параметрам и дешевле на треть. Вся экономия сделки — здесь.",
    specs: [
      {
        label: "Присоединение",
        original: "ISO 4401-05 (NG10)",
        candidate: "ISO 4401-05 (D05)",
        match: "yes",
      },
      {
        label: "Номинальный расход",
        original: "75 л/мин",
        candidate: "75 л/мин при Δp10 бар",
        match: "yes",
      },
      { label: "Макс. давление", original: "315/350 бар", candidate: "315 бар", match: "yes" },
      { label: "Обратная связь", original: "LVDT по золотнику", candidate: "LVDT", match: "yes" },
      {
        label: "Электроника",
        original: "встроенная (OBE)",
        candidate: "встроенная (TEB)",
        match: "yes",
      },
      { label: "Питание", original: "24 В DC", candidate: "24 В DC", match: "yes" },
      { label: "Сигнал задания", original: "±10 В (A1)", candidate: "±10 В аналог", match: "yes" },
      { label: "Уплотнения", original: "FKM (V)", candidate: "Viton", match: "yes" },
      {
        label: "Символ золотника",
        original: "W",
        candidate: "L5 / S5 / D5 — соответствие не установлено",
        match: "no",
      },
    ],
    sources: [
      {
        label: "Atos DKZOR-TEB",
        url: "https://www.atos.com/en-it/Products/Industrial/Proportional-valves/High-performance-directionals/DHZO-TEB-TES,-DKZOR-TEB-TES/p/DKZOR-TEB_HP",
      },
      {
        label: "Hydropress — цена",
        url: "https://www.hydropress.cz/en/flow-proportional-valves/3091-dkzor-teb-sn-np-171-l5-proportional-distributor-atos-ng10-170-l-min-315-bar-9631297345812.html",
      },
    ],
  },
  {
    id: "duplomatic-dse5j",
    role: "alternative",
    kind: "valve",
    brand: "Duplomatic MS",
    part: "DSE5J",
    sites: [
      {
        city: "Parabiago",
        cc: "it",
        lat: 45.556,
        lng: 8.947,
        kind: "plant",
        confidence: "confirmed",
      },
    ],
    verdict: "viable",
    takeaway:
      "Тот же класс: CETOP 05, OBE, обратная связь по положению. Разъём 6 pin + PE — как K31 у Rexroth. Публичной цены нет.",
    sources: [
      { label: "Duplomatic DSE5J", url: "https://duplomaticmotionsolutions.com/en/dse5.html" },
    ],
  },
  {
    id: "parker-d3fp",
    role: "alternative",
    kind: "valve",
    brand: "Parker Hannifin",
    part: "D3FP",
    sites: [
      {
        city: "Kaarst",
        cc: "de",
        lat: 51.2242,
        lng: 6.6169,
        kind: "division",
        confidence: "confirmed",
      },
    ],
    verdict: "overkill",
    takeaway:
      "Привод VCD®, динамика сервоклапана (−3 дБ при 350 Гц). Для замены 4WREE избыточен и дороже оригинала.",
    sources: [
      {
        label: "Parker D3FP — каталог",
        url: "https://www.parker.com/content/dam/Parker-com/Literature/Hydraulic-Valve-Division/hydraulicvalve/Catalog-sections-for-websphere/Proportional-Directional-Control/Catalog---Static-Files/D3FP.pdf",
      },
    ],
  },
  {
    id: "argo-prm9-10",
    role: "alternative",
    kind: "valve",
    brand: "Argo-Hytos",
    part: "PRM9-10",
    sites: [
      {
        city: "Vrchlabí",
        cc: "cz",
        lat: 50.6256,
        lng: 15.6106,
        kind: "plant",
        confidence: "confirmed",
      },
    ],
    verdict: "ruled-out",
    takeaway:
      "Подходило всё — NG10, OBE, LVDT, 350 бар — кроме расхода: максимум 60 л/мин при нужных 75.",
    sources: [
      {
        label: "Argo-Hytos PRM9-10",
        url: "https://www.argo-hytos.com/products/valves/proportional-valves/prm9-10.html",
      },
    ],
  },
  {
    id: "continental-ved05j",
    role: "alternative",
    kind: "valve",
    brand: "Continental Hydraulics",
    part: "VED05J",
    sites: [],
    verdict: "unverified",
    takeaway:
      "D05/NG10 с интегрированной цифровой электроникой и LVDT-датчиком положения золотника. Публичной цены нет, место производства не устанавливалось.",
    sources: [],
  },
  {
    id: "huade-4wree10",
    role: "alternative",
    kind: "valve",
    brand: "Beijing Huade",
    part: "4WRE / 4WRA (паттерн Rexroth)",
    sites: [
      { city: "Пекин", cc: "cn", lat: 39.9042, lng: 116.4074, kind: "hq", confidence: "estimate" },
    ],
    verdict: "unverified",
    takeaway:
      "Пропорциональная линейка по паттерну Rexroth подтверждена, но исполнения с OBE и обратной связью найти не удалось.",
    sources: [],
  },
  {
    id: "northman-eswhee",
    role: "alternative",
    kind: "valve",
    brand: "Northman",
    part: "ESWHEE-G03 / ESWKE-G04",
    sites: [
      { city: "Тайбэй", cc: "tw", lat: 25.033, lng: 121.5654, kind: "hq", confidence: "estimate" },
    ],
    verdict: "unverified",
    takeaway:
      "Единственный азиатский кандидат, которого не удалось ни подтвердить, ни отбросить — параметры не публикуются.",
    sources: [
      { label: "Northman — пропорциональные", url: "https://www.northman.com/products/list/52/" },
    ],
  },
  {
    id: "yuken-ehdfg",
    role: "alternative",
    kind: "valve",
    brand: "Yuken",
    part: "EHDFG",
    sites: [],
    verdict: "ruled-out",
    takeaway:
      "Замкнутый контур на LVDT внутри клапана есть, но сигнал задания 0…5 В вместо ±10 В и расход до 60 л/мин.",
    sources: [
      {
        label: "Yuken Europe — CETOP 5",
        url: "https://yukeneurope.com/product-category/cetop-5ng10/",
      },
    ],
  },

  // ── Alternatives: motor ──────────────────────────────────────────────────────
  {
    id: "white-oms315",
    role: "alternative",
    kind: "motor",
    brand: "White Drive Motors & Steering",
    owner: "Interpump Group",
    part: "OMS 315 · 151F0513",
    sites: [
      {
        city: "Hopkinsville, KY",
        cc: "us",
        lat: 36.8656,
        lng: -87.4886,
        kind: "plant",
        confidence: "confirmed",
      },
      {
        city: "Wrocław",
        cc: "pl",
        lat: 51.1079,
        lng: 17.0385,
        kind: "plant",
        confidence: "confirmed",
      },
      {
        city: "Parchim",
        cc: "de",
        lat: 53.4269,
        lng: 11.8489,
        kind: "plant",
        confidence: "confirmed",
      },
    ],
    price: {
      eur: 665.69,
      source: "Holstein Hydraulik (DE)",
      confidence: "dealer",
      note: "Прайс €870,18. При 100+ шт — €465,98. Дороже M+S на 56 %",
    },
    lead: "1–3 дня",
    leadWeeks: [0.15, 0.45],
    stock: ">10 шт",
    verdict: "viable",
    takeaway:
      "Совпадение по размерам полное, до десятых миллиметра. Но покупает не цену, а срок: 1–3 дня против 8 недель.",
    specs: [
      { label: "Рабочий объём", original: "314,9 см³/об", candidate: "315 см³/об", match: "yes" },
      {
        label: "Вал",
        original: 'ø1¼" шлиц 14T DP12/24',
        candidate: "14 spline 12/24 (Ø31.75 mm) ANS B92.1-1970",
        match: "yes",
      },
      {
        label: "Фланец",
        original: "Square 4 отв., ø106,4 / центрир. ø82,5",
        candidate: "4 bolt Ø106.4 — centring Ø82.5 mm",
        match: "yes",
      },
      {
        label: "Порты",
        original: "2×G1/2, дренаж G¼",
        candidate: "G1/2, дренаж G1/4",
        match: "yes",
      },
      {
        label: "Подшипник",
        original: "конические роликовые",
        candidate: "конический роликовый",
        match: "yes",
      },
      { label: "Цена", original: "€426,65", candidate: "€665,69 (+56 %)", match: "no" },
    ],
    sources: [
      {
        label: "Hydrokit — 151F0513, размеры",
        url: "https://www.hydrokit.com/en/produit/hydraulic-motors/orbital-medium-speed/type-oms/oms-standard-4-hole-flange/engine-oms-315-danfoss-151f0513-s-xrp23262-xpr32910.html",
      },
      {
        label: "Holstein Hydraulik — цена",
        url: "https://www.holsteinhydraulik.com/en/Danfoss-151F0506-OMS-315-Hydraulic-Motor",
      },
      {
        label: "Danfoss — выделение White Drive в отдельный бизнес",
        url: "https://www.danfoss.com/en/about-danfoss/news/cf/white-drive-motors-steering/",
      },
      {
        label: "Interpump — приобретение White Drive",
        url: "https://www.interpumpfluidsolutions.com/our-welcome-to-white-drive-now-part-of-the-interpump-group/",
      },
    ],
  },
  {
    id: "blince-oms315",
    role: "alternative",
    kind: "motor",
    brand: "Blince",
    part: "OMS315 / BMS315",
    sites: [
      {
        city: "Dongguan",
        cc: "cn",
        lat: 23.0207,
        lng: 113.7518,
        kind: "plant",
        confidence: "estimate",
      },
    ],
    price: {
      eur: [86, 173],
      source: "Made-in-China, $100–200",
      confidence: "estimate",
      note: "Вилка витрины, MOQ 1 шт. Точную дадут по запросу",
    },
    verdict: "ruled-out",
    takeaway:
      "Дешевле в 2,5–5 раз, но давление 120 бар против 200/230 у M+S — разрыв около 40 %. Другой класс изделия.",
    specs: [
      { label: "Рабочий объём", original: "314,9 см³/об", candidate: "315 см³/об", match: "yes" },
      {
        label: "Вал",
        original: 'ø1¼" шлиц 14T DP12/24',
        candidate: "Shaft Ø31.75, splined tooth 14-DP12/24",
        match: "yes",
      },
      { label: "Порты", original: "2×G1/2 или M22×1,5", candidate: "G1/2 и M22×1,5", match: "yes" },
      {
        label: "Фланец",
        original: "Square 4 отв., ø106,4",
        candidate: "Square ø127; ø106,4 только на ромбическом",
        match: "partial",
      },
      {
        label: "Макс. давление",
        original: "перепад 200 бар, вход 230 бар",
        candidate: "12 МПа = 120 бар",
        match: "no",
      },
    ],
    sources: [
      {
        label: "Blince OMS315/BMS315",
        url: "https://blince.en.made-in-china.com/product/EXwxydIlLBkY/China-Oms315-BMS315-Danfoss-Oms-Hydraulic-Orbit-Motor.html",
      },
    ],
  },
];

/** Items in the order the globe should tab through them: originals first, then by verdict. */
const VERDICT_ORDER: Record<Verdict, number> = {
  baseline: 0,
  recommended: 1,
  viable: 2,
  overkill: 3,
  unverified: 4,
  "ruled-out": 5,
};

export function itemsForGlobe(): Item[] {
  return ITEMS.filter((i) => i.sites.length > 0).sort(
    (a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict],
  );
}

export function itemsWithoutSite(): Item[] {
  return ITEMS.filter((i) => i.sites.length === 0);
}

export function getItem(id: string): Item | undefined {
  return ITEMS.find((i) => i.id === id);
}

/** Lowest known price for an item, for charts that need one number per item. */
export function priceLow(item: Item): number | undefined {
  if (!item.price) return undefined;
  return Array.isArray(item.price.eur) ? item.price.eur[0] : item.price.eur;
}

export function formatEur(eur: number | [number, number]): string {
  const one = (n: number) =>
    n.toLocaleString("ru-RU", { maximumFractionDigits: n < 100 ? 0 : 2 }).replace(",00", "");
  return Array.isArray(eur) ? `€${one(eur[0])}–${one(eur[1])}` : `€${one(eur)}`;
}

/** The quantity the customer asked for, per position. Drives every total in the post. */
export const ORDER_QTY = 6;

/** The two items the specification actually named. */
export function baselineFor(kind: Kind): Item {
  const item = ITEMS.find((i) => i.role === "original" && i.kind === kind);
  if (!item) throw new Error(`no baseline for ${kind}`);
  return item;
}

/** Every item of a kind that has a price, baseline first — for charts that compare against it. */
export function pricedByKind(kind: Kind): Item[] {
  const base = baselineFor(kind);
  const rest = ITEMS.filter((i) => i.kind === kind && i !== base && i.price).sort(
    (a, b) => (priceLow(a) ?? 0) - (priceLow(b) ?? 0),
  );
  return [base, ...rest];
}

/** Items with a plottable lead time, soonest first. */
export function itemsByLead(): Item[] {
  return ITEMS.filter((i) => i.leadWeeks).sort((a, b) => a.leadWeeks![0] - b.leadWeeks![0]);
}

/** Options the cost calculator offers for one position: the original plus every priced candidate. */
export function optionsFor(kind: Kind): Item[] {
  return pricedByKind(kind);
}
