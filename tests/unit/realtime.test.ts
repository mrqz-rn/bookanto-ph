import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { publishBookingMessage, publishBookingRead, publishRealtimeEvent } from "@/lib/realtime";

describe("realtime broadcast adapter", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("publishes broadcast event with apikey and topic", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    global.fetch = fetchMock;

    await publishRealtimeEvent("booking:123", "test_event", { hello: "world" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toContain("/realtime/v1/api/broadcast");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(options.body);
    expect(body.messages[0]).toEqual({
      topic: "booking:123",
      event: "test_event",
      payload: { hello: "world" },
    });
  });

  it("publishes new message to booking channel", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    const messagePayload = { id: "msg-1", body: "Hello customer" };
    await publishBookingMessage("booking-456", messagePayload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.messages[0].topic).toBe("booking:booking-456");
    expect(body.messages[0].event).toBe("new_message");
    expect(body.messages[0].payload).toEqual(messagePayload);
  });

  it("publishes read receipt to booking channel", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    await publishBookingRead("booking-789", {
      readAt: "2026-11-15T12:00:00Z",
      readBy: "user-abc",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.messages[0].topic).toBe("booking:booking-789");
    expect(body.messages[0].event).toBe("messages_read");
    expect(body.messages[0].payload.readAt).toBe("2026-11-15T12:00:00Z");
    expect(body.messages[0].payload.readBy).toBe("user-abc");
    expect(body.messages[0].payload.bookingId).toBe("booking-789");
  });

  it("does not throw when fetch fails (graceful degradation)", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("Network offline"));

    await expect(publishRealtimeEvent("booking:fail", "error_test", {})).resolves.toBeUndefined();

    expect(consoleWarnSpy).toHaveBeenCalled();
  });
});
