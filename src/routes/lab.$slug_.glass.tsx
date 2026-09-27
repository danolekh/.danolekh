import { createFileRoute, notFound } from "@tanstack/react-router";
import { LabPage } from "@/components/lab-page";
import { getLabItem } from "@/data/lab";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

// The same page with the demo in glass, for the X post that shows it. Not linked from anywhere on
// the site, noindexed, and canonical to the page itself.
export const Route = createFileRoute("/lab/$slug_/glass")({
  component: () => <LabPage item={Route.useLoaderData()} look="glass" />,
  loader: ({ params }) => {
    const item = getLabItem(params.slug);
    if (!item?.looks?.includes("glass")) throw notFound();
    return item;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    return createMeta({
      title: loaderData.title,
      description: loaderData.description,
      url: `${siteConfig.url}/lab/${loaderData.slug}`,
      noindex: true,
      ...(loaderData.cover ? { image: `${siteConfig.url}/og/lab-${loaderData.slug}-glass.jpg` } : {}),
    });
  },
});
