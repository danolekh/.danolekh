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

// Inline code that is really a confidence label, and the chip it becomes. Keyed on the exact text
// used in the posts; extend here rather than inventing per-post syntax.
const CHIP_BASE =
  "not-prose inline-flex items-center rounded-full border px-1.5 py-px text-[0.7em] font-medium align-[0.1em] whitespace-nowrap";
const CONFIDENCE_CHIPS: Record<string, string> = {
  подтверждено: `${CHIP_BASE} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`,
  "прайс дилера": `${CHIP_BASE} border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300`,
  оценка: `${CHIP_BASE} border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300`,
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
const LANGS = ["ts", "tsx", "js", "jsx", "json", "bash", "shell", "md", "css", "html"];

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// A node is either a run of rendered prose HTML, or a portfolio block embedded via a
// ```block:<name> fenced block. The route maps block nodes through the PORTFOLIO_BLOCKS registry.
export type PNode =
  | { type: "html"; html: string }
  | { type: "block"; name: string; props: Record<string, JsonValue> };

/** One entry in the in-page table of contents. Only h2/h3 — h4 is too fine for a sidebar. */
export type TocEntry = { id: string; text: string; level: 2 | 3 };

export type PProject = {
  slug: string;
  /** `draft: true` in frontmatter: hidden from lists and prerender, 404 in production. */
  draft: boolean;
  title: string;
  subtitle: string | null;
  client: string | null;
  role: string | null;
  year: string | null;
  liveUrl: string | null;
  stack: string[];
  nodes: PNode[];
  toc: TocEntry[];
};

/* Headings arrive as plain <h2>/<h3> from marked. Long posts need anchors to link to and a
 * contents rail to navigate, so both are derived here, in one pass over the rendered HTML, rather
 * than by hooking marked's renderer — the renderer is a shared singleton and would need per-parse
 * state to collect anything. */
const HEADING_RE = /<(h[23])>([\s\S]*?)<\/\1>/g;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/* marked escapes heading text (`It's` arrives as `It&#39;s`). The TOC renders `text` as a React
 * child, which escapes it again, so entities are decoded here. One pass: `&amp;lt;` becomes `&lt;`,
 * not `<`. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === "#") {
      const hex = body[1] === "x" || body[1] === "X";
      const code = hex ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return code <= 0x10ffff ? String.fromCodePoint(code) : entity;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity;
  });
}

function addHeadingIds(html: string, toc: TocEntry[], seen: Map<string, number>): string {
  return html.replace(HEADING_RE, (_all, tag: string, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]*>/g, "").trim());
    const base = slugify(text) || "section";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    toc.push({ id, text, level: tag === "h2" ? 2 : 3 });
    return `<${tag} id="${id}">${inner}</${tag}>`;
  });
}

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
          // Confidence labels are written as ordinary inline code in the markdown so the source
          // stays readable, and are promoted to coloured chips on the way out. Anything else keeps
          // the normal <code> treatment.
          codespan({ text }) {
            const chip = CONFIDENCE_CHIPS[text.trim()];
            return chip
              ? `<span class="${chip}">${escapeHtml(text)}</span>`
              : `<code>${escapeHtml(text)}</code>`;
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

function isDraft(data: Record<string, unknown>): boolean {
  return data.draft === true;
}

export async function getPProjectBySlug(slug: string): Promise<PProject | null> {
  const cached = cache.get(slug);
  if (cached) return cached;

  const raw = rawFiles[`/src/content/p/${slug}.md`];
  if (raw === undefined) return null;

  const { data, content } = matter(raw);
  const marked = await getMarked();

  const nodes: PNode[] = [];
  const toc: TocEntry[] = [];
  const seenSlugs = new Map<string, number>();
  const pushProse = async (md: string) => {
    if (md.trim().length === 0) return;
    const html = await marked.parse(md);
    nodes.push({ type: "html", html: addHeadingIds(html, toc, seenSlugs) });
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
    draft: isDraft(data),
    title: typeof data.title === "string" ? data.title : slug,
    subtitle: asStringOrNull(data.subtitle),
    client: asStringOrNull(data.client),
    role: asStringOrNull(data.role),
    year: asStringOrNull(data.year),
    liveUrl: asStringOrNull(data.liveUrl),
    stack: asStringArray(data.stack),
    nodes,
    toc,
  };
  cache.set(slug, project);
  return project;
}

/** Published (non-draft) case-study slugs. Drafts are still reachable by slug in dev. */
export function getAllPSlugs(): string[] {
  return Object.entries(rawFiles)
    .filter(([, raw]) => !isDraft(matter(raw).data))
    .map(([key]) => key.slice(key.lastIndexOf("/") + 1).replace(/\.md$/, ""));
}
