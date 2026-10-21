import { createFileRoute, Link } from "@tanstack/react-router";
import { KickerArrow } from "@/components/site-frame";
import { BlogComponent } from "@/lib/content/blog-components";
import { lab } from "@/data/lab";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

export const Route = createFileRoute("/lab/")({
  component: LabIndex,
  head: () =>
    createMeta({
      title: "Lab",
      description: "Small interface things by Dan Olekh, each built for one product.",
      url: `${siteConfig.url}/lab`,
    }),
});

// Every item's demo, live, newest first, as the lab repo's playground shows them; each one's name
// links to its own page (the code, and its other looks).
function LabIndex() {
  const items = [...lab].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="px-6 pt-12 md:px-12 md:pt-16">
      <header className="mb-12">
        <div className="kicker">
          <span className="dot" />
          <KickerArrow />
          <span className="label">Small interface things</span>
        </div>
        <h1 className="display mt-4 text-[clamp(48px,7vw,88px)]">Lab</h1>
        <p className="mt-5 max-w-[40rem] text-xl leading-normal">
          Small interface things, each one built for a product I like. The code is open and each
          one installs with the shadcn CLI.
        </p>
      </header>

      <div className="max-w-3xl space-y-16">
        {items.map((item, i) => (
          <section key={item.slug} data-item={item.slug}>
            <div className="mb-5 flex items-center gap-4">
              <span className="label">{String(items.length - i).padStart(2, "0")}</span>
              <Link
                to="/lab/$slug"
                params={{ slug: item.slug }}
                className="display text-[28px] hover:text-signal"
              >
                {item.title}
              </Link>
              <span className="h-[1.5px] flex-1 bg-current" aria-hidden />
            </div>
            <BlogComponent name={item.demo} props={item.look ? { look: item.look } : {}} />
          </section>
        ))}
      </div>
    </div>
  );
}
