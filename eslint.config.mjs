import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** RULES.md §3: Next.js rules + layer boundaries. */
const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: [".next/**", ".data/**", "node_modules/**", "next-env.d.ts", "playwright-report/**", "test-results/**"] },
  {
    files: ["app/**", "components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["@/pipeline/*", "**/pipeline/*", "@/db/migrations/*"], message: "app/ dan components/ tidak boleh mengimpor pipeline/ atau migrasi." }] },
      ],
    },
  },
  {
    files: ["components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/pipeline/*", "**/pipeline/*", "@/db/migrations/*"], message: "components/ tidak boleh mengimpor pipeline/." },
            { group: ["@/db/*", "@/lib/queries/dashboard", "@/lib/queries/data-quality", "@/lib/queries/meta"], message: "Data masuk ke komponen lewat props." },
          ],
        },
      ],
    },
  },
];

export default config;
