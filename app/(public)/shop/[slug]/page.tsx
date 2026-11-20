import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, MapPin, Phone, Star } from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { ShopRail } from "@/components/shared/shop-card";
import { priceLabel } from "@/components/shared/price-tag";
import { buttonVariants } from "@/components/ui/button";
import { WEEKDAYS, formatClock } from "@/features/availability/constants";
import { CUSTOMER_BOOKING_MODES } from "@/features/bookings/booking-modes";
import { ShopViewTracker } from "@/features/analytics/components/shop-view-tracker";
import { ReviewList } from "@/features/reviews/components/review-list";
import { getShopReviews, getShopReviewStats } from "@/features/reviews/queries";
import { getSimilarShops } from "@/features/search/queries";
import { getPublicShopBySlug } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { bookings, reviews } from "@/lib/db/schema";

type ShopPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 600;

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicShopBySlug(slug);
  // The root layout's title template adds "| BooKanto".
  if (!data) return { title: "Shop not found" };

  const { shop, categories } = data;
  const primaryCat = categories[0]?.name || "Local Service";
  const location = [shop.barangayName, shop.cityName].filter(Boolean).join(", ");

  return {
    title: `${shop.name} - ${primaryCat} in ${location}`,
    description:
      shop.description ||
      `Book appointments online at ${shop.name} in ${location}. Rated ${shop.ratingAvg}★ from ${shop.ratingCount} reviews.`,
    alternates: { canonical: `/shop/${shop.slug}` },
  };
}

export default async function PublicShopPage({ params }: ShopPageProps) {
  const { slug } = await params;
  const data = await getPublicShopBySlug(slug);

  if (!data) {
    notFound();
  }

  const { shop, categories, hours, photos, services } = data;
  const user = await getCurrentUser();

  const [stats, reviewsData, similarShops] = await Promise.all([
    getShopReviewStats(shop.id),
    getShopReviews(shop.id, { limit: 20 }),
    getSimilarShops(shop.id),
  ]);

  // Check if current user is owner/manager to allow replying
  const canReply = user ? can(user, "review:reply", { shopId: shop.id }) : false;

  // Check if current user has an unreviewed completed booking
  let canReview = false;
  let eligibleBookingId: string | null = null;
  let eligibleServiceName: string | null = null;

  if (user) {
    const userCompletedBookings = await db
      .select({
        id: bookings.id,
        serviceId: bookings.serviceId,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.shopId, shop.id),
          eq(bookings.customerId, user.id),
          eq(bookings.status, "completed"),
        ),
      );

    for (const b of userCompletedBookings) {
      const [existingRev] = await db
        .select({ id: reviews.id })
        .from(reviews)
        .where(eq(reviews.bookingId, b.id))
        .limit(1);

      if (!existingRev) {
        canReview = true;
        eligibleBookingId = b.id;
        const matchedService = services.find((s) => s.id === b.serviceId);
        eligibleServiceName = matchedService?.name ?? null;
        break;
      }
    }
  }

  const primaryPhoto = photos[0]?.url || null;
  const area = [shop.barangayName, shop.cityName].filter(Boolean).join(", ");
  const fullAddress = withArea(shop.address, [shop.barangayName, shop.cityName]);

  return (
    <main id="main" className="mx-auto max-w-6xl px-4 pb-16 sm:pt-6">
      <ShopViewTracker shopId={shop.id} shopSlug={shop.slug} shopName={shop.name} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-x-10">
        <div className="lg:col-start-1">
          {primaryPhoto && (
            <div className="relative -mx-4 aspect-[16/9] overflow-hidden bg-accent sm:mx-0 sm:aspect-[5/2] sm:rounded-2xl">
              <Image
                src={primaryPhoto}
                alt={shop.name}
                fill
                priority
                sizes="(min-width: 1024px) 768px, 100vw"
                className="object-cover"
              />
              {photos.length > 1 && (
                <span className="absolute right-3 bottom-3 rounded-md bg-navy-900/85 px-2 py-1 text-xs font-semibold text-white">
                  +{photos.length - 1} photos
                </span>
              )}
            </div>
          )}

          <header className={primaryPhoto ? "pt-5" : "pt-6"}>
            <div className="flex items-center gap-4">
              {!primaryPhoto && (
                // No photo yet: a small category mark, not an empty banner.
                <div
                  aria-hidden="true"
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent sm:size-16"
                >
                  <CategoryIcon
                    name={categories[0]?.icon || null}
                    className="size-7 text-green-700 sm:size-8"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {categories.length > 0 && (
                  <p className="flex flex-wrap gap-x-1 text-sm font-semibold text-green-700">
                    {categories.map((c, index) => (
                      <span key={c.categoryId}>
                        <Link href={`/c/${c.slug}`} className="hover:underline">
                          {c.name}
                        </Link>
                        {index < categories.length - 1 && <span aria-hidden> ·</span>}
                      </span>
                    ))}
                  </p>
                )}
                <h1 className="mt-0.5 font-display text-3xl leading-tight font-bold text-navy-900 sm:text-4xl">
                  {shop.name}
                </h1>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 text-sm">
              {shop.verifiedAt && (
                <span className="inline-flex min-h-8 items-center gap-1 font-semibold text-success">
                  <BadgeCheck aria-hidden className="size-4" />
                  Verified shop
                </span>
              )}
              <a
                href="#reviews"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-navy-900 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <Star aria-hidden className="size-4 fill-yellow-400 text-yellow-400" />
                {stats.ratingCount > 0 ? (
                  <>
                    <span className="font-bold">{stats.ratingAvg.toFixed(1)}</span>
                    <span className="text-slate-600">
                      ({stats.ratingCount} {stats.ratingCount === 1 ? "review" : "reviews"})
                    </span>
                  </>
                ) : (
                  <span className="text-slate-600">New, no reviews yet</span>
                )}
              </a>
              {area && (
                <span className="inline-flex min-h-8 items-center gap-1 text-slate-600">
                  <MapPin aria-hidden className="size-4" />
                  {area}
                </span>
              )}
            </div>

            {shop.description && (
              <p className="mt-3 max-w-2xl text-slate-600">{shop.description}</p>
            )}
          </header>
        </div>

        <section aria-labelledby="services-heading" className="mt-8 lg:col-start-1">
          <h2 id="services-heading" className="font-display text-2xl font-bold text-navy-900">
            Services and rates
          </h2>
          {services.length > 0 ? (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {services.map((svc) => {
                const mode = CUSTOMER_BOOKING_MODES[svc.bookingType];
                const showDuration = svc.bookingType !== "quote" && svc.bookingType !== "queue";
                return (
                  <li key={svc.id} className="relative flex items-center gap-4 py-4">
                    {svc.coverPhotoUrl && (
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-slate-100 sm:size-20">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={svc.coverPhotoUrl}
                          alt={svc.name}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-navy-900">{svc.name}</h3>
                      {svc.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">
                          {svc.description}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        {showDuration && <>{svc.durationMin} min · </>}
                        {mode.label}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <span className="font-bold text-navy-900">
                        {svc.priceType === "quote" || svc.priceCentavos === null
                          ? "By quote"
                          : priceLabel(svc.priceCentavos, svc.priceType)}
                      </span>
                      {/* The link covers the whole row, so the row is one big tap target. */}
                      <Link
                        href={`/book/${svc.id}`}
                        aria-label={`${mode.action}: ${svc.name}`}
                        className={cn(
                          buttonVariants({ size: "default" }),
                          "px-4 text-sm after:absolute after:inset-0",
                        )}
                      >
                        {mode.action}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-lg bg-muted px-4 py-6 text-center text-slate-600">
              This shop hasn&apos;t listed its services yet. Check back soon.
            </p>
          )}
        </section>

        <aside
          aria-label="Hours and location"
          className="mt-8 space-y-6 border-t border-border pt-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:mt-0 lg:self-start lg:rounded-xl lg:border lg:p-5"
        >
          <section aria-labelledby="hours-heading">
            <h2 id="hours-heading" className="font-display text-lg font-bold text-navy-900">
              Opening hours
            </h2>
            <dl className="mt-2 text-sm">
              {WEEKDAYS.map((day) => {
                const row = hours.find((h) => h.weekday === day.weekday);
                return (
                  <div key={day.weekday} className="flex justify-between gap-4 py-1.5">
                    <dt className="font-medium text-navy-900">{day.label}</dt>
                    <dd className="text-right text-slate-600 tabular-nums">
                      {row ? (
                        <>
                          {formatClock(row.opens)} – {formatClock(row.closes)}
                          {row.breakStart && row.breakEnd && (
                            <span className="block text-xs">
                              Break {formatClock(row.breakStart)} – {formatClock(row.breakEnd)}
                            </span>
                          )}
                        </>
                      ) : (
                        "Closed"
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
            <p className="mt-2 text-xs text-slate-600">
              Philippine time. Holiday hours may differ; open times show when you book.
            </p>
          </section>

          {(fullAddress || shop.phone) && (
            <section aria-labelledby="location-heading">
              <h2 id="location-heading" className="font-display text-lg font-bold text-navy-900">
                Location
              </h2>
              {fullAddress && (
                <p className="mt-2 flex gap-2 text-sm text-navy-900">
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-slate-600" />
                  {fullAddress}
                </p>
              )}
              {shop.phone && (
                <a
                  href={`tel:${shop.phone}`}
                  className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-green-700 hover:underline"
                >
                  <Phone aria-hidden className="size-4" />
                  {shop.phone}
                </a>
              )}
            </section>
          )}
        </aside>

        <div id="reviews" className="mt-10 scroll-mt-6 lg:col-start-1">
          <ReviewList
            shopId={shop.id}
            shopName={shop.name}
            ratingAvg={stats.ratingAvg}
            ratingCount={stats.ratingCount}
            recommendPercentage={stats.recommendPercentage}
            distribution={stats.distribution}
            highlights={stats.highlights}
            photosCount={stats.photosCount}
            showcasePhotos={stats.showcasePhotos}
            initialReviews={reviewsData.items}
            canReview={canReview}
            eligibleBookingId={eligibleBookingId}
            eligibleServiceName={eligibleServiceName}
            canReply={canReply}
          />
        </div>
      </div>

      {similarShops.length > 0 && (
        <section aria-labelledby="similar-heading" className="mt-12 flex flex-col gap-4">
          <h2 id="similar-heading" className="font-display text-2xl font-bold text-navy-900">
            Similar shops
          </h2>
          <ShopRail shops={similarShops} />
        </section>
      )}
    </main>
  );
}

/** The street address plus the barangay and city, unless the address already names them. */
function withArea(address: string | null, area: Array<string | null>): string {
  const parts = address ? [address] : [];
  const lower = (address ?? "").toLowerCase();
  for (const name of area) {
    if (name && !lower.includes(name.toLowerCase())) parts.push(name);
  }
  return parts.join(", ");
}
