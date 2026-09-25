import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectCover } from "@/components/project-cover";
import { PreviewVideo, useCardPreview } from "@/components/cover-video";
import { projects, type Project } from "@/data/projects";
import { WEB3_LIVE } from "@/lib/config";
import { cn } from "@/lib/utils";

// Draft cards (the onchain projects) stay out of the grid until the flag flips.
const visibleProjects = projects.filter((p) => !p.draft || WEB3_LIVE);

export default function Projects() {
  return (
    <section className="py-8 px-6 md:px-12">
      <div className="max-w-208 mx-auto">
        <h2 className="text-2xl font-bold tracking-tight mb-6">Projects</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleProjects.map((project, i) => (
            <ProjectCard key={project.slug} project={project} priority={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project, priority }: { project: Project; priority: boolean }) {
  const preview = useCardPreview();
  // 16:9, the ratio the cover art is composed at, so nothing important gets cropped away.
  // The first card's cover is the largest thing above the fold on a phone.
  const cover = {
    className: "aspect-video w-full object-cover",
    sizes: "(min-width: 832px) 400px, (min-width: 640px) 50vw, 100vw",
    priority,
  };
  const inner = (
    <Card
      size="sm"
      className={cn("h-full hover:ring-foreground/20 transition-all cursor-pointer", project.video && "pt-0")}
    >
      {/* A project with a clip plays it over the cover while hovered, or while in view on touch. */}
      {project.video ? (
        <PreviewVideo art={project} video={project.video} active={preview.active} {...cover} />
      ) : (
        <ProjectCover project={project} {...cover} />
      )}
      <CardHeader>
        <CardTitle className="text-base">{project.title}</CardTitle>
        <CardDescription>{project.subtitle}</CardDescription>
      </CardHeader>
    </Card>
  );

  const link = project.internal ? (
    <Link to="/p/$project" params={{ project: project.slug }} className="block h-full">
      {inner}
    </Link>
  ) : (
    <a href={project.href} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </a>
  );

  return project.video ? <div {...preview.props}>{link}</div> : link;
}
