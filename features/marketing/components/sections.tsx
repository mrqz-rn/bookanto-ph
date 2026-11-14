import {
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  Mail,
  MessageCircle,
  Phone,
  Smartphone,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import {
  BOOKING_TYPES,
  CONTACT,
  FAQS,
  FEATURES,
  MILESTONES,
  MOBILE_PLATFORM,
  PILOT_DECISION,
  PILOT_GOALS,
  PILOT_LAUNCH,
  PILOT_MONTHS,
  PLANS,
  PROBLEMS,
  STEPS,
} from "../content";
import { BookingPreview } from "./booking-preview";
import { ContactForm } from "./contact-form";
import { MobilePreview } from "./mobile-preview";
import { AppleIcon, GooglePlayIcon } from "./store-icons";

// Sections link to each other by id (#features, #pricing, …); scroll-mt keeps
// headings clear of the sticky header.
const section = "scroll-mt-20";

function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  invert,
}: {
  id: string;
  eyebrow: string;
  title: string;
  intro?: string;
  invert?: boolean;
}) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <p
        className={cn(
          "text-sm font-semibold tracking-wide uppercase",
          invert ? "text-yellow-400" : "text-green-700",
        )}
      >
        {eyebrow}
      </p>
      <h2 id={id} className="font-display text-3xl font-bold sm:text-4xl">
        {title}
      </h2>
      {intro && (
        <p className={cn("text-lg", invert ? "text-white/85" : "text-slate-600")}>{intro}</p>
      )}
    </div>
  );
}

export function Hero() {
  return (
    <section className="grid items-center gap-12 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-6">
        <p className="w-fit rounded-full bg-yellow-400 px-3 py-1 text-sm font-semibold text-navy-900">
          Free during the pilot · Opens {PILOT_LAUNCH.replace("March", "Mar")}
        </p>
        <h1 className="font-display text-4xl leading-tight font-bold sm:text-6xl">
          Online booking for shops <span className="text-green-600">sa kanto mo</span>
        </h1>
        <p className="max-w-xl text-lg text-slate-600">
          BooKanto helps barbershops, salons, aircon technicians, auto shops and other local
          services get found on Google, take bookings day and night, and run walk-ins and reminders
          from one phone.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <a href="#contact">
              List your shop for free
              <ArrowRight aria-hidden />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href="#investors">For investors</a>
          </Button>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t pt-6 sm:grid-cols-4">
          {[
            ["₱0", "fees during the pilot"],
            ["0%", "commission on bookings"],
            ["24/7", "online booking"],
            ["Any phone", "no app to download"],
          ].map(([value, label]) => (
            <div key={label} className="flex flex-col">
              <dt className="order-last text-sm text-slate-600">{label}</dt>
              <dd className="font-display text-2xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <BookingPreview />
    </section>
  );
}

export function Problems() {
  return (
    <section aria-labelledby="problems-heading" className={cn(section, "flex flex-col gap-8")}>
      <SectionHeading
        id="problems-heading"
        eyebrow="Sounds familiar?"
        title="Common shop problems, solved"
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {PROBLEMS.map(({ problem, solution }) => (
          <li key={problem} className="flex flex-col gap-4 rounded-xl border bg-white p-5">
            <p className="flex gap-2 font-semibold text-slate-600">
              <X aria-hidden className="mt-0.5 size-5 shrink-0 text-danger" />
              {problem}
            </p>
            <p className="flex gap-2">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" />
              {solution}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className={cn(section, "flex flex-col gap-8")}
    >
      <SectionHeading
        id="features-heading"
        eyebrow="Features"
        title="Everything you need to run bookings"
        intro="A complete toolkit for Philippine neighborhood shops, from a one-chair barbershop to a busy car wash."
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body, soon }) => (
          <li key={title} className="flex gap-4 rounded-xl border bg-white p-5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent">
              <Icon aria-hidden className="size-5 text-green-700" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                {title}
                {soon && <SoonBadge />}
              </h3>
              <p className="text-sm text-slate-600">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SoonBadge() {
  return (
    <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-semibold text-navy-900">
      Soon
    </span>
  );
}

export function BookingTypes() {
  return (
    <section aria-labelledby="booking-types-heading" className={cn(section, "flex flex-col gap-8")}>
      <SectionHeading
        id="booking-types-heading"
        eyebrow="One system, four ways to book"
        title="Built for every kind of local service"
        intro="Each service picks the booking style that fits how the shop really works."
      />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {BOOKING_TYPES.map(({ name, tagline, examples, soon }) => (
          <li key={name} className="flex flex-col gap-2 rounded-xl border bg-white p-5">
            <p className="flex items-center gap-2 font-display text-xl font-bold">
              {name}
              {soon && <SoonBadge />}
            </p>
            <p className="font-semibold">{tagline}</p>
            <p className="text-sm text-slate-600">{examples}</p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600">
        “Soon” means coming during the pilot, at no cost to pilot shops.
      </p>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className={cn(section, "flex flex-col gap-8")}>
      <SectionHeading id="how-heading" eyebrow="How it works" title="Live in four steps" />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ title, body }, index) => (
          <li key={title} className="flex flex-col gap-3 rounded-xl border bg-white p-5">
            <span className="flex size-10 items-center justify-center rounded-full bg-navy-900 font-display text-lg font-bold text-white">
              {index + 1}
            </span>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-slate-600">{body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function StoreBadge({
  subtitle,
  title,
  icon: Icon,
}: {
  subtitle: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs sm:min-w-64">
      <div className="flex items-center gap-3">
        <Icon className="size-8 shrink-0 text-navy-900" />
        <div className="flex flex-col text-left leading-tight">
          <span className="text-[11px] font-medium tracking-wider text-slate-600 uppercase">
            {subtitle}
          </span>
          <span className="font-display text-base font-bold text-navy-900">{title}</span>
        </div>
      </div>
      <span className="rounded-full bg-yellow-400 px-2.5 py-0.5 text-xs font-semibold text-navy-900">
        Coming soon
      </span>
    </div>
  );
}

export function MobilePlatform() {
  return (
    <section
      id="mobile"
      aria-labelledby="mobile-heading"
      className={cn(
        section,
        "flex flex-col gap-10 rounded-2xl border bg-gradient-to-b from-accent/30 via-white to-white p-6 sm:p-10 lg:p-14",
      )}
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <SectionHeading
            id="mobile-heading"
            eyebrow={MOBILE_PLATFORM.eyebrow}
            title={MOBILE_PLATFORM.title}
            intro={MOBILE_PLATFORM.intro}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {MOBILE_PLATFORM.stores.map((store) => (
              <StoreBadge
                key={store.title}
                subtitle={store.subtitle}
                title={store.title}
                icon={store.store === "play" ? GooglePlayIcon : AppleIcon}
              />
            ))}
          </div>

          <ul className="grid gap-3 pt-2">
            {MOBILE_PLATFORM.highlights.map(({ title, body }, idx) => {
              const Icon = idx === 0 ? Bell : idx === 1 ? Smartphone : Zap;
              return (
                <li key={title} className="flex gap-3.5 rounded-xl border bg-white p-4 shadow-2xs">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <Icon aria-hidden className="size-4 text-green-700" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
                    <p className="text-xs text-slate-600">{body}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <a href="#contact">
                Get notified on launch
                <ArrowRight aria-hidden />
              </a>
            </Button>
            <p className="text-xs text-slate-600">
              Pilot partner shops receive priority early access before public store releases.
            </p>
          </div>
        </div>

        <MobilePreview />
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={cn(section, "flex flex-col gap-8")}
    >
      <SectionHeading
        id="pricing-heading"
        eyebrow="Pricing"
        title="Simple, honest pricing"
        intro="Free during the pilot. If paid plans come later, we'll tell you at least 30 days before, and your basic listing stays free."
      />
      <ul className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <li
            key={plan.name}
            className={cn(
              "relative flex flex-col gap-5 rounded-xl border bg-white p-6",
              plan.highlight && "border-2 border-green-600 shadow-lg",
            )}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-6 rounded-full bg-green-600 px-3 py-0.5 text-xs font-semibold text-white">
                Now enrolling
              </span>
            )}
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
              <p className="text-sm text-slate-600">{plan.description}</p>
            </div>
            <p className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold">{plan.price}</span>
              <span className="text-sm text-slate-600">{plan.period}</span>
            </p>
            <ul className="flex flex-col gap-2 text-sm">
              {plan.points.map((point) => (
                <li key={point} className="flex gap-2">
                  <Check aria-hidden className="size-5 shrink-0 text-green-700" />
                  {point}
                </li>
              ))}
            </ul>
            {plan.highlight && (
              <Button asChild className="mt-auto">
                <a href="#contact">Join the pilot</a>
              </Button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-sm text-slate-600">
        Customers always book for free, with no convenience fees during the pilot. Shops that join
        early become Founding Partners: a badge on their page and a discount on any future paid
        plan.
      </p>
    </section>
  );
}

export function Investors() {
  return (
    <section
      id="investors"
      aria-labelledby="investors-heading"
      className={cn(
        section,
        "flex flex-col gap-10 rounded-2xl bg-navy-900 px-5 py-10 text-white sm:px-10 sm:py-14",
      )}
    >
      <SectionHeading
        id="investors-heading"
        eyebrow="For investors"
        title="Building the booking layer for neighborhood services"
        intro="Most neighborhood shops in the Philippines still take bookings by walk-in, text and Messenger. BooKanto gives them a free booking system, and gives customers one place to find and book them."
        invert
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Lean by design",
            body: `A serverless stack and a ${PILOT_MONTHS}-month pilot in one launch area, so we learn fast and spend little before scaling.`,
          },
          {
            title: "A clear path to revenue",
            body: "A free basic listing grows supply. Revenue comes from optional Pro tools and featured spots, then online payments.",
          },
          {
            title: "Decided by numbers",
            body: `We decide on scaling up in ${PILOT_DECISION.month} using real pilot data: active shops, monthly bookings and repeat customers.`,
          },
        ].map(({ title, body }) => (
          <div key={title} className="flex flex-col gap-2 rounded-xl bg-white/10 p-5">
            <h3 className="font-display text-xl font-bold">{title}</h3>
            <p className="text-white/85">{body}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-bold">Pilot timeline</h3>
          <ol className="flex flex-col gap-4 border-l border-white/30 pl-5">
            {MILESTONES.map(({ date, title }) => (
              <li key={title} className="relative">
                <span
                  aria-hidden
                  className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-green-600"
                />
                <p className="text-sm font-semibold text-yellow-400">{date}</p>
                <p>{title}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-xl font-bold">Pilot goals for {PILOT_DECISION.month}</h3>
          <dl className="grid gap-3 sm:grid-cols-3">
            {PILOT_GOALS.map(({ value, label }) => (
              <div
                key={label}
                className="flex items-baseline gap-3 rounded-xl bg-white/10 p-4 sm:flex-col sm:gap-0"
              >
                <dt className="order-last text-sm text-white/85">{label}</dt>
                <dd className="font-display text-2xl font-bold sm:text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
          <Button asChild size="lg" className="mt-2 w-full sm:w-fit">
            <a href="#contact">
              Talk to the founder
              <ArrowRight aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className={cn(section, "flex flex-col gap-8")}>
      <SectionHeading id="faq-heading" eyebrow="FAQ" title="Frequently asked questions" />
      <div className="flex flex-col gap-3">
        {FAQS.map(({ question, answer }) => (
          <details key={question} className="group rounded-xl border bg-white">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
              {question}
              <ChevronDown
                aria-hidden
                className="size-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="px-5 pb-5 text-slate-600">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Contact() {
  const links = [
    CONTACT.email && { icon: Mail, label: CONTACT.email, href: `mailto:${CONTACT.email}` },
    CONTACT.phone && {
      icon: Phone,
      label: formatPhone(CONTACT.phone),
      href: `tel:${CONTACT.phone}`,
    },
    CONTACT.messengerUrl && {
      icon: MessageCircle,
      label: "Message us on Messenger",
      href: CONTACT.messengerUrl,
    },
  ].filter(Boolean) as Array<{ icon: typeof Mail; label: string; href: string }>;

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className={cn(section, "grid gap-10 lg:grid-cols-[1fr_1.2fr]")}
    >
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="contact-heading"
          eyebrow="Contact us"
          title="Let's talk"
          intro="Shop owners, business partners and investors: send a message and we'll get back to you."
        />
        <ul className="flex flex-col gap-4">
          {[
            ["Shop owners", "Join the pilot for free and get help setting up your shop."],
            [
              "Businesses and partners",
              "Suppliers, associations and local groups: let's grow together.",
            ],
            ["Investors", "Ask about the pilot, our plans and the numbers as they come in."],
          ].map(([who, what]) => (
            <li key={who} className="flex gap-3">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-green-700" />
              <p>
                <span className="font-semibold">{who}.</span>{" "}
                <span className="text-slate-600">{what}</span>
              </p>
            </li>
          ))}
        </ul>
        {links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map(({ icon: Icon, label, href }) => (
              <li key={href}>
                <a
                  href={href}
                  className="inline-flex min-h-11 items-center gap-2 font-semibold text-green-700 underline-offset-4 hover:underline"
                >
                  <Icon aria-hidden className="size-5" />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-slate-600">
          Looking for a shop instead?{" "}
          <Link
            href="/explore"
            className="font-semibold text-green-700 underline underline-offset-4"
          >
            Explore shops near you
          </Link>
        </p>
      </div>
      <ContactForm />
    </section>
  );
}
