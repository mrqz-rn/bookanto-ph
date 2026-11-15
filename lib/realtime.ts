import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

import { publicEnv } from "@/lib/public-env";

// Realtime adapter. Supabase Realtime broadcast today; AWS IoT / AppSync / API Gateway
// WebSocket after the AWS migration, when only this file changes.

export type BookingRealtimeHandlers = {
  onMessage?: (message: Record<string, unknown>) => void;
  onRead?: (payload: { readAt: string; readBy: string; bookingId?: string }) => void;
};

/**
 * Server-side broadcast helper.
 * Publishes an event to the Realtime topic `booking:${bookingId}`.
 * Never throws to the caller: if Supabase or network is unreachable (e.g. in test runner),
 * it logs a warning so server actions continue smoothly.
 */
export async function publishRealtimeEvent(
  topic: string,
  event: string,
  payload: unknown,
): Promise<void> {
  try {
    const url = `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic,
            event,
            payload,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.warn("Realtime broadcast returned non-OK status:", res.status, res.statusText);
    }
  } catch (err) {
    // Expected during offline tests or environments without realtime connectivity
    console.warn("Realtime broadcast warning:", err instanceof Error ? err.message : err);
  }
}

/**
 * Publishes a new message event to the booking channel.
 */
export async function publishBookingMessage(bookingId: string, message: unknown): Promise<void> {
  await publishRealtimeEvent(`booking:${bookingId}`, "new_message", message);
}

/**
 * Publishes a read receipt event to the booking channel.
 */
export async function publishBookingRead(
  bookingId: string,
  payload: { readAt: string; readBy: string },
): Promise<void> {
  await publishRealtimeEvent(`booking:${bookingId}`, "messages_read", {
    ...payload,
    bookingId,
  });
}

// Browser singleton client for Realtime websockets
let browserClient: ReturnType<typeof createClient> | null = null;

export function getBrowserRealtimeClient() {
  if (typeof window === "undefined") return null;

  if (!browserClient) {
    browserClient = createClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      },
    );
  }

  return browserClient;
}

/**
 * Subscribes the browser client to a booking's realtime broadcast channel.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeToBooking(
  bookingId: string,
  handlers: BookingRealtimeHandlers,
): () => void {
  const client = getBrowserRealtimeClient();
  if (!client || !bookingId) return () => {};

  const channel: RealtimeChannel = client.channel(`booking:${bookingId}`, {
    config: {
      broadcast: { ack: false, self: false },
    },
  });

  if (handlers.onMessage) {
    channel.on("broadcast", { event: "new_message" }, ({ payload }) => {
      handlers.onMessage?.(payload);
    });
  }

  if (handlers.onRead) {
    channel.on("broadcast", { event: "messages_read" }, ({ payload }) => {
      handlers.onRead?.(payload);
    });
  }

  channel.subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
