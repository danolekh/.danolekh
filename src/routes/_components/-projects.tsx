import { Link } from "@tanstack/react-router";
import { ProjectCover } from "@/components/project-cover";
import { PreviewVideo, useCardPreview } from "@/components/cover-video";
import { projects, type Project } from "@/data/projects";
import { WEB3_LIVE } from "@/lib/config";
import { SectionHead } from "@/components/site-frame";

// Draft cards (the onchain projects) stay out of the grid until the flag flips.
const visibleProjects = projects.filter((p) => !p.draft || WEB3_LIVE);

export default function Projects() {
  return (
    <section className="px-6 py-10 md:px-12">
      <SectionHead label="Selected work" note={String(visibleProjects.length).padStart(2, "0")} />
      <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2">
        {visibleProjects.map((project, i) => (
          <ProjectCard key={project.slug} project={project} priority={i === 0} />
        ))}
      </div>
    </section>
  );
}

/* A card is the cover on a paper plate with registration dots, then the title in the poster face.
 * Hover kicks the plate up-left onto a pink offset, like a second impression. */
function ProjectCard({ project, priority }: { project: Project; priority: boolean }) {
  const preview = useCardPreview();
  // 16:9, the ratio the cover art is composed at, so nothing important gets cropped away.
  // The first card's cover is the largest thing above the fold on a phone.
  const cover = {
    className: "aspect-video w-full object-cover",
    sizes: "(min-width: 1152px) 500px, (min-width: 640px) 45vw, 100vw",
    priority,
  };
  const inner = (
    <div className="group h-full">
      <div className="reg transition-[translate,box-shadow] duration-150 group-hover:-translate-x-[3px] group-hover:-translate-y-[3px] group-hover:shadow-[7px_7px_0_var(--signal)]">
        {/* A project with a clip plays it over the cover while hovered, or while in view on touch. */}
        {project.video ? (
          <PreviewVideo art={project} video={project.video} active={preview.active} {...cover} />
        ) : (
          <ProjectCover project={project} {...cover} />
        )}
      </div>
      <h3 className="display mt-4 text-[34px] group-hover:text-signal">{project.title}</h3>
      <p className="mt-2 max-w-[46ch] text-[15px] leading-normal">{project.subtitle}</p>
    </div>
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
