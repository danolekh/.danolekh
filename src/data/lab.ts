// The lab: small interface things, each built for one product. Shown on `/lab` and
// `/lab/$slug`. The code lives in github.com/danolekh/lab and installs with the shadcn CLI from
// `/r/<slug>.json` (copied into public/r from that repo's `public/r`).
//
// Plain data, no imports: vite.config.ts reads it to prerender the pages.

type Look = "glass" | "minimist" | "retinsight" | "site";

export type LabItem = {
  slug: string;
  title: string;
  /** For search and link previews only. The page shows the thing, not a description of it. */
  description: string;
  /** The product it was made for, when it was made for one. */
  for?: { name: string; url: string };
  /** The write-up it follows, when it follows one (the page reads "After <name>'s write-up"). */
  after?: { name: string; url: string };
  date: string;
  /** A ```demo:<name>``` component from src/lib/content/blog-components.tsx. */
  demo: string;
  /** The demo's look on this page, when it isn't its first one. */
  look?: Look;
  /** Other looks the demo has, each at /lab/<slug>/<look> (noindexed, linked from nowhere). */
  looks?: Look[];
  /** Cover art and a looping clip, dark by default, from cardstock's promo encoder. */
  cover?: string;
  coverLight?: string;
  video?: string;
  videoLight?: string;
  /** False while the code isn't out: the page shows the demo but no install line or source link,
   *  and the demo lives in src/private (gitignored). */
  code?: false;
};

export const lab: LabItem[] = [
  {
    slug: "fluid-visits",
    title: "Visit by visit",
    description: "An eye's retinal fluid over its visits: a synthetic OCT scan and the volumes, scrubbed by date.",
    for: { name: "RetInSight", url: "https://www.retinsight.com" },
    date: "2026-10-06",
    demo: "fluid-visits",
    // The site's look here, as with price-evidence; the RetInSight-styled one, for the pitch, at
    // /lab/fluid-visits/retinsight.
    look: "site",
    looks: ["retinsight"],
  },
  {
    slug: "reviewer",
    title: "Where the card goes",
    description: "A flashcard review screen that shows where each answer sends the card.",
    for: { name: "Anki", url: "https://apps.ankiweb.net" },
    date: "2026-09-29",
    demo: "reviewer",
    // Not released yet: the demo, its pictures and its audio are in src/private and public/private.
    code: false,
    // Take lab-reviewer in cardstock's apps/promo, filmed in both themes (encode --loop 0.8).
    cover: "/images/covers/lab-reviewer-dark.webp",
    coverLight: "/images/covers/lab-reviewer.webp",
    video: "/videos/lab-reviewer-dark-800.mp4",
    videoLight: "/videos/lab-reviewer-800.mp4",
  },
  {
    slug: "smear",
    title: "Type that smears",
    description: "Headline type that smears, in a shader.",
    for: { name: "wild", url: "https://wild.as" },
    date: "2026-09-29",
    demo: "smear",
    // Take lab-smear in cardstock's apps/promo (encode --poster 2.6; the page is still, so no --loop).
    cover: "/images/covers/lab-smear.webp",
    video: "/videos/lab-smear-800.mp4",
  },
  {
    slug: "glass",
    title: "Liquid Glass",
    description: "Liquid Glass on the web, as one React component.",
    after: { name: "Aave", url: "https://aave.com/design/building-glass-for-the-web" },
    date: "2026-09-28",
    demo: "glass",
    // Take lab-glass in cardstock's apps/promo (encode --poster 3.5; the backdrop is still, so no --loop).
    cover: "/images/covers/lab-glass.webp",
    video: "/videos/lab-glass-800.mp4",
  },
  {
    slug: "price-evidence",
    title: "Where the price comes from",
    description: "A suggested price with the sales behind it.",
    for: { name: "Minimist", url: "https://minimist.com" },
    date: "2026-10-01",
    demo: "price-evidence",
    // The site's own look here (the glass one made the page lag in Chromium); the glass one stays at
    // /lab/price-evidence/glass for the X post, and the Minimist-styled one, for the pitch, at
    // /lab/price-evidence/minimist.
    look: "site",
    looks: ["glass", "minimist"],
    // Take lab-price-evidence-glass in cardstock's apps/promo (encode --loop 0.8 --poster 7.9).
    cover: "/images/covers/lab-price-evidence-glass.webp",
    video: "/videos/lab-price-evidence-glass-800.mp4",
  },
];

export function getLabItem(slug: string): LabItem | undefined {
  return lab.find((item) => item.slug === slug);
}

export const labSource = (slug: string) => `https://github.com/danolekh/lab/tree/main/items/${slug}`;
export const labInstall = (slug: string) => `npx shadcn@latest add https://www.danolekh.com/r/${slug}.json`;
