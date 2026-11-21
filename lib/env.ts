import "server-only";

import { z } from "zod";

import { parseEnv, publicEnv } from "@/lib/public-env";

/** `KEY=` in an env file arrives as "", which should read as "not set". */
const unset = (value: unknown) => (value === "" ? undefined : value);

// The only place server code reads process.env. Validated when the server
// starts (instrumentation.ts), so a missing secret fails the deploy, not a
// customer's request. Add each new variable here and to .env.example.
const serverEnv = parseEnv(
  z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      // Supabase transaction pooler (port 6543) in deployed environments.
      DATABASE_URL: z.url(),
      // Scheduled background maintenance cron secret
      CRON_SECRET: z.string().default("bookanto-dev-cron-secret"),
      // Semaphore SMS API credentials (PH gateway)
      SEMAPHORE_API_KEY: z.string().optional(),
      SEMAPHORE_SENDER_NAME: z.string().optional().default("BooKanto"),
      // Supabase secret key (sb_secret_…), server only. Private storage for
      // verification documents (lib/supabase/admin.ts). Locally:
      // `pnpm exec supabase status -o env` prints it as SECRET_KEY.
      SUPABASE_SECRET_KEY: z.preprocess(unset, z.string().optional()),
      // Webhook secret for Supabase Send SMS Hook
      SUPABASE_SMS_HOOK_SECRET: z.string().optional(),
      // Outgoing email (lib/notify.ts). EMAIL_PROVIDER picks the service; left
      // empty, it's SMTP when SMTP_HOST is set, else Resend when RESEND_API_KEY
      // is set, else "log": nothing is sent, which suits tests and offline work.
      EMAIL_PROVIDER: z.preprocess(unset, z.enum(["smtp", "resend", "log"]).optional()),
      // The sender every email shows, for SMTP and Resend alike.
      EMAIL_FROM: z.preprocess(unset, z.string().optional()),
      // SMTP: any provider's server (Gmail, Brevo, Mailgun, SES, Postmark…).
      // Port 587 uses STARTTLS; 465 uses TLS from the start (SMTP_SECURE
      // defaults to that). Locally, Inbucket in docker-compose.yml takes mail on
      // 127.0.0.1:2500 with no login and shows it at http://localhost:54324.
      SMTP_HOST: z.preprocess(unset, z.string().optional()),
      SMTP_PORT: z.preprocess(unset, z.coerce.number().int().min(1).max(65535).default(587)),
      SMTP_SECURE: z.preprocess(unset, z.stringbool().optional()),
      SMTP_USER: z.preprocess(unset, z.string().optional()),
      SMTP_PASSWORD: z.preprocess(unset, z.string().optional()),
      // Resend Email API credentials
      RESEND_API_KEY: z.string().optional(),
      // Older name for EMAIL_FROM; still read when EMAIL_FROM is empty.
      RESEND_FROM_EMAIL: z.string().optional().default("BooKanto <notifications@bookanto.ph>"),
      // WhatsApp Cloud API credentials
      WHATSAPP_API_TOKEN: z.string().optional(),
      WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
      // Viber Business REST API credentials
      VIBER_AUTH_TOKEN: z.string().optional(),
      VIBER_SENDER_NAME: z.string().optional().default("BooKanto"),
      // Web Push VAPID credentials
      VAPID_PUBLIC_KEY: z.string().optional(),
      VAPID_PRIVATE_KEY: z.string().optional(),
      VAPID_SUBJECT: z.string().optional().default("mailto:admin@bookanto.ph"),
      // PayMongo (deposits and online payment). Online payment stays off until
      // both are set. The webhook secret comes from the webhook registered for
      // /api/hooks/payments (event checkout_session.payment.paid).
      PAYMONGO_SECRET_KEY: z.string().optional(),
      PAYMONGO_WEBHOOK_SECRET: z.string().optional(),
      // Google OAuth credentials for direct OAuth callback (shows "continue to BooKanto"
      // instead of "<project-ref>.supabase.co" on Google's account chooser).
      GOOGLE_CLIENT_ID: z.string().optional(),
      GOOGLE_CLIENT_SECRET: z.string().optional(),
      SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: z.string().optional(),
      SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.EMAIL_PROVIDER === "smtp" && !value.SMTP_HOST) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_HOST"],
          message: "is required when EMAIL_PROVIDER is smtp",
        });
      }
      if (value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "is required when EMAIL_PROVIDER is resend",
        });
      }
      // 587 and 25 start in plain text and upgrade with STARTTLS; forcing TLS
      // from the first byte there fails every send ("wrong version number").
      if (value.SMTP_SECURE === true && (value.SMTP_PORT === 587 || value.SMTP_PORT === 25)) {
        ctx.addIssue({
          code: "custom",
          path: ["SMTP_SECURE"],
          message: `must be false on port ${value.SMTP_PORT} (it upgrades with STARTTLS); use port 465 for SMTP_SECURE=true`,
        });
      }
      if (Boolean(value.SMTP_USER) !== Boolean(value.SMTP_PASSWORD)) {
        ctx.addIssue({
          code: "custom",
          path: [value.SMTP_USER ? "SMTP_PASSWORD" : "SMTP_USER"],
          message: "SMTP_USER and SMTP_PASSWORD go together: set both, or neither",
        });
      }
    }),
  process.env,
);

export const env = { ...serverEnv, ...publicEnv };
