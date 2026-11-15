export const OTP_COUNTDOWN_SECONDS = 60;

export const DEFAULT_AUTH_REDIRECT = "/account";

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
    defaultNext: "/account",
  },
} as const;

export type SampleAccountRole = keyof typeof SAMPLE_ACCOUNTS;
