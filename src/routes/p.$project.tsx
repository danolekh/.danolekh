import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { Button } from "@/components/ui/button";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { getPProjectBySlug } from "@/lib/content/p";
import { PortfolioBlock } from "@/lib/content/portfolio-components";
import { createProjectMeta } from "@/lib/seo";
import { getProject } from "@/data/projects";
import { PostToc } from "@/components/post-toc";

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
    return createProjectMeta({
      title: loaderData.title,
      description: loaderData.subtitle ?? undefined,
      slug: loaderData.slug,
    });
  },
});

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
  // Cover comes from the static project list (falls back to none if the slug isn't listed).
  const meta = getProject(project.slug);
  const cover = meta?.cover;

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
            <PostToc entries={project.toc} />
          </div>
        </aside>

        <div className="max-w-208 mx-auto w-full min-w-0">
          <BackHome />

          {/* Below xl the rail has no margin to live in, so the contents collapse into a
              dropdown that rides along at the top of the screen. */}
          <div className="sticky top-0 z-30 -mx-6 mb-2 bg-background/85 px-6 py-2 backdrop-blur xl:hidden">
            <PostToc entries={project.toc} variant="dropdown" />
          </div>

          <header className="mt-6 mb-8 space-y-4">
            {cover ? (
              <img
                src={cover}
                alt={`${project.title} preview`}
                className="w-full border border-dashed object-cover"
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

          <div className="space-y-8">
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

          <div className="mt-10 text-right">
            <BackHome />
          </div>
        </div>
      </div>
    </div>
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
  return (
    <div className="min-h-dvh px-6 py-12">
      <div className="max-w-208 mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Project not found</h1>
        <p className="text-muted-foreground">This case study doesn’t exist (yet).</p>
        <BackHome />
      </div>
    </div>
  );
}
