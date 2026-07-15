// Projects shown in the `/` Projects section. `internal` projects have a case-study page at
// `/p/$slug` (backed by a markdown file in `src/content/p/`); external ones link straight out.

export type Project = {
  slug: string;
  title: string;
  subtitle: string;
  cover: string;
} & ({ internal: true } | { internal: false; href: string });

export const projects: Project[] = [
  {
    slug: "oasi-kadir",
    title: "Oasi Kadir",
    subtitle: "Bilingual agriturismo site — Astro + Strapi on Cloudflare, with native bookings",
    cover: "/images/oasi-kadir.jpg",
    internal: true,
  },
  {
    slug: "ifit",
    title: "iFit",
    subtitle: "E-commerce store for selling sports equipment in Ukraine",
    cover: "/images/ifit.png",
    internal: false,
    href: "https://ifit.danolekh.com",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
