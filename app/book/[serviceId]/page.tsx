import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSavedAddresses } from "@/features/account/queries";
import {
  BookingFlow,
  type FlowService,
} from "@/features/bookings/components/customer/booking-flow";
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
  if (!service) return { title: "Service Not Found | BooKanto" };

  return {
    title: `Book ${service.name} - ${service.shop.name} | BooKanto`,
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

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-6">
      {/* Back to shop navigation */}
      <div className="mb-4">
        <Link
          href={`/shop/${service.shop.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-navy-900"
        >
          <ArrowLeft className="size-4" />
          Back to {service.shop.name}
        </Link>
      </div>

      {/* Booking Header */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-2xs">
        <span className="text-xs font-semibold tracking-wider text-green-700 uppercase">
          {service.shop.name}
        </span>
        <h1 className="mt-1 font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          {service.name}
        </h1>
        {service.description && (
          <p className="mt-1 text-sm text-slate-600">{service.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-navy-900">
          <span className="rounded-md bg-green-50 px-2.5 py-1 text-green-800">{priceLabel}</span>
          {service.bookingType !== "quote" && (
            <span className="font-normal text-slate-600">{service.durationMin} minutes</span>
          )}
          {depositLabel && (
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
              {depositLabel} required
            </span>
          )}
        </div>
      </div>

      {/* Booking Flow Form */}
      <BookingFlow
        service={flowService}
        today={manilaDate(now)}
        signedIn={!!user}
        savedAddresses={savedAddresses}
      />
    </div>
  );
}
