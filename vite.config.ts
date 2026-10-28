import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { execFile } from "node:child_process";
import { createReadStream, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { promisify } from "node:util";
import matter from "gray-matter";
import { lab } from "./src/data/lab";

// Enumerate the markdown files in a content dir at config time (Node) so each page can be
// prerendered to static HTML. Same folders the route content modules read. Files with
// `draft: true` in their frontmatter are skipped, matching the loaders (which also hide them from
// lists and 404 them in production).
function getContentPages(dir: string, routePrefix: string) {
  const abs = fileURLToPath(new URL(dir, import.meta.url));
  try {
    return readdirSync(abs)
      .filter((f) => f.endsWith(".md"))
      .filter((f) => matter(readFileSync(join(abs, f), "utf8")).data.draft !== true)
      .map((f) => ({
        path: `${routePrefix}/${f.replace(/\.md$/, "")}`,
        prerender: { enabled: true },
      }));
  } catch {
    return [];
  }
}

// src/private/b holds pages kept off git until what they show is released (see AGENTS.md).
const getBPages = () => [
  ...getContentPages("./src/content/b/", "/b"),
  ...getContentPages("./src/private/b/", "/b"),
];
const getPPages = () => getContentPages("./src/content/p/", "/p");
const getLabPages = () => [
  { path: "/lab", prerender: { enabled: true } },
  ...lab.map((item) => ({ path: `/lab/${item.slug}`, prerender: { enabled: true } })),
  ...lab.flatMap((item) =>
    (item.looks ?? []).map((look) => ({
      path: `/lab/${item.slug}/${look}`,
      prerender: { enabled: true },
    })),
  ),
];

/* `vite dev` only: lists the real bucket, which its public URL can't do and the emulated R2 doesn't
 * hold, through the Cloudflare API with wrangler's own login (`wrangler auth token`). Answers like
 * R2's `list()`: `{ delimitedPrefixes, truncated, cursor }`. */
const BUCKET = "danolekh-bucket";
let cloudflareLogin: Promise<{ token: string; account: string }> | null = null;
let cloudflareLoginAt = 0;

function cloudflareAuth() {
  // wrangler refreshes its OAuth token when it's asked for one; it lasts about an hour.
  if (!cloudflareLogin || Date.now() - cloudflareLoginAt > 10 * 60_000) {
    cloudflareLoginAt = Date.now();
    cloudflareLogin = (async () => {
      const wrangler = fileURLToPath(new URL("./node_modules/.bin/wrangler", import.meta.url));
      const { stdout } = await promisify(execFile)(wrangler, ["auth", "token", "--json"]);
      const token = (JSON.parse(stdout) as { token?: string }).token;
      if (!token) throw new Error("wrangler auth token gave no token (wrangler login?)");
      let account: string | undefined = process.env.CLOUDFLARE_ACCOUNT_ID;
      if (!account) {
        const response = await fetch("https://api.cloudflare.com/client/v4/accounts?per_page=1", {
          headers: { Authorization: `Bearer ${token}` },
        });
        account = ((await response.json()) as { result?: { id: string }[] }).result?.[0]?.id;
      }
      if (!account) throw new Error("no Cloudflare account");
      return { token, account };
    })();
    cloudflareLogin.catch(() => (cloudflareLogin = null));
  }
  return cloudflareLogin;
}

async function listRealBucket(query: URLSearchParams) {
  const { token, account } = await cloudflareAuth();
  const url = new URL(
    `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/${BUCKET}/objects`,
  );
  for (const key of ["prefix", "delimiter", "cursor"]) {
    const value = query.get(key);
    if (value) url.searchParams.set(key, value);
  }
  url.searchParams.set("per_page", "1000");
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await response.json()) as {
    success?: boolean;
    errors?: unknown;
    result_info?: { delimited?: string[]; is_truncated?: boolean; cursor?: string };
  };
  if (!body.success) throw new Error(`R2 list: ${JSON.stringify(body.errors)}`);
  const info = body.result_info ?? {};
  return {
    delimitedPrefixes: info.delimited ?? [],
    truncated: info.is_truncated === true,
    cursor: info.cursor,
  };
}

// `vite dev` only: the local test runs for /m (scripts/replays-fixtures.ts) at /__replays, standing
// in for bucket.danolekh.com/runs. Their meta.json files sit in the emulated R2 next to them.
// /__bucket proxies the real bucket, so real runs play in dev from any origin (localhost, the
// tailnet) without the bucket having to allow it in CORS; see src/lib/replays/get-run.ts.
// /__bucket-list lists it, so /m in dev shows the real runs next to the fixtures.
function replayFixtures(): Plugin {
  const root = fileURLToPath(new URL("./fixtures/replays/", import.meta.url));
  const types: Record<string, string> = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".m4s": "video/iso.segment",
    ".mp4": "video/mp4",
    ".jpg": "image/jpeg",
    ".json": "application/json",
  };
  return {
    name: "replay-fixtures",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__bucket-list", async (req, res) => {
        try {
          const page = await listRealBucket(new URL(req.url ?? "/", "http://dev").searchParams);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(page));
        } catch (error) {
          res.statusCode = 502;
          res.end(error instanceof Error ? error.message : String(error));
        }
      });
      server.middlewares.use("/__bucket", async (req, res) => {
        const upstream = `https://bucket.danolekh.com${req.url ?? "/"}`;
        try {
          const response = await fetch(upstream, {
            method: req.method === "HEAD" ? "HEAD" : "GET",
            headers: req.headers.range ? { range: req.headers.range } : {},
          });
          res.statusCode = response.status;
          // fetch() hands back the decoded body, so a compressed response's length doesn't apply.
          const compressed = response.headers.has("content-encoding");
          for (const header of [
            "content-type",
            "content-length",
            "content-range",
            "accept-ranges",
            "cache-control",
            "etag",
            "last-modified",
          ]) {
            const value = response.headers.get(header);
            if (value && !(compressed && header === "content-length")) res.setHeader(header, value);
          }
          if (!response.body || req.method === "HEAD") return void res.end();
          Readable.fromWeb(response.body as import("node:stream/web").ReadableStream).pipe(res);
        } catch {
          res.statusCode = 502;
          res.end();
        }
      });
      server.middlewares.use("/__replays", (req, res, next) => {
        const file = resolve(root, `.${decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/")}`);
        if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) return next();
        let size: number;
        try {
          const stat = statSync(file);
          if (!stat.isFile()) return next();
          size = stat.size;
        } catch {
          return next();
        }
        res.setHeader("Content-Type", types[extname(file)] ?? "application/octet-stream");
        res.setHeader("Content-Length", size);
        // Like the bucket: playlists change while a run renders, segments never do.
        res.setHeader(
          "Cache-Control",
          file.endsWith(".m3u8") ? "no-cache" : "public, max-age=3600",
        );
        res.setHeader("Access-Control-Allow-Origin", "*");
        createReadStream(file).pipe(res);
      });
    },
  };
}

const config = defineConfig({
  plugins: [
    replayFixtures(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      // Prerender only the static pages: home, the resume bounce page, every /b/<slug> and the lab.
      // The D1-backed /feed routes stay normal SSR (they're $-param/dynamic and excluded below).
      prerender: {
        enabled: true,
        crawlLinks: false, // don't follow <a href="/feed"> etc. found in prerendered HTML
        autoStaticPathsDiscovery: false, // we list the pages explicitly
        failOnError: true,
        filter: ({ path }) => !path.startsWith("/feed"), // defensive: never prerender D1 routes
      },
      pages: [
        { path: "/", prerender: { enabled: true } },
        { path: "/resume", prerender: { enabled: true } },
        { path: "/b", prerender: { enabled: true } },
        ...getBPages(),
        ...getPPages(),
        ...getLabPages(),
      ],
    }),
    viteReact(),
  ],
  environments: {
    // The Cloudflare plugin runs SSR in a `workerd` environment named "ssr". workerd is ESM-only and
    // can't execute CommonJS, so force the SSR dep optimizer to pre-bundle CJS deps to ESM. Listing
    // gray-matter (a CJS dep this app's SSR path uses) is enough to enable optimization for the
    // worker env, which then also bundles the transitive CJS shim (use-sync-external-store) reached
    // through TanStack Router / Base UI.
    ssr: {
      optimizeDeps: {
        include: ["gray-matter"],
      },
    },
  },
});

export default config;
