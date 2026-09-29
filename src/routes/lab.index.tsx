import { createFileRoute, Link } from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-dvh px-4 py-12 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          Back home
        </Button>

        <header className="mt-6 mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">Lab</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Small interface things, each one built for a product I like. The code is open and
            each one installs with the shadcn CLI.
          </p>
        </header>

        <div className="space-y-16">
          {items.map((item) => (
            <section key={item.slug} data-item={item.slug}>
              <h2 className="mb-4 font-mono text-sm font-normal text-muted-foreground">
                <Link to="/lab/$slug" params={{ slug: item.slug }} className="hover:text-foreground">
                  {item.slug}
                </Link>
              </h2>
              <BlogComponent name={item.demo} props={item.look ? { look: item.look } : {}} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
