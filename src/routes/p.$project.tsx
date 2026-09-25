import { LinkPreviews } from "@/components/link-previews";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAutoplayVideos } from "@/hooks/use-autoplay-videos";
import { Schema } from "effect";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { getPProjectBySlug } from "@/lib/content/p";
import { PortfolioBlock } from "@/lib/content/portfolio-components";
import { createProjectMeta } from "@/lib/seo";
import { getProject, projects } from "@/data/projects";
import { PostToc } from "@/components/post-toc";
import { PostAuthor } from "@/components/post-author";
import { Cover } from "@/components/project-cover";
import { HeroVideo } from "@/components/cover-video";
import { WEB3_LIVE, siteConfig } from "@/lib/config";

const getProjectPost = createServerFn({ method: "GET" })
  .inputValidator(Schema.Struct({ slug: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }) => {
    const project = await getPProjectBySlug(data.slug);
    // Drafts stay reachable in dev for writing; in production they do not exist.
    if (!project || (project.draft && !import.meta.env.DEV)) throw notFound();
    return project;
  });

export const Route = createFileRoute("/p/$project")({
  component: RouteComponent,
  loader: async ({ params }) => getProjectPost({ data: { slug: params.project } }),
  notFoundComponent: ProjectNotFound,
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [], links: [] };
    // Only the slugs listed in `src/data/projects.ts` have a social card cut from their cover art
    // (scripts/generate-og.ts); the rest fall back to the site-wide one.
    const hasCard = getProject(loaderData.slug) !== undefined || loaderData.cover !== null;
    return createProjectMeta({
      title: loaderData.title,
      description: loaderData.description ?? loaderData.subtitle ?? undefined,
      slug: loaderData.slug,
      image: hasCard ? `${siteConfig.url}/og/${loaderData.slug}.jpg` : undefined,
      clientName: clientName(loaderData.client),
      clientUrl: loaderData.liveUrl ?? undefined,
      stack: loaderData.stack,
      lang: loaderData.lang,
      publishedTime: loaderData.date ?? undefined,
      modifiedTime: loaderData.updated ?? undefined,
    });
  },
});

/* `client` is written for the reader as "Consolline (international logistics, Ukraine)". The
 * structured data wants the bare organisation name, which is everything before the parenthetical. */
function clientName(client: string | null): string | undefined {
  return client?.split(" (")[0]?.trim() || undefined;
}

function BackHome() {
  return (
    <Button render={<Link to="/"></Link>} nativeButton={false} variant="link" className="px-0">
      <IconArrowLeft />
      Back home
    </Button>
  );
}

function RouteComponent() {
  const project = Route.useLoaderData();
  useAutoplayVideos(project.slug);
  // Cover comes from the static project list, else from the case study's own frontmatter.
  const meta = getProject(project.slug);
  const art = meta ?? (project.cover ? { ...project, cover: project.cover } : null);

  return (
    <div className="min-h-dvh px-6 py-12">
      {/* On wide screens the contents rail sits in the left margin; below xl it collapses away and
          the article keeps the same measure it always had. */}
      <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[12rem_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          {/* The article's own backdrop fades out over the outer 15% of the page, and the rail
              lives in exactly that band — so the decorative dots behind it show through the text.
              It gets its own scrim, matching the one the mobile trigger already uses. */}
          <div className="sticky top-12 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-lg bg-background/75 p-3 backdrop-blur-sm">
            <PostAuthor className="mb-3 border-b border-dashed pb-3" />
            <PostToc entries={project.toc} />
          </div>
        </aside>

        <div className="max-w-208 mx-auto w-full min-w-0">
          {/* Below xl the rail has no margin to live in, so the contents collapse into a
              dropdown that rides along at the top of the screen, with the way home beside it. */}
          <div className="sticky top-0 z-30 -mx-6 mb-2 flex items-center justify-between gap-3 bg-background/85 px-6 py-2 backdrop-blur xl:hidden">
            <PostAuthor variant="bar" className="shrink-0" />
            {/* The trigger takes whatever room is left and shortens its label; the author stays. */}
            <div className="flex min-w-0 flex-1 justify-end">
              <PostToc entries={project.toc} variant="dropdown" />
            </div>
          </div>

          <header className="mt-6 mb-8 space-y-4">
            {art && meta?.video?.hero ? (
              <HeroVideo
                art={art}
                video={{ src: meta.video.hero, srcLight: meta.video.heroLight }}
                className="w-full border border-dashed object-cover"
                sizes="(min-width: 880px) 832px, 100vw"
                priority
              />
            ) : art ? (
              <Cover
                art={art}
                className="w-full border border-dashed object-cover"
                sizes="(min-width: 880px) 832px, 100vw"
                priority
              />
            ) : null}

            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground lg:text-4xl">
                  {project.title}
                </h1>
                {project.subtitle ? (
                  <p className="mt-2 text-muted-foreground lg:text-lg">{project.subtitle}</p>
                ) : null}
              </div>
              {project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Visit site <IconExternalLink className="size-4" />
                </a>
              ) : null}
            </div>

            {(project.client || project.role || project.year) && (
              <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t border-dashed pt-4 text-sm">
                {project.client ? <MetaItem label="Client" value={project.client} /> : null}
                {project.role ? <MetaItem label="Role" value={project.role} /> : null}
                {project.year ? <MetaItem label="Year" value={project.year} /> : null}
              </dl>
            )}
          </header>

          {/* Not every case study is in English; `lang` scopes the right one to the body copy so
              crawlers and screen readers do not inherit the document's `lang="en"`. */}
          <LinkPreviews previews={project.previews}>
            <div className="space-y-8" lang={project.lang}>
              {project.nodes.map((node, i) =>
                node.type === "html" ? (
                  <article
                    key={i}
                    className="prose lg:prose-lg dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: node.html }}
                  />
                ) : (
                  <PortfolioBlock key={i} name={node.name} props={node.props} />
                ),
              )}
            </div>
          </LinkPreviews>

          <MoreCaseStudies currentSlug={project.slug} />

          <div className="mt-10 text-right">
            <BackHome />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Every case study links to the others. Cheap for a reader who liked this one, and it stops each
 * write-up sitting as a leaf that is only reachable from the home page. */
function MoreCaseStudies({ currentSlug }: { currentSlug: string }) {
  const others = projects.filter(
    (p) => p.internal && (!p.draft || WEB3_LIVE) && p.slug !== currentSlug,
  );
  if (others.length === 0) return null;

  return (
    <nav aria-label="More case studies" className="mt-14 border-t border-dashed pt-6">
      <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        More case studies
      </h2>
      <ul className="mt-3 space-y-2">
        {others.map((p) => (
          <li key={p.slug}>
            <Link
              to="/p/$project"
              params={{ project: p.slug }}
              className="group flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2"
            >
              <span className="font-medium text-primary underline-offset-4 group-hover:underline">
                {p.title}
              </span>
              <span className="text-sm text-muted-foreground">{p.subtitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function ProjectNotFound() {
  const published = projects.filter((p) => p.internal && (!p.draft || WEB3_LIVE));
  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-208 mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">This case study isn’t published</h1>
        <p className="text-muted-foreground">It may be unfinished or moved. These are live:</p>
        <ul className="space-y-2">
          {published.map((p) => (
            <li key={p.slug}>
              <Link
                to="/p/$project"
                params={{ project: p.slug }}
                className="font-medium text-foreground hover:underline"
              >
                {p.title}
              </Link>
              <span className="text-muted-foreground"> - {p.subtitle}</span>
            </li>
          ))}
        </ul>
        <BackHome />
      </div>
    </div>
  );
}
