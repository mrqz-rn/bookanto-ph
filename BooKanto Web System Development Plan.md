# BooKanto Web System Development Plan

Nov 14, 2026 · @WMedlaw

## Overview

This is the technical blueprint for building BooKanto's web system for the 6-month pilot: one Next.js app on Vercel with Supabase behind it, built so it can move to full AWS after the pilot without a rewrite. It covers architecture, code layout, features, roles and permissions, UI, security, SEO and performance.

**What the pilot build delivers**

- Public marketplace: home, search, category and city pages, shop profiles, map
- Customer accounts: book (Slot, Home, Quote, Queue), manage bookings, chat, review
- Shop dashboard: onboarding, services, hours, booking inbox, calendar, walk-ins, staff (phase 2)
- Admin console: shop approval, categories, users, bookings, disputes, audit log
- Notifications by SMS, web push and email; installable PWA

**Engineering principles**

1. **Server owns the data.** The browser never queries the database; every read and write goes through server code that checks permissions.
2. **Adapters around vendors.** Auth, storage, realtime and jobs sit behind small interfaces, so Supabase can be swapped for AWS later.
3. **Mobile-first and fast on budget Android phones and mobile data.**
4. **Secure by default:** validate every input, check every permission, log every sensitive action.
5. **Ship small, every week:** trunk-based development, preview deploys, automated tests on each change.

Related documents: [Web-First Launch Plan](https://claude.ai/artifact/DRP7agNpkQv8Adug7Azyfm) (features and AWS target) and [6-Month Pilot Plan and AWS Migration](https://claude.ai/artifact/FZvy43BL4PZHz6owec18XS) (schedule and budget).

## System architecture

The pilot runs as one Next.js app on Vercel in front of one Supabase project, both in Singapore. Requests flow in one direction: routes call feature modules, feature modules call `lib/`, and only `lib/` touches Supabase or outside services.

&#91;embedded content: system architecture · pilot on Vercel and Supabase\]

The browser talks to Supabase directly for only two things: login sessions and realtime subscriptions to channels it is allowed to read. For the move to AWS, only the four adapters in `lib/` and the database driver change; routes and features stay the same.

## Tech stack

One TypeScript codebase, mostly open-source libraries, with managed services for hosting and data. Stay on Next.js 15 during the pilot, because AWS Amplify documents support up to version 15 and that is the migration target.

| Layer | Choice | Role |
| --- | --- | --- |
| Language | TypeScript (strict mode) | One language for UI, server, jobs and infrastructure |
| Framework | Next.js 15, App Router, React | Server rendering for SEO, server actions, route handlers, middleware |
| Styling | Tailwind CSS | Utility classes mapped to BooKanto design tokens |
| Components | shadcn/ui on Radix primitives | Accessible dialogs, menus, sheets, tabs; code lives in the repo |
| Icons | Lucide | Consistent stroke icons, tree-shaken |
| Forms | React Hook Form plus Zod | Same schema validates on client and server |
| Client data | TanStack Query | Caching and refetching in the shop dashboard |
| Database | PostgreSQL on Supabase, PostGIS, pg\_cron | Data, nearby search, scheduled jobs |
| ORM and migrations | Drizzle ORM and drizzle-kit | Typed queries; SQL migrations in git; swaps to the RDS Data API driver on AWS |
| Auth | Supabase Auth (phone OTP, Google) behind `lib/auth` | Sessions in secure cookies through `@supabase/ssr` |
| Files | Supabase Storage behind `lib/storage` | Public shop photos; private documents |
| Realtime | Supabase Realtime broadcast behind `lib/realtime` | Live booking inbox and chat |
| SMS | Semaphore (PH gateway) through the Send SMS Hook and `lib/notify` | OTPs and booking texts |
| Email | Resend with React Email templates | Receipts and notices |
| Web push | `web-push` library with VAPID keys | Free alerts to installed PWAs |
| Maps | Google Maps JavaScript API, Places Autocomplete | Shop location and map view |
| Bot protection | Cloudflare Turnstile | On OTP request and sign-up forms |
| Dates and money | `date-fns` and `date-fns-tz` (Asia/Manila); integer centavos | Correct times and prices |
| PWA | Serwist | Manifest, service worker, offline shell |
| Testing | Vitest, Testing Library, Playwright, axe-core | Unit, component, end-to-end, accessibility |
| Quality | ESLint, Prettier, TypeScript checks, Husky with lint-staged | Consistent code before every commit |
| Monitoring | Sentry, Vercel Speed Insights, PostHog | Errors, real-user performance, product analytics, feature flags |
| Package manager and CI | pnpm, GitHub Actions | Fast installs; checks on every pull request |

## Repository and file structure

One repository, organized by feature. Pages in `app/` stay thin: they call feature modules in `features/`, which call the database and adapters in `lib/`.

```
bookanto/
├─ app/
│  ├─ (public)/                    # indexed by Google
│  │  ├─ page.tsx                  # home
│  │  ├─ search/page.tsx
│  │  ├─ c/[category]/page.tsx
│  │  ├─ [city]/[category]/page.tsx
│  │  ├─ shop/[slug]/page.tsx
│  │  └─ (legal)/terms, privacy, about, help
│  ├─ (auth)/login, verify          # OTP and Google sign-in
│  ├─ book/[serviceId]/              # booking flow
│  ├─ account/                       # customer: bookings, favorites, settings
│  ├─ dashboard/                     # shop: setup, bookings, services, shop, staff, reviews, poster
│  ├─ admin/                         # admin: shops, users, bookings, categories, reviews, disputes, audit
│  ├─ api/
│  │  ├─ cron/[job]/route.ts        # scheduled jobs, secret-protected
│  │  ├─ hooks/send-sms/route.ts    # Supabase Send SMS Hook
│  │  └─ og/[type]/route.tsx        # share images
│  ├─ sitemap.ts, robots.ts, manifest.ts
│  └─ layout.tsx, error.tsx, not-found.tsx
├─ features/                        # business logic by domain
│  ├─ shops/      (actions.ts, queries.ts, schema.ts, components/)
│  ├─ services/
│  ├─ availability/   (slots.ts: open-slot engine)
│  ├─ search/         (nearby search, filters)
│  ├─ bookings/       (state machine, actions, queries)
│  ├─ messages/
│  ├─ reviews/
│  ├─ notifications/
│  └─ admin/
├─ components/
│  ├─ ui/            # shadcn/ui primitives (button, dialog, sheet…)
│  └─ shared/        # header, bottom nav, shop card, map, empty states
├─ lib/
│  ├─ db/            # drizzle client, schema/*.ts, sql functions
│  ├─ auth.ts        # adapter: getCurrentUser, sendOtp, verifyOtp, signOut
│  ├─ authz.ts       # roles, permissions, can()
│  ├─ storage.ts     # adapter: upload and signed URLs
│  ├─ realtime.ts    # adapter: publish and subscribe
│  ├─ jobs.ts        # expire requests, reminders, ratings, sitemap
│  ├─ notify.ts      # SMS, push, email router
│  ├─ rate-limit.ts, audit.ts, errors.ts, env.ts (zod-validated)
│  └─ seo.ts, geo.ts, money.ts, time.ts
├─ db/migrations/      # SQL from drizzle-kit, plus PostGIS, triggers, policies
├─ db/seed.ts          # categories, cities, demo shops (staging only)
├─ emails/             # React Email templates
├─ public/             # icons, logo, robots extras
├─ tests/              # unit/, integration/, e2e/ (Playwright), authz/
├─ infra/              # later: AWS CDK app for the migration
├─ .github/workflows/  # ci.yml, deploy checks, migrations
├─ middleware.ts       # session refresh, route guards, security headers
└─ next.config.ts, drizzle.config.ts, tailwind config, .env.example
```

**Module rule:** each feature folder exposes `actions.ts` (server actions that change data), `queries.ts` (reads), `schema.ts` (Zod input schemas) and `components/`. Features may import from `lib/` and `components/`, never from each other's internals.

## Feature modules

Fourteen modules make up the system. Phase 1 is everything needed for the public pilot on March 8, 2027; phase 2 follows during the pilot; phase 3 waits for after the decision gate.

| Module | Phase 1 (pilot launch) | Phase 2 (during pilot) | Phase 3 (after pilot) |
| --- | --- | --- | --- |
| Accounts and auth | Phone OTP, Google sign-in, profile, delete account | Email login, saved addresses | Facebook login |
| Shop onboarding | 5-step wizard, map pin, hours, photos, document upload | Category service templates | Bulk import of services |
| Services and pricing | Fixed, starts-at and quote prices; duration; booking type; capacity | Service photos, add-ons | Packages and memberships |
| Availability | Weekly hours, breaks, closures, buffer, capacity per slot | Per-staff schedules | Holiday templates |
| Search and discovery | Nearby search, filters, sort, map view, category and city pages | Typo-tolerant search, "open now" | Recommendations |
| Booking | Slot and Home flows, booking rules, cancel, reschedule | Quote and Queue flows | Deposits and online payment |
| Shop dashboard | Today view, inbox, calendar, walk-ins, accept and decline | Staff accounts, simple stats | Revenue reports, exports |
| Notifications | SMS for OTP and confirmations, email receipts, reminders, auto-expiry | Web push, notification settings | WhatsApp or Viber channel |
| Messaging | Chat per booking with photos | Quick replies for shops | Read receipts |
| Reviews | Rating and comment after completed booking, shop replies | Review photos, report a review | Review highlights |
| Admin | Shop approval and verification, categories, users, bookings, audit log | Disputes, announcements | Fraud signals |
| Marketing tools | Shop share link, QR poster | Founding-partner badge | Promos, featured listings, Pro plan |
| PWA | Manifest, install prompt, offline shell | Offline cache of today's bookings | Native apps |
| Analytics | Booking funnel events, pilot metrics dashboard | Shop-level stats | Cohort reports |

## Data model

Nineteen tables in PostgreSQL. Every table has `id uuid` (primary key), `created_at` and `updated_at`; statuses are `text` with `CHECK` constraints (no enum types, for the AWS Data API); money is integer centavos; times are `timestamptz` in UTC.

| Table | Key columns | Indexes and rules |
| --- | --- | --- |
| users | auth\_id, phone (E.164), name, email, platform\_role (`customer`, `admin`, `super_admin`), status, deleted\_at | Unique phone; unique auth\_id |
| shops | owner\_id, slug, name, description, address, barangay\_id, city\_id, location `geography(Point)`, phone, status (`draft`, `pending`, `active`, `suspended`), verified\_at, rating\_avg, rating\_count | GIST on location; unique slug; index (city\_id, status) |
| shop\_members | shop\_id, user\_id, role (`owner`, `manager`, `staff`), active | Unique (shop\_id, user\_id) |
| categories | parent\_id, slug, name, icon, default\_booking\_type, sort\_order, active | Unique slug |
| shop\_categories | shop\_id, category\_id | Composite primary key |
| services | shop\_id, category\_id, name, price\_type, price\_centavos, duration\_min, booking\_type (`slot`, `home`, `quote`, `queue`), capacity, buffer\_min, active, sort\_order | Index (shop\_id, active) |
| business\_hours | shop\_id, weekday, opens, closes, break\_start, break\_end | Unique (shop\_id, weekday) |
| closures | shop\_id, starts\_at, ends\_at, reason | Index (shop\_id, starts\_at) |
| bookings | ref\_code, customer\_id, shop\_id, service\_id, staff\_id, start\_at, end\_at, status, address, location, notes, quoted\_price\_centavos, total\_centavos, expires\_at | Unique ref\_code; index (shop\_id, start\_at); index (customer\_id, start\_at); index (status, expires\_at) |
| booking\_events | booking\_id, from\_status, to\_status, actor\_id, reason | Append-only |
| messages | booking\_id, sender\_id, body, image\_path, read\_at | Index (booking\_id, created\_at) |
| reviews | booking\_id, customer\_id, shop\_id, rating (1 to 5), comment, reply, hidden | Unique booking\_id |
| media | owner\_type, owner\_id, path, kind, sort\_order | Index (owner\_type, owner\_id) |
| cities and barangays | name, slug, province, center point, is\_active | Unique slug per parent |
| notifications | user\_id, channel, template, payload, status, sent\_at, read\_at | Index (user\_id, created\_at) |
| push\_subscriptions | user\_id, endpoint, keys, user\_agent | Unique endpoint |
| reports | booking\_id or review\_id, reporter\_id, reason, status, resolution | Index (status) |
| audit\_log | actor\_id, action, target\_type, target\_id, data, ip | Append-only; index (target\_type, target\_id) |

**Database functions:** `search_shops()`, `get_open_slots()`, `create_booking()` (locks the slot inside a transaction), `change_booking_status()` (checks the allowed transition and writes `booking_events`).

## Roles and permissions (RBAC)

Roles come at two levels: a **platform role** on the user (customer, admin, super admin) and a **shop role** per shop membership (owner, manager, staff). One person can be a customer and also the owner of a shop. Every check combines the role with ownership: "Own" means only their own records, "Assigned" means only bookings assigned to them.

| Permission | Guest | Customer | Shop staff | Shop manager | Shop owner | Admin | Super admin |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Browse shops, services, reviews | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Create a booking | No | Yes | Yes | Yes | Yes | No | No |
| View, cancel, reschedule a booking as customer | No | Own | Own | Own | Own | No | No |
| Write a review | No | Own completed | Own completed | Own completed | Own completed | No | No |
| Register a new shop | No | Yes | Yes | Yes | Yes | No | No |
| Edit shop profile, hours, photos | No | No | No | Yes | Yes | Yes | Yes |
| Manage services and prices | No | No | No | Yes | Yes | No | No |
| View shop bookings | No | No | Assigned | All in shop | All in shop | All (logged) | All (logged) |
| Accept, decline, quote, complete, mark no-show | No | No | Assigned | Yes | Yes | No | No |
| Add walk-ins, block time | No | No | Yes | Yes | Yes | No | No |
| Chat on a booking | No | Own | Assigned | Yes | Yes | Read (dispute) | Read (dispute) |
| Reply to reviews | No | No | No | Yes | Yes | No | No |
| Invite or remove staff and managers | No | No | No | Staff only | Yes | No | No |
| Upload or view verification documents | No | No | No | No | Own | View | View |
| Delete or transfer the shop | No | No | No | No | Yes | No | Yes |
| Approve, verify, suspend shops | No | No | No | No | No | Yes | Yes |
| Hide reviews, resolve disputes, suspend users | No | No | No | No | No | Yes | Yes |
| Manage categories, cities, announcements | No | No | No | No | No | Yes | Yes |
| Manage admins, platform settings, view audit log | No | No | No | No | No | No | Yes |

**How it is enforced**

1. **Permission names** follow `resource:action`, for example `booking:accept`, `shop:update`, `service:manage`, `admin:shop.verify`.
2. **`lib/authz.ts`** maps each role to its permissions and exposes `can(user, permission, resource)` and `assertCan(...)`. The resource carries `shopId`, `customerId` or `assignedStaffId`, so ownership is checked in the same call.
3. **Every server action and route handler** calls `assertCan` before reading or writing. A failed check returns 403 (or 404 for records the user must not know exist) and is logged.
4. **Middleware route guards:** `/account` needs a session; `/dashboard` needs an active shop membership; `/admin` needs an admin role plus two-factor login (TOTP) on the admin's account.
5. **Database guard:** Supabase RLS policies mirror the key rules as a second line of defense; the service-role key is used only in server code and never reaches the browser.
6. **Tests:** an automated matrix test runs every permission in this table against every role and fails the build on any mismatch.

## Booking lifecycle

Every booking moves through eight statuses, and only `change_booking_status()` may move it, so the rules live in one place and every change is recorded in `booking_events`.

&#91;embedded content: booking lifecycle · 8 statuses\]

| Transition | Who can do it | Rule |
| --- | --- | --- |
| Requested to Confirmed | Shop staff (assigned), manager, owner | Slot still free; Slot, Home and Queue bookings |
| Requested to Quoted | Shop staff (assigned), manager, owner | Quote bookings; price required |
| Quoted to Confirmed | The customer | Before the quote expires |
| Requested to Declined | Shop staff, manager, owner | Reason required |
| Requested or Quoted to Expired | System job | No answer by `expires_at` (2 hours, or 30 minutes for same-day) |
| Requested, Quoted or Confirmed to Cancelled | Customer (within the shop's cancellation window) or shop (reason required) | Late cancellations are counted on the profile |
| Confirmed to Completed | Shop staff, manager, owner | After the start time; system reminds the shop if not marked within 12 hours |
| Confirmed to No-show | Shop staff, manager, owner | From 15 minutes after the start time |

Completed is the only status that lets the customer leave a review. Declined, Expired, Cancelled and No-show are final.

## Server and API design

Use server actions for everything the app's own pages do, and route handlers only for outside callers (cron, webhooks, share images). Every server entry point follows the same five steps.

**The five steps of every action**

1. **Authenticate:** `getCurrentUser()` from `lib/auth`; no user means 401 or a redirect to login.
2. **Validate:** parse input with the feature's Zod schema; reject unknown fields.
3. **Authorize:** `assertCan(user, permission, resource)` after loading the resource.
4. **Execute:** one Drizzle transaction or a database function such as `create_booking()`.
5. **Record and notify:** write `audit_log` for sensitive actions, publish realtime events, queue notifications; then `revalidateTag()` for cached pages.

**Conventions**

- Actions return `{ ok: true, data }` or `{ ok: false, code, message, fieldErrors }`; they never throw raw errors to the browser. Codes: `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `CONFLICT` (slot taken), `RATE_LIMITED`.
- Messages shown to users are short and friendly, in English with Filipino-friendly wording; details go to Sentry only.
- **Idempotency:** booking creation takes a client-generated `idempotency_key` so a double tap on a slow connection makes one booking.
- **Pagination:** cursor-based (`created_at`, `id`), 20 items by default.
- **Rate limits** (per user and per IP, stored in Postgres or Upstash Redis): OTP requests 3 per 10 minutes per phone; bookings 10 per day per customer; messages 30 per minute; search 60 per minute.
- **Route handlers:** `/api/cron/[job]` requires a secret header; `/api/hooks/send-sms` verifies the Supabase hook signature; all check the HTTP method and return JSON.
- **Time:** accept and return ISO strings in UTC; convert to Asia/Manila only in the UI.

**Key actions**

| Feature | Actions |
| --- | --- |
| Shops | `createShop`, `updateShop`, `submitForVerification`, `setAcceptingToday` |
| Services | `createService`, `updateService`, `reorderServices`, `archiveService` |
| Availability | `setHours`, `addClosure`, `getOpenSlots` |
| Bookings | `createBooking`, `acceptBooking`, `declineBooking`, `sendQuote`, `acceptQuote`, `cancelBooking`, `rescheduleBooking`, `completeBooking`, `markNoShow`, `addWalkIn` |
| Messages | `sendMessage`, `markRead` |
| Reviews | `createReview`, `replyToReview`, `reportReview` |
| Admin | `verifyShop`, `suspendShop`, `hideReview`, `resolveReport`, `upsertCategory` |

## UI design system

The interface uses the BooKanto brand from the [logo canvas](https://claude.ai/artifact/V14VJVJRhqatiKmZeTGvGc): warm, friendly and local, but clean enough for shop owners to manage bookings quickly. Design for a 360 px wide Android screen first.

**Design tokens**

| Token | Value | Use |
| --- | --- | --- |
| `orange-500` (Kanto Orange) | #F26B1D | Primary buttons and highlights, with **navy text** on it (5.3:1 contrast); never white body text on it (3.1:1 fails) |
| `orange-700` | #C2410C | Orange text links and white-text buttons (5.2:1 on white) |
| `navy-900` (Gabi Navy) | #14213D | Main text, headers, dark sections |
| `yellow-400` (Araw Yellow) | #FFC233 | Badges, promos, "Open now" chips, with navy text |
| `cream-50` | #FFF8EE | Page background |
| `slate-600` | #3D4A63 | Secondary text (8.4:1 on cream) |
| Status colors | Green #15803D, red #B91C1C, amber #B45309 | Confirmed, declined or cancelled, pending; always paired with an icon and a word |
| Fonts | Lilita One (logo and big headlines), Plus Jakarta Sans (everything else) | Self-hosted through `next/font`; body 16 px minimum |
| Radius and spacing | 12 px cards, 999 px pills; 4 px spacing scale | Consistent rhythm |

**Layout**

- Breakpoints: 360 (base), 640, 1024, 1280 px
- Customer side: top bar with search, sticky "Book" button on shop pages, bottom sheet for filters and slot picking
- Shop dashboard: bottom tab bar on phones (Today, Bookings, Services, Shop, More), side menu on desktop
- Admin: desktop-first tables with filters

**Core components:** button, input, select, phone input (+63), OTP input, date strip, slot grid, shop card, service row, price tag, rating stars, status chip, booking card, bottom sheet, dialog, toast, empty state, skeleton loader, map with pins, image uploader with crop, QR poster.

**Key screens (phase 1):** home, search results with list and map, category and city pages, shop profile, booking flow (service, date and slot, details, review, confirmed), login and OTP, my bookings, booking detail with chat, shop onboarding wizard, shop Today, booking inbox, calendar, services editor, admin shop queue.

**Every screen has four states:** loading (skeletons, not spinners), empty (helpful next step, for example "Add your first service"), error (plain message and a retry button), and success.

**Accessibility (WCAG 2.2 AA):** contrast 4.5:1 for text; touch targets at least 44 by 44 px; real buttons and links with visible focus; labels on every input; status never shown by color alone; reduced-motion support; screen-reader labels on icon buttons.

**Copy tone:** short, warm Taglish where natural ("Next ka na, suki!", "Book na"), plain English for terms, prices and errors. Show prices as ₱ with no decimals unless needed.

## Web security

BooKanto holds names, phone numbers, addresses and locations, so security is built into every layer and mapped to the OWASP Top 10 risks. The rules below are requirements for phase 1, not later improvements.

| Area | Controls |
| --- | --- |
| Authentication | Phone OTP: 6 digits, 5-minute expiry, 5 tries then lock 15 minutes; Cloudflare Turnstile before sending an OTP; sessions in `httpOnly`, `Secure`, `SameSite=Lax` cookies; refresh tokens rotated; sign out everywhere option; TOTP two-factor required for admins |
| Authorization | `assertCan` in every action (see RBAC); 404 for records the user must not see; RLS as a second guard; service-role key only on the server |
| Input validation | Zod schemas on every input, strict mode (unknown fields rejected); length limits on all text; phone numbers normalized to E.164 |
| Injection | Only parameterized queries through Drizzle; no string-built SQL; database functions use bound parameters |
| Cross-site scripting | React escaping; no `dangerouslySetInnerHTML` with user text; reviews and messages stored and shown as plain text; links in messages made non-clickable or `rel="nofollow noopener"` |
| Cross-site request forgery | Server actions check the request origin; route handlers check `Origin` and use secrets or signatures; `SameSite` cookies |
| Security headers (middleware) | Content-Security-Policy with nonces (self, Supabase, Google Maps, Turnstile, Sentry only); `Strict-Transport-Security` with preload; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` (geolocation self only, camera off); `frame-ancestors 'none'` |
| File uploads | Images only (JPEG, PNG, WebP, HEIC), 8 MB max; type checked by file signature, not name; re-encoded to WebP with metadata (including GPS) stripped; documents in a private bucket, served by signed URLs that expire in 5 minutes |
| Privacy of contact details | A customer's phone and exact address are shown to a shop only after it accepts the booking; chat inside the app instead of sharing numbers |
| Abuse and fraud | Rate limits (see API design); limits on open requests per customer; report buttons on shops, reviews and messages; reviews only from completed bookings |
| Secrets | In Vercel and Supabase environment settings only; `.env.example` without values; `lib/env.ts` validates at startup; secret scanning on GitHub; keys rotated every 6 months and after staff changes |
| Dependencies | Dependabot or Renovate weekly; `pnpm audit` in CI; lockfile committed; minimal packages |
| Logging and audit | `audit_log` for logins by admins, role changes, verification, suspensions, data exports, and admin views of bookings; no OTPs, tokens or full phone numbers in logs |
| Backups and recovery | Supabase Pro daily backups; weekly export to separate storage; restore drill once during the pilot |
| Data Privacy Act (RA 10173) | Consent at sign-up, privacy notice, a named Data Protection Officer, data kept only as long as needed, delete-account flow, breach response plan with notice to the National Privacy Commission within 72 hours |

**Before public launch:** run OWASP ZAP baseline scan against staging, check headers with securityheaders.com, and walk the RBAC matrix by hand with test accounts.

## SEO

Google search is BooKanto's free growth channel: each shop page and each city-and-category page should rank for local searches such as "barbershop Marikina" or "aircon cleaning Quezon City". Build these rules into the first release, because changing URLs later loses rankings.

**URL structure**

| Page | URL | Example |
| --- | --- | --- |
| Category, nationwide | `/c/[category]` | `/c/barbershop` |
| City and category | `/[city]/[category]` | `/marikina/barbershop` |
| Barangay and category (when 5 or more shops) | `/[city]/[barangay]/[category]` | `/marikina/concepcion-uno/barbershop` |
| Shop | `/shop/[slug]` | `/shop/kuya-jun-barbershop-marikina` |
| Search results | `/search?q=` | Not indexed (`noindex, follow`) |

**On-page rules**

- Unique `<title>` (under 60 characters) and meta description (under 155) from `generateMetadata`, for example "Barbershops in Marikina, from ₱100 | BooKanto"
- One `<h1>` per page; city pages carry a short intro, price range, top shops and a few FAQs written per category
- Canonical URLs on every page; filtered and sorted views point to the clean URL
- Publish a city or category page only when it has 3 or more active shops; below that, `noindex`
- Internal links: shop pages link to their city and category pages; city pages link to nearby barangays and related categories; breadcrumbs everywhere

**Structured data (JSON-LD)**

- Shop pages: `LocalBusiness` (or a fitting subtype such as `HairSalon` or `AutoRepair`) with name, address, geo, opening hours, price range, `AggregateRating`, and `Service` items
- All pages: `BreadcrumbList`; home page: `Organization` and `WebSite` with a search action
- City pages: `FAQPage` only where the FAQs are visible on the page

**Technical**

- Server-rendered public pages; content present in the first HTML
- `app/sitemap.ts` split by type (shops, city pages), rebuilt nightly; `robots.ts` blocks `/account`, `/dashboard`, `/admin`, `/book`, `/api`
- Open Graph and Twitter images generated per shop (`/api/og/shop`), so links look good on Facebook and Messenger
- `hreflang` ready for English and Filipino versions later
- Old slugs redirect (301) to new ones through a small `slug_redirects` table
- Google Search Console and Bing Webmaster Tools at launch; watch indexing and Core Web Vitals reports weekly

**Local SEO outside the site:** each shop adds its BooKanto link to its Google Business Profile and Facebook page; BooKanto's own Google Business Profile, Facebook, Instagram and TikTok link back to the site.

## Page performance

Most users will open BooKanto on budget Android phones over mobile data, so every public page must load fast there, not just on a laptop. Choose a rendering mode per page, keep JavaScript small, and measure real users from day one.

**Performance budget (public pages, mid-range Android on 4G)**

| Metric | Target |
| --- | --- |
| Largest Contentful Paint | Under 2.5 s |
| Interaction to Next Paint | Under 200 ms |
| Cumulative Layout Shift | Under 0.1 |
| JavaScript sent for first load | Under 170 KB compressed |
| Page weight before images below the fold | Under 500 KB |
| Server response (time to first byte) | Under 600 ms from Manila |
| Lighthouse mobile score | 90 or higher on home, city and shop pages |

**Rendering by page**

| Page | Mode | Freshness |
| --- | --- | --- |
| Home, category, city pages | Static with incremental revalidation | Rebuilt every 10 minutes, or at once when a shop changes (`revalidateTag`) |
| Shop profile | Static with incremental revalidation | Revalidated when the shop, services, hours or reviews change |
| Open slots on a shop page | Fetched on the client after load | Always live |
| Search results | Server-rendered per request | Live |
| Account, dashboard, admin | Server-rendered per request, client cache with TanStack Query | Live, realtime updates |
| Legal and help pages | Fully static | At deploy |

**Techniques**

- **Server Components by default;** add `"use client"` only to interactive parts (slot picker, map, forms)
- **Images:** `next/image` with AVIF and WebP, correct `sizes`, width and height always set (no layout shift); shop photos resized on upload to 400, 800 and 1600 px; lazy-load below the fold; the first shop photo gets `priority`
- **Fonts:** self-hosted through `next/font`, Latin subset, `display: swap`; Lilita One only for headlines
- **Map:** loaded only when the user taps "Map" (`next/dynamic`, no server rendering); a list is the default view
- **Third-party scripts:** PostHog and Turnstile loaded after the page is interactive; no chat widgets or heavy trackers
- **Database:** GIST index for nearby search, composite indexes from the data model, `EXPLAIN ANALYZE` on every query that runs per page view; Supabase's transaction pooler for serverless connections; Vercel functions in Singapore next to the database
- **Caching:** public pages served from Vercel's edge cache; tag-based invalidation by shop, city and category
- **Streaming:** `loading.tsx` skeletons and `Suspense` so the page shell shows at once
- **Bundle discipline:** `@next/bundle-analyzer` in CI; fail the build if first-load JavaScript passes the budget

**Measuring:** Vercel Speed Insights for real users, Lighthouse CI on every pull request for the home, city and shop pages, and a monthly test on a real budget Android phone.

## Testing and QA

Automate the checks that protect money-like data (bookings) and private data (permissions); test the rest by hand on real phones each week.

| Layer | Tool | What it covers | When it runs |
| --- | --- | --- | --- |
| Unit | Vitest | Slot engine, price math, booking state transitions, time zones, validation schemas | Every commit |
| Integration | Vitest with local Supabase (Docker) | Database functions, `create_booking` race conditions, RLS policies | Every pull request |
| Permissions | Vitest matrix test | Every row of the RBAC table against every role | Every pull request |
| End to end | Playwright, Android and iPhone viewports | Sign up, shop onboarding, search, book, accept, chat, review, cancel | Every pull request against the preview deploy |
| Accessibility | axe-core in Playwright | Contrast, labels, roles on key screens | Every pull request |
| Performance | Lighthouse CI | Budgets above | Every pull request |
| Security | OWASP ZAP baseline, `pnpm audit` | Headers, common vulnerabilities, vulnerable packages | Weekly and before launch |
| Load | k6 | 200 concurrent users searching and booking on staging | Before beta and before public launch |
| Manual | Real devices (a budget Android, an iPhone) | Full flows on mobile data, SMS delivery on Globe, Smart and DITO | Weekly during the build |

**Test data:** a seed script creates demo categories, cities, 30 shops and customers on staging; production never receives seed data. **Beta feedback:** a "Report a problem" link in the dashboard sends a screenshot and context to a GitHub issue template.

## DevOps, environments and monitoring

Three environments, one-click deploys from GitHub, and alerts that reach your phone before customers notice a problem.

| Environment | Web app | Database | Data |
| --- | --- | --- | --- |
| Local | `pnpm dev` | Supabase CLI in Docker | Seed data |
| Staging (preview) | Vercel preview deploy per pull request | Free Supabase project | Seed data, test SMS numbers only |
| Production | Vercel production (Singapore functions) | Supabase Pro, Singapore | Real users |

**Branching and releases**

- Trunk-based: short branches from `main`, a pull request for every change, merge when checks pass
- Every pull request gets a preview URL; merging to `main` deploys production
- Risky features ship behind PostHog feature flags, turned on for beta shops first

**CI pipeline (GitHub Actions, every pull request)**

1. Install with pnpm (cached)
2. Type check, lint, format check
3. Unit tests and the permissions matrix
4. Integration tests against local Supabase
5. Build and bundle-size check
6. Playwright end-to-end and axe tests on the preview deploy
7. Lighthouse CI on key pages

**Database migrations:** generated by drizzle-kit, reviewed in the pull request, applied to staging automatically and to production by a manual GitHub Actions job after a backup; changes are backward-compatible (add first, remove later) so a rollback of the app never breaks the database.

**Monitoring and alerts**

- Sentry: errors with release tags; alert on new error types and spikes
- Uptime checks every minute on home, a shop page and the health endpoint (`/api/health`); alert by SMS or push
- Job monitoring: each cron job records its last success; alert if reminders or expiry have not run for 30 minutes
- Business alerts: bookings with no shop response for 2 hours; SMS delivery failures above 5%
- Weekly review: errors, slow queries (Supabase query performance), Core Web Vitals, costs

**Incident basics:** a one-page runbook (who, how to roll back on Vercel, how to restore the database), and a status message banner the admin can switch on.

## Coding standards and definition of done

The same rules for every change keep a solo-built codebase easy to hand over or migrate later.

**Coding standards**

- TypeScript strict; no `any` without a comment explaining why
- Names: files in kebab-case, React components in PascalCase, database columns in snake\_case, permissions as `resource:action`
- Server-only code imports `server-only`; secrets read only through `lib/env.ts`
- No Supabase client calls outside the four adapter files and `lib/db`
- No direct `Date` math on local time; use `lib/time.ts` helpers for Asia/Manila
- Money only through `lib/money.ts` (integer centavos, ₱ formatting)
- Conventional commit messages (`feat:`, `fix:`, `chore:`), small pull requests with screenshots for UI changes
- Comments explain why, not what; each feature folder has a short README

**A feature is done when**

- [ ] It works on a budget Android phone and an iPhone at 360 px wide
- [ ] Inputs validated with Zod; permissions checked with `assertCan`
- [ ] Loading, empty and error states are designed and built
- [ ] Unit or integration tests cover its logic; the permissions matrix is updated if it adds an action
- [ ] Accessibility checks pass (axe, keyboard, screen-reader labels)
- [ ] No new performance budget warnings
- [ ] Analytics events added for its key steps
- [ ] Sensitive actions write to `audit_log`
- [ ] Copy reviewed for tone and clarity
- [ ] Deployed to staging and checked on the preview URL
