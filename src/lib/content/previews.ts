import matter from "gray-matter";
import { projects } from "@/data/projects";
import { siteConfig } from "@/lib/config";

/* What a link inside a post or case study shows when hovered: the page it points to, as a small
 * card with its hero (the clip if it has one, else its cover). Resolved here on the server when
 * the post is rendered, for the links that post actually has, and sent with the post, so the
 * client needs no content and no request.
 *
 * Server-only, like b.ts and p.ts: the frontmatter of every page is read at build time. */

export type LinkPreview = {
  href: string;
  kind: "Post" | "Case study" | "Page";
  title: string;
  description: string | null;
  cover: string | null;
  coverLight: string | null;
  video: string | null;
  videoLight: string | null;
};

const bFiles = import.meta.glob("/src/content/b/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const pFiles = import.meta.glob("/src/content/p/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const slugOf = (key: string) => key.slice(key.lastIndexOf("/") + 1).replace(/\.md$/, "");

/* The card is small, so it takes the smaller cuts the promo encoder writes beside each file:
 * `<name>-800.mp4` for `<name>-1600.mp4`, `<name>-poster-800.webp` for `<name>-poster.webp`. */
const smallVideo = (src: string | null) => src?.replace(/-1600\.mp4$/, "-800.mp4") ?? null;
const smallPoster = (src: string | null) =>
  src?.replace(/-poster\.webp$/, "-poster-800.webp") ?? null;

let index: Map<string, LinkPreview> | null = null;

function build(): Map<string, LinkPreview> {
  const map = new Map<string, LinkPreview>();

  // Posts, unlisted ones included: a link to one already exposes it. Drafts never.
  for (const [key, raw] of Object.entries(bFiles)) {
    const data = matter(raw).data as Record<string, unknown>;
    if (data.draft === true) continue;
    const href = `/b/${slugOf(key)}`;
    map.set(href, {
      href,
      kind: "Post",
      title: str(data.title) ?? slugOf(key),
      description: str(data.description),
      cover: smallPoster(str(data.cover)),
      coverLight: smallPoster(str(data.coverLight)),
      video: smallVideo(str(data.video)),
      videoLight: smallVideo(str(data.videoLight)),
    });
  }

  // Case studies: the art lives in the project list when the project is listed there, else in
  // the case study's own frontmatter.
  for (const [key, raw] of Object.entries(pFiles)) {
    const data = matter(raw).data as Record<string, unknown>;
    if (data.draft === true) continue;
    const slug = slugOf(key);
    const listed = projects.find((p) => p.slug === slug);
    map.set(`/p/${slug}`, {
      href: `/p/${slug}`,
      kind: "Case study",
      title: str(data.title) ?? listed?.title ?? slug,
      description: str(data.subtitle) ?? listed?.subtitle ?? str(data.description),
      cover: listed?.cover ?? str(data.cover),
      coverLight: listed?.coverLight ?? str(data.coverLight),
      video: listed?.video?.src ?? null,
      videoLight: listed?.video?.srcLight ?? null,
    });
  }

  const page = (href: string, title: string, description: string): LinkPreview => ({
    href,
    kind: "Page",
    title,
    description,
    cover: "/og.jpg",
    coverLight: null,
    video: null,
    videoLight: null,
  });
  map.set(
    "/",
    page("/", siteConfig.name, "Software engineer in Vienna: projects, case studies and writing."),
  );
  map.set("/resume", page("/resume", "Resume", "Experience, projects and skills, on one page."));
  return map;
}

/** The path a link points to on this site, without its query, hash or trailing slash; null for
 * links elsewhere. */
function internalPath(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.replace(/[?#].*$/, "").replace(/(.)\/$/, "$1");
  return path || "/";
}

export function previewFor(href: string): LinkPreview | null {
  index ??= build();
  const path = internalPath(href);
  return path ? (index.get(path) ?? null) : null;
}

const ANCHOR_RE = /<a href="([^"]*)"/g;

/** Marks each link in `html` that has a preview with `data-preview="<path>"` (the key into the
 * returned map), leaving out links to `self` and in-page anchors. */
export function markLinkPreviews(
  html: string,
  self: string,
  previews: Record<string, LinkPreview>,
): string {
  return html.replace(ANCHOR_RE, (match, href: string) => {
    const path = internalPath(href);
    if (!path || path === self) return match;
    const preview = previewFor(href);
    if (!preview) return match;
    previews[path] = preview;
    return `${match} data-preview="${path}"`;
  });
}
