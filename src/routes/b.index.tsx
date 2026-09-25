import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { IconArrowLeft } from "@tabler/icons-react";
import { listBPosts } from "@/lib/content/b";
import { createMeta } from "@/lib/seo";
import { siteConfig } from "@/lib/config";
import { Cover } from "@/components/project-cover";

// Frontmatter only - the markdown itself is rendered per post in `b.$slug.tsx`. Drafts are
// filtered out in the loader module, so they never reach this list.
const getPosts = createServerFn({ method: "GET" }).handler(async () => listBPosts());

export const Route = createFileRoute("/b/")({
  component: WritingIndex,
  loader: () => getPosts(),
  head: () =>
    createMeta({
      title: "Writing",
      description: "Notes and write-ups by Dan Olekh",
      url: `${siteConfig.url}/b`,
    }),
});

function formatDate(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function WritingIndex() {
  const posts = Route.useLoaderData();

  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
          <IconArrowLeft />
          Back home
        </Button>

        <header className="mt-6 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
            Writing
          </h1>
        </header>

        {posts.length === 0 ? (
          <p className="text-lg font-light italic text-muted-foreground">Nothing here yet.</p>
        ) : (
          <ul className="divide-y divide-dashed">
            {posts.map((post) => {
              const date = formatDate(post.date);
              return (
                <li key={post.slug}>
                  <Link
                    to="/b/$slug"
                    params={{ slug: post.slug }}
                    className="group flex flex-col gap-4 py-5 first:pt-0 sm:flex-row-reverse sm:items-start sm:gap-6"
                  >
                    {post.cover ? (
                      <div className="shrink-0 overflow-hidden border border-dashed sm:w-56">
                        <Cover
                          art={{
                            title: post.title,
                            cover: post.cover,
                            coverLight: post.coverLight,
                          }}
                          className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                          sizes="(min-width: 640px) 224px, 100vw"
                        />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold tracking-tight text-foreground underline-offset-4 group-hover:underline">
                        {post.title}
                      </h2>
                      {date ? <p className="mt-1 text-sm text-muted-foreground">{date}</p> : null}
                      {post.description ? (
                        <p className="mt-2 leading-relaxed text-muted-foreground">
                          {post.description}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
