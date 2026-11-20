import type { NotificationChannel } from "@/lib/db/schema/enums";
import { AVAILABLE_NOTIFICATION_CHANNELS } from "@/lib/notification-channels";

export type ChannelInfo = {
  id: NotificationChannel;
  label: string;
  badge: string;
  description: string;
  icon: string;
};

export const CHANNELS: Record<NotificationChannel, ChannelInfo> = {
  sms: {
    id: "sms",
    label: "SMS Text Message",
    badge: "PH Gateway",
    description: "Receive instant texts on any mobile phone in the Philippines.",
    icon: "📱",
  },
  email: {
    id: "email",
    label: "Email",
    badge: "Recommended",
    description: "Booking confirmations, reminders and receipts with the shop address and time.",
    icon: "✉️",
  },
  push: {
    id: "push",
    label: "Web Push Alerts",
    badge: "Instant & Free",
    description: "Instant pop-up alerts on your device without opening the browser.",
    icon: "🔔",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    badge: "Meta Cloud",
    description: "Receive booking confirmations and reminders in WhatsApp.",
    icon: "💬",
  },
  viber: {
    id: "viber",
    label: "Viber",
    badge: "Viber Business",
    description: "Receive updates via Viber messaging channel.",
    icon: "🟣",
  },
};

/** The channels shown in settings, in display order. SMS appears only when it's switched on. */
export const NOTIFICATION_CHANNELS_LIST: NotificationChannel[] = (
  ["sms", "email", "push", "whatsapp", "viber"] as const
).filter((channel) => AVAILABLE_NOTIFICATION_CHANNELS.includes(channel));

/**
 * The "Send a test notification" card on the settings screen is hidden for now.
 * The card and sendTestNotificationAction stay in the code; flip this to bring it back.
 */
export const TEST_NOTIFICATION_ENABLED = false;
