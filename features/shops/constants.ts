export const ONBOARDING_STEPS = [
  { step: 1, id: "details", title: "Shop details", subtitle: "Name, category, and contact" },
  { step: 2, id: "location", title: "Location & map pin", subtitle: "Exact spot on the map" },
  { step: 3, id: "hours", title: "Business hours", subtitle: "When you accept bookings" },
  { step: 4, id: "photos", title: "Shop photos", subtitle: "Storefront and work photos" },
  { step: 5, id: "documents", title: "Verification", subtitle: "Permit and owner ID" },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

/** Who can register, shown on /register-shop. Matches the four booking types. */
export const PROVIDER_KINDS = [
  {
    id: "storefront",
    title: "Shops with a storefront",
    description: "Barbershops, salons, repair shops and clinics. Customers book a time slot.",
  },
  {
    id: "home",
    title: "Home service providers",
    description: "Aircon cleaning, plumbing, home massage. You go to the customer's address.",
  },
  {
    id: "quote",
    title: "Jobs priced on request",
    description: "Customers describe the job and you send a price before they confirm.",
  },
  {
    id: "queue",
    title: "Walk-in and queue shops",
    description: "Customers take a number online and come in when it's their turn.",
  },
] as const;

export const WEEKDAYS = [
  { day: 0, label: "Sunday", short: "Sun" },
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
] as const;

export const STANDARD_HOURS_PRESETS = [
  { label: "8:00 AM – 5:00 PM", opens: "08:00", closes: "17:00" },
  { label: "9:00 AM – 6:00 PM", opens: "09:00", closes: "18:00" },
  { label: "9:00 AM – 7:00 PM", opens: "09:00", closes: "19:00" },
  { label: "10:00 AM – 8:00 PM (Mall hours)", opens: "10:00", closes: "20:00" },
] as const;

export const DOCUMENT_TYPES = [
  {
    type: "business_permit",
    name: "Mayor's / Barangay Business Permit",
    description: "Official permit issued by your local city or municipality.",
    required: true,
  },
  {
    type: "dti_sec",
    name: "DTI or SEC Registration / BIR 2303",
    description: "Certificate of business name registration or BIR tax certificate.",
    required: false,
  },
  {
    type: "owner_id",
    name: "Owner Government-Issued ID",
    description: "Passport, Driver's License, UMID, Postal ID, or PhilID.",
    required: true,
  },
] as const;

export type DocumentTypeId = (typeof DOCUMENT_TYPES)[number]["type"];

/** Most verification documents one shop can keep at a time. */
export const MAX_SHOP_DOCUMENTS = 10;

export const CITY_PRESETS = [
  { name: "Marikina", lat: 14.6507, lng: 121.1029 },
  { name: "Quezon City", lat: 14.676, lng: 121.0437 },
  { name: "Pasig", lat: 14.5764, lng: 121.0851 },
  { name: "Manila", lat: 14.5995, lng: 120.9842 },
  { name: "Taguig / BGC", lat: 14.5547, lng: 121.0509 },
  { name: "Makati", lat: 14.5547, lng: 121.0244 },
] as const;
