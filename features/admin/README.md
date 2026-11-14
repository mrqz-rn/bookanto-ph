# Admin

Shop approval and verification, categories and cities, users, bookings, disputes and the audit log.

- Actions: `verifyShop`, `suspendShop`, `hideReview`, `resolveReport`, `upsertCategory`
- Every admin action and every admin view of a booking writes `audit_log` through `lib/audit.ts`.
- `/admin` requires an admin role and a TOTP second factor.
