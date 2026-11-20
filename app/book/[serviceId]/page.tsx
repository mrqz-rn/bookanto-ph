import { ArrowLeft, BadgeCheck, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSavedAddresses } from "@/features/account/queries";
import {
  BookingFlow,
  type FlowService,
} from "@/features/bookings/components/customer/booking-flow";
import { ServicePhotosGallery } from "@/features/bookings/components/customer/service-photos-gallery";
import { CUSTOMER_BOOKING_MODES } from "@/features/bookings/booking-modes";
import { getBookableService } from "@/features/bookings/customer-queries";
import { getCurrentUser } from "@/lib/auth";
import { formatPeso } from "@/lib/money";
import { manilaDate } from "@/lib/time";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ serviceId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serviceId } = await params;
  const service = await getBookableService(serviceId, new Date());
  // The root layout's title template adds "| BooKanto".
  if (!service) return { title: "Service not found" };

  return {
    title: `Book ${service.name} - ${service.shop.name}`,
    description: `Book your appointment for ${service.name} at ${service.shop.name}. Verified local services sa kanto mo.`,
  };
}

export default async function BookServicePage({ params }: Props) {
  const { serviceId } = await params;
  const now = new Date();
  const [user, service] = await Promise.all([getCurrentUser(), getBookableService(serviceId, now)]);

  if (!service || !service.active) {
    notFound();
  }

  const priceLabel =
    service.priceType === "quote"
      ? "Get a quote"
      : service.priceType === "starts_at"
        ? `From ${formatPeso(service.priceCentavos ?? 0)}`
        : formatPeso(service.priceCentavos ?? 0);

  const depositLabel =
    service.rules.depositValue > 0
      ? service.rules.depositType === "fixed"
        ? `${formatPeso(service.rules.depositValue)} deposit`
        : `${service.rules.depositValue}% deposit`
      : null;

  const cancelNote =
    service.rules.cancelWindowHours > 0
      ? `Free to cancel up to ${service.rules.cancelWindowHours} ${
          service.rules.cancelWindowHours === 1 ? "hour" : "hours"
        } before.`
      : "Free cancellation anytime.";

  const flowService: FlowService = {
    id: service.id,
    name: service.name,
    bookingType: service.bookingType,
    priceLabel,
    durationMin: service.durationMin,
    shopName: service.shop.name,
    staff: service.staff,
    waiting: service.waiting,
    depositLabel,
    cancelNote,
    photos: service.photos,
  };

  let savedAddresses: Array<{ id: string; label: string; text: string }> = [];
  if (user) {
    const addresses = await getSavedAddresses(user.id);
    savedAddresses = addresses.map((a) => ({
      id: a.id,
      label: a.label,
      text: [a.streetAddress, a.barangayName, a.cityName].filter(Boolean).join(", "),
    }));
  }

  const mode = CUSTOMER_BOOKING_MODES[service.bookingType];

  return (
    <main id="main" className="mx-auto max-w-xl px-4 pt-2 sm:px-6 sm:pt-6">
      <Link
        href={`/shop/${service.shop.slug}`}
        className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-slate-600 hover:text-navy-900 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to {service.shop.name}
      </Link>

      <header className="mt-2 pb-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-green-700">
          {service.shop.name}
          {service.shop.verified && (
            <span className="inline-flex items-center gap-1 text-success">
              <BadgeCheck aria-hidden className="size-4" />
              Verified shop
            </span>
          )}
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight font-bold text-navy-900">
          {service.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-base text-slate-600">
          <span className="font-bold text-navy-900">{priceLabel}</span>
          {service.bookingType !== "quote" && service.bookingType !== "queue" && (
            <>
              <span aria-hidden>·</span>
              <span>{service.durationMin} min</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span>{mode.label}</span>
        </p>
        {service.description && (
          <p className="mt-2 text-sm text-slate-600">{service.description}</p>
        )}
        {depositLabel && service.bookingType !== "queue" && (
          <p className="mt-3 flex items-start gap-2 text-sm text-navy-900">
            <Wallet aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
            <span>
              <span className="font-semibold">{depositLabel}</span>, paid online after the shop
              confirms.
            </span>
          </p>
        )}

        {/* Uploaded Service Photos Gallery */}
        {service.photos.length > 0 && (
          <div className="mt-4">
            <ServicePhotosGallery photos={service.photos} serviceName={service.name} />
          </div>
        )}
      </header>

      <BookingFlow
        service={flowService}
        today={manilaDate(now)}
        signedIn={!!user}
        savedAddresses={savedAddresses}
      />
    </main>
  );
}
