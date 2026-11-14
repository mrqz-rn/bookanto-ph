import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JsonLd } from "@/components/shared/json-ld";

describe("JsonLd", () => {
  it("can't be broken out of by user text", () => {
    const html = renderToStaticMarkup(
      <JsonLd data={{ name: "</script><script>alert(1)</script>" }} />,
    );
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain("<script>alert");
  });

  it("stays valid JSON", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ name: "Kuya Jun's <Barbershop>" }} />);
    const json = html.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, "");
    expect(JSON.parse(json)).toEqual({ name: "Kuya Jun's <Barbershop>" });
  });
});
