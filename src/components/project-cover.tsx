import { cn } from "@/lib/utils";
import type { Project } from "@/data/projects";

/* Covers come in a light and a dark cut. Both are in the markup and the `.dark` class that
 * next-themes sets on <html> before first paint hides one, so the prerendered page never flashes
 * the wrong one.
 *
 * The case-study covers (public/images/covers/*.webp, 1600x900) also have an 800px version next to
 * them (`<name>-800.webp`), so a grid card on a phone doesn't download the full original; `sizes`
 * tells the browser how wide the cover is shown. `priority` is for the cover that is the largest
 * thing above the fold: fetched right away and first, instead of lazily after layout.
 */
const srcSetFor = (src: string) =>
  /^\/images\/covers\/[\w-]+\.webp$/.test(src)
    ? `${src.replace(/\.webp$/, "-800.webp")} 800w, ${src} 1600w`
    : undefined;

/** A cover pair for anything with art: case studies, posts. */
export type CoverArt = { title: string; cover: string; coverLight?: string | null };

type CoverProps = { className?: string; sizes?: string; priority?: boolean };

export function Cover({
  art,
  className,
  sizes = "100vw",
  priority = false,
}: CoverProps & { art: CoverArt }) {
  const img = (src: string, extra?: string) => (
    <img
      src={src}
      srcSet={srcSetFor(src)}
      sizes={srcSetFor(src) ? sizes : undefined}
      width={1600}
      height={900}
      alt={`${art.title} preview`}
      className={cn(className, extra)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
  if (!art.coverLight) return img(art.cover);
  return (
    <>
      {img(art.coverLight, "dark:hidden")}
      {img(art.cover, "hidden dark:block")}
    </>
  );
}

export function ProjectCover({
  project,
  ...props
}: CoverProps & { project: Pick<Project, "title" | "cover" | "coverLight"> }) {
  return <Cover art={project} {...props} />;
}
