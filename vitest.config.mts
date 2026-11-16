import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Run outside Manila time, so code that leans on the machine's time zone
// fails here instead of in production.
process.env.TZ = "America/Los_Angeles";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/authz/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    environment: "node",
    setupFiles: ["tests/setup.ts"],
  },
});
