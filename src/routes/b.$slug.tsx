import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { getBPostBySlug } from "@/lib/content/b";
import { BlogComponent } from "@/lib/content/blog-components";
import { createArticleMeta } from "@/lib/seo";

const getPost = createServerFn({ method: "GET" })
  .inputValidator(Schema.Struct({ slug: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }) => {
    const post = await getBPostBySlug(data.slug);
    if (!post) throw notFound();
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

  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          Back home
        </Button>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            {post.title}
          </h1>
          {date ? <p className="mt-2 text-sm text-muted-foreground lg:text-base">{date}</p> : null}
        </header>

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

        <div className="mt-10 text-right">
          <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
            <IconArrowLeft />
            Back home
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
        <h1 className="text-2xl font-semibold text-foreground">Post not found</h1>
        <p className="text-muted-foreground">This article doesn’t exist (yet).</p>
        <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          Back home
        </Button>
      </div>
    </div>
  );
}
