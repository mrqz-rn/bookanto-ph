import { readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const APP_DIR = path.join(process.cwd(), "app");

/**
 * Dynamic folder names under each URL position. Route groups like "(public)"
 * don't add a URL segment, so their children count as the parent's.
 */
function dynamicSegments(dir: string, urlPath: string, found: Map<string, Set<string>>) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith("@")) continue;
    const child = path.join(dir, entry.name);
    if (/^\(.+\)$/.test(entry.name)) {
      dynamicSegments(child, urlPath, found);
      continue;
    }
    const dynamic = /^\[+(?:\.\.\.)?(\w+)\]+$/.exec(entry.name);
    if (dynamic) {
      const names = found.get(urlPath) ?? new Set<string>();
      names.add(dynamic[1]!);
      found.set(urlPath, names);
    }
    dynamicSegments(child, `${urlPath}/${dynamic ? "*" : entry.name}`, found);
  }
  return found;
}

describe("app routes", () => {
  // Next.js builds fine but fails every request (even static pages) with
  // "You cannot use different slug names for the same dynamic path".
  it("use one parameter name per URL segment", () => {
    const conflicts = [...dynamicSegments(APP_DIR, "", new Map())]
      .filter(([, names]) => names.size > 1)
      .map(([urlPath, names]) => `${urlPath || "/"}: ${[...names].join(", ")}`);
    expect(conflicts).toEqual([]);
  });
});
