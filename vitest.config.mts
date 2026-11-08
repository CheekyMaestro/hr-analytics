import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

const alias = {
  "@": root,
  // App modules import these Next.js-only entry points; tests run them as plain functions.
  "server-only": path.resolve(root, "tests/stubs/server-only.ts"),
  "next/cache": path.resolve(root, "tests/stubs/next-cache.ts"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: { name: "unit", include: ["tests/unit/**/*.test.ts", "tests/api/**/*.test.ts"], environment: "node" },
      },
      {
        resolve: { alias },
        test: { name: "golden", include: ["tests/golden/**/*.test.ts"], environment: "node", testTimeout: 240_000, hookTimeout: 240_000 },
      },
    ],
    coverage: { include: ["lib/domain/**", "pipeline/**"] },
  },
});
