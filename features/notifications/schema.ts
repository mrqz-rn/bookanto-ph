import { z } from "zod";

import { NOTIFICATION_CHANNELS } from "@/lib/db/schema/enums";

export const updateNotificationPreferencesSchema = z.strictObject({
  preferredChannel: z.enum(NOTIFICATION_CHANNELS),
  smsEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  viberEnabled: z.boolean(),
  bookingConfirmations: z.boolean(),
  bookingReminders: z.boolean(),
  bookingAutoExpiry: z.boolean(),
  marketingPromos: z.boolean(),
  whatsappPhone: z.string().max(20).optional().nullable(),
  viberPhone: z.string().max(20).optional().nullable(),
});

export const savePushSubscriptionSchema = z.strictObject({
  endpoint: z.string().url(),
  keys: z.strictObject({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(300).optional().nullable(),
});

export const deletePushSubscriptionSchema = z.strictObject({
  endpoint: z.string().url(),
});

export const sendTestNotificationSchema = z.strictObject({
  channel: z.enum(NOTIFICATION_CHANNELS),
});

export const markNotificationReadSchema = z.strictObject({
  notificationId: z.string().uuid(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
export type SavePushSubscriptionInput = z.infer<typeof savePushSubscriptionSchema>;
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;
export type SendTestNotificationInput = z.infer<typeof sendTestNotificationSchema>;
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
