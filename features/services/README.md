# Services

The services a shop offers, with fixed, starts-at or quote pricing, duration, booking type (slot, home, quote, queue), capacity and buffer.

- Actions: `createService`, `updateService`, `reorderServices`, `archiveService`
- Tables: `services`
- Prices are integer centavos through `lib/money.ts`.
