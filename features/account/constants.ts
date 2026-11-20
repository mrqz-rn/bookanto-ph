export const ADDRESS_LABELS = ["Home", "Work", "Office", "Condo", "Other"] as const;

/** A customer can keep at most this many saved addresses. */
export const MAX_SAVED_ADDRESSES = 5;

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

/** Who the site header is drawn for. Built on the server by `toViewer`. */
export type Viewer = {
  /** Full name, else email or phone. */
  name: string;
  firstName: string | null;
  /** Email or phone, shown under the name in the account menu. */
  contact: string | null;
  kind: "customer" | "store" | "admin";
};
