import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same .env files and precedence as Next.js.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema/index.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "",
  },
  schemaFilter: ["public"],
  extensionsFilters: ["postgis"],
  strict: true,
  verbose: true,
});
