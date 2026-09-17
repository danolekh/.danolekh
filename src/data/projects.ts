// Projects shown in the `/` Projects section. `internal` projects have a case-study page at
// `/p/$slug` (backed by a markdown file in `src/content/p/`); external ones link straight out.

export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  /** Cover art for the dark theme (and the only cover when there is no light cut). */
  cover: string;
  /** Light-theme cut of the same cover; the theme class on <html> picks one before paint. */
  coverLight?: string;
  /** Hidden from the home grid until `WEB3_LIVE` (src/lib/config.ts) flips on. */
  draft?: boolean;
} & ({ internal: true } | { internal: false; href: string });

export const projects: Project[] = [
  {
    slug: "milestone-escrow",
    title: "Milestone Escrow",
    subtitle:
      "USDC milestone escrow on Base — verified contract, fuzz + invariant tests, wallet-connected demo",
    cover: "/images/milestone-escrow.png",
    internal: true,
    draft: true,
  },
  {
    slug: "evm-ledger-indexer",
    title: "EVM Ledger Indexer",
    subtitle: "Reorg-safe double-entry ledger from on-chain events — Effect + Cloudflare D1",
    cover: "/images/evm-ledger-indexer.png",
    internal: true,
    draft: true,
  },
  {
    slug: "effect-viem",
    title: "effect-viem",
    subtitle: "viem clients as Effect services: typed errors, retries, streams",
    cover: "/images/effect-viem.png",
    internal: false,
    href: "https://github.com/danolekh/effect-viem",
    draft: true,
  },
  {
    slug: "oasi-kadir",
    title: "Oasi Kadir",
    subtitle: "Bilingual agriturismo site — Astro + Strapi on Cloudflare, with native bookings",
    cover: "/images/covers/oasi-kadir-dark.webp",
    coverLight: "/images/covers/oasi-kadir-light.webp",
    internal: true,
  },
  {
    slug: "consolline",
    title: "Consolline",
    subtitle:
      "Four-language logistics site in Astro — WebGL globe and halftone shaders, built from Figma",
    cover: "/images/covers/consolline-dark.webp",
    coverLight: "/images/covers/consolline-light.webp",
    internal: true,
  },
  {
    slug: "sportmagaz",
    title: "SportMagaz",
    subtitle:
      "Sports-equipment store for Ukraine with its own admin panel — Next.js, then static Astro",
    cover: "/images/covers/sportmagaz-dark.webp",
    coverLight: "/images/covers/sportmagaz-light.webp",
    internal: true,
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
