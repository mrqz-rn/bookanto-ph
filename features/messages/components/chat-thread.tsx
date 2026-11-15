"use client";

import * as React from "react";
import { ArrowDown, Check, CheckCheck, MessageSquare, ShieldAlert } from "lucide-react";
import { subscribeToBooking } from "@/lib/realtime";

import { markRead, sendMessage } from "../actions";
import type { ChatMessage, QuickReplyItem } from "../constants";
import { ChatInput } from "./chat-input";
import { ImagePreviewModal } from "./image-preview-modal";

type ChatThreadProps = {
  bookingId: string;
  shopId?: string;
  initialMessages: ChatMessage[];
  quickReplies?: QuickReplyItem[];
  isShopMember?: boolean;
  canManageQuickReplies?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  onBookingActionRequired?: () => void;
};

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}

function formatDateSeparator(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();

    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();

    if (isToday) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isYesterday) return "Yesterday";

    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }).format(date);
  } catch {
    return "";
  }
}

export function ChatThread({
  bookingId,
  shopId,
  initialMessages,
  quickReplies: initialQuickReplies = [],
  isShopMember = false,
  canManageQuickReplies = false,
  headerTitle,
  headerSubtitle,
}: ChatThreadProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>(initialMessages);
  const [quickReplies, setQuickReplies] = React.useState<QuickReplyItem[]>(initialQuickReplies);
  const [previewImage, setPreviewImage] = React.useState<{ src: string; alt: string } | null>(null);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = React.useState(false);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  // Check if unread incoming messages exist on mount and mark them read
  React.useEffect(() => {
    const hasUnread = initialMessages.some((m) => !m.isMe && m.readAt === null);
    if (hasUnread) {
      markRead({ bookingId }).catch(() => {});
    }
  }, [bookingId, initialMessages]);

  // Scroll to bottom on initial load
  React.useEffect(() => {
    scrollToBottom("auto");
  }, [scrollToBottom]);

  // Subscribe to Realtime messages and read receipts
  React.useEffect(() => {
    const unsubscribe = subscribeToBooking(bookingId, {
      onMessage: (payload) => {
        const newMsg = payload as unknown as ChatMessage;
        if (!newMsg?.id) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // Trigger read receipt for incoming messages while user is active in chat
        if (!newMsg.isMe) {
          markRead({ bookingId }).catch(() => {});
        }

        scrollToBottom("smooth");
      },
      onRead: (payload) => {
        if (!payload?.readAt) return;
        const readAtTime = payload.readAt;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.isMe && m.readAt === null) {
              return { ...m, readAt: readAtTime };
            }
            return m;
          }),
        );
      },
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId, scrollToBottom]);

  // Monitor scroll position to show / hide scroll-to-bottom pill
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceToBottom > 150);
  };

  const handleSendMessage = async (data: {
    body?: string;
    imageBase64?: string;
    imageName?: string;
  }): Promise<boolean> => {
    setErrorBanner(null);

    const res = await sendMessage({
      bookingId,
      body: data.body,
      imageBase64: data.imageBase64,
      imageName: data.imageName,
    });

    if (res.ok) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setTimeout(() => scrollToBottom("smooth"), 50);
      return true;
    } else {
      setErrorBanner(res.message);
      return false;
    }
  };

  // Group messages by date for visual clarity
  const groupedByDate: { dateLabel: string; items: ChatMessage[] }[] = [];
  messages.forEach((msg) => {
    const label = formatDateSeparator(msg.createdAt);
    const lastGroup = groupedByDate[groupedByDate.length - 1];
    if (lastGroup && lastGroup.dateLabel === label) {
      lastGroup.items.push(msg);
    } else {
      groupedByDate.push({ dateLabel: label, items: [msg] });
    }
  });

  return (
    <div className="flex h-full min-h-[500px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50/50 shadow-xs">
      {/* Thread Header if provided */}
      {(headerTitle || headerSubtitle) && (
        <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
          <div>
            {headerTitle && (
              <h2 className="text-sm font-semibold text-neutral-900 sm:text-base">{headerTitle}</h2>
            )}
            {headerSubtitle && <p className="text-xs text-neutral-500">{headerSubtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live chat
            </span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorBanner && (
        <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="size-4 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-red-500 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto p-4 sm:p-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-12 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-xs">
              <MessageSquare className="size-7 text-emerald-600" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-neutral-900">No messages yet</h3>
            <p className="mt-1 max-w-xs text-xs text-neutral-500">
              {isShopMember
                ? "Send a friendly greeting or use Quick Replies below to reach out to the customer."
                : "Ask questions, share directions, or send photos about your booking."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedByDate.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-3">
                {/* Date separator */}
                <div className="my-2 flex items-center justify-center">
                  <span className="rounded-full bg-neutral-200/80 px-3 py-0.5 text-[11px] font-medium text-neutral-600">
                    {group.dateLabel}
                  </span>
                </div>

                {/* Messages in this group */}
                {group.items.map((msg) => {
                  const isOutgoing = msg.isMe;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}
                    >
                      {/* Sender label for incoming */}
                      {!isOutgoing && (
                        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] text-neutral-500">
                          <span className="font-semibold text-neutral-800">{msg.senderName}</span>
                          {msg.senderRole !== "customer" && (
                            <span className="py-0.2 rounded bg-emerald-100 px-1 text-[9px] font-bold text-emerald-800 uppercase">
                              {msg.senderRole}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`group relative max-w-[85%] rounded-2xl p-3 shadow-2xs sm:max-w-[75%] ${
                          isOutgoing
                            ? "rounded-br-xs bg-emerald-600 text-white"
                            : "rounded-bl-xs border border-neutral-200 bg-white text-neutral-900"
                        }`}
                      >
                        {/* Attached Photo */}
                        {msg.imageUrl && (
                          <div className="mb-2 overflow-hidden rounded-xl bg-neutral-900/10">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  src: msg.imageUrl!,
                                  alt: "Attached photo preview",
                                })
                              }
                              className="block overflow-hidden transition-opacity hover:opacity-95"
                              aria-label="View photo full size"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={msg.imageUrl}
                                alt="Attached photo"
                                className="max-h-64 w-auto rounded-xl object-contain"
                                loading="lazy"
                              />
                            </button>
                          </div>
                        )}

                        {/* Text Content (Stored and shown as plain text) */}
                        {msg.body && (
                          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
                            {msg.body}
                          </p>
                        )}

                        {/* Timestamp & Read Receipt */}
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isOutgoing ? "text-emerald-100" : "text-neutral-400"
                          }`}
                        >
                          <span>{formatTime(msg.createdAt)}</span>

                          {/* Read receipt indicator for outgoing messages */}
                          {isOutgoing && (
                            <span
                              className="inline-flex items-center"
                              title={msg.readAt ? `Read · ${formatTime(msg.readAt)}` : "Sent"}
                            >
                              {msg.readAt ? (
                                <span
                                  className="inline-flex items-center font-medium text-white"
                                  aria-label="Read"
                                >
                                  <CheckCheck className="size-3.5 stroke-[2.5]" />
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center text-emerald-200"
                                  aria-label="Sent"
                                >
                                  <Check className="size-3.5 stroke-[2]" />
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollBottom && (
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="absolute right-4 bottom-4 flex size-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-md transition-transform hover:scale-105 active:scale-95"
            aria-label="Scroll to latest message"
          >
            <ArrowDown className="size-4" />
          </button>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        shopId={shopId}
        isShopMember={isShopMember}
        canManageQuickReplies={canManageQuickReplies}
        quickReplies={quickReplies}
        onCustomRepliesChange={(updated) => setQuickReplies(updated)}
        onSend={handleSendMessage}
      />

      {/* Image preview modal */}
      <ImagePreviewModal
        src={previewImage?.src ?? null}
        alt={previewImage?.alt}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
}
