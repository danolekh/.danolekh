import { LinkPreviews } from "@/components/link-previews";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAutoplayVideos } from "@/hooks/use-autoplay-videos";
import { Schema } from "effect";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { KickerArrow } from "@/components/site-frame";
import { PostAuthor } from "@/components/post-author";
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

/** Minutes to read, from the rendered prose at ~230 words a minute. */
function readingMinutes(nodes: { type: string; html?: string }[]): number {
  const words = nodes
    .map((n) => (n.type === "html" && n.html ? n.html.replace(/<pre[\s\S]*?<\/pre>|<[^>]+>/g, " ") : ""))
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

function RouteComponent() {
  const post = Route.useLoaderData();
  const date = formatDate(post.date);
  useAutoplayVideos(post.slug);
  const minutes = readingMinutes(post.nodes);

  return (
    <div className="px-6 pt-12 md:px-12 md:pt-16">
      <article className="mx-auto max-w-[45rem]">
        <header className="mb-10">
          <div className="kicker">
            <span className="dot" />
            <KickerArrow />
            <span className="label">
              Writing{date ? ` · ${date}` : ""} · {minutes} min
            </span>
          </div>
          <h1 className="display mt-5 text-balance text-[clamp(34px,4.6vw,54px)] leading-[0.92]">
            {post.title}
          </h1>
          {post.description ? (
            <p className="mt-5 text-xl leading-normal">{post.description}</p>
          ) : null}
          <PostAuthor className="mt-6" />
        </header>

        {post.cover ? (
          <div className="reg mb-10">
            {post.video ? (
              <HeroVideo
                art={{ title: post.title, cover: post.cover, coverLight: post.coverLight }}
                video={{ src: post.video, srcLight: post.videoLight }}
                className="w-full object-cover"
                sizes="(min-width: 816px) 720px, 100vw"
                priority
              />
            ) : (
              <Cover
                art={{ title: post.title, cover: post.cover, coverLight: post.coverLight }}
                className="w-full object-cover"
                sizes="(min-width: 816px) 720px, 100vw"
                priority
              />
            )}
          </div>
        ) : null}

        <LinkPreviews previews={post.previews}>
          <div className="riso-body space-y-8">
            {post.nodes.map((node, i) =>
              node.type === "html" ? (
                <div
                  key={i}
                  className="prose prose-lg max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: node.html }}
                />
              ) : (
                <BlogComponent key={i} name={node.name} props={node.props} />
              ),
            )}
          </div>
        </LinkPreviews>

        <footer className="mt-16 flex flex-col gap-6 border-t-[1.5px] border-current pt-6 sm:flex-row sm:items-center sm:justify-between">
          <PostAuthor />
          <Link to="/b" className="ink-link text-lg">
            All writing
          </Link>
        </footer>
      </article>
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
