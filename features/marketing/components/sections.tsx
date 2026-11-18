import { ArrowRight, Check, Mail, MessageCircle, Phone, Sparkles } from "lucide-react";
import { Fragment, type CSSProperties } from "react";

import { formatPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

import {
  BOOKING_TYPES,
  CONTACT,
  LANDING_FAQS,
  MAIN_ACTION,
  MILESTONES,
  MOBILE_PLATFORM,
  PILOT_DECISION,
  PILOT_GOALS,
  PILOT_LAUNCH,
  PLANS,
  PROBLEMS,
  STEPS,
} from "../content";
import { ContactForm } from "./contact-form";
import {
  BookingChat,
  CustomerBookingPhone,
  DaySchedule,
  GoogleResult,
  InboxWindow,
  LockScreenPhone,
  PhoneInbox,
  EmailStack,
} from "./mocks";
import { PauseButton } from "./pause-button";
import { AppleIcon, GooglePlayIcon } from "./store-icons";

// The business landing page. Section order: hero, problems (the scroll
// moment), the inbox (the product, big), features, booking types, pricing,
// the coming apps (the navy band), FAQ, investors, contact. The close and the
// directory are the footer (marketing-footer.tsx).

type Vars = CSSProperties & Record<`--${string}`, string | number>;

export function Hero() {
  const lines = ["Online booking", "for the shops", "sa kanto mo"];
  const facts = [
    ["₱0", "fees during the pilot"],
    ["0%", "commission on bookings"],
    ["24/7", "online booking"],
    ["Any phone", "no app to download"],
  ];

  return (
    <section
      aria-labelledby="hero-heading"
      className="mk-hero mk-enter hero hero--split"
      data-enter
    >
      <div className="mk-wrap wrap">
        <div className="hero-text mk-hero__grid">
          <div className="flex flex-col lg:col-span-5">
            <p className="mk-label mk-enter-up mb-4" style={{ "--i": 0 } as Vars}>
              Public pilot opens {PILOT_LAUNCH}
            </p>
            <h1 id="hero-heading" className="mk-hero__h1">
              {lines.map((line, index) => (
                <span key={line} className="mk-line">
                  <span
                    className={index === 2 ? "text-green-600" : undefined}
                    style={{ "--i": index } as Vars}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>
            <p className="mk-hero__lead hero__lead mk-enter-up mt-6" style={{ "--i": 1 } as Vars}>
              Barbershops, salons, aircon technicians and other local services take bookings day and
              night, send email reminders and log walk-ins from one phone.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#contact"
                className="mk-btn btn btn--primary mk-btn--primary mk-enter-up"
                style={{ "--i": 2 } as Vars}
              >
                {MAIN_ACTION}
                <ArrowRight aria-hidden className="mk-arrow size-5" />
              </a>
              <a
                href="#inbox"
                className="mk-btn btn btn--secondary mk-btn--tonal mk-enter-up"
                style={{ "--i": 3 } as Vars}
              >
                See the booking inbox
              </a>
            </div>
            <dl
              className="mk-enter-up mt-10 hidden grid-cols-2 gap-x-6 gap-y-5 border-t border-[var(--line)] pt-[60px] xl:grid"
              style={{ "--i": 4 } as Vars}
            >
              {facts.map(([value, label]) => (
                <div key={label} className="flex flex-col">
                  <dt className="order-last text-[15px] text-[var(--ink-2)]">{label}</dt>
                  <dd className="font-display text-[26px] leading-tight font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div
            data-visual
            className="mk-hero__visual hero__media mk-enter-media lg:col-span-6 lg:col-start-7"
            style={{ maxHeight: "68vh" }}
          >
            <div className="mk-fade-b absolute inset-0">
              <PhoneInbox className="top-8 left-1/2 h-[calc(100%+24px)] -translate-x-1/2 lg:top-12 lg:right-14 lg:left-auto lg:translate-x-0" />
            </div>
            <div className="mk-float hidden lg:flex" aria-hidden>
              <span className="mk-dot" />
              <span className="mk-ui">
                <span className="block font-semibold">Email sent to Maria Santos</span>
                <span className="block text-[var(--ink-2)]">Confirmed for today, 2:30 PM</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Spread each letter a little, the same way on every render. */
function scatter(index: number) {
  const noise = (salt: number) => {
    const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    "--i": index,
    "--dx": `${((noise(1) - 0.5) * 1.8).toFixed(2)}em`,
    "--dy": `${((noise(2) - 0.15) * 1.6).toFixed(2)}em`,
    "--r": `${Math.round((noise(3) - 0.5) * 70)}deg`,
  } as Vars;
}

function AssembledLines({ lines }: { lines: string[] }) {
  let index = 0;
  return (
    <>
      <span className="sr-only">{lines.join(" ")}</span>
      <span aria-hidden>
        {lines.map((line) => (
          <span key={line} className="block">
            {line.split(" ").map((word, w) => (
              <Fragment key={word}>
                {w > 0 && " "}
                <span className="mk-word">
                  {[...word].map((letter) => {
                    const i = index++;
                    return (
                      <span key={i} className="mk-letter" style={scatter(i)}>
                        {letter}
                      </span>
                    );
                  })}
                </span>
              </Fragment>
            ))}
          </span>
        ))}
      </span>
    </>
  );
}

export function Problems() {
  const fixes = [
    "One inbox and one-tap accept",
    "Email reminders and a no-show record",
    "A free shop page made for Google",
  ];
  return (
    <section
      id="problems"
      aria-labelledby="problems-heading"
      className="mk-section mk-statement-section statement min-h-0"
      data-moment="word-highlight"
      data-statement
    >
      <div className="mk-wrap wrap grid grid-cols-12 items-center gap-x-6">
        <div className="col-span-12 lg:col-span-6">
          <h2 id="problems-heading" className="mk-h2">
            Common booking problems shops face: lost messages and no-shows
          </h2>
          <p className="mk-intro mo-wh__text mt-4">
            Most neighborhood shops manage customer bookings across Facebook Messenger, SMS and
            paper notebooks. <strong>Messages get buried</strong>, walk-ins double-book the chair,
            and no-shows waste hours every single week.
          </p>
          <ul className="mt-8">
            {PROBLEMS.map(({ problem }, index) => (
              <li
                key={problem}
                className="grid grid-cols-12 gap-x-4 border-b border-[var(--line)] py-3 text-[16px]"
              >
                <p className="col-span-6 font-semibold">{problem}</p>
                <p className="col-span-6 text-green-800">{fixes[index]}</p>
              </li>
            ))}
          </ul>
        </div>
        <div
          data-visual
          className="mk-frame frame col-span-12 mt-8 p-4 sm:p-6 lg:col-span-6 lg:mt-0"
        >
          <EmailStack inFlow />
        </div>
      </div>
    </section>
  );
}

export function Inbox() {
  return (
    <section id="inbox" aria-labelledby="inbox-heading" className="mk-section">
      <div className="mk-wrap wrap flex flex-col">
        <h2 id="inbox-heading" className="mk-h2">
          Booking inbox: day and night appointment manager
        </h2>
        <p className="mk-intro">
          See the whole day at a glance. Accept, decline or suggest another time in one tap, and
          BooKanto emails the customer for you.
        </p>
        <div
          data-visual
          className="mk-frame frame mt-10 h-[400px] p-3 sm:h-[clamp(440px,calc(100svh-372px),540px)] sm:p-6 lg:mt-12 lg:p-8"
        >
          <InboxWindow />
        </div>
      </div>
    </section>
  );
}

const FEATURE_CARDS = [
  {
    title: "Emails customers for you",
    body: "An email when you confirm and a reminder before the visit. Requests with no answer expire after 2 hours.",
    picture: <EmailStack />,
    loop: true,
  },
  {
    title: "Keeps chat in the booking",
    body: "Sort out landmarks, gate passes and photos in the booking thread, without giving out your number.",
    picture: <BookingChat />,
    loop: false,
  },
  {
    title: "Blocks breaks and logs walk-ins",
    body: "Block lunch or a day off and add walk-ins, so no time slot gets booked twice.",
    picture: <DaySchedule />,
    loop: false,
  },
  {
    title: "Puts your shop on Google",
    body: "Your free shop page is built to show up for searches like “barbershop Marikina”.",
    picture: <GoogleResult />,
    loop: false,
  },
];

function FeatureCard({ card }: { card: (typeof FEATURE_CARDS)[number] }) {
  return (
    <article
      className={cn(
        "mk-card card col-span-12 h-[320px] sm:h-[390px] lg:col-span-6 lg:h-[var(--card-h)]",
        card.loop && "mk-loop",
      )}
    >
      <div className="mk-card__text">
        <h3 className="mk-h3">{card.title}</h3>
        <p className="mk-body mt-2 max-w-[46ch]">{card.body}</p>
      </div>
      <div className="mk-card__panel panel" data-visual>
        {card.picture}
        {card.loop && <PauseButton />}
      </div>
    </article>
  );
}

export function Features() {
  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="mk-section mk-ground-surface"
    >
      <div
        className="mk-wrap wrap mk-g2 flex flex-col gap-6"
        style={{ "--card-h": "calc(100svh - var(--padt) - var(--padb) - 176px)" } as Vars}
      >
        <div className="flex flex-col">
          <h2 id="features-heading" className="mk-h2">
            Platform features for neighborhood shops
          </h2>
          <p className="mk-intro">
            Made for budget Android phones and mobile data, with nothing to download.
          </p>
          <div className="mt-10 grid grid-cols-12 gap-6 lg:mt-12">
            {FEATURE_CARDS.slice(0, 2).map((card) => (
              <FeatureCard key={card.title} card={card} />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 content-start gap-6">
          {FEATURE_CARDS.slice(2).map((card) => (
            <FeatureCard key={card.title} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BookingModes() {
  return (
    <section id="modes" aria-labelledby="modes-heading" className="mk-section mk-split">
      <div className="mk-wrap wrap grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-5">
          <h2 id="modes-heading" className="mk-h2">
            Four booking modes for every service shop
          </h2>
          <p className="mk-intro">
            Time slots and home service open with the pilot. Quotes and queues come next.
          </p>
          <ul className="mt-8">
            {BOOKING_TYPES.map((type) => (
              <li key={type.name} className="border-b border-[var(--line)] py-4">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="mk-h3">{type.name}</span>
                  <span className="text-[16px] text-[var(--ink-2)]">{type.tagline}</span>
                  {type.soon && <span className="mk-chip mk-chip--soon">Coming soon</span>}
                </p>
                <p className="mk-body mt-1">{type.examples}</p>
              </li>
            ))}
          </ul>
        </div>
        <div
          data-visual
          className="mk-frame frame mk-split__visual col-span-12 lg:col-span-6 lg:col-start-7"
          style={{ maxHeight: "68vh" }}
        >
          <div className="mk-fade-b absolute inset-0">
            <CustomerBookingPhone className="top-10 left-1/2 h-[calc(100%+24px)] -translate-x-1/2" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="mk-section mk-ground-surface mk-tall-sm"
    >
      <div className="mk-wrap wrap">
        <h2 id="pricing-heading" className="mk-h2">
          Pilot pricing: free for founding shops
        </h2>
        <p className="mk-intro">
          No fees and no commissions while we build BooKanto with you. If paid plans come later, you
          get at least 30 days&apos; notice.
        </p>
        <ul className="mt-10 grid grid-cols-12 gap-6 lg:mt-12">
          {PLANS.map((plan) => (
            <li
              key={plan.name}
              className={cn(
                "mk-card card col-span-12 gap-5 p-6 lg:col-span-4 lg:p-8",
                plan.highlight && "border-2 border-green-600",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles aria-hidden className="size-5 shrink-0 text-green-700" />
                  <h3 className="mk-h3">{plan.name}</h3>
                </div>
                {plan.highlight && <span className="mk-chip mk-chip--new">Now enrolling</span>}
              </div>
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-[28px] leading-none font-bold sm:text-[34px] lg:text-[40px]">
                  {plan.price}
                </span>
                <span className="text-[15px] text-[var(--ink-2)]">{plan.period}</span>
              </p>
              <p className="mk-body">{plan.description}</p>
              <ul className="border-t border-[var(--line)]">
                {plan.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2 border-b border-[var(--line)] py-2.5 text-[16px]"
                  >
                    <Check aria-hidden className="size-4 shrink-0 text-green-700" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {/* <p className="mk-body mt-6">Customers always book for free.</p> */}
      </div>
    </section>
  );
}

export function MobilePlatform() {
  return (
    <section
      id="mobile"
      aria-labelledby="mobile-heading"
      className="mk-section mk-ground-navy mk-split overflow-hidden"
    >
      <div className="mk-wrap wrap grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-5">
          <p className="mk-label">{MOBILE_PLATFORM.eyebrow}</p>
          <h2 id="mobile-heading" className="mk-h2 mt-3">
            {MOBILE_PLATFORM.title}
          </h2>
          <p className="mk-intro">
            BooKanto already works in any phone browser. Android and iOS apps are on the way, and
            pilot shops get them first.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {MOBILE_PLATFORM.stores.map((store) => (
              <span
                key={store.store}
                className="flex min-h-14 items-center gap-2.5 rounded-[12px] border border-white/25 bg-black px-3 py-2 sm:gap-3 sm:px-4"
              >
                {store.store === "play" ? (
                  <GooglePlayIcon className="size-6" />
                ) : (
                  <AppleIcon className="size-6 text-white" />
                )}
                <span className="leading-tight">
                  <span className="block text-[13px]">{store.subtitle}</span>
                  <span className="block text-[18px] font-semibold">{store.title}</span>
                </span>
              </span>
            ))}
            <span className="mk-chip mk-chip--soon">Coming soon</span>
          </div>
          <ul className="mt-6">
            {MOBILE_PLATFORM.highlights.map((item) => (
              <li key={item.title} className="border-b border-white/20 py-3">
                <p className="text-[17px] font-semibold">{item.title}</p>
                <p className="hidden text-[16px] text-white/80 sm:block">{item.summary}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <a href="#contact" className="mk-link inline-flex min-h-11 items-center">
              Get notified on launch
            </a>
          </p>
        </div>
        <div data-visual className="mk-split__visual col-span-12 lg:col-span-6 lg:col-start-7">
          <div
            data-visual
            className="mk-frame frame h-full bg-[radial-gradient(90%_70%_at_50%_0%,#1f6b45_0%,rgb(31_107_69/0)_70%),linear-gradient(180deg,#1b2b4d,#14213d)]"
            style={{ maxHeight: "68vh" }}
          >
            <div className="mk-fade-b absolute inset-0">
              <LockScreenPhone className="top-10 left-1/2 h-[calc(100%+24px)] -translate-x-1/2" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const half = Math.ceil(LANDING_FAQS.length / 2);
  const columns = [LANDING_FAQS.slice(0, half), LANDING_FAQS.slice(half)];
  return (
    <section id="faq" aria-labelledby="faq-heading" className="mk-section mk-split">
      <div className="mk-wrap wrap grid grid-cols-12 gap-x-6">
        {columns.map((column, index) => (
          <div
            key={index}
            className={cn(
              "col-span-12 lg:col-span-6 lg:row-start-2",
              index === 0 ? "lg:contents" : "lg:col-start-7",
            )}
          >
            {index === 0 && (
              <h2 id="faq-heading" className="mk-h2 col-span-12 mb-10 lg:mb-6">
                Frequently asked questions from local shop owners
              </h2>
            )}
            <dl className="col-span-12 lg:col-span-6 lg:row-start-2">
              {column.map(({ question, answer }) => (
                <div key={question} className="border-b border-[var(--line)] py-5">
                  <dt className="flex items-center gap-2 text-[18px] font-semibold">
                    <MessageCircle aria-hidden className="size-4 shrink-0 text-green-700" />
                    <span>{question}</span>
                  </dt>
                  <dd className="mk-body mt-1">{answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}

function PilotTimeline() {
  return (
    <div data-visual className="mk-frame frame flex h-full flex-col justify-center p-6 sm:p-10">
      <div className="mk-ui-surface card flex flex-col gap-8 p-6 sm:p-8">
        <div>
          <h3 className="mk-h3">Pilot timeline</h3>
          <ol className="mt-5 flex flex-col">
            {MILESTONES.map((milestone, index) => (
              <li key={milestone.title} className="relative flex gap-4 pb-5 last:pb-0">
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 mt-1 size-3.5 shrink-0 rounded-full border-2",
                    index === 0
                      ? "border-green-600 bg-green-600"
                      : "border-[var(--line-strong)] bg-white",
                  )}
                />
                {index < MILESTONES.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-5 bottom-0 left-[6px] w-0.5 bg-[var(--line)]"
                  />
                )}
                <p>
                  <span className="block text-[14px] font-semibold text-[var(--ink-2)]">
                    {milestone.date}
                    {index === 0 && <span className="ml-2 text-green-800">Under way</span>}
                  </span>
                  <span className="block text-[17px] font-semibold">{milestone.title}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div className="border-t border-[var(--line)] pt-6">
          <h3 className="mk-h3">Targets for {PILOT_DECISION.month}</h3>
          <dl className="mt-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 min-[420px]:gap-4">
            {PILOT_GOALS.map((goal) => (
              <div key={goal.label} className="flex flex-col">
                <dt className="order-last text-[14px] text-[var(--ink-2)]">{goal.label}</dt>
                <dd className="font-display text-[26px] leading-tight font-bold">{goal.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

export function Investors() {
  return (
    <section id="investors" aria-labelledby="investors-heading" className="mk-section mk-split">
      <div className="mk-wrap wrap grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-5">
          <p className="mk-label">For investors</p>
          <h2 id="investors-heading" className="mk-h2 mt-3">
            Pilot roadmap &amp; investment milestones
          </h2>
          <p className="mk-intro">
            Most neighborhood shops in the Philippines still take bookings by walk-in, text and
            Messenger. BooKanto gives them a free booking system and gives customers one place to
            find and book them.
          </p>
          <p className="mk-intro">
            We decide on scaling up in {PILOT_DECISION.month}, on real pilot numbers: active shops,
            monthly bookings and repeat customers.
          </p>
          <p className="mt-8">
            <a href="#contact" className="mk-link inline-flex min-h-11 items-center">
              Talk to the founder
            </a>
          </p>
        </div>
        <div data-visual className="mk-split__visual col-span-12 lg:col-span-6 lg:col-start-7">
          <PilotTimeline />
        </div>
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
      className="mk-section mk-ground-surface mk-split mk-split--flow-sm"
    >
      <div className="mk-wrap wrap grid grid-cols-12 gap-x-6">
        <div className="col-span-12 lg:col-span-5">
          <h2 id="contact-heading" className="mk-h2">
            Contact us: reserve your pilot spot
          </h2>
          <p className="mk-intro">
            Shop owners, business partners and investors: send a message and we&apos;ll reply by
            email or text.
          </p>
          <h3 className="mk-h3 mt-8 sm:mt-10">What happens next</h3>
          <ol className="mt-4 flex flex-col gap-3 sm:gap-4">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <p className="flex items-center gap-3 font-semibold">
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] font-display text-[15px] font-bold text-green-800"
                  >
                    {index + 1}
                  </span>
                  <span>{step.title}</span>
                </p>
                <p className="mk-body mt-1 pl-10">{step.body}</p>
              </li>
            ))}
          </ol>
          {links.length > 0 && (
            <ul className="mt-8 flex flex-col gap-2">
              {links.map(({ icon: Icon, label, href }) => (
                <li key={href}>
                  <a href={href} className="mk-link inline-flex min-h-11 items-center gap-2">
                    <Icon aria-hidden className="size-5" />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div data-visual className="col-span-12 lg:col-span-6 lg:col-start-7">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  return (
    <>
      <Hero />
      <Problems />
      <Inbox />
      <Features />
      <BookingModes />
      <Pricing />
      <MobilePlatform />
      <Faq />
      {/* <Investors /> */}
      <Contact />
    </>
  );
}
