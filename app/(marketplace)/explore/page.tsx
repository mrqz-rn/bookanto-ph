import { ArrowRight, CalendarDays, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ShopRail, type ShopCardData } from "@/components/shared/shop-card";
import { BookingStatusBadge } from "@/features/bookings/components/booking-status-badge";
import { getMyBookings, type MyBooking } from "@/features/bookings/customer-queries";
import { CategoryTiles } from "@/features/search/components/category-tiles";
import { ListingLinks } from "@/features/search/components/listing-links";
import { NearbyShops } from "@/features/search/components/nearby-shops";
import { SearchForm } from "@/features/search/components/search-form";
import {
  getActiveCities,
  getCustomerRecommendations,
  getHomeCategories,
  getNewShops,
  getPopularListingLinks,
  getTopRatedShops,
} from "@/features/search/queries";
import { ListYourShop } from "@/features/shops/components/list-your-shop";
import { getCurrentUser } from "@/lib/auth";
import { isStoreAccount } from "@/lib/home";
import { formatManila } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book local services near you",
  description:
    "Find and book barbershops, salons, aircon cleaning, auto repair and more from trusted shops near you.",
  alternates: { canonical: "/explore" },
};

export default async function ExplorePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/explore");
  }
  // Store accounts manage their shop from the dashboard, not the marketplace.
  if (isStoreAccount(user)) {
    redirect("/dashboard");
  }

  const [categories, topRated, newShops, listingLinks, cities, personal, upcoming] =
    await Promise.all([
      getHomeCategories(),
      getTopRatedShops(),
      getNewShops(),
      getPopularListingLinks(),
      getActiveCities(),
      getCustomerRecommendations(user.id),
      getMyBookings(user.id, "upcoming"),
    ]);
  const hasShops = newShops.length > 0;
  const firstName = user.name?.trim().split(/\s+/)[0] ?? null;

  return (
    <main id="main" className="flex flex-col gap-12 pb-4">
      <section aria-labelledby="explore-heading" className="border-b bg-accent/60">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <p className="font-semibold text-green-700">
                {greeting(new Date())}
                {firstName ? `, ${firstName}` : ""}
              </p>
              <h1
                id="explore-heading"
                className="font-display text-4xl leading-tight font-bold text-balance sm:text-5xl"
              >
                Book services <span className="text-green-600">sa kanto mo</span>
              </h1>
              <p className="max-w-prose text-lg text-slate-600">
                Barbershops, salons, aircon cleaning and more from shops near you. Pick a time, book
                na, and we&apos;ll tell you when the shop confirms.
              </p>
            </div>
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-border">
              <SearchForm />
            </div>
          </div>
          <NextBooking bookings={upcoming.items} />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4">
        {categories.length > 0 && (
          <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
            <SectionHeading id="categories-heading" title="What do you need today?" />
            <CategoryTiles categories={categories} />
          </section>
        )}

        {hasShops ? (
          <>
            {personal.bookAgain.length > 0 && (
              <ShopSection id="book-again" title="Book again" shops={personal.bookAgain} />
            )}
            {personal.forYou.length > 0 && (
              <ShopSection id="for-you" title="Recommended for you" shops={personal.forYou} />
            )}
            <NearbyShops cities={cities} />
            {topRated.length > 0 && (
              <ShopSection
                id="top-rated"
                title="Top rated"
                shops={topRated}
                seeAll="/search?sort=rating"
              />
            )}
            <ShopSection
              id="new-shops"
              title="New shops"
              shops={newShops}
              seeAll="/search?sort=newest"
            />
          </>
        ) : (
          <NoShopsYet />
        )}

        {listingLinks.length > 0 && (
          <section aria-labelledby="popular-searches-heading" className="flex flex-col gap-4">
            <SectionHeading id="popular-searches-heading" title="Popular searches" />
            <ListingLinks links={listingLinks} />
          </section>
        )}

        <ListYourShop />
      </div>
    </main>
  );
}

/** "Magandang umaga" before noon, "hapon" until 6 PM, "gabi" after, in Manila time. */
function greeting(now: Date): string {
  const hour = Number(formatManila(now, "H"));
  if (hour >= 4 && hour < 12) return "Magandang umaga";
  if (hour >= 12 && hour < 18) return "Magandang hapon";
  return "Magandang gabi";
}

function SectionHeading({
  id,
  title,
  seeAll,
}: {
  id: string;
  title: string;
  seeAll?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 id={id} className="font-display text-2xl font-bold">
        {title}
      </h2>
      {seeAll && (
        <Link
          href={seeAll.href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md text-sm font-semibold text-green-700 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-200 group-hover:bg-[length:100%_2px]">
            {seeAll.label}
          </span>
          <ArrowRight
            aria-hidden
            className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </div>
  );
}

function ShopSection({
  id,
  title,
  shops,
  seeAll,
}: {
  id: string;
  title: string;
  shops: ShopCardData[];
  seeAll?: string;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <SectionHeading
        id={id}
        title={title}
        seeAll={seeAll ? { href: seeAll, label: `See all ${title.toLowerCase()}` } : undefined}
      />
      <ShopRail shops={shops} />
    </section>
  );
}

/** The soonest open booking, or a quiet empty state with the way to past ones. */
function NextBooking({ bookings }: { bookings: MyBooking[] }) {
  const [next] = bookings;
  const more = bookings.length - 1;

  return (
    <section
      aria-labelledby="next-booking-heading"
      className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="next-booking-heading" className="font-display text-xl font-bold">
          Your next booking
        </h2>
        <Link
          href="/account/bookings"
          className="inline-flex min-h-11 items-center gap-0.5 rounded-md text-sm font-semibold text-green-700 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          My bookings
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>

      {next ? (
        <>
          <Link
            href={`/account/bookings/${next.id}`}
            className="group flex gap-4 rounded-xl border p-3 transition-[transform,box-shadow] duration-200 outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-0"
          >
            <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-navy-900 py-2 text-white">
              <span className="text-xs font-semibold tracking-wide uppercase">
                {formatManila(next.startAt, "MMM")}
              </span>
              <span className="font-display text-2xl leading-none font-bold">
                {formatManila(next.startAt, "d")}
              </span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="truncate font-semibold">{next.shopName}</span>
              <span className="truncate text-sm text-slate-600">{next.serviceName}</span>
              <span className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {formatManila(next.startAt, "EEE · h:mm a")}
                <BookingStatusBadge status={next.status} />
              </span>
            </span>
          </Link>
          {more > 0 && (
            <p className="text-sm text-slate-600">
              {more === 1 ? "1 more upcoming booking" : `${more} more upcoming bookings`}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white">
            <CalendarDays aria-hidden className="size-5 text-green-700" />
          </span>
          <div className="text-sm">
            <p className="font-semibold">No upcoming bookings</p>
            <p className="text-slate-600">
              Book a shop below and its time and status show up here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/** Before the first shop is approved. */
function NoShopsYet() {
  return (
    <section className="rounded-xl border bg-white p-6">
      <h2 className="font-display text-2xl font-bold">Shops are joining now</h2>
      <p className="mt-2 max-w-prose text-slate-600">
        We&apos;re signing up barbershops, salons and other shops near you. Check back soon.
      </p>
    </section>
  );
}
