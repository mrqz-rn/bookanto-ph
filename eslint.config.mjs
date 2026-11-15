import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier/flat";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

// Only the vendor adapters may call Supabase, so moving to AWS changes these files alone.
const SUPABASE_ADAPTERS = [
  "lib/auth.ts",
  "lib/storage.ts",
  "lib/realtime.ts",
  "lib/jobs.ts",
  "lib/supabase/**",
  "middleware.ts",
];

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // User text is never rendered as HTML.
      "react/no-danger": "error",
      "@next/next/no-html-link-for-pages": "off",
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@supabase/*", "@/lib/supabase/*"],
              message:
                "Call Supabase only through the adapters in lib/ (auth, storage, realtime, jobs).",
            },
          ],
        },
      ],
    },
  },
  { files: SUPABASE_ADAPTERS, rules: { "no-restricted-imports": "off" } },
  prettier,
];

export default eslintConfig;
