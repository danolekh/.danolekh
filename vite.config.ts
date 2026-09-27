import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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
const getBPages = () => [...getContentPages("./src/content/b/", "/b"), ...getContentPages("./src/private/b/", "/b")];
const getPPages = () => getContentPages("./src/content/p/", "/p");
const getLabPages = () => [
  { path: "/lab", prerender: { enabled: true } },
  ...lab.map((item) => ({ path: `/lab/${item.slug}`, prerender: { enabled: true } })),
  ...lab.flatMap((item) =>
    (item.looks ?? []).map((look) => ({ path: `/lab/${item.slug}/${look}`, prerender: { enabled: true } })),
  ),
];

const config = defineConfig({
  plugins: [
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
