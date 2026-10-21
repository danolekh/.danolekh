import { LinkPreviews } from "@/components/link-previews";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useAutoplayVideos } from "@/hooks/use-autoplay-videos";
import { Schema } from "effect";
import { IconExternalLink } from "@tabler/icons-react";
import { getPProjectBySlug } from "@/lib/content/p";
import { PortfolioBlock } from "@/lib/content/portfolio-components";
import { createProjectMeta } from "@/lib/seo";
import { getProject, projects } from "@/data/projects";
import { PostToc } from "@/components/post-toc";
import { PostAuthor } from "@/components/post-author";
import { Cover } from "@/components/project-cover";
import { KickerArrow } from "@/components/site-frame";
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
    <Link to="/" className="ink-link text-lg">
      Back home
    </Link>
  );
}

/* A case study: the contents rail in the left margin on wide screens (a sticky bar with a dropdown
 * below that), then the kicker, the title in the poster face, the cover on a registration plate,
 * the client/role/year line, and the write-up. */
function RouteComponent() {
  const project = Route.useLoaderData();
  useAutoplayVideos(project.slug);
  // Cover comes from the static project list, else from the case study's own frontmatter.
  const meta = getProject(project.slug);
  const art = meta ?? (project.cover ? { ...project, cover: project.cover } : null);

  return (
    <div className="px-6 pt-10 md:px-12 md:pt-14">
      <div className="mx-auto grid gap-12 xl:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="hidden xl:block">
          <div className="sticky top-8 max-h-[calc(100dvh-4rem)] space-y-8 overflow-y-auto pb-4">
            <PostAuthor />
            <PostToc entries={project.toc} />
          </div>
        </aside>

        <div className="mx-auto w-full max-w-[52rem] min-w-0">
          {/* Below xl the rail has no margin to live in, so the contents collapse into a
              dropdown that rides along at the top of the screen, with the way home beside it. */}
          <div className="sticky top-0 z-30 -mx-6 mb-4 flex items-center justify-between gap-3 bg-background/90 px-6 py-2.5 backdrop-blur xl:hidden">
            <PostAuthor variant="bar" className="shrink-0" />
            <div className="flex min-w-0 flex-1 justify-end">
              <PostToc entries={project.toc} variant="dropdown" />
            </div>
          </div>

          <header className="mb-10">
            <div className="kicker">
              <span className="dot" />
              <KickerArrow />
              <span className="label">Case study{project.year ? ` · ${project.year}` : ""}</span>
            </div>
            <h1 className="display mt-5 text-balance text-[clamp(44px,7vw,84px)]">{project.title}</h1>
            {project.subtitle ? (
              <p className="mt-5 max-w-[40rem] text-xl leading-normal">{project.subtitle}</p>
            ) : null}

            {art ? (
              <div className="reg mt-9">
                {meta?.video?.hero ? (
                  <HeroVideo
                    art={art}
                    video={{ src: meta.video.hero, srcLight: meta.video.heroLight }}
                    className="w-full object-cover"
                    sizes="(min-width: 880px) 780px, 100vw"
                    priority
                  />
                ) : (
                  <Cover
                    art={art}
                    className="w-full object-cover"
                    sizes="(min-width: 880px) 780px, 100vw"
                    priority
                  />
                )}
              </div>
            ) : null}

            {(project.client || project.role || project.year || project.liveUrl) && (
              <dl className="mt-8 flex flex-wrap items-end gap-x-10 gap-y-4 border-t-[1.5px] border-current pt-4">
                {project.client ? <MetaItem label="Client" value={project.client} /> : null}
                {project.role ? <MetaItem label="Role" value={project.role} /> : null}
                {project.year ? <MetaItem label="Year" value={project.year} /> : null}
                {project.liveUrl ? (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ink-link ml-auto inline-flex items-center gap-1"
                  >
                    Visit site <IconExternalLink className="size-4" />
                  </a>
                ) : null}
              </dl>
            )}
          </header>

          {/* Not every case study is in English; `lang` scopes the right one to the body copy so
              crawlers and screen readers do not inherit the document's `lang="en"`. */}
          <LinkPreviews previews={project.previews}>
            <div className="riso-body space-y-8" lang={project.lang}>
              {project.nodes.map((node, i) =>
                node.type === "html" ? (
                  <article
                    key={i}
                    className="prose prose-lg max-w-none dark:prose-invert"
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
    <nav aria-label="More case studies" className="mt-16">
      <div className="mb-5 flex items-center gap-4">
        <h2 className="label">More case studies</h2>
        <span className="h-[1.5px] flex-1 bg-current" aria-hidden />
      </div>
      <ul className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {others.map((p) => (
          <li key={p.slug}>
            <Link to="/p/$project" params={{ project: p.slug }} className="group block">
              <span className="display block text-[28px] group-hover:text-signal">{p.title}</span>
              <span className="mt-1.5 block text-[15px] leading-normal">{p.subtitle}</span>
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
      <dt className="label opacity-80">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
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
