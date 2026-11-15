import type { NotificationChannel } from "@/lib/db/schema/enums";

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
    label: "Email Receipts & Notices",
    badge: "HTML Receipts",
    description: "Full receipts with breakdown, shop address and calendar details.",
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

export const NOTIFICATION_CHANNELS_LIST: NotificationChannel[] = [
  "sms",
  "email",
  "push",
  "whatsapp",
  "viber",
];
