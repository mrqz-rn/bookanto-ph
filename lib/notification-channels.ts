import { NOTIFICATION_CHANNELS, type NotificationChannel } from "@/lib/db/schema/enums";

// Which notification channels BooKanto actually uses. Browser-safe, so the
// settings screen and lib/notify.ts read the same switch.

/**
 * SMS is switched off: booking confirmations, reminders and notices go by
 * email (and web push when the person turns it on). The SMS provider, the
 * Supabase send-sms hook and phone sign-in stay in the code; flip this to
 * `true` (and PHONE_AUTH_ENABLED in features/auth/constants.ts for sign-in)
 * to bring SMS back.
 */
export const SMS_NOTIFICATIONS_ENABLED = false;

/**
 * WhatsApp and Viber are switched off: they're hidden from settings, can't be
 * turned on, and an old preference for either falls back to email. The
 * providers stay in lib/notify.ts; flip this to `true` to bring them back.
 */
export const MESSAGING_APP_NOTIFICATIONS_ENABLED = false;

/** Email can't be turned off: it's how confirmations, reminders and receipts always arrive. */
export const EMAIL_NOTIFICATIONS_REQUIRED = true;

/** Where a notification goes when the person hasn't chosen a channel. */
export const DEFAULT_NOTIFICATION_CHANNEL: NotificationChannel = SMS_NOTIFICATIONS_ENABLED
  ? "sms"
  : "email";

/** The channels people can pick from, in display order. */
export const AVAILABLE_NOTIFICATION_CHANNELS: readonly NotificationChannel[] =
  NOTIFICATION_CHANNELS.filter((channel) => {
    if (channel === "sms") return SMS_NOTIFICATIONS_ENABLED;
    if (channel === "whatsapp" || channel === "viber") return MESSAGING_APP_NOTIFICATIONS_ENABLED;
    return true;
  });

/** A stored channel that's no longer offered (an old "sms", "whatsapp" or "viber" preference) reads as the default. */
export function effectiveChannel(channel: NotificationChannel | null | undefined) {
  return channel && AVAILABLE_NOTIFICATION_CHANNELS.includes(channel)
    ? channel
    : DEFAULT_NOTIFICATION_CHANNEL;
}
