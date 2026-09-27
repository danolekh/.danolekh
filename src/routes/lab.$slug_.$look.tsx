import { createFileRoute, notFound } from "@tanstack/react-router";
import { LabPage } from "@/components/lab-page";
import { getLabItem } from "@/data/lab";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

// The same page with the demo in another of its looks (the Minimist-styled one for the pitch, say).
// Not linked from anywhere on the site, noindexed, and canonical to the item's page.
export const Route = createFileRoute("/lab/$slug_/$look")({
  component: () => {
    const { item, look } = Route.useLoaderData();
    return <LabPage item={item} look={look} />;
  },
  loader: ({ params }) => {
    const item = getLabItem(params.slug);
    const look = item?.looks?.find((l) => l === params.look);
    if (!item || !look) throw notFound();
    return { item, look };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    const { item, look } = loaderData;
    return createMeta({
      title: item.title,
      description: item.description,
      url: `${siteConfig.url}/lab/${item.slug}`,
      noindex: true,
      image: `${siteConfig.url}/og/lab-${item.slug}-${look}.jpg`,
    });
  },
});
