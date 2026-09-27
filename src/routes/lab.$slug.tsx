import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { IconArrowLeft, IconBrandGithub } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { BlogComponent } from "@/lib/content/blog-components";
import { getLabItem, labInstall, labSource } from "@/data/lab";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

export const Route = createFileRoute("/lab/$slug")({
  component: LabPage,
  loader: ({ params }) => {
    const item = getLabItem(params.slug);
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    return createMeta({
      title: loaderData.title,
      description: loaderData.description,
      url: `${siteConfig.url}/lab/${loaderData.slug}`,
      type: "article",
      publishedTime: loaderData.date,
      ...(loaderData.cover ? { image: `${siteConfig.url}/og/lab-${loaderData.slug}.jpg` } : {}),
    });
  },
});

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function LabPage() {
  const item = Route.useLoaderData();
  return (
    <div className="min-h-dvh px-4 py-12 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Button render={<Link to="/lab"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          All of the lab
        </Button>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">{item.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground lg:text-base">
            For{" "}
            <a href={item.for.url} className="underline underline-offset-4 hover:text-foreground" rel="noopener noreferrer" target="_blank">
              {item.for.name}
            </a>{" "}
            · {formatDate(item.date)}
          </p>
        </header>

        <BlogComponent name={item.demo} props={{}} />

        <div className="mt-8 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Get the code</p>
            <pre className="overflow-x-auto rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm">
              <code>{labInstall(item.slug)}</code>
            </pre>
            <Button render={<a href={labSource(item.slug)} rel="noopener noreferrer" target="_blank"></a>} nativeButton={false} variant="link" className="px-0">
              <IconBrandGithub />
              Source on GitHub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
