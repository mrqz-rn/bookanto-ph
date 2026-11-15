export const ADDRESS_LABELS = ["Home", "Work", "Office", "Condo", "Other"] as const;

export const ACCOUNT_NAV_ITEMS = [
  {
    href: "/account/bookings",
    label: "My Bookings",
    description: "View upcoming bookings and rate completed services",
  },
  {
    href: "/account/profile",
    label: "Profile",
    description: "Manage your personal information",
  },
  {
    href: "/account/addresses",
    label: "Saved Addresses",
    description: "Manage delivery and service locations",
  },
  {
    href: "/account/notifications",
    label: "Notifications",
    description: "Channels, alerts, receipts and reminders",
  },
] as const;
