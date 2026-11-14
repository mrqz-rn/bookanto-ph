# Availability

Weekly hours, breaks, closures, staff schedules and holiday rules, and the open-slot engine (`slots.ts`) that turns them into bookable times. Shops manage it at `/dashboard/availability`.

- Actions: `setHours`, `addClosure`, `removeClosure`, `addTimeOff`, `removeTimeOff`, `setHolidayRules`, `setStaffSchedule`, `getOpenSlots`
- Tables: `business_hours`, `closures` (shop-wide), `staff_schedules`, `staff_hours`, `staff_time_off`, `shop_holiday_rules`
- Hours are Manila wall-clock times; convert with `lib/time.ts`, never `Date` math on local time.

## How a slot is decided

`openSlotsOnDate()` in `slots.ts` is pure, so tests, queries and booking creation share it.

1. **Hours:** a holiday rule for the date wins (closed, or special hours with no break); otherwise the weekday's `business_hours`, split by its break. No row means closed.
2. **Start times** step every `SLOT_STEP_MIN` (30) minutes from each opening period's start, so from the end of a break too. The whole service must fit before closing or the break; its buffer may run past.
3. **Closures** remove any start whose service overlaps them.
4. **Capacity:** bookings that hold time (`requested`, `quoted`, `confirmed`) of the same service, each extended by its service's `buffer_min`, must number fewer than `services.capacity` over the candidate's time plus its own buffer.
5. **Staff:** when any active member has a `staff_schedules` row, a slot also needs one of them working (shop hours, or their own `staff_hours` within the shop's), not on `staff_time_off`, and not booked. Unassigned bookings use up a free person each. `remaining` is the smaller of capacity left and free staff.
6. **Notice:** starts sooner than `MIN_NOTICE_MIN` (30) from now are hidden; `getOpenSlots` serves up to `BOOKING_HORIZON_DAYS` (60) ahead, at most 14 days a call.

Buffer and capacity are columns of `services`, edited with the service. Queue services have no slots.

## Holidays

`holidays.ts` holds the Philippine holiday calendar: fixed dates, Holy Week from Easter, National Heroes Day as the last Monday of August, and a per-year table for Chinese New Year and the two Eid holidays. A shop's `shop_holiday_rules` name holidays by key, so they apply every year without re-entry. **Each year**, when the government publishes the next year's holidays, add the proclaimed dates (and any moved holiday) to `dates` in `holidays.ts`. The templates (`HOLIDAY_TEMPLATES`) only fill in the form.

## For the bookings module

`create_booking()` should lock the service row, then call `findBookableSlot(tx, …)` from `queries.ts` inside the same transaction. It returns the slot with the staff free to take it, or null for a `CONFLICT`. Public slot reads cache the schedule under `availabilityTag(shopId)` (`lib/cache.ts`); bookings are always read fresh.
