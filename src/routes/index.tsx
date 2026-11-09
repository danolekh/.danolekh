import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/studio";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";

export const Route = createFileRoute("/")({
  component: Studio,
  staticData: { bare: true },
  head: () =>
    createMeta({
      title: "Daniil Olekh: websites and web apps, designed and built",
      description:
        "I'm Daniil (Dan) Olekh, an engineer in Vienna. I design and build websites, online stores, booking systems and web apps, usually live in weeks.",
      url: siteConfig.url,
    }),
});
