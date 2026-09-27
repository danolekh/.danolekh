import { createFileRoute, Link } from "@tanstack/react-router";
import { IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cover } from "@/components/project-cover";
import { PreviewVideo, useCardPreview } from "@/components/cover-video";
import { lab, type LabItem } from "@/data/lab";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lab/")({
  component: LabIndex,
  head: () =>
    createMeta({
      title: "Lab",
      description: "Small interface things by Dan Olekh, each built for one product.",
      url: `${siteConfig.url}/lab`,
    }),
});

function LabIndex() {
  const items = [...lab].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-208 mx-auto">
        <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          Back home
        </Button>

        <header className="mt-6 mb-8 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">Lab</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Small interface things, each one built for a product I like. The code is open and
            each one installs with the shadcn CLI.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item, i) => (
            <LabCard key={item.slug} item={item} priority={i === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LabCard({ item, priority }: { item: LabItem; priority: boolean }) {
  const preview = useCardPreview();
  const art = { title: item.title, cover: item.cover ?? "", coverLight: item.coverLight };
  const cover = {
    className: "aspect-video w-full object-cover",
    sizes: "(min-width: 832px) 400px, (min-width: 640px) 50vw, 100vw",
    priority,
  };
  const card = (
    <Link to="/lab/$slug" params={{ slug: item.slug }} className="block h-full">
      <Card
        size="sm"
        className={cn("h-full cursor-pointer transition-all hover:ring-foreground/20", item.cover && "pt-0")}
      >
        {item.cover && item.video ? (
          <PreviewVideo art={art} video={{ src: item.video, srcLight: item.videoLight }} active={preview.active} {...cover} />
        ) : item.cover ? (
          <Cover art={art} {...cover} />
        ) : null}
        <CardHeader>
          <CardTitle className="text-base">{item.title}</CardTitle>
          <CardDescription>For {item.for.name}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
  return item.video ? <div {...preview.props}>{card}</div> : card;
}
