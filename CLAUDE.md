# BooKanto

The blueprint is `BooKanto Web System Development Plan.md`. Read the relevant section before building a feature; it defines the data model, RBAC table, booking lifecycle, security rules, SEO and performance budgets.

## Commands

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`: run all four before calling a change done.
- `pnpm build` needs the env vars in `.env.example` and a migrated database, because public pages query it at build time (see `.github/workflows/ci.yml`). Then `pnpm check:bundle` enforces the 170 kB first-load JS budget.
- `pnpm db:seed` loads demo data (local or staging only). The e2e tests expect it.
- `pnpm db:generate` after schema changes; review the SQL and unquote any `"geography(...)"` type.

## Rules

- **Next.js 15 only.** Don't upgrade to 16 (AWS Amplify, the migration target, supports up to 15). TypeScript 5 and ESLint 9 for the same reason.
- **The browser never queries the database.** All reads and writes go through server actions or route handlers.
- **Supabase only through adapters:** `lib/auth.ts`, `lib/storage.ts`, `lib/realtime.ts`, `lib/jobs.ts` (via `lib/supabase/`). ESLint enforces this.
- **Every server action follows five steps:** `requireUser()` → `parseInput(schema, input)` with a `z.strictObject` → `assertCan(user, permission, resource)` → one transaction or database function → `writeAudit` for sensitive actions, realtime publish, notifications, `revalidateTag`. Wrap the body in `runAction()` so it returns `ActionResult` and never throws to the browser.
- **Permissions live in `lib/authz.ts`.** A new action that needs a new permission updates `lib/authz.ts` and the matrix in `tests/authz/permissions-matrix.test.ts` together, matching the plan's RBAC table.
- **Feature modules** (`features/<name>/`) expose `actions.ts`, `queries.ts`, `schema.ts`, `components/`. They import from `lib/` and `components/`, never from another feature's internals.
- **Money** is integer centavos through `lib/money.ts`. **Time** is UTC in the database; Manila time only through `lib/time.ts`.
- **Statuses** are `text` plus a CHECK constraint, listed in `lib/db/schema/enums.ts`. No Postgres enums.
- **Secrets** only through `lib/env.ts` (server) or `lib/public-env.ts` (browser-safe). Add new variables to the schema and `.env.example`.
- **New tables** call `.enableRLS()`; new database functions `REVOKE EXECUTE ... FROM PUBLIC` unless they're meant for the Data API.
- **Dynamic routes** (`lib/routes.ts` `DYNAMIC_ROUTES`) get a nonce-based CSP and must render per request. Everything else must be cacheable and must not read cookies.
- **Public data** is read through `unstable_cache` with a tag from `lib/cache.ts`; actions that change it call `revalidateTag` with that tag.
- **Client components** import only browser-safe modules: never `queries.ts`, `schema.ts` (Zod) or anything `server-only`. Shared values go in a feature's `constants.ts`.
- **UI:** design for 360px first; touch targets at least 44px; every screen has loading (skeleton), empty, error and success states. Orange buttons take navy text; orange text uses `orange-700`.
- No `dangerouslySetInnerHTML` except `components/shared/json-ld.tsx`.
- Conventional commits (`feat:`, `fix:`, `chore:`).
