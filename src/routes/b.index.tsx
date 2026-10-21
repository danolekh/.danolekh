import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { KickerArrow, SectionHead } from "@/components/site-frame";
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
    <div className="px-6 pt-12 md:px-12 md:pt-16">
      <header className="mb-12">
        <div className="kicker">
          <span className="dot" />
          <KickerArrow />
          <span className="label">Notes and write-ups</span>
        </div>
        <h1 className="display mt-4 text-[clamp(64px,11vw,132px)]">Writing</h1>
      </header>

      <SectionHead label="All posts" note={String(posts.length).padStart(2, "0")} />
      {posts.length === 0 ? (
        <p className="text-lg italic">Nothing here yet.</p>
      ) : (
        <ul>
          {posts.map((post, i) => {
            const date = formatDate(post.date);
            return (
              <li key={post.slug} className="border-b-[1.5px] border-border last:border-0">
                <Link
                  to="/b/$slug"
                  params={{ slug: post.slug }}
                  className="group grid gap-5 py-7 sm:grid-cols-[3rem_minmax(0,1fr)_16rem] sm:gap-8"
                >
                  <span className="label pt-1.5">{String(posts.length - i).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    {date ? <p className="label opacity-80">{date}</p> : null}
                    <h2 className="display mt-2 text-balance text-[clamp(28px,3.4vw,38px)] leading-[0.92] group-hover:text-signal">
                      {post.title}
                    </h2>
                    {post.description ? (
                      <p className="mt-3 max-w-[38rem] leading-relaxed">{post.description}</p>
                    ) : null}
                  </div>
                  {post.cover ? (
                    <div className="reg self-start [--d:7px] [--p:7px] p-5 sm:order-none">
                      <Cover
                        art={{ title: post.title, cover: post.cover, coverLight: post.coverLight }}
                        className="w-full object-cover"
                        sizes="(min-width: 640px) 216px, 100vw"
                      />
                    </div>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
