# BooKanto

Book services sa kanto mo. A marketplace for booking local services in the Philippines: barbershops, salons, aircon cleaning, auto repair and more.

This is the web system for the 6-month pilot: one Next.js 15 app on Vercel with Supabase behind it, built to move to AWS after the pilot without a rewrite. The full blueprint is in [BooKanto Web System Development Plan.md](./BooKanto%20Web%20System%20Development%20Plan.md).

## Getting started

You need Node.js 22 or later, pnpm (through Corepack) and Docker for the local Supabase stack.

```sh
corepack enable pnpm
pnpm install
pnpm exec supabase start          # Postgres, Auth, Storage and Realtime in Docker
cp .env.example .env.local        # then paste the publishable key from `pnpm exec supabase status`
pnpm db:migrate                   # apply db/migrations
pnpm dev                          # http://localhost:3000
```

## Scripts

| Command                     | What it does                                       |
| --------------------------- | -------------------------------------------------- |
| `pnpm dev`                  | Dev server with Turbopack                          |
| `pnpm build`                | Production build                                   |
| `pnpm typecheck`            | Generate route types, then `tsc`                   |
| `pnpm lint` / `pnpm format` | ESLint / Prettier                                  |
| `pnpm test`                 | Unit tests and the permissions matrix (Vitest)     |
| `pnpm test:e2e`             | Playwright and axe tests (own dev server on 3210)  |
| `pnpm db:generate`          | Create a migration from changes in `lib/db/schema` |
| `pnpm db:migrate`           | Apply migrations to `DIRECT_DATABASE_URL`          |
| `pnpm db:studio`            | Browse the database                                |

## Layout

```
app/           routes; pages stay thin and call features/
features/      business logic by domain: actions.ts, queries.ts, schema.ts, components/
components/    ui/ (shadcn/ui primitives) and shared/ (logo, JSON-LD, …)
lib/           adapters and helpers; the only code that touches Supabase or outside services
  db/          Drizzle client and schema
db/migrations/ SQL from drizzle-kit plus hand-written extensions and triggers
supabase/      local Supabase stack config
tests/         unit/, authz/ (permissions matrix), e2e/ (Playwright)
middleware.ts  session refresh, route guards, Content-Security-Policy
```

## Working on the database

1. Change the schema in `lib/db/schema/`.
2. Run `pnpm db:generate` and review the SQL. If it adds a `geography` column, remove the quotes drizzle-kit puts around the type (`pnpm test` checks for this).
3. For SQL drizzle-kit can't express (functions, triggers, policies), run `pnpm exec drizzle-kit generate --custom --name=<what>` and write it by hand.
4. Keep changes backward-compatible: add first, remove later.

Migrations expect PostGIS in the `extensions` schema and on the `search_path`, which is how Supabase sets up its roles.
