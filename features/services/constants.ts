export const PRICE_TYPE_LABELS = {
  fixed: "Fixed price",
  starts_at: "Starts at",
  quote: "Quote upon request",
} as const;

export const BOOKING_TYPE_LABELS = {
  slot: "Shop appointment",
  home: "Home service",
  quote: "Request a quote",
  queue: "Walk-in queue",
} as const;

export const BOOKING_TYPE_DESCRIPTIONS = {
  slot: "Customer visits your shop at the scheduled date and time.",
  home: "You travel to the customer's house or location.",
  quote: "Customer submits request details, and you send a custom price quote.",
  queue: "Customer joins a virtual line or queue for same-day walk-in service.",
} as const;

export const CADENCE_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 Months",
  yearly: "Yearly",
  sessions_pack: "Session Pass",
} as const;

export const DURATION_OPTIONS = [
  { value: 15, label: "15 mins" },
  { value: 30, label: "30 mins" },
  { value: 45, label: "45 mins" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
  { value: 180, label: "3 hours" },
  { value: 240, label: "4 hours" },
] as const;

export const BUFFER_OPTIONS = [
  { value: 0, label: "No buffer" },
  { value: 5, label: "5 mins" },
  { value: 10, label: "10 mins" },
  { value: 15, label: "15 mins" },
  { value: 30, label: "30 mins" },
] as const;
