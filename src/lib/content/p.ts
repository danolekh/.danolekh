import matter from "gray-matter";
import { Marked } from "marked";
import { createHighlighter, type Highlighter } from "shiki";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

// Portfolio case studies. Mirrors `src/lib/content/b.ts` (the blog loader): markdown files are
// inlined raw at build time, split into ordered prose-HTML nodes + embedded component nodes, and
// passed through a TanStack server fn as JSON-serializable data. The difference is the fenced
// directive: case studies use ```block:<name> to drop bespoke, in-theme achievement UI (metrics
// grid, CMS→live pipeline, feedback card, …) rendered via the PORTFOLIO_BLOCKS registry.
//
// Server-only module: imported solely by the route's createServerFn handler, so marked/shiki and
// the raw content never reach the client bundle.
const rawFiles = import.meta.glob("/src/content/p/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const THEMES = { light: "github-light", dark: "github-dark" } as const;
const LANGS = ["ts", "tsx", "js", "jsx", "json", "bash", "shell", "md", "css", "html"];

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// A node is either a run of rendered prose HTML, or a portfolio block embedded via a
// ```block:<name> fenced block. The route maps block nodes through the PORTFOLIO_BLOCKS registry.
export type PNode =
  | { type: "html"; html: string }
  | { type: "block"; name: string; props: Record<string, JsonValue> };

export type PProject = {
  slug: string;
  title: string;
  subtitle: string | null;
  client: string | null;
  role: string | null;
  year: string | null;
  liveUrl: string | null;
  stack: string[];
  nodes: PNode[];
};

let markedPromise: Promise<Marked> | null = null;

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

// Matches a fenced block whose info-string is `block:<name>`, with an optional JSON body for props.
const BLOCK_RE = /^```block:([\w-]+)[ \t]*\r?\n([\s\S]*?)\r?\n?```[ \t]*$/gm;

const cache = new Map<string, PProject>();

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return [];
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : value != null ? String(value) : null;
}

export async function getPProjectBySlug(slug: string): Promise<PProject | null> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const raw = rawFiles[`/src/content/p/${slug}.md`];
  if (raw === undefined) return null;

  const { data, content } = matter(raw);
  const marked = await getMarked();

  const nodes: PNode[] = [];
  const pushProse = async (md: string) => {
    if (md.trim().length === 0) return;
    nodes.push({ type: "html", html: await marked.parse(md) });
  };

  let lastIndex = 0;
  BLOCK_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = BLOCK_RE.exec(content)) !== null) {
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
    nodes.push({ type: "block", name: m[1], props });
    lastIndex = m.index + m[0].length;
  }
  await pushProse(content.slice(lastIndex));

  const project: PProject = {
    slug,
    title: typeof data.title === "string" ? data.title : slug,
    subtitle: asStringOrNull(data.subtitle),
    client: asStringOrNull(data.client),
    role: asStringOrNull(data.role),
    year: asStringOrNull(data.year),
    liveUrl: asStringOrNull(data.liveUrl),
    stack: asStringArray(data.stack),
    nodes,
  };
  cache.set(slug, project);
  return project;
}

export function getAllPSlugs(): string[] {
  return Object.keys(rawFiles).map((key) =>
    key.slice(key.lastIndexOf("/") + 1).replace(/\.md$/, ""),
  );
}
