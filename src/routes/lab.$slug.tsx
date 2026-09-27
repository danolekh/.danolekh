import { createFileRoute, notFound } from "@tanstack/react-router";
import { LabPage } from "@/components/lab-page";
import { getLabItem } from "@/data/lab";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

export const Route = createFileRoute("/lab/$slug")({
  component: () => {
    const item = Route.useLoaderData();
    return <LabPage item={item} look={item.look} />;
  },
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
