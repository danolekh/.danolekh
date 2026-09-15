import matter from "gray-matter";
import { Marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

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
  title: string;
  date: string | null;
  description: string | null;
  nodes: BNode[];
};

/** What the `/b` index needs per post - frontmatter only, no markdown rendering. */
export type BPostSummary = Pick<BPost, "slug" | "title" | "date" | "description">;

function isDraft(data: Record<string, unknown>): boolean {
  return data.draft === true;
}

function slugOf(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

function summarize(key: string, data: Record<string, unknown>): BPostSummary {
  const slug = slugOf(key);
  return {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    date: data.date != null ? String(data.date) : null,
    description: typeof data.description === "string" ? data.description : null,
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

  const post: BPost = {
    ...summarize(`/src/content/b/${slug}.md`, data),
    draft: isDraft(data),
    nodes,
  };
  cache.set(slug, post);
  return post;
}

/** Published (non-draft) posts, newest first. Undated posts sort last. */
export function listBPosts(): BPostSummary[] {
  return Object.entries(rawFiles)
    .map(([key, raw]) => ({ key, data: matter(raw).data as Record<string, unknown> }))
    .filter(({ data }) => !isDraft(data))
    .map(({ key, data }) => summarize(key, data))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

/** Published (non-draft) post slugs. Drafts are still reachable by slug in dev. */
export function getAllBSlugs(): string[] {
  return listBPosts().map((p) => p.slug);
}
