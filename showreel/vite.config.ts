import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

/* The showreel's stage: a page of its own, apart from the site's build, that cardstock's recorder
 * films frame by frame (take `showreel` in ~/code/cardstock/apps/promo/record/takes.ts).
 *
 *   pnpm showreel    # http://localhost:4174, plays with a scrubber; ?t=7.5 holds a frame
 *
 * It shares the site's node_modules, components and public folder. */
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  root: here("."),
  publicDir: here("../public"),
  server: { port: 4174, strictPort: true },
  plugins: [tsconfigPaths({ projects: [here("../tsconfig.json")] }), tailwindcss(), react()],
});
