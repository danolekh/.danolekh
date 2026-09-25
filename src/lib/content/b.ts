import matter from "gray-matter";
import { Marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { type LinkPreview, markLinkPreviews } from "./previews";

// Eagerly inline every markdown file's RAW text at build time. Keys look like
// "/src/content/b/hello-world.md". Lives in a server-only module (only imported by the
// `createServerFn` handler in the route), so marked/shiki/content never reach the client bundle.
const rawFiles = import.meta.glob("/src/content/b/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const THEMES = { light: "github-light", dark: "github-dark" } as const;
const LANGS = ["ts", "tsx", "js", "jsx", "json", "bash", "shell", "md", "css", "html"];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// A node is either a run of rendered prose HTML, or an interactive component embedded via a
// ```demo:<name> fenced block. The route maps component nodes through a name→component registry.
// props is JSON-serializable so the whole BPost can pass through a TanStack server fn.
export type BNode =
  | { type: "html"; html: string }
  | { type: "component"; name: string; props: Record<string, JsonValue> };

export type BPost = {
  slug: string;
  /** `draft: true` in frontmatter: hidden from the index and prerender, 404 in production. */
  draft: boolean;
  /** `unlisted: true`: published and reachable by URL, but kept off the index and the sitemap, and
   *  noindexed. For pages written for one reader, like an outreach note. */
  unlisted: boolean;
  /** `noindex: true` (implied by `unlisted`): the page asks search engines not to index it. */
  noindex: boolean;
  /** `image`: the page's own share image, a path under /public. */
  image: string | null;
  /** `cover` / `coverLight`: the dark and light hero (1600x900, made by scripts/generate-covers.ts),
   *  shown above the title and as the post's card on /b. */
  cover: string | null;
  coverLight: string | null;
  /** `video` / `videoLight`: a clip that loops over the hero, its first frame being the cover. */
  video: string | null;
  videoLight: string | null;
  title: string;
  date: string | null;
  description: string | null;
  nodes: BNode[];
  /** The pages this post links to, by path, for the hover cards on those links. */
  previews: Record<string, LinkPreview>;
};

/** What the `/b` index needs per post - frontmatter only, no markdown rendering. */
export type BPostSummary = Pick<
  BPost,
  "slug" | "title" | "date" | "description" | "cover" | "coverLight"
>;

function isDraft(data: Record<string, unknown>): boolean {
  return data.draft === true;
}

function isUnlisted(data: Record<string, unknown>): boolean {
  return data.unlisted === true;
}

function slugOf(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

/* gray-matter turns an unquoted `date: 2026-06-03` into a Date, and `String(date)` on that gives
 * "Tue Jun 02 2026 02:00:00 GMT+0200 (…)" — which was reaching <meta article:published_time> and
 * the sitemap's <lastmod>, where only YYYY-MM-DD is valid. Normalise both shapes here. */
function asIsoDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && value.trim()) return value.trim().slice(0, 10);
  return null;
}

function summarize(key: string, data: Record<string, unknown>): BPostSummary {
  const slug = slugOf(key);
  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    date: asIsoDate(data.date),
    description: typeof data.description === "string" ? data.description : null,
    cover: typeof data.cover === "string" ? data.cover : null,
    coverLight: typeof data.coverLight === "string" ? data.coverLight : null,
  };
}

let markedPromise: Promise<Marked> | null = null;

// A singleton marked instance whose `code` renderer highlights via a shared Shiki highlighter.
// The JS regex engine avoids the oniguruma WASM, so this also works on the Workers runtime path;
// for prerendered pages it runs at build time anyway.
function getMarked(): Promise<Marked> {
  if (!markedPromise) {
    markedPromise = (async () => {
      const highlighter: Highlighter = await createHighlighter({
        themes: [THEMES.light, THEMES.dark],
        langs: LANGS,
        engine: createJavaScriptRegexEngine(),
      });
      const loaded = new Set(highlighter.getLoadedLanguages());

      return new Marked({
        gfm: true,
        renderer: {
          code({ text, lang }) {
            const language = lang && loaded.has(lang) ? lang : "text";
            return highlighter.codeToHtml(text, {
              lang: language,
              themes: THEMES,
              defaultColor: false,
            });
          },
        },
      });
    })();
  }
  return markedPromise;
}

// Matches a fenced block whose info-string is `demo:<name>`, with an optional JSON body for props.
const DEMO_RE = /^```demo:([\w-]+)[ \t]*\r?\n([\s\S]*?)\r?\n?```[ \t]*$/gm;

const cache = new Map<string, BPost>();

export async function getBPostBySlug(slug: string): Promise<BPost | null> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const raw = rawFiles[`/src/content/b/${slug}.md`];
  if (raw === undefined) return null;

  const { data, content } = matter(raw);
  const marked = await getMarked();

  // Split the markdown into ordered prose-HTML nodes + interactive component nodes.
  const nodes: BNode[] = [];
  const pushProse = async (md: string) => {
    if (md.trim().length === 0) return;
    nodes.push({ type: "html", html: await marked.parse(md) });
  };

  let lastIndex = 0;
  DEMO_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = DEMO_RE.exec(content)) !== null) {
    await pushProse(content.slice(lastIndex, m.index));
    let props: Record<string, JsonValue> = {};
    const body = (m[2] ?? "").trim();
    if (body) {
      try {
        props = JSON.parse(body) as Record<string, JsonValue>;
      } catch {
        props = {};
      }
    }
    nodes.push({ type: "component", name: m[1], props });
    lastIndex = m.index + m[0].length;
  }
  await pushProse(content.slice(lastIndex));

  const previews: Record<string, LinkPreview> = {};
  for (const node of nodes)
    if (node.type === "html") node.html = markLinkPreviews(node.html, `/b/${slug}`, previews);

  const post: BPost = {
    ...summarize(`/src/content/b/${slug}.md`, data),
    draft: isDraft(data),
    unlisted: isUnlisted(data),
    noindex: data.noindex === true || isUnlisted(data),
    image: typeof data.image === "string" ? data.image : null,
    video: typeof data.video === "string" ? data.video : null,
    videoLight: typeof data.videoLight === "string" ? data.videoLight : null,
    nodes,
    previews,
  };
  cache.set(slug, post);
  return post;
}

/** Published posts (not drafts, not unlisted), newest first. Undated posts sort last. */
export function listBPosts(): BPostSummary[] {
  return Object.entries(rawFiles)
    .map(([key, raw]) => ({ key, data: matter(raw).data as Record<string, unknown> }))
    .filter(({ data }) => !isDraft(data) && !isUnlisted(data))
    .map(({ key, data }) => summarize(key, data))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/** Published (non-draft) post slugs. Drafts are still reachable by slug in dev. */
export function getAllBSlugs(): string[] {
  return listBPosts().map((p) => p.slug);
}
