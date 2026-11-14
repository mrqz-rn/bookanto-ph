# Availability

Weekly hours, breaks, closures and the open-slot engine (`slots.ts`) that turns them into bookable times.

- Actions: `setHours`, `addClosure`, `getOpenSlots`
- Tables: `business_hours`, `closures`; database function `get_open_slots()`
- Hours are Manila wall-clock times; convert with `lib/time.ts`, never `Date` math on local time.
