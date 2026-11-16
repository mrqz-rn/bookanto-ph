import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { BadgeCheck, Clock, MapPin, Phone, Star } from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { ShopRail } from "@/components/shared/shop-card";
import { PriceTag } from "@/components/shared/price-tag";
import { Button } from "@/components/ui/button";
import { ShopViewTracker } from "@/features/analytics/components/shop-view-tracker";
import { ReviewList } from "@/features/reviews/components/review-list";
import { getShopReviews, getShopReviewStats } from "@/features/reviews/queries";
import { getSimilarShops } from "@/features/search/queries";
import { getPublicShopBySlug } from "@/features/shops/queries";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/authz";
import { db } from "@/lib/db";
import { bookings, reviews } from "@/lib/db/schema";

type ShopPageProps = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 600;

export async function generateMetadata({ params }: ShopPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicShopBySlug(slug);
  if (!data) return { title: "Shop Not Found | BooKanto" };

  const { shop, categories } = data;
  const primaryCat = categories[0]?.name || "Local Service";
  const location = [shop.barangayName, shop.cityName].filter(Boolean).join(", ");

  return {
    title: `${shop.name} - ${primaryCat} in ${location} | BooKanto`,
    description:
      shop.description ||
      `Book appointments online at ${shop.name} in ${location}. Rated ${shop.ratingAvg}★ from ${shop.ratingCount} reviews.`,
    alternates: { canonical: `/shop/${shop.slug}` },
  };
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
  const locationStr = [shop.address, shop.barangayName, shop.cityName].filter(Boolean).join(", ");

  return (
    <main id="main" className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 sm:py-12">
      <ShopViewTracker shopId={shop.id} shopSlug={shop.slug} shopName={shop.name} />
      {/* Shop Hero Card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        {/* Cover / Gallery row */}
        <div className="relative aspect-[21/9] max-h-72 w-full bg-accent sm:aspect-[24/9]">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt={shop.name}
              fill
              priority
              sizes="(min-width: 1200px) 1152px, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <CategoryIcon
                name={categories[0]?.icon || null}
                className="size-16 text-green-700 opacity-60"
              />
            </div>
          )}

          {photos.length > 1 && (
            <div className="bg-navy-950/80 absolute right-3 bottom-3 rounded-lg px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
              +{photos.length - 1} photos
            </div>
          )}
        </div>

        {/* Shop Info Details */}
        <div className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-extrabold text-navy-900 sm:text-4xl">
                  {shop.name}
                </h1>
                {shop.verifiedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-success">
                    <BadgeCheck className="size-4" />
                    Verified Partner
                  </span>
                )}
              </div>

              {categories.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <span key={c.categoryId} className="text-xs font-semibold text-slate-500">
                      {c.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick rating pill */}
            <a
              href="#reviews"
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2 text-xs font-bold text-navy-900 transition-colors hover:bg-amber-100"
            >
              <Star className="size-4 fill-amber-400 text-amber-500" />
              <span className="text-sm font-extrabold">
                {stats.ratingAvg > 0 ? stats.ratingAvg.toFixed(1) : "New"}
              </span>
              <span className="font-normal text-slate-500">
                ({stats.ratingCount} {stats.ratingCount === 1 ? "review" : "reviews"})
              </span>
            </a>
          </div>

          {shop.description && (
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{shop.description}</p>
          )}

          {/* Quick Contact & Location Info */}
          <div className="flex flex-wrap gap-6 border-t border-border pt-4 text-xs text-slate-600">
            {locationStr && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 shrink-0 text-slate-400" />
                <span>{locationStr}</span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-slate-400" />
                <a href={`tel:${shop.phone}`} className="hover:text-green-700">
                  {shop.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Services List Section */}
      <section aria-labelledby="services-heading" className="flex flex-col gap-4">
        <h2 id="services-heading" className="font-display text-2xl font-bold text-navy-900">
          Services & Rates
        </h2>
        {services.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs transition-shadow hover:shadow-xs"
              >
                <div>
                  <h3 className="font-bold text-navy-900">{svc.name}</h3>
                  {svc.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{svc.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="size-3.5 text-slate-400" />
                    <span>{svc.durationMin} mins</span>
                    <span>•</span>
                    <span className="capitalize">{svc.bookingType}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <PriceTag
                    centavos={svc.priceCentavos}
                    type={svc.priceType}
                    className="font-bold"
                  />
                  <Button
                    asChild
                    size="sm"
                    className="min-h-[44px] bg-green-600 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    <Link href={`/book?service=${svc.id}`}>Book Now</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No services listed yet.</p>
        )}
      </section>

      {/* Business Hours */}
      {hours.length > 0 && (
        <section
          aria-labelledby="hours-heading"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-green-700" />
            <h2 id="hours-heading" className="font-display text-lg font-bold text-navy-900">
              Opening Hours
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 md:grid-cols-7">
            {hours.map((h) => (
              <div
                key={h.weekday}
                className="flex flex-col rounded-lg bg-slate-50 p-2.5 text-center"
              >
                <span className="font-bold text-navy-900">{WEEKDAYS[h.weekday]}</span>
                <span className="mt-1 text-slate-600">
                  {h.opens} - {h.closes}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Customer Reviews Section */}
      <div id="reviews" className="scroll-mt-8 pt-4">
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

      {similarShops.length > 0 && (
        <section aria-labelledby="similar-heading" className="flex flex-col gap-4">
          <h2 id="similar-heading" className="font-display text-2xl font-semibold">
            Similar shops
          </h2>
          <ShopRail shops={similarShops} />
        </section>
      )}
    </main>
  );
}
