export const PRICE_TYPE_LABELS = {
  fixed: "Fixed price",
  starts_at: "Starting price",
  quote: "By quote",
} as const;

export const PRICE_TYPE_HINTS = {
  fixed: "Every customer pays this.",
  starts_at: 'Customers see "From" before the price; you can charge more.',
  quote: "Customers describe the job and you send them a price.",
} as const;

export const BOOKING_TYPE_LABELS = {
  slot: "Shop appointment",
  home: "Home service",
  quote: "Request a quote",
  queue: "Walk-in queue",
} as const;

export const BOOKING_TYPE_DESCRIPTIONS = {
  slot: "The customer picks a time and comes to your shop.",
  home: "The customer picks a time and you go to them.",
  quote: "The customer sends the details and you reply with a price.",
  queue: "The customer joins today's line and comes in when called.",
} as const;

export const CADENCE_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Every 3 months",
  yearly: "Yearly",
  sessions_pack: "Session pass",
} as const;

export const DURATION_OPTIONS = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1 hr 30 min" },
  { value: 120, label: "2 hr" },
  { value: 180, label: "3 hr" },
  { value: 240, label: "4 hr" },
] as const;

export const BUFFER_OPTIONS = [
  { value: 0, label: "No break" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
] as const;
