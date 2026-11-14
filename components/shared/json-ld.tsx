type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

/**
 * Structured data for search engines. `<` is escaped so user text such as a
 * shop name or review can't close the script tag.
 */
export function JsonLd({ data }: { data: JsonLdData }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD needs raw script text; `<` is escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
