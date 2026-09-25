import { createFileRoute } from "@tanstack/react-router";
import { listBPosts } from "@/lib/content/b";
import { listPProjects } from "@/lib/content/p";
import { siteConfig } from "@/lib/config";

/* /sitemap.xml — the list `robots.txt` points Google Search Console at.
 *
 * Built from the same content modules the pages are, so adding a markdown file is all it takes for
 * the URL to show up here; drafts are filtered out upstream. Google ignores <changefreq> and
 * <priority>, so neither is emitted — only <loc> and, where the frontmatter knows one, <lastmod>.
 *
 * The D1-backed `/feed/b/*` pages are left out on purpose: they would make this handler depend on
 * the database.
 */

type Entry = { path: string; lastmod?: string | null };

function urlEntry({ path, lastmod }: Entry): string {
  const loc = `${siteConfig.url}${path}`;
  return lastmod
    ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`
    : `  <url><loc>${loc}</loc></url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const entries: Entry[] = [
          { path: "/" },
          { path: "/b" },
          { path: "/resume" },
          { path: "/feed" },
          ...listPProjects().map((p) => ({
            path: `/p/${p.slug}`,
            lastmod: p.updated ?? p.date,
          })),
          ...listBPosts().map((p) => ({ path: `/b/${p.slug}`, lastmod: p.date })),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(urlEntry).join("\n")}
</urlset>
`;

        return new Response(xml, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
