import { cn } from "@/lib/utils";
import type { Project } from "@/data/projects";

/* Covers come in a light and a dark cut. Both are in the markup and the `.dark` class that
 * next-themes sets on <html> before first paint hides one, so the prerendered page never flashes
 * the wrong one. */
export function ProjectCover({
  project,
  className,
  loading,
}: {
  project: Pick<Project, "title" | "cover" | "coverLight">;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const alt = `${project.title} preview`;
  if (!project.coverLight) {
    return <img src={project.cover} alt={alt} className={className} loading={loading} />;
  }
  return (
    <>
      <img
        src={project.coverLight}
        alt={alt}
        className={cn(className, "dark:hidden")}
        loading={loading}
      />
      <img
        src={project.cover}
        alt={alt}
        className={cn(className, "hidden dark:block")}
        loading={loading}
      />
    </>
  );
}
