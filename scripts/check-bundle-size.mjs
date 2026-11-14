// Fails when a page's first-load JavaScript (gzipped) passes the budget in the
// development plan. Run after `pnpm build`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 170;
const nextDir = ".next";

const { pages } = JSON.parse(readFileSync(join(nextDir, "app-build-manifest.json"), "utf8"));
const gzipKb = new Map();
const sizeOf = (file) => {
  if (!gzipKb.has(file))
    gzipKb.set(file, gzipSync(readFileSync(join(nextDir, file))).length / 1024);
  return gzipKb.get(file);
};

const layouts = Object.keys(pages).filter((key) => key.endsWith("/layout"));
const results = Object.keys(pages)
  .filter((key) => key.endsWith("/page"))
  .map((page) => {
    const dir = page.slice(0, -"/page".length);
    // A page loads its own chunks plus those of every layout above it.
    const ancestors = layouts.filter((layout) =>
      dir.startsWith(layout.slice(0, -"/layout".length)),
    );
    const files = new Set([page, ...ancestors].flatMap((key) => pages[key]));
    const kb = [...files]
      .filter((file) => file.endsWith(".js"))
      .reduce((sum, file) => sum + sizeOf(file), 0);
    return { page, kb };
  })
  .sort((a, b) => b.kb - a.kb);

for (const { page, kb } of results) {
  console.log(`${kb > BUDGET_KB ? "OVER" : "ok  "} ${kb.toFixed(1).padStart(6)} kB  ${page}`);
}

const over = results.filter(({ kb }) => kb > BUDGET_KB);
if (over.length > 0) {
  console.error(`\n${over.length} page(s) over the ${BUDGET_KB} kB first-load JavaScript budget.`);
  process.exit(1);
}
console.log(`\nAll pages within the ${BUDGET_KB} kB first-load JavaScript budget.`);
