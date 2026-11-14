# Search

Nearby search, filters, sort and map view, plus the category and city pages that carry most of the SEO.

- Database function `search_shops()` on the GIST index over `shops.location`.
- City and category pages are statically rendered and revalidated by tag; `/search` renders per request and is `noindex, follow`.
- Publish a city or category page only with 3 or more active shops.
