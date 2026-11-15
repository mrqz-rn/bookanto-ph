import "server-only";

import { z } from "zod";

import { parseEnv, publicEnv } from "@/lib/public-env";

// The only place server code reads process.env. Validated when the server
// starts (instrumentation.ts), so a missing secret fails the deploy, not a
// customer's request. Add each new variable here and to .env.example.
const serverEnv = parseEnv(
  z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    // Supabase transaction pooler (port 6543) in deployed environments.
    DATABASE_URL: z.url(),
    // Scheduled background maintenance cron secret
    CRON_SECRET: z.string().default("bookanto-dev-cron-secret"),
    // Semaphore SMS API credentials (PH gateway)
    SEMAPHORE_API_KEY: z.string().optional(),
    SEMAPHORE_SENDER_NAME: z.string().optional().default("BooKanto"),
    // Webhook secret for Supabase Send SMS Hook
    SUPABASE_SMS_HOOK_SECRET: z.string().optional(),
    // Resend Email API credentials
    RESEND_API_KEY: z.string().optional(),
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
  }),
  process.env,
);

export const env = { ...serverEnv, ...publicEnv };
