import { defineConfig } from "vitest/config";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Unit tests run in plain Node. vite.config.ts loads the Cloudflare and TanStack Start plugins,
// which vitest can't start under (workerd chokes on CJS deps), and the tests only need the aliases.
export default defineConfig({
  plugins: [viteTsConfigPaths({ projects: ["./tsconfig.json"] })],
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
  },
});
