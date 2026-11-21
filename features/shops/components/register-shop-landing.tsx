import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, FileText, Home, Store, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SHOP_SETUP_ROUTE } from "@/lib/home";

import { DOCUMENT_TYPES, ONBOARDING_STEPS, PROVIDER_KINDS } from "../constants";

const KIND_ICONS = {
  storefront: Store,
  home: Home,
  quote: FileText,
  queue: Users,
} as const;

/**
 * Public explainer for shop owners and service providers. Static and cacheable:
 * the call to action goes to the onboarding wizard, and middleware sends guests
 * through /login first.
 */
export function RegisterShopLanding() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:space-y-16 sm:px-6 sm:py-14">
      {/* Hero */}
      <section
        aria-labelledby="register-shop-heading"
        className="rounded-3xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-white px-5 py-10 text-center sm:px-12 sm:py-14"
      >
        <p className="text-sm font-semibold text-green-700">May shop ka o service provider ka?</p>
        <h1
          id="register-shop-heading"
          className="mx-auto mt-2 max-w-2xl font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-5xl"
        >
          Register your shop with BooKanto
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
          Get bookings from customers nearby. Accept requests, add walk-ins and see your whole day
          from your phone. Free during the pilot.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href={SHOP_SETUP_ROUTE}>
              Start registration
              <ArrowRight aria-hidden />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/dashboard">I already registered</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Your progress is saved. You can stop and continue later.
        </p>
      </section>

      {/* Who can register */}
      <section aria-labelledby="who-heading">
        <h2 id="who-heading" className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Who can register
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {PROVIDER_KINDS.map((kind) => {
            const Icon = KIND_ICONS[kind.id];
            return (
              <li key={kind.id} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-navy-900">{kind.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{kind.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Steps */}
      <section aria-labelledby="steps-heading">
        <h2
          id="steps-heading"
          className="font-display text-2xl font-bold text-navy-900 sm:text-3xl"
        >
          Five steps to your shop page
        </h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-5">
          {ONBOARDING_STEPS.map((s) => (
            <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {s.step}
              </span>
              <h3 className="mt-3 font-semibold text-navy-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.subtitle}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* What to prepare */}
      <section aria-labelledby="prepare-heading" className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2
            id="prepare-heading"
            className="font-display text-2xl font-bold text-navy-900 sm:text-3xl"
          >
            What to prepare
          </h2>
          <p className="mt-2 text-slate-600">
            Take clear photos or scans (PDF, JPG, PNG or WebP). Only you and BooKanto admins can see
            your documents.
          </p>
          <ul className="mt-5 space-y-3">
            {DOCUMENT_TYPES.map((doc) => (
              <li key={doc.type} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                <FileText className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden />
                <div>
                  <p className="font-semibold text-navy-900">
                    {doc.name}{" "}
                    <span className="text-xs font-medium text-slate-500">
                      {doc.required ? "(required)" : "(optional)"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">{doc.description}</p>
                </div>
              </li>
            ))}
            <li className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <Store className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-semibold text-navy-900">Photos and opening hours</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  A photo of your storefront or your work, and the days and times you take bookings.
                </p>
              </div>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
            What happens next
          </h2>
          <ol className="mt-5 space-y-4">
            <li className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-semibold text-navy-900">We review your shop</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Our team checks your documents within 24 to 48 hours.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <CalendarCheck className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-semibold text-navy-900">Add your services meanwhile</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Set prices, durations and booking rules from your shop dashboard.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Users className="mt-0.5 size-5 shrink-0 text-green-700" aria-hidden />
              <div>
                <p className="font-semibold text-navy-900">Go live and get bookings</p>
                <p className="mt-0.5 text-sm text-slate-600">
                  Once approved, customers nearby can find and book you. We email you each new
                  request.
                </p>
              </div>
            </li>
          </ol>
          <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
            <Link href={SHOP_SETUP_ROUTE}>
              Start registration
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
