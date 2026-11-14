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
