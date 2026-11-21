export const OTP_COUNTDOWN_SECONDS = 60;

export const DEFAULT_AUTH_REDIRECT = "/auth/continue";

/** A password reset link works once, for this long. */
export const PASSWORD_RESET_TTL_MINUTES = 10;

/** Password length for new passwords (bcrypt reads at most 72 bytes). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Phone (SMS OTP) sign-in is temporarily disabled. Flip to `true` to re-enable
 * the "Phone Number" tab on /login and the phone OTP server actions.
 */
export const PHONE_AUTH_ENABLED = false;

export const PHONE_AUTH_DISABLED_MESSAGE =
  "Phone number sign-in is temporarily unavailable. Please use email or Google.";

export const OAUTH_PROVIDERS = [
  {
    id: "google" as const,
    name: "Google",
    label: "Continue with Google",
  },
  {
    id: "facebook" as const,
    name: "Facebook",
    label: "Continue with Facebook",
  },
] as const;

export const SAMPLE_ACCOUNTS = {
  store: {
    role: "store" as const,
    authId: "00000000-0000-4000-a000-000000000001",
    label: "Sample Store Account",
    name: "Kuya Jun Santos",
    shopName: "Kuya Jun's Barbershop",
    email: "store@bookanto.ph",
    password: "DemoStore123!",
    phone: "+639170000001",
    defaultNext: "/dashboard",
  },
  customer: {
    role: "customer" as const,
    authId: "00000000-0000-4000-a000-000000000002",
    label: "Sample User Account",
    name: "Maria Santos",
    email: "user@bookanto.ph",
    password: "DemoUser123!",
    phone: "+639180000001",
    defaultNext: "/explore",
  },
  admin: {
    role: "admin" as const,
    authId: "00000000-0000-4000-a000-000000000003",
    label: "Sample Admin Account",
    name: "BooKanto SuperAdmin",
    email: "admin@bookanto.ph",
    password: "DemoAdmin123!",
    phone: "+639190000001",
    defaultNext: "/admin",
  },
} as const;

export type SampleAccountRole = keyof typeof SAMPLE_ACCOUNTS;
