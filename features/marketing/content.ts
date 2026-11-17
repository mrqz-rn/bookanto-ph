import {
  BadgeCheck,
  CalendarCheck,
  Clock,
  Inbox,
  MessageSquareText,
  MessagesSquare,
  QrCode,
  Search,
  Smartphone,
  Star,
  Tag,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

// Landing page copy. Every claim here comes from the development plan and the
// pilot plan; update both together when the offer changes.

/** Public pilot launch (pilot plan: "public pilot from March 8, 2027"). */
export const PILOT_LAUNCH = "March 8, 2027";

/** The pilot runs 8 months, November 16, 2026 to July 15, 2027, then the scale-up decision. */
export const PILOT_MONTHS = 8;
export const PILOT_DECISION = { date: "Jul 15, 2027", month: "July 2027" };

/** The main action, worded the same in the header, the hero and the close. */
export const MAIN_ACTION = "Join the pilot";

/** Header words. Features opens the panel below; every word lands on a section. */
export const NAV = [
  { href: "#inbox", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "#mobile", label: "App" },
  { href: "#faq", label: "FAQ" },
  { href: "#investors", label: "Investors" },
];

export const FEATURE_LINKS = [
  {
    href: "#problems",
    title: "What it fixes",
    body: "Lost requests, no-shows and shops nobody can find online.",
  },
  {
    href: "#features",
    title: "Reminders, chat and Google",
    body: "SMS reminders, booking chat, breaks and walk-ins, and a shop page on Google.",
  },
  { href: "#modes", title: "Booking types", body: "Time slots, home service, quotes and queues." },
];

/**
 * Direct contact details shown beside the form. Leave a value empty to hide it.
 * phone is E.164 (+639…); messengerUrl is a link such as https://m.me/yourpage.
 */
export const CONTACT = {
  email: "",
  phone: "",
  messengerUrl: "",
};

export const PROBLEMS: Array<{ problem: string; solution: string }> = [
  {
    problem: "Bookings buried in Messenger, texts and calls",
    solution: "One inbox for every booking request, with confirmations sent to customers by SMS.",
  },
  {
    problem: "Customers who forget or don't show up",
    solution:
      "Automatic reminders before every booking, and a record of no-shows and late cancellations.",
  },
  {
    problem: "New customers can't find you online",
    solution: "A free shop page made to show up on Google, plus a QR poster for your counter.",
  },
];

export const FEATURES: Array<{ icon: LucideIcon; title: string; body: string; soon?: boolean }> = [
  {
    icon: CalendarCheck,
    title: "Online booking, 24/7",
    body: "Customers pick a service and an open time, or ask for a home visit. No more back-and-forth.",
  },
  {
    icon: Inbox,
    title: "Booking inbox and calendar",
    body: "See today's bookings at a glance. Accept, decline or reschedule in one tap.",
  },
  {
    icon: UserRoundPlus,
    title: "Walk-ins and blocked time",
    body: "Add walk-ins and block breaks or days off, so you're never double-booked.",
  },
  {
    icon: MessageSquareText,
    title: "SMS confirmations and reminders",
    body: "Customers get a text when you confirm and a reminder before their visit. Unanswered requests expire on their own.",
  },
  {
    icon: MessagesSquare,
    title: "Chat on every booking",
    body: "Sort out the details in the app, without giving out your personal number.",
  },
  {
    icon: Star,
    title: "Reviews from real customers",
    body: "Only completed bookings can leave a review, and you can reply to each one.",
  },
  {
    icon: Tag,
    title: "Services and prices your way",
    body: "Fixed prices, “starts at” prices or quotes, with durations and how many customers you can take at once.",
  },
  {
    icon: Clock,
    title: "Hours, breaks and closures",
    body: "Set your weekly hours once. Customers only see times when you're open.",
  },
  {
    icon: Search,
    title: "A shop page that shows up on Google",
    body: "Your own BooKanto page, built to rank for searches like “barbershop Marikina”.",
  },
  {
    icon: QrCode,
    title: "Share link and QR poster",
    body: "Post your link on Facebook and print a QR poster for your counter.",
  },
  {
    icon: BadgeCheck,
    title: "Verified badge",
    body: "Upload your DTI, SEC or Mayor's permit to earn a Verified badge. Optional.",
  },
  {
    icon: Smartphone,
    title: "Works on any phone",
    body: "No app to download. Fast on budget Android phones and mobile data, and installable to the home screen.",
  },
  {
    icon: Users,
    title: "Staff accounts",
    body: "Give your staff their own login to see and handle the bookings assigned to them.",
    soon: true,
  },
];

export const BOOKING_TYPES: Array<{
  name: string;
  tagline: string;
  examples: string;
  soon?: boolean;
}> = [
  { name: "Slot", tagline: "Pick a time", examples: "Barbershops, salons, nail salons, spas" },
  {
    name: "Home service",
    tagline: "The shop comes to you",
    examples: "Aircon cleaning, home cleaning, repairs",
  },
  {
    name: "Quote",
    tagline: "Price after a look",
    examples: "Auto repair, renovation, custom jobs",
    soon: true,
  },
  {
    name: "Queue",
    tagline: "Get in line",
    examples: "Car wash, laundry, walk-in counters",
    soon: true,
  },
];

export const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Send us a message",
    body: "Tell us about your shop. We'll help you get set up for the pilot.",
  },
  {
    title: "Add your services and hours",
    body: "Your prices, how long each service takes, your weekly hours and your map pin.",
  },
  {
    title: "Share your link",
    body: "Post it on Facebook and Messenger, and print your QR poster for the counter.",
  },
  {
    title: "Take bookings from your phone",
    body: "Accept requests in one tap. Customers pay you at the shop, just like today.",
  },
];

export const PLANS: Array<{
  name: string;
  price: string;
  period: string;
  description: string;
  points: string[];
  highlight?: boolean;
}> = [
  {
    name: "Pilot",
    price: "₱0",
    period: "for the whole pilot",
    description: "Everything BooKanto does, free while we build it with you.",
    points: [
      "Every feature included",
      "No fees and no commissions",
      "SMS confirmations and reminders",
      "Help setting up your shop",
      "Founding partner badge",
    ],
    highlight: true,
  },
  {
    name: "Basic listing",
    price: "Soon",
    period: "after the pilot",
    description: "Your place on BooKanto.",
    points: ["Your shop page", "Listing in search, category and city pages", "Customer reviews"],
  },
  {
    name: "Pro",
    price: "Soon",
    period: "after the pilot",
    description: "Optional tools for growing shops, priced after the pilot.",
    points: ["Staff accounts", "Reports", "Featured spots in search", "Founding partner discount"],
  },
];

export const MILESTONES: Array<{ date: string; title: string }> = [
  { date: "Nov 2026", title: "Build starts" },
  { date: "Feb 15, 2027", title: "Beta with our first partner shops" },
  { date: PILOT_LAUNCH.replace("March", "Mar"), title: "Public pilot opens" },
  { date: PILOT_DECISION.date, title: "Scale-up decision, made on pilot numbers" },
];

export const PILOT_GOALS: Array<{ value: string; label: string }> = [
  { value: "100+", label: "active shops" },
  { value: "2,000+", label: "bookings a month" },
  { value: "30%", label: "of customers booking again" },
];

export const MOBILE_PLATFORM = {
  eyebrow: "Mobile Platform",
  title: "Mobile platform coming soon for Play Store and App store",
  intro:
    "We're building dedicated mobile apps for Android and iOS. While BooKanto works right now in any phone browser, dedicated Play Store and App Store apps are on the way for instant alerts and booking on the go.",
  stores: [
    {
      store: "play" as const,
      subtitle: "GET IT ON",
      title: "Google Play",
      platform: "Android",
    },
    {
      store: "apple" as const,
      subtitle: "Download on the",
      title: "App Store",
      platform: "iOS",
    },
  ],
  highlights: [
    {
      title: "Instant push notifications",
      summary: "Booking alerts even when your phone is locked.",
      body: "Receive alerts immediately for booking requests, confirmations, and customer reminders even when your phone is locked.",
    },
    {
      title: "One-tap appointment management",
      summary: "Accept, reschedule or block time off from your phone.",
      body: "Accept walk-ins, reschedule visits, or block time off directly from your phone in seconds.",
    },
    {
      title: "Optimized for Philippine networks",
      summary: "Small downloads, fast on budget phones and mobile data.",
      body: "Lightweight download sizes, smooth offline calendar viewing, and fast operation on budget phones and mobile data.",
    },
  ],
};

export const FAQS: Array<{ question: string; answer: string }> = [
  {
    question: "Is BooKanto really free?",
    answer:
      "Yes. Shops and customers use every feature free for the whole pilot, with no fees and no commissions. If paid plans come later, we'll give at least 30 days' notice, and your basic listing stays free.",
  },
  {
    question: "What kinds of shops can join?",
    answer:
      "Any local service that takes appointments or walk-ins: barbershops, salons, nail salons, spas, aircon cleaning, auto repair, car wash, laundry, pet grooming, home cleaning and more.",
  },
  {
    question: "Do my customers need to download an app?",
    answer:
      "Not right now. BooKanto works in any phone browser. Customers who use it often can add it to their home screen like an app. Dedicated mobile apps for Google Play Store and Apple App Store are also coming soon.",
  },
  {
    question: "When will the mobile apps for Play Store and App Store be released?",
    answer:
      "Dedicated apps for Android (Google Play Store) and iOS (Apple App Store) are currently in active development. Pilot partner shops will receive priority early access before the public store launch.",
  },
  {
    question: "How do customers pay?",
    answer: "They pay you directly at your shop, just like today. BooKanto doesn't take a cut.",
  },
  {
    question: "Do I need a business permit to join?",
    answer:
      "No. Uploading a DTI, SEC or Mayor's permit is optional. Shops that do get a Verified badge on their page.",
  },
  {
    question: "When can I start?",
    answer: `Our beta with the first partner shops starts February 15, 2027, and the public pilot opens ${PILOT_LAUNCH}. Send us a message now and we'll save you a spot.`,
  },
  {
    question: "Where is BooKanto available?",
    answer:
      "The pilot starts in one launch area and grows from there. Tell us where your shop is in the form below.",
  },
  {
    question: "How do you protect customer data?",
    answer:
      "We follow the Data Privacy Act (RA 10173). A customer's phone number and exact address are shown to a shop only after it accepts the booking, and chat happens inside the app.",
  },
];

/** The questions the landing page shows. The apps' release is answered in the mobile section. */
export const LANDING_FAQS = FAQS.filter(
  ({ question }) => !question.startsWith("When will the mobile apps"),
);
