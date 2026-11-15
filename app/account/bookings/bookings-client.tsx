"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageSquare,
  PenLine,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MyBooking } from "@/features/bookings/customer-queries";
import { RatingStars } from "@/features/reviews/components/rating-stars";
import { ReviewFormDialog } from "@/features/reviews/components/review-form-dialog";
import type { PublicReviewItem } from "@/features/reviews/queries";
import { formatPeso } from "@/lib/money";

type CustomerBookingsClientProps = {
  upcomingBookings: MyBooking[];
  pastBookings: MyBooking[];
  initialReviews: Record<string, PublicReviewItem | null>;
};

export function CustomerBookingsClient({
  upcomingBookings,
  pastBookings,
  initialReviews,
}: CustomerBookingsClientProps) {
  const [tab, setTab] = React.useState<"past" | "upcoming">("past");
  const [reviewsMap, setReviewsMap] = React.useState(initialReviews);
  const [reviewingBooking, setReviewingBooking] = React.useState<MyBooking | null>(null);

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-PH", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Tab Switcher */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab("past")}
          className={`flex min-h-[44px] items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            tab === "past"
              ? "border-green-600 text-green-700"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          <span>Past Services ({pastBookings.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className={`flex min-h-[44px] items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            tab === "upcoming"
              ? "border-green-600 text-green-700"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          <span>Upcoming Appointments ({upcomingBookings.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {tab === "past" ? (
        pastBookings.length > 0 ? (
          <div className="flex flex-col gap-4">
            {pastBookings.map((b) => {
              const review = reviewsMap[b.id];
              const isCompleted = b.status === "completed";

              return (
                <div
                  key={b.id}
                  className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-5"
                >
                  {/* Top info */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-navy-900">{b.shopName}</h3>
                        <Link
                          href={`/shop/${b.shopSlug}`}
                          className="text-slate-400 hover:text-green-700"
                          title="View shop"
                        >
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </div>
                      <p className="text-xs font-medium text-slate-600">{b.serviceName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                          isCompleted
                            ? "bg-emerald-100 text-success"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  </div>

                  {/* Booking details metadata */}
                  <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-slate-400" />
                      <span>{formatDate(b.startAt)}</span>
                    </div>
                    {b.totalCentavos && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy-900">
                          {formatPeso(b.totalCentavos)}
                        </span>
                        <span className="text-[11px] text-slate-400">• Ref: {b.refCode}</span>
                      </div>
                    )}
                  </div>

                  {/* Review Section */}
                  {isCompleted && (
                    <div className="mt-1 border-t border-border pt-3">
                      {review ? (
                        /* Customer review card */
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 sm:p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-success">
                                <CheckCircle2 className="size-3.5" />
                                Reviewed by you
                              </span>
                              <RatingStars value={review.rating} size="sm" />
                            </div>
                            <time className="text-[11px] text-slate-400">
                              {new Date(review.createdAt).toLocaleDateString("en-PH", {
                                month: "short",
                                day: "numeric",
                              })}
                            </time>
                          </div>

                          {review.comment && (
                            <p className="mt-2 text-xs leading-relaxed whitespace-pre-line text-slate-700">
                              &quot;{review.comment}&quot;
                            </p>
                          )}

                          {review.photos && review.photos.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-2">
                              {review.photos.map((p, i) => (
                                <div
                                  key={p.id || i}
                                  className="size-14 overflow-hidden rounded-md border border-border bg-slate-100"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={p.url}
                                    alt="Review photo"
                                    className="size-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {review.reply && (
                            <div className="mt-3 rounded-md border border-emerald-200 bg-white p-3 text-xs">
                              <div className="flex items-center gap-1 font-semibold text-green-700">
                                <MessageSquare className="size-3.5" />
                                <span>Shop Owner Reply</span>
                              </div>
                              <p className="mt-1 whitespace-pre-line text-slate-700">
                                {review.reply}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Prompt to write review */
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/70 p-3 sm:p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                              <Star className="size-4 fill-amber-400 text-amber-500" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-navy-900">
                                How was your appointment at {b.shopName}?
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Share your rating and photos to help the shop and local neighbors.
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            onClick={() => setReviewingBooking(b)}
                            className="min-h-[44px] bg-green-600 font-semibold text-white hover:bg-green-700"
                          >
                            <PenLine className="mr-1.5 size-4" />
                            Write a Review
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-1 flex items-center gap-2 border-t border-border pt-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="min-h-[44px] gap-1.5 text-xs"
                    >
                      <Link href={`/account/bookings/${b.id}`}>
                        <MessageSquare className="size-3.5 text-emerald-600" />
                        <span>Chat & History</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Clock className="size-10 text-slate-300" />
            <h3 className="mt-3 font-semibold text-navy-900">No past bookings yet</h3>
            <p className="mt-1 text-xs text-slate-500">
              When you complete an appointment, you will be able to review and rate the shop here.
            </p>
            <Button
              asChild
              className="mt-4 min-h-[44px] bg-green-600 text-white hover:bg-green-700"
            >
              <Link href="/explore">Explore Shops</Link>
            </Button>
          </div>
        )
      ) : /* Upcoming Tab */
      upcomingBookings.length > 0 ? (
        <div className="flex flex-col gap-4">
          {upcomingBookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs sm:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-navy-900">{b.shopName}</h3>
                  <p className="text-xs text-slate-600">{b.serviceName}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 capitalize">
                  {b.status}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="size-3.5" />
                <span>{formatDate(b.startAt)}</span>
              </div>

              <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="min-h-[44px] gap-1.5 text-xs"
                >
                  <Link href={`/account/bookings/${b.id}`}>
                    <MessageSquare className="size-3.5 text-emerald-600" />
                    <span>Chat with Shop</span>
                  </Link>
                </Button>
                {b.totalCentavos && (
                  <span className="text-xs font-semibold text-navy-900">
                    {formatPeso(b.totalCentavos)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Calendar className="size-10 text-slate-300" />
          <h3 className="mt-3 font-semibold text-navy-900">No upcoming appointments</h3>
          <p className="mt-1 text-xs text-slate-500">
            Find trusted neighborhood shops and book your next appointment easily.
          </p>
          <Button asChild className="mt-4 min-h-[44px] bg-green-600 text-white hover:bg-green-700">
            <Link href="/explore">Find a Service</Link>
          </Button>
        </div>
      )}

      {/* Review Dialog */}
      {reviewingBooking && (
        <ReviewFormDialog
          bookingId={reviewingBooking.id}
          shopName={reviewingBooking.shopName}
          serviceName={reviewingBooking.serviceName}
          isOpen={true}
          onClose={() => setReviewingBooking(null)}
          onSuccess={(newReviewId) => {
            setReviewsMap((prev) => ({
              ...prev,
              [reviewingBooking.id]: {
                id: newReviewId,
                bookingId: reviewingBooking.id,
                customerId: "",
                customerName: "You",
                rating: 5,
                comment: "Review submitted",
                reply: null,
                serviceName: reviewingBooking.serviceName,
                photos: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                matchedHighlights: [],
              },
            }));
            setReviewingBooking(null);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
