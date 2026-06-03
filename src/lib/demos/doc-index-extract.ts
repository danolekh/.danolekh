import { createServerFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { env } from "cloudflare:workers";
import { FIXTURES, SAMPLE_DOCS, type DocFields, type DocResult } from "./doc-index";

// In-memory cache keyed by docId. The doc set is a fixed allow-list, so the live API bills at most once
// per document per Worker isolate — a fraction of a cent total regardless of traffic.
const cache = new Map<string, DocResult>();

const MODEL = "claude-haiku-4-5-20251001";

const EXTRACT_PROMPT = `You are indexing a third-party engineering document for a legal case file.
From the document text below, extract exactly these fields:
- author: the person (and firm) who wrote/sent it
- addressee: the person (and firm) it is addressed to
- date: the document date in YYYY-MM-DD format
- subject: a concise subject line (the RE:/Subject: line, or a short description)

Return ONLY a JSON object with keys "author", "addressee", "date", "subject" and no other text.

Document:
`;

function parseFields(text: string): DocFields | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as Partial<DocFields>;
    if (!obj.author && !obj.subject) return null;
    return {
      author: String(obj.author ?? "—"),
      addressee: String(obj.addressee ?? "—"),
      date: String(obj.date ?? "—"),
      subject: String(obj.subject ?? "—"),
    };
  } catch {
    return null;
  }
}

/**
 * Extracts {author, addressee, date, subject} from a single allow-listed sample document by calling
 * Claude (Haiku) live. Falls back to the committed real-data fixture when there's no API key (local dev
 * without .dev.vars) or the call fails, so the UI always renders. Only allow-listed docIds are accepted.
 */
export const extractDocIndex = createServerFn({ method: "POST" })
  .inputValidator(Schema.Struct({ docId: Schema.String }).pipe(Schema.standardSchemaV1))
  .handler(async ({ data }): Promise<DocResult> => {
    const doc = SAMPLE_DOCS.find((d) => d.id === data.docId);
    if (!doc) throw new Error(`Unknown document: ${data.docId}`);

    const cached = cache.get(doc.id);
    if (cached) return cached;

    const apiKey = (env as unknown as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
    const fixture: DocResult = { docId: doc.id, fields: FIXTURES[doc.id]!, source: "fixture" };
    if (!apiKey) return fixture;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 300,
          messages: [{ role: "user", content: EXTRACT_PROMPT + doc.text }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic ${res.status}`);
      const json = (await res.json()) as { content?: Array<{ text?: string }> };
      const fields = parseFields(json.content?.[0]?.text ?? "");
      if (!fields) return fixture;

      const result: DocResult = { docId: doc.id, fields, source: "live" };
      cache.set(doc.id, result);
      return result;
    } catch {
      return fixture;
    }
  });
