import "server-only";

import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";

import { db } from "@/lib/db";
import {
  notificationPreferences,
  notifications,
  pushSubscriptions,
  users,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationTemplate,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatPeso } from "@/lib/money";
import {
  DEFAULT_NOTIFICATION_CHANNEL,
  effectiveChannel,
  SMS_NOTIFICATIONS_ENABLED,
} from "@/lib/notification-channels";
import { normalizePhone } from "@/lib/phone";
import { publicEnv } from "@/lib/public-env";
import { formatManila } from "@/lib/time";

// ============================================================================
// Types
// ============================================================================

export type NotificationPayload = {
  bookingId?: string;
  refCode?: string;
  serviceName?: string;
  shopName?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  /** When an unanswered request lapses (shown to the shop). */
  expiresAt?: string | Date;
  priceCentavos?: number;
  totalCentavos?: number;
  customerName?: string;
  address?: string;
  reason?: string;
  otp?: string;
  url?: string;
  [key: string]: unknown;
};

export type SendNotificationOptions = {
  userId: string;
  template: NotificationTemplate;
  payload: NotificationPayload;
  /** Force delivery through a specific channel regardless of preferences */
  preferredChannelOverride?: NotificationChannel;
  recipientPhone?: string;
  recipientEmail?: string;
};

export type NotificationResult = {
  success: boolean;
  channel: NotificationChannel;
  notificationId?: string;
  messageId?: string;
  error?: string;
};

// ============================================================================
// Providers
// ============================================================================

export interface SmsProvider {
  sendSms(params: { to: string; text: string }): Promise<{ success: boolean; messageId?: string }>;
}

export interface EmailProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}

export interface WhatsAppProvider {
  sendWhatsApp(params: {
    to: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}

export interface ViberProvider {
  sendViber(params: {
    to: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }>;
}

export interface PushProvider {
  sendPush(params: {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    payload: { title: string; body: string; url?: string; tag?: string };
  }): Promise<{ success: boolean; statusCode?: number }>;
}

// ----------------------------------------------------------------------------
// Semaphore SMS Provider (Philippine Gateway)
// ----------------------------------------------------------------------------

export class SemaphoreSmsProvider implements SmsProvider {
  async sendSms({
    to,
    text,
  }: {
    to: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const apiKey = env.SEMAPHORE_API_KEY;
    const normalizedPhone = normalizePhone(to);

    // If no API key is configured (dev/staging/test), simulate delivery
    if (!apiKey) {
      return {
        success: true,
        messageId: `sim_sms_${crypto.randomUUID().slice(0, 8)}`,
      };
    }

    try {
      const response = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          apikey: apiKey,
          number: normalizedPhone,
          message: text,
          sendername: env.SEMAPHORE_SENDER_NAME ?? "BooKanto",
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, messageId: errorText };
      }

      const data = (await response.json()) as Array<{ message_id?: string | number }>;
      const messageId = String(data[0]?.message_id ?? crypto.randomUUID());
      return { success: true, messageId };
    } catch (err) {
      return { success: false, messageId: err instanceof Error ? err.message : "SMS error" };
    }
  }
}

// ----------------------------------------------------------------------------
// Resend Email Provider
// ----------------------------------------------------------------------------

export class ResendEmailProvider implements EmailProvider {
  async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const apiKey = env.RESEND_API_KEY;

    if (!apiKey) {
      return {
        success: true,
        messageId: `sim_email_${crypto.randomUUID().slice(0, 8)}`,
      };
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: emailSender(),
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, messageId: errorText };
      }

      const data = (await response.json()) as { id?: string };
      return { success: true, messageId: data.id ?? crypto.randomUUID() };
    } catch (err) {
      return { success: false, messageId: err instanceof Error ? err.message : "Email error" };
    }
  }
}

// ----------------------------------------------------------------------------
// SMTP Email Provider
// ----------------------------------------------------------------------------

const DEFAULT_EMAIL_FROM = "BooKanto <notifications@bookanto.ph>";

/** The From line: EMAIL_FROM, or the older RESEND_FROM_EMAIL. */
export function emailSender(): string {
  return env.EMAIL_FROM || env.RESEND_FROM_EMAIL || DEFAULT_EMAIL_FROM;
}

/** Nodemailer's transport options for the SMTP_* settings. */
export function smtpTransportOptions() {
  const port = env.SMTP_PORT;
  return {
    host: env.SMTP_HOST,
    port,
    // Port 465 speaks TLS from the first byte; 587 and 25 upgrade with STARTTLS.
    secure: env.SMTP_SECURE ?? port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    // A slow mail server must not hold up a booking or a cron run for minutes.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

export class SmtpEmailProvider implements EmailProvider {
  private transporter: Transporter | null = null;

  private transport(): Transporter {
    // One pooled connection per server instance, reused across emails.
    this.transporter ??= nodemailer.createTransport({
      ...smtpTransportOptions(),
      pool: true,
      maxConnections: 2,
    });
    return this.transporter;
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    if (!env.SMTP_HOST) {
      return { success: false, messageId: "SMTP_HOST is not set" };
    }
    try {
      const info = await this.transport().sendMail({
        from: emailSender(),
        to,
        subject,
        html,
        text,
      });
      if ((info.rejected?.length ?? 0) > 0) {
        return { success: false, messageId: `Rejected by the mail server: ${to}` };
      }
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, messageId: err instanceof Error ? err.message : "SMTP error" };
    }
  }
}

/** Sends nothing; for tests and working offline. */
export class LogEmailProvider implements EmailProvider {
  async sendEmail(): Promise<{ success: boolean; messageId?: string }> {
    return { success: true, messageId: `sim_email_${crypto.randomUUID().slice(0, 8)}` };
  }
}

export type EmailProviderName = "smtp" | "resend" | "log";

/** Which service sends email: EMAIL_PROVIDER, else whichever one is configured. */
export function configuredEmailProvider(): EmailProviderName {
  if (env.EMAIL_PROVIDER) return env.EMAIL_PROVIDER;
  if (env.SMTP_HOST) return "smtp";
  if (env.RESEND_API_KEY) return "resend";
  return "log";
}

const emailProviders: Record<EmailProviderName, EmailProvider> = {
  smtp: new SmtpEmailProvider(),
  resend: new ResendEmailProvider(),
  log: new LogEmailProvider(),
};

/**
 * Sends one account email now (password reset and the like) through the
 * configured service. Skips notification preferences: these aren't optional.
 */
export function sendAccountEmail(
  params: Parameters<EmailProvider["sendEmail"]>[0],
): ReturnType<EmailProvider["sendEmail"]> {
  return emailProviders[configuredEmailProvider()].sendEmail(params);
}

/** Hands each email to the configured service, chosen at send time. */
class ConfiguredEmailProvider implements EmailProvider {
  sendEmail(params: Parameters<EmailProvider["sendEmail"]>[0]) {
    return emailProviders[configuredEmailProvider()].sendEmail(params);
  }
}

// ----------------------------------------------------------------------------
// WhatsApp Cloud API Provider
// ----------------------------------------------------------------------------

export class CloudWhatsAppProvider implements WhatsAppProvider {
  async sendWhatsApp({
    to,
    text,
  }: {
    to: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const token = env.WHATSAPP_API_TOKEN;
    const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        success: true,
        messageId: `sim_wa_${crypto.randomUUID().slice(0, 8)}`,
      };
    }

    // Clean number: E.164 without '+'
    const cleanNumber = normalizePhone(to).replace(/^\+/, "");

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanNumber,
          type: "text",
          text: { preview_url: false, body: text },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, messageId: errorText };
      }

      const data = (await response.json()) as { messages?: Array<{ id: string }> };
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (err) {
      return { success: false, messageId: err instanceof Error ? err.message : "WhatsApp error" };
    }
  }
}

// ----------------------------------------------------------------------------
// Viber Bot Provider
// ----------------------------------------------------------------------------

export class ViberBotProvider implements ViberProvider {
  async sendViber({
    to,
    text,
  }: {
    to: string;
    text: string;
  }): Promise<{ success: boolean; messageId?: string }> {
    const token = env.VIBER_AUTH_TOKEN;

    if (!token) {
      return {
        success: true,
        messageId: `sim_viber_${crypto.randomUUID().slice(0, 8)}`,
      };
    }

    try {
      const response = await fetch("https://chatapi.viber.com/pa/send_message", {
        method: "POST",
        headers: {
          "X-Viber-Auth-Token": token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiver: to,
          min_api_version: 1,
          type: "text",
          text,
          sender: {
            name: env.VIBER_SENDER_NAME ?? "BooKanto",
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, messageId: errorText };
      }

      const data = (await response.json()) as { message_token?: number | string };
      return { success: true, messageId: String(data.message_token ?? crypto.randomUUID()) };
    } catch (err) {
      return { success: false, messageId: err instanceof Error ? err.message : "Viber error" };
    }
  }
}

// ----------------------------------------------------------------------------
// Web Push Provider (RFC 8291 / RFC 8292 standard Web Push)
// ----------------------------------------------------------------------------

export class WebPushProvider implements PushProvider {
  async sendPush({
    subscription,
    payload,
  }: {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
    payload: { title: string; body: string; url?: string; tag?: string };
  }): Promise<{ success: boolean; statusCode?: number }> {
    const publicKey = vapidPublicKey();
    const privateKey = env.VAPID_PRIVATE_KEY;

    // In dev / test when VAPID keys are absent, simulate delivery
    if (!publicKey || !privateKey) {
      return { success: true, statusCode: 201 };
    }

    try {
      // Create VAPID JWT
      const endpointUrl = new URL(subscription.endpoint);
      const audience = endpointUrl.origin;
      const vapidToken = createVapidToken({
        audience,
        subject: env.VAPID_SUBJECT ?? "mailto:admin@bookanto.ph",
        privateKey: vapidSigningKey(privateKey, publicKey),
      });

      const encryptedPayload = encryptWebPushPayload({
        payload: JSON.stringify(payload),
        clientPublicKey: subscription.keys.p256dh,
        clientAuthSecret: subscription.keys.auth,
      });

      const response = await fetch(subscription.endpoint, {
        method: "POST",
        headers: {
          TTL: "86400",
          Urgency: "high",
          "Content-Type": "application/octet-stream",
          "Content-Encoding": "aes128gcm",
          Authorization: `vapid t=${vapidToken}, k=${publicKey}`,
        },
        body: new Uint8Array(encryptedPayload),
      });

      if (response.status === 404 || response.status === 410) {
        // Subscription has expired or been revoked; delete from database
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        return { success: false, statusCode: response.status };
      }

      return { success: response.ok, statusCode: response.status };
    } catch {
      return { success: false, statusCode: 500 };
    }
  }
}

/**
 * The VAPID public key (base64url, uncompressed P-256 point) browsers subscribe
 * with, or null when web push isn't set up. VAPID_PUBLIC_KEY wins over the
 * older NEXT_PUBLIC_ copy, so one variable is enough.
 */
export function vapidPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY || publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

/**
 * The private key as a KeyObject. Accepts the raw 32-byte base64url key that
 * `web-push generate-vapid-keys` prints, a PEM, or a base64 PKCS8 body.
 */
function vapidSigningKey(privateKey: string, publicKey: string): crypto.KeyObject {
  const trimmed = privateKey.trim();
  if (trimmed.includes("-----BEGIN")) return crypto.createPrivateKey(trimmed);

  const raw = Buffer.from(trimmed, "base64url");
  if (raw.length === 32) {
    const point = Buffer.from(publicKey, "base64url");
    if (point.length !== 65 || point[0] !== 0x04) {
      throw new Error("VAPID_PUBLIC_KEY must be an uncompressed P-256 public key.");
    }
    return crypto.createPrivateKey({
      format: "jwk",
      key: {
        kty: "EC",
        crv: "P-256",
        d: raw.toString("base64url"),
        x: point.subarray(1, 33).toString("base64url"),
        y: point.subarray(33).toString("base64url"),
      },
    });
  }
  return crypto.createPrivateKey({
    key: Buffer.from(trimmed, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

// Helper: VAPID token generation using ES256
function createVapidToken({
  audience,
  subject,
  privateKey,
}: {
  audience: string;
  subject: string;
  privateKey: crypto.KeyObject;
}): string {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 3600, // 12 hours
    sub: subject,
  };

  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Claims = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const data = `${b64Header}.${b64Claims}`;

  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();
  const signature = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" }, "base64url");

  return `${data}.${signature}`;
}

// Helper: RFC 8291 Web Push payload encryption
function encryptWebPushPayload({
  payload,
  clientPublicKey,
  clientAuthSecret,
}: {
  payload: string;
  clientPublicKey: string;
  clientAuthSecret: string;
}): Buffer {
  const userPublicKey = Buffer.from(clientPublicKey, "base64url");
  const userAuth = Buffer.from(clientAuthSecret, "base64url");

  // Generate ephemeral ECDH key on P-256
  const localEcdh = crypto.createECDH("prime256v1");
  localEcdh.generateKeys();
  const localPublicKey = localEcdh.getPublicKey();

  const sharedSecret = localEcdh.computeSecret(userPublicKey);
  const salt = crypto.randomBytes(16);

  // Derive PRK and Encryption Keys with HKDF
  // auth_info = "WebPush: info" || 0x00 || userPublicKey || localPublicKey
  const authInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "utf8"),
    userPublicKey,
    localPublicKey,
  ]);
  const ikm = Buffer.from(crypto.hkdfSync("sha256", sharedSecret, userAuth, authInfo, 32));

  // Derive CEK and Nonce
  const cek = Buffer.from(
    crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0", "utf8"), 16),
  );
  const nonce = Buffer.from(
    crypto.hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0", "utf8"), 12),
  );

  // Plaintext + record padding (delimiter 0x02)
  const plaintext = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([0x02])]);

  const cipher = crypto.createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Header = salt (16) || record_size (4: 4096 = 0x00001000) || idlen (1: 65 = 0x41) || localPublicKey (65)
  const header = Buffer.concat([
    salt,
    Buffer.from([0x00, 0x00, 0x10, 0x00]),
    Buffer.from([localPublicKey.length]),
    localPublicKey,
  ]);

  return Buffer.concat([header, ciphertext, tag]);
}

// Default provider instances
export const smsProvider: SmsProvider = new SemaphoreSmsProvider();
export const emailProvider: EmailProvider = new ConfiguredEmailProvider();
export const whatsAppProvider: WhatsAppProvider = new CloudWhatsAppProvider();
export const viberProvider: ViberProvider = new ViberBotProvider();
export const pushProvider: PushProvider = new WebPushProvider();

// ============================================================================
// Template Content Generator
// ============================================================================

export type RenderedContent = {
  smsText: string;
  emailSubject: string;
  emailHtml: string;
  emailText: string;
  push: { title: string; body: string; url: string; tag: string };
  whatsAppText: string;
  viberText: string;
};

export function renderNotificationTemplate(
  template: NotificationTemplate,
  payload: NotificationPayload,
): RenderedContent {
  const siteUrl = publicEnv.NEXT_PUBLIC_SITE_URL;
  const shopName = payload.shopName ?? "BooKanto Partner Shop";
  const serviceName = payload.serviceName ?? "Service";
  const refCode = payload.refCode ?? "BK-000000";
  const bookingUrl = payload.bookingId
    ? `${siteUrl}/account/bookings/${payload.bookingId}`
    : `${siteUrl}/account`;

  const formattedTime = payload.startAt ? formatManila(payload.startAt) : "your scheduled time";
  const priceDisplay =
    payload.totalCentavos !== undefined
      ? formatPeso(payload.totalCentavos)
      : payload.priceCentavos !== undefined
        ? formatPeso(payload.priceCentavos)
        : "";

  switch (template) {
    case "booking_confirmed": {
      const smsText = `BooKanto: Booking CONFIRMED at ${shopName} for ${serviceName} on ${formattedTime}. Ref: ${refCode}.${priceDisplay ? ` Total: ${priceDisplay}.` : ""} Details: ${bookingUrl}`;
      const emailSubject = `Booking Confirmed: ${serviceName} at ${shopName} (Ref: ${refCode})`;
      const emailHtml = generateReceiptEmailHtml({
        shopName,
        serviceName,
        refCode,
        formattedTime,
        priceDisplay,
        address: payload.address,
        bookingUrl,
      });
      const emailText = `BooKanto Booking Receipt\nRef: ${refCode}\nStatus: Confirmed\n\nShop: ${shopName}\nService: ${serviceName}\nDate & Time: ${formattedTime}\nTotal: ${priceDisplay || "Free"}\n${payload.address ? `Address: ${payload.address}\n` : ""}\nManage your booking: ${bookingUrl}\n\nThank you for booking with BooKanto!`;
      const push = {
        title: "Booking Confirmed! 🎉",
        body: `Your booking for ${serviceName} at ${shopName} on ${formattedTime} is confirmed.`,
        url: bookingUrl,
        tag: `booking-${refCode}`,
      };
      const whatsAppText = `🎉 *BooKanto Booking Confirmed!*\n\n*Shop:* ${shopName}\n*Service:* ${serviceName}\n*Time:* ${formattedTime}\n*Ref Code:* \`${refCode}\`\n${priceDisplay ? `*Total:* ${priceDisplay}\n` : ""}\nView details: ${bookingUrl}`;
      const viberText = `🎉 BooKanto Booking Confirmed!\nShop: ${shopName}\nService: ${serviceName}\nTime: ${formattedTime}\nRef: ${refCode}\n${priceDisplay ? `Total: ${priceDisplay}\n` : ""}Manage: ${bookingUrl}`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "booking_requested": {
      const smsText = `BooKanto: We received your booking request for ${serviceName} at ${shopName} on ${formattedTime}. Ref: ${refCode}. We'll notify you once confirmed!`;
      const emailSubject = `Booking Request Received: ${serviceName} at ${shopName}`;
      const emailHtml = generateSimpleEmailHtml({
        title: "Booking Request Received",
        message: `Your booking request for <strong>${serviceName}</strong> at <strong>${shopName}</strong> on <strong>${formattedTime}</strong> has been sent. The shop has up to 2 hours to confirm before it expires.`,
        refCode,
        ctaText: "View Request Status",
        ctaUrl: bookingUrl,
      });
      const emailText = `BooKanto: Booking Request Received\nShop: ${shopName}\nService: ${serviceName}\nTime: ${formattedTime}\nRef: ${refCode}\n\nCheck status: ${bookingUrl}`;
      const push = {
        title: "Booking Request Sent",
        body: `Your request for ${serviceName} at ${shopName} is awaiting shop approval.`,
        url: bookingUrl,
        tag: `booking-${refCode}`,
      };
      const whatsAppText = `⏳ *BooKanto Booking Requested*\n\nYour request for *${serviceName}* at *${shopName}* on ${formattedTime} is pending. Ref: \`${refCode}\`\n\nTrack: ${bookingUrl}`;
      const viberText = `⏳ BooKanto Booking Requested: ${serviceName} at ${shopName} on ${formattedTime}. Ref: ${refCode}. Track: ${bookingUrl}`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "booking_request_received": {
      // To the shop owner: a customer is waiting for an answer.
      const customerName = payload.customerName ?? "A customer";
      const inboxUrl = `${siteUrl}/dashboard/inbox`;
      const answerBy = payload.expiresAt ? formatManila(payload.expiresAt) : null;
      const answerLine = answerBy
        ? `Accept or decline by ${answerBy}, or the request expires.`
        : "Accept or decline soon, or the request expires.";
      const smsText = `BooKanto: New booking request from ${customerName} for ${serviceName} on ${formattedTime}. Ref: ${refCode}. ${answerLine} ${inboxUrl}`;
      const emailSubject = `New booking request: ${serviceName}, ${formattedTime}`;
      const emailHtml = generateSimpleEmailHtml({
        title: "New Booking Request",
        message: `<strong>${escapeHtml(customerName)}</strong> asked to book <strong>${escapeHtml(serviceName)}</strong> at <strong>${escapeHtml(shopName)}</strong> on <strong>${escapeHtml(formattedTime)}</strong>. ${escapeHtml(answerLine)}`,
        refCode,
        ctaText: "Open Booking Inbox",
        ctaUrl: inboxUrl,
      });
      const emailText = `BooKanto: New Booking Request\nCustomer: ${customerName}\nService: ${serviceName}\nTime: ${formattedTime}\nRef: ${refCode}\n\n${answerLine}\nOpen your inbox: ${inboxUrl}`;
      const push = {
        title: "New Booking Request",
        body: `${customerName} wants ${serviceName} on ${formattedTime}.`,
        url: "/dashboard/inbox",
        tag: `booking-${refCode}`,
      };
      const whatsAppText = `📥 *New BooKanto Booking Request*\n\n${customerName} wants *${serviceName}* on ${formattedTime}. Ref: \`${refCode}\`\n\n${answerLine}\n${inboxUrl}`;
      const viberText = `📥 New BooKanto request: ${customerName}, ${serviceName} on ${formattedTime}. Ref: ${refCode}. ${inboxUrl}`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "booking_reminder": {
      const smsText = `BooKanto Reminder: You have an upcoming booking at ${shopName} for ${serviceName} on ${formattedTime}. Ref: ${refCode}. Need changes? ${bookingUrl}`;
      const emailSubject = `Reminder: Upcoming Booking at ${shopName} (${formattedTime})`;
      const emailHtml = generateSimpleEmailHtml({
        title: "Appointment Reminder",
        message: `This is a friendly reminder for your upcoming <strong>${serviceName}</strong> at <strong>${shopName}</strong> scheduled for <strong>${formattedTime}</strong>.`,
        refCode,
        ctaText: "View Booking Details",
        ctaUrl: bookingUrl,
      });
      const emailText = `BooKanto Appointment Reminder\n\nYou have an upcoming booking for ${serviceName} at ${shopName} on ${formattedTime}.\nRef: ${refCode}\n\nManage: ${bookingUrl}`;
      const push = {
        title: "Upcoming Appointment Reminder ⏰",
        body: `${serviceName} at ${shopName} starts on ${formattedTime}.`,
        url: bookingUrl,
        tag: `reminder-${refCode}`,
      };
      const whatsAppText = `⏰ *BooKanto Reminder*\n\nYou have an appointment for *${serviceName}* at *${shopName}* on *${formattedTime}*.\nRef: \`${refCode}\`\n\nDetails: ${bookingUrl}`;
      const viberText = `⏰ BooKanto Reminder: ${serviceName} at ${shopName} on ${formattedTime}. Ref: ${refCode}. Details: ${bookingUrl}`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "booking_auto_expired": {
      const smsText = `BooKanto: Your booking request ${refCode} at ${shopName} expired without shop response. No payment was charged. You can rebook here: ${siteUrl}/explore`;
      const emailSubject = `Booking Request Expired: ${refCode} at ${shopName}`;
      const emailHtml = generateSimpleEmailHtml({
        title: "Booking Request Expired",
        message: `Your booking request <strong>${refCode}</strong> for <strong>${serviceName}</strong> at <strong>${shopName}</strong> was not confirmed within the response window and has expired automatically. No charges were made.`,
        refCode,
        ctaText: "Find Other Available Shops",
        ctaUrl: `${siteUrl}/explore`,
      });
      const emailText = `BooKanto: Booking Request Expired\n\nYour request ${refCode} at ${shopName} for ${serviceName} expired because the shop did not respond in time. No charge was made.\n\nBrowse other shops: ${siteUrl}/explore`;
      const push = {
        title: "Booking Request Expired",
        body: `Request ${refCode} at ${shopName} expired without response. Tap to find other shops.`,
        url: `${siteUrl}/explore`,
        tag: `expired-${refCode}`,
      };
      const whatsAppText = `⚠️ *BooKanto Booking Expired*\n\nYour request \`${refCode}\` at *${shopName}* was not confirmed before the response window and has expired. No charges were made.\n\nFind available services: ${siteUrl}/explore`;
      const viberText = `⚠️ BooKanto: Booking ${refCode} at ${shopName} expired without response. Find available services: ${siteUrl}/explore`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "booking_cancelled": {
      const reasonText = payload.reason ? ` Reason: ${payload.reason}` : "";
      const smsText = `BooKanto: Booking ${refCode} at ${shopName} has been cancelled.${reasonText} View details: ${bookingUrl}`;
      const emailSubject = `Booking Cancelled: ${refCode} at ${shopName}`;
      const emailHtml = generateSimpleEmailHtml({
        title: "Booking Cancelled",
        message: `The booking <strong>${refCode}</strong> for <strong>${serviceName}</strong> at <strong>${shopName}</strong> has been cancelled.${payload.reason ? `<br><br><strong>Reason:</strong> ${payload.reason}` : ""}`,
        refCode,
        ctaText: "View Bookings",
        ctaUrl: bookingUrl,
      });
      const emailText = `BooKanto: Booking Cancelled\nRef: ${refCode}\nShop: ${shopName}\n${reasonText}\n\nDetails: ${bookingUrl}`;
      const push = {
        title: "Booking Cancelled",
        body: `Booking ${refCode} at ${shopName} has been cancelled.`,
        url: bookingUrl,
        tag: `cancelled-${refCode}`,
      };
      const whatsAppText = `❌ *BooKanto Booking Cancelled*\n\nBooking \`${refCode}\` at *${shopName}* has been cancelled.${reasonText}\n\nDetails: ${bookingUrl}`;
      const viberText = `❌ BooKanto: Booking ${refCode} at ${shopName} has been cancelled.${reasonText} Details: ${bookingUrl}`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "booking_completed": {
      const smsText = `BooKanto: Thank you for your visit to ${shopName}! Rate your ${serviceName} experience: ${bookingUrl}`;
      const emailSubject = `How was your service at ${shopName}? Leave a review!`;
      const emailHtml = generateSimpleEmailHtml({
        title: "Thank You for Your Visit!",
        message: `We hope you enjoyed your <strong>${serviceName}</strong> at <strong>${shopName}</strong>. Your feedback helps other customers and helps the shop improve!`,
        refCode,
        ctaText: "Leave a 5-Star Review",
        ctaUrl: bookingUrl,
      });
      const emailText = `BooKanto: Thank You!\n\nWe hope you enjoyed your visit to ${shopName}. Leave a review: ${bookingUrl}`;
      const push = {
        title: "How was your visit? ⭐",
        body: `Rate your ${serviceName} at ${shopName}.`,
        url: bookingUrl,
        tag: `completed-${refCode}`,
      };
      const whatsAppText = `⭐ *BooKanto: How was your visit?*\n\nThank you for visiting *${shopName}*! Please take a moment to leave a review: ${bookingUrl}`;
      const viberText = `⭐ BooKanto: Thank you for visiting ${shopName}! Leave a review: ${bookingUrl}`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "otp": {
      const code = payload.otp ?? "000000";
      const smsText = `Your BooKanto verification code is: ${code}. It expires in 5 minutes. Do not share this code with anyone.`;
      const emailSubject = `Your BooKanto Verification Code: ${code}`;
      const emailHtml = generateSimpleEmailHtml({
        title: "One-Time Verification Code",
        message: `Your one-time verification code is:<br><br><span style="font-size: 28px; font-weight: 700; letter-spacing: 4px; color: #166534; background: #dcfce7; padding: 8px 16px; border-radius: 8px; display: inline-block;">${code}</span><br><br>This code expires in 5 minutes. Never share this code with anyone.`,
        refCode: "AUTH-OTP",
        ctaText: "Open BooKanto",
        ctaUrl: siteUrl,
      });
      const emailText = `Your BooKanto verification code is: ${code}\n\nIt expires in 5 minutes. Never share this code with anyone.`;
      const push = {
        title: "Verification Code",
        body: `Your verification code is ${code}. Expires in 5 minutes.`,
        url: "/verify",
        tag: "otp",
      };
      const whatsAppText = `🔐 *BooKanto Verification Code*\n\nYour code is: *${code}*\n\nExpires in 5 minutes. Do not share this with anyone.`;
      const viberText = `🔐 BooKanto Verification Code: ${code}. Expires in 5 minutes. Do not share with anyone.`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }

    case "test_alert":
    default: {
      const smsText = `BooKanto: This is a test notification verifying your delivery settings. Everything is working perfectly!`;
      const emailSubject = `BooKanto Notification Test`;
      const emailHtml = generateSimpleEmailHtml({
        title: "Notification Test",
        message:
          "This is a test notification confirming that your BooKanto email delivery is connected and active.",
        refCode: "TEST-ALERT",
        ctaText: "Back to Account",
        ctaUrl: `${siteUrl}/account/notifications`,
      });
      const emailText = `BooKanto: Test notification successful!\n\nManage settings: ${siteUrl}/account/notifications`;
      const push = {
        title: "BooKanto Notification Test ✅",
        body: "Web push notifications are configured and working properly!",
        url: "/account/notifications",
        tag: "test-alert",
      };
      const whatsAppText = `✅ *BooKanto Notification Test*\n\nYour WhatsApp notifications are working properly!`;
      const viberText = `✅ BooKanto Notification Test: Your Viber notifications are working properly!`;

      return { smsText, emailSubject, emailHtml, emailText, push, whatsAppText, viberText };
    }
  }
}

// ----------------------------------------------------------------------------
// Email Template Renderers (Responsive HTML)
// ----------------------------------------------------------------------------

function generateReceiptEmailHtml({
  shopName,
  serviceName,
  refCode,
  formattedTime,
  priceDisplay,
  address,
  bookingUrl,
}: {
  shopName: string;
  serviceName: string;
  refCode: string;
  formattedTime: string;
  priceDisplay: string;
  address?: string;
  bookingUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Receipt - ${refCode}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #166534; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">BooKanto</h1>
              <p style="margin: 6px 0 0; color: #bbf7d0; font-size: 14px; font-weight: 500;">Trusted Local Service Booking</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="display: inline-block; background-color: #dcfce7; color: #15803d; font-size: 13px; font-weight: 700; padding: 4px 14px; border-radius: 9999px; text-transform: uppercase;">Confirmed Booking</span>
                <h2 style="margin: 12px 0 4px; font-size: 20px; font-weight: 700; color: #0f172a;">Booking Receipt</h2>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Reference Code: <strong style="color: #0f172a; font-family: monospace;">${refCode}</strong></p>
              </div>

              <!-- Item Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; border-radius: 12px; margin-bottom: 24px; padding: 20px;">
                <tr>
                  <td style="padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Service</p>
                    <p style="margin: 4px 0 0; font-size: 16px; font-weight: 700; color: #0f172a;">${serviceName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Shop / Provider</p>
                    <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #0f172a;">${shopName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Date & Time (Asia/Manila)</p>
                    <p style="margin: 4px 0 0; font-size: 15px; font-weight: 600; color: #166534;">${formattedTime}</p>
                  </td>
                </tr>
                ${
                  address
                    ? `<tr>
                  <td style="padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Service Location</p>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #334155;">${address}</p>
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding-top: 14px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 15px; font-weight: 700; color: #0f172a;">Total Amount</td>
                        <td align="right" style="font-size: 20px; font-weight: 800; color: #166534;">${priceDisplay || "₱0.00"}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${bookingUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.2);">Manage Booking</a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center; line-height: 1.5;">
                Need to reschedule or cancel? You can manage your appointment anytime before the shop's cancellation cutoff.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                BooKanto Philippines · Built for neighborhood communities.<br>
                This receipt was sent automatically for booking ${refCode}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Text from people (names, notes) goes into email HTML escaped. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function generateSimpleEmailHtml({
  title,
  message,
  refCode,
  ctaText,
  ctaUrl,
}: {
  title: string;
  message: string;
  refCode?: string;
  ctaText: string;
  ctaUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background-color: #166534; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800;">BooKanto</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center;">${title}</h2>
              <div style="font-size: 15px; color: #334155; line-height: 1.6; text-align: center; margin-bottom: 28px;">
                ${message}
              </div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 13px 26px; border-radius: 8px;">${ctaText}</a>
                  </td>
                </tr>
              </table>
              ${refCode ? `<p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">Reference: ${refCode}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">BooKanto Philippines · Neighborhood Booking</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// Core Notification Dispatcher
// ============================================================================

/**
 * Loads or creates default notification preferences for a user.
 */
export async function getOrCreateNotificationPreferences(
  userId: string,
): Promise<NotificationPreference> {
  const [existing] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(notificationPreferences)
    .values({
      userId,
      preferredChannel: DEFAULT_NOTIFICATION_CHANNEL,
      smsEnabled: SMS_NOTIFICATIONS_ENABLED,
      emailEnabled: true,
      pushEnabled: true,
      whatsappEnabled: false,
      viberEnabled: false,
      bookingConfirmations: true,
      bookingReminders: true,
      bookingAutoExpiry: true,
      marketingPromos: false,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [refetched] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);

  return refetched!;
}

/**
 * Dispatches a notification across the user's preferred or enabled channel(s).
 * Enforces preference toggles (confirmations, reminders, auto-expiry).
 * Records notification attempts in `notifications` table.
 */
export async function sendNotification(
  options: SendNotificationOptions,
): Promise<NotificationResult> {
  const { userId, template, payload, preferredChannelOverride } = options;

  // 1. Fetch user data (phone, email) and preferences
  const [user] = await db
    .select({ id: users.id, phone: users.phone, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return { success: false, channel: DEFAULT_NOTIFICATION_CHANNEL, error: "User not found" };
  }

  const prefs = await getOrCreateNotificationPreferences(userId);

  // 2. Check event type toggles in preferences
  if (template === "booking_confirmed" && !prefs.bookingConfirmations) {
    return { success: false, channel: prefs.preferredChannel, error: "Confirmations disabled" };
  }
  if (template === "booking_reminder" && !prefs.bookingReminders) {
    return { success: false, channel: prefs.preferredChannel, error: "Reminders disabled" };
  }
  if (template === "booking_auto_expired" && !prefs.bookingAutoExpiry) {
    return { success: false, channel: prefs.preferredChannel, error: "Auto-expiry disabled" };
  }

  // 3. Resolve target channel. A channel that's switched off (SMS, see
  // lib/notification-channels.ts) resolves to the default, email.
  let targetChannel: NotificationChannel = effectiveChannel(
    preferredChannelOverride ?? prefs.preferredChannel,
  );

  const recipientPhone = options.recipientPhone ?? user.phone ?? "";
  const recipientEmail = options.recipientEmail ?? user.email ?? "";
  const waPhone = prefs.whatsappPhone ?? recipientPhone;
  const viberPhone = prefs.viberPhone ?? recipientPhone;
  const smsReady = SMS_NOTIFICATIONS_ENABLED && prefs.smsEnabled && Boolean(recipientPhone);
  const emailReady = prefs.emailEnabled && Boolean(recipientEmail);

  // Ensure channel is enabled and has necessary contact info, otherwise fall back
  if (targetChannel === "sms" && !smsReady) {
    targetChannel = emailReady ? "email" : "push";
  } else if (targetChannel === "email" && !emailReady) {
    targetChannel = smsReady ? "sms" : "push";
  } else if (targetChannel === "whatsapp" && (!prefs.whatsappEnabled || !waPhone)) {
    targetChannel = smsReady ? "sms" : "email";
  } else if (targetChannel === "viber" && (!prefs.viberEnabled || !viberPhone)) {
    targetChannel = smsReady ? "sms" : "email";
  }

  // 4. Render content
  const content = renderNotificationTemplate(template, payload);

  let sendSuccess = false;
  let messageId: string | undefined;

  // 5. Dispatch through selected channel
  switch (targetChannel) {
    case "sms": {
      if (recipientPhone) {
        const res = await smsProvider.sendSms({ to: recipientPhone, text: content.smsText });
        sendSuccess = res.success;
        messageId = res.messageId;
      }
      break;
    }

    case "email": {
      if (recipientEmail) {
        const res = await emailProvider.sendEmail({
          to: recipientEmail,
          subject: content.emailSubject,
          html: content.emailHtml,
          text: content.emailText,
        });
        sendSuccess = res.success;
        messageId = res.messageId;
      }
      break;
    }

    case "whatsapp": {
      if (waPhone) {
        const res = await whatsAppProvider.sendWhatsApp({
          to: waPhone,
          text: content.whatsAppText,
        });
        sendSuccess = res.success;
        messageId = res.messageId;
      }
      break;
    }

    case "viber": {
      if (viberPhone) {
        const res = await viberProvider.sendViber({
          to: viberPhone,
          text: content.viberText,
        });
        sendSuccess = res.success;
        messageId = res.messageId;
      }
      break;
    }

    case "push": {
      // Find user push subscriptions
      const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      if (subs.length > 0) {
        const results = await Promise.all(
          subs.map((s) =>
            pushProvider.sendPush({
              subscription: { endpoint: s.endpoint, keys: s.keys },
              payload: content.push,
            }),
          ),
        );
        sendSuccess = results.some((r) => r.success);
        messageId = `push_${subs.length}_devices`;
      } else {
        // No device subscribed to push: fall back to SMS (when on), then email.
        if (smsReady) {
          targetChannel = "sms";
          const res = await smsProvider.sendSms({ to: recipientPhone, text: content.smsText });
          sendSuccess = res.success;
          messageId = res.messageId;
        } else if (emailReady) {
          targetChannel = "email";
          const res = await emailProvider.sendEmail({
            to: recipientEmail,
            subject: content.emailSubject,
            html: content.emailHtml,
            text: content.emailText,
          });
          sendSuccess = res.success;
          messageId = res.messageId;
        }
      }
      break;
    }
  }

  // 6. Record in notifications table
  // Sanitize payload to never include OTP or sensitive raw tokens
  const safePayload: Record<string, unknown> = { ...payload };
  if (safePayload.otp) {
    delete safePayload.otp;
  }

  const [record] = await db
    .insert(notifications)
    .values({
      userId,
      channel: targetChannel,
      template,
      payload: safePayload,
      status: sendSuccess ? "sent" : "failed",
      sentAt: sendSuccess ? new Date() : null,
    })
    .returning();

  return {
    success: sendSuccess,
    channel: targetChannel,
    notificationId: record?.id,
    messageId,
  };
}

// ----------------------------------------------------------------------------
// Convenience Handlers
// ----------------------------------------------------------------------------

/**
 * Sends SMS for OTP verification code.
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const content = renderNotificationTemplate("otp", { otp: code });
  const result = await smsProvider.sendSms({ to: phone, text: content.smsText });
  return result.success;
}
