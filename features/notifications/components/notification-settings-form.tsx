"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { NotificationChannel, NotificationPreference } from "@/lib/db/schema";
import { publicEnv } from "@/lib/public-env";

import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
  sendTestNotificationAction,
  updateNotificationPreferencesAction,
} from "../actions";
import { CHANNELS, NOTIFICATION_CHANNELS_LIST } from "../constants";

type NotificationSettingsFormProps = {
  initialPreferences: NotificationPreference;
  userPhone?: string | null;
  userEmail?: string | null;
  hasActivePushSubscription?: boolean;
};

export function NotificationSettingsForm({
  initialPreferences,
  userPhone,
  userEmail,
  hasActivePushSubscription = false,
}: NotificationSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [preferredChannel, setPreferredChannel] = useState<NotificationChannel>(
    initialPreferences.preferredChannel,
  );
  const [smsEnabled, setSmsEnabled] = useState(initialPreferences.smsEnabled);
  const [emailEnabled, setEmailEnabled] = useState(initialPreferences.emailEnabled);
  const [pushEnabled, setPushEnabled] = useState(initialPreferences.pushEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(initialPreferences.whatsappEnabled);
  const [viberEnabled, setViberEnabled] = useState(initialPreferences.viberEnabled);

  const [bookingConfirmations, setBookingConfirmations] = useState(
    initialPreferences.bookingConfirmations,
  );
  const [bookingReminders, setBookingReminders] = useState(initialPreferences.bookingReminders);
  const [bookingAutoExpiry, setBookingAutoExpiry] = useState(initialPreferences.bookingAutoExpiry);
  const [marketingPromos, setMarketingPromos] = useState(initialPreferences.marketingPromos);

  const [whatsappPhone, setWhatsappPhone] = useState(
    initialPreferences.whatsappPhone ?? userPhone ?? "",
  );
  const [viberPhone, setViberPhone] = useState(initialPreferences.viberPhone ?? userPhone ?? "");

  const [isPushSubscribed, setIsPushSubscribed] = useState(hasActivePushSubscription);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState<string | null>(null);

  const [testChannel, setTestChannel] = useState<NotificationChannel>(preferredChannel);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Handle Save Preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    startTransition(async () => {
      const res = await updateNotificationPreferencesAction({
        preferredChannel,
        smsEnabled,
        emailEnabled,
        pushEnabled,
        whatsappEnabled,
        viberEnabled,
        bookingConfirmations,
        bookingReminders,
        bookingAutoExpiry,
        marketingPromos,
        whatsappPhone: whatsappPhone ? whatsappPhone : null,
        viberPhone: viberPhone ? viberPhone : null,
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: "Notification preferences saved successfully!",
        });
        router.refresh();
      } else {
        setStatusMessage({
          type: "error",
          text: res.message || "Failed to update notification preferences.",
        });
      }
    });
  };

  // Handle Web Push Registration
  const handleTogglePushSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushMessage("Web push is not supported in this browser.");
      return;
    }

    setPushLoading(true);
    setPushMessage(null);

    try {
      if (isPushSubscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await deletePushSubscriptionAction({ endpoint: subscription.endpoint });
        }
        setIsPushSubscribed(false);
        setPushMessage("Web push notifications disabled for this device.");
      } else {
        // Request permission and subscribe
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setPushMessage("Notification permission was denied in your browser settings.");
          setPushLoading(false);
          return;
        }

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const vapidPublicKey = publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const subOptions: PushSubscriptionOptionsInit = {
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey
            ? (urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer)
            : undefined,
        };

        const subscription = await registration.pushManager.subscribe(subOptions);
        const subJson = subscription.toJSON();

        if (subJson.endpoint && subJson.keys?.p256dh && subJson.keys?.auth) {
          const res = await savePushSubscriptionAction({
            endpoint: subJson.endpoint,
            keys: {
              p256dh: subJson.keys.p256dh,
              auth: subJson.keys.auth,
            },
            userAgent: navigator.userAgent,
          });

          if (res.ok) {
            setIsPushSubscribed(true);
            setPushEnabled(true);
            setPushMessage("Web push notifications enabled for this device!");
          } else {
            setPushMessage("Failed to register push subscription on server.");
          }
        }
      }
    } catch (err) {
      setPushMessage(err instanceof Error ? err.message : "Error configuring push notifications.");
    } finally {
      setPushLoading(false);
    }
  };

  // Handle Test Notification
  const handleSendTestNotification = () => {
    setTestResult(null);
    startTransition(async () => {
      const res = await sendTestNotificationAction({
        channel: testChannel,
      });

      if (res.ok && res.data.success) {
        setTestResult({
          success: true,
          message: `Test alert sent successfully via ${CHANNELS[testChannel].label}!`,
        });
        router.refresh();
      } else {
        setTestResult({
          success: false,
          message: res.ok
            ? `Failed sending test to ${testChannel}. Check your channel credentials.`
            : res.message,
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div
          role="alert"
          className={`rounded-lg p-4 text-sm font-medium ${
            statusMessage.type === "success"
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleSavePreferences} className="space-y-8">
        {/* Preferred Channel Card */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-900">Primary Delivery Channel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select your preferred method for receiving booking confirmations, receipts, and
            appointment alerts.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {NOTIFICATION_CHANNELS_LIST.map((channelKey) => {
              const ch = CHANNELS[channelKey];
              const isSelected = preferredChannel === channelKey;

              return (
                <button
                  type="button"
                  key={channelKey}
                  onClick={() => setPreferredChannel(channelKey)}
                  className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                    isSelected
                      ? "border-green-600 bg-green-50/60 ring-2 ring-green-600 ring-offset-1"
                      : "border-border bg-background hover:border-slate-300"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-2xl">{ch.icon}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {ch.badge}
                    </span>
                  </div>
                  <span className="mt-3 font-semibold text-navy-900">{ch.label}</span>
                  <span className="mt-1 text-xs text-slate-500">{ch.description}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Channel Activation & Configuration Card */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-900">Channel Settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enable or configure the channels through which BooKanto can reach you.
          </p>

          <div className="mt-6 space-y-6 divide-y divide-border">
            {/* SMS */}
            <div className="flex flex-col justify-between gap-3 pt-4 first:pt-0 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📱</span>
                  <span className="font-semibold text-navy-900">SMS Notifications</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {userPhone
                    ? `Registered mobile number: ${userPhone}`
                    : "Add your phone number in your Profile to enable SMS."}
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={smsEnabled}
                  onChange={(e) => setSmsEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-green-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            {/* Email */}
            <div className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">✉️</span>
                  <span className="font-semibold text-navy-900">Email Receipts</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {userEmail
                    ? `Receipts will be sent to: ${userEmail}`
                    : "Add an email address in your Profile to receive receipts."}
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-green-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            {/* Web Push */}
            <div className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
              <div className="max-w-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🔔</span>
                  <span className="font-semibold text-navy-900">Web Push Notifications</span>
                  {isPushSubscribed && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                      Active on device
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Get instant real-time browser popups for appointment reminders and shop responses.
                </p>
                {pushMessage && (
                  <p className="text-navy-800 mt-1 text-xs font-semibold">{pushMessage}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTogglePushSubscription}
                  disabled={pushLoading}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isPushSubscribed
                      ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {pushLoading
                    ? "Updating..."
                    : isPushSubscribed
                      ? "Disable on Device"
                      : "Enable on Device"}
                </button>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={pushEnabled}
                    onChange={(e) => setPushEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-green-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="space-y-3 pt-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💬</span>
                    <span className="font-semibold text-navy-900">WhatsApp Channel</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Receive rich booking details and reminders directly on WhatsApp.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={whatsappEnabled}
                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-green-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>
              {whatsappEnabled && (
                <div className="max-w-sm pt-2">
                  <label
                    htmlFor="whatsapp-phone"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    WhatsApp Mobile Number
                  </label>
                  <input
                    id="whatsapp-phone"
                    type="tel"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-green-600 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Viber */}
            <div className="space-y-3 pt-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🟣</span>
                    <span className="font-semibold text-navy-900">Viber Channel</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Receive service updates via Viber messaging.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={viberEnabled}
                    onChange={(e) => setViberEnabled(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-green-600 peer-focus:outline-hidden after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>
              {viberEnabled && (
                <div className="max-w-sm pt-2">
                  <label
                    htmlFor="viber-phone"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Viber Mobile Number
                  </label>
                  <input
                    id="viber-phone"
                    type="tel"
                    value={viberPhone}
                    onChange={(e) => setViberPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-green-600 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Alert Types Card */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="font-display text-lg font-bold text-navy-900">Notification Types</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose what events you want to be notified about.
          </p>

          <div className="mt-4 space-y-4">
            <label className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:bg-slate-50/50">
              <div>
                <span className="font-medium text-navy-900">Booking Confirmations & Receipts</span>
                <p className="text-xs text-slate-500">
                  Instant receipt when a shop approves your booking request.
                </p>
              </div>
              <input
                type="checkbox"
                checked={bookingConfirmations}
                onChange={(e) => setBookingConfirmations(e.target.checked)}
                className="size-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:bg-slate-50/50">
              <div>
                <span className="font-medium text-navy-900">Upcoming Appointment Reminders</span>
                <p className="text-xs text-slate-500">
                  Friendly reminders 24 hours and 2 hours before your appointment starts.
                </p>
              </div>
              <input
                type="checkbox"
                checked={bookingReminders}
                onChange={(e) => setBookingReminders(e.target.checked)}
                className="size-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:bg-slate-50/50">
              <div>
                <span className="font-medium text-navy-900">Auto-Expiry & Status Updates</span>
                <p className="text-xs text-slate-500">
                  Alerts if a shop request times out or if a schedule changes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={bookingAutoExpiry}
                onChange={(e) => setBookingAutoExpiry(e.target.checked)}
                className="size-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
            </label>

            <label className="flex items-center justify-between rounded-lg border border-border p-3.5 hover:bg-slate-50/50">
              <div>
                <span className="font-medium text-navy-900">
                  Exclusive Promos & Local Discounts
                </span>
                <p className="text-xs text-slate-500">
                  Special offers from partner barbershops, salons, and spas in your barangay.
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketingPromos}
                onChange={(e) => setMarketingPromos(e.target.checked)}
                className="size-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-green-600 px-6 py-2.5 font-display text-sm font-semibold text-white shadow-xs transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </form>

      {/* Test Notification Card */}
      <section className="rounded-xl border border-dashed border-border bg-card p-5 shadow-2xs sm:p-6">
        <h2 className="font-display text-lg font-bold text-navy-900">Send a Test Notification</h2>
        <p className="mt-1 text-sm text-slate-500">
          Verify your notification delivery by dispatching a test message to your selected channel.
        </p>

        {testResult && (
          <div
            role="alert"
            className={`mt-4 rounded-lg p-3 text-xs font-semibold ${
              testResult.success
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={testChannel}
            onChange={(e) => setTestChannel(e.target.value as NotificationChannel)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-navy-900 focus:border-green-600 focus:outline-hidden"
          >
            {NOTIFICATION_CHANNELS_LIST.map((c) => (
              <option key={c} value={c}>
                {CHANNELS[c].label} ({CHANNELS[c].icon})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={isPending}
            className="rounded-lg border border-green-600 bg-white px-4 py-2 text-xs font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
          >
            {isPending ? "Sending..." : `Send Test to ${CHANNELS[testChannel].label}`}
          </button>
        </div>
      </section>
    </div>
  );
}

// Utility to convert Base64 URL string to Uint8Array for VAPID applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
