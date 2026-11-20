import type { BookingType } from "@/lib/db/schema/enums";

// Its own module, not constants.ts: that file is imported by most dashboard and
// admin client components, and this copy is only needed on customer pages.
/** How each booking type reads to customers (shops see features/services BOOKING_TYPE_LABELS). */
export const CUSTOMER_BOOKING_MODES: Record<
  BookingType,
  { label: string; action: string; submit: string }
> = {
  slot: { label: "At the shop", action: "Book", submit: "Book na" },
  home: { label: "Home service", action: "Book", submit: "Book na" },
  queue: { label: "Walk-in queue", action: "Get a number", submit: "Get a queue number" },
  quote: { label: "Quote first", action: "Get a quote", submit: "Ask for a quote" },
};
