import { LinkPreviews } from "@/components/link-previews";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAutoplayVideos } from "@/hooks/use-autoplay-videos";
import { Schema } from "effect";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { getBPostBySlug } from "@/lib/content/b";
import { BlogComponent } from "@/lib/content/blog-components";
import { createArticleMeta } from "@/lib/seo";
import { Cover } from "@/components/project-cover";
import { HeroVideo } from "@/components/cover-video";

const getPost = createServerFn({ method: "GET" })
  .inputValidator(Schema.Struct({ slug: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }) => {
    const post = await getBPostBySlug(data.slug);
    // Drafts stay reachable in dev for writing; in production they do not exist.
    if (!post || (post.draft && !import.meta.env.DEV)) throw notFound();
    return post;
  });

export const Route = createFileRoute("/b/$slug")({
  component: RouteComponent,
  loader: async ({ params }) => getPost({ data: { slug: params.slug } }),
  notFoundComponent: PostNotFound,
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    return createArticleMeta({
      title: loaderData.title,
      description: loaderData.description ?? undefined,
      slug: loaderData.slug,
      publishedTime: loaderData.date ?? undefined,
      noindex: loaderData.noindex,
      // A post with a hero gets a share card cut from it (scripts/generate-og.ts).
      image: loaderData.image ?? (loaderData.cover ? `/og/b-${loaderData.slug}.jpg` : undefined),
    });
  },
});

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function RouteComponent() {
  const post = Route.useLoaderData();
  const date = formatDate(post.date);
  useAutoplayVideos(post.slug);

  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Button render={<Link to="/b"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          All writing
        </Button>

        <header className="mt-6 mb-8 space-y-6">
          {post.cover && post.video ? (
            <HeroVideo
              art={{ title: post.title, cover: post.cover, coverLight: post.coverLight }}
              video={{ src: post.video, srcLight: post.videoLight }}
              className="w-full border border-dashed object-cover"
              sizes="(min-width: 816px) 768px, 100vw"
              priority
            />
          ) : post.cover ? (
            <Cover
              art={{ title: post.title, cover: post.cover, coverLight: post.coverLight }}
              className="w-full border border-dashed object-cover"
              sizes="(min-width: 816px) 768px, 100vw"
              priority
            />
          ) : null}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
              {post.title}
            </h1>
            {date ? (
              <p className="mt-2 text-sm text-muted-foreground lg:text-base">{date}</p>
            ) : null}
          </div>
        </header>

        <LinkPreviews previews={post.previews}>
          <div className="space-y-8">
            {post.nodes.map((node, i) =>
              node.type === "html" ? (
                <article
                  key={i}
                  className="prose lg:prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: node.html }}
                />
              ) : (
                <BlogComponent key={i} name={node.name} props={node.props} />
              ),
            )}
          </div>
        </LinkPreviews>

        <div className="mt-10 text-right">
          <Button
            render={<Link to="/b"></Link>}
            nativeButton={false}
            variant="link"
            className="px-0"
          >
            <IconArrowLeft />
            All writing
          </Button>
        </div>
      </div>
    </div>
  );
}

function PostNotFound() {
  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">This post isn’t published</h1>
        <p className="text-muted-foreground">
          It may be unfinished or moved. Everything that is published is on the{" "}
          <Link to="/b" className="text-primary underline underline-offset-4">
            writing page
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-x-6">
          <Button
            render={<Link to="/b"></Link>}
            nativeButton={false}
            variant="link"
            className="px-0"
          >
            <IconArrowLeft />
            All writing
          </Button>
          <Button
            render={<Link to="/"></Link>}
            nativeButton={false}
            variant="link"
            className="px-0"
          >
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
