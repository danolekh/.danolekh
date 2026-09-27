// The lab: small interface things, each built for one product. Shown on `/lab` and
// `/lab/$slug`. The code lives in github.com/danolekh/lab and installs with the shadcn CLI from
// `/r/<slug>.json` (copied into public/r from that repo's `public/r`).
//
// Plain data, no imports: vite.config.ts reads it to prerender the pages.

export type LabItem = {
  slug: string;
  title: string;
  /** One or two sentences: what it is and why it's there. */
  summary: string;
  /** The product it was made for, and whether it's a pitch or just for fun. */
  for: { name: string; url: string };
  date: string;
  /** A ```demo:<name>``` component from src/lib/content/blog-components.tsx. */
  demo: string;
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
    summary:
      "A suggested price with the sales behind it. Every similar sale drops in as a dot, the count ticks up as they land, and the range settles over the thickest part. Point at a dot, or use the arrow keys, to see that sale.",
    for: { name: "Minimist", url: "https://minimist.com" },
    date: "2026-10-01",
    demo: "price-evidence",
    // Take lab-price-evidence in cardstock's apps/promo, --poster 3.6 (the full plot, one sale read).
    cover: "/images/covers/lab-price-evidence-dark.webp",
    coverLight: "/images/covers/lab-price-evidence.webp",
    video: "/videos/lab-price-evidence-dark-800.mp4",
    videoLight: "/videos/lab-price-evidence-800.mp4",
  },
];

export function getLabItem(slug: string): LabItem | undefined {
  return lab.find((item) => item.slug === slug);
}

export const labSource = (slug: string) => `https://github.com/danolekh/lab/tree/main/items/${slug}`;
export const labInstall = (slug: string) => `npx shadcn@latest add https://www.danolekh.com/r/${slug}.json`;
