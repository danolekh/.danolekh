// The lab: small interface things, each built for one product. Shown on `/lab` and
// `/lab/$slug`. The code lives in github.com/danolekh/lab and installs with the shadcn CLI from
// `/r/<slug>.json` (copied into public/r from that repo's `public/r`).
//
// Plain data, no imports: vite.config.ts reads it to prerender the pages.

type Look = "glass" | "minimist";

export type LabItem = {
  slug: string;
  title: string;
  /** For search and link previews only. The page shows the thing, not a description of it. */
  description: string;
  /** The product it was made for, and whether it's a pitch or just for fun. */
  for: { name: string; url: string };
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
};

export const lab: LabItem[] = [
  {
    slug: "price-evidence",
    title: "Where the price comes from",
    description: "A suggested price with the sales behind it.",
    for: { name: "Minimist", url: "https://minimist.com" },
    date: "2026-10-01",
    demo: "price-evidence",
    // Glass here; the Minimist-styled one, for the pitch, at /lab/price-evidence/minimist.
    look: "glass",
    looks: ["minimist"],
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
