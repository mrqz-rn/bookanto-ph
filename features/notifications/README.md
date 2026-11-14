# Notifications

SMS (Semaphore), email (Resend) and web push, routed through `lib/notify.ts`, plus reminders and auto-expiry run by `lib/jobs.ts`.

- Tables: `notifications`, `push_subscriptions`
- Never log OTPs, tokens or full phone numbers.
