import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const dir = join(process.cwd(), "db/migrations");
const migrations = readdirSync(dir)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => ({ file, sql: readFileSync(join(dir, file), "utf8") }));

describe("migrations", () => {
  // drizzle-kit quotes types it doesn't know, and Postgres then looks for a
  // type literally named "geography(Point,4326)". Remove the quotes by hand.
  it.each(migrations)("$file has no quoted geography type", ({ sql }) => {
    expect(sql).not.toMatch(/"geography\(/);
  });

  it.each(migrations)("$file enables row-level security on every table it creates", ({ sql }) => {
    const created = [...sql.matchAll(/CREATE TABLE "(\w+)"/g)].map((match) => match[1]);
    for (const table of created) {
      expect(sql).toContain(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
  });
});
