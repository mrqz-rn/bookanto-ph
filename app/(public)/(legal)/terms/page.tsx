import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/shared/legal-page";
import { ContactLink } from "@/features/marketing/components/contact-link";

// Written from the pilot plan's terms (free during the pilot, 30 days' notice
// before any paid plan) and the booking rules in the development plan. Have it
// reviewed by a lawyer before the public pilot.

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules for using BooKanto to find, book and offer local services in the Philippines.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="November 18, 2026">
      <p>
        These terms apply when you use BooKanto, as a customer booking a service or as a shop
        offering one. By creating an account or using BooKanto, you agree to them. If you don&apos;t
        agree, please don&apos;t use the service.
      </p>

      <h2>1. What BooKanto does</h2>
      <p>
        BooKanto is a marketplace and booking tool. It helps customers find local shops and request
        bookings, and helps shops manage their services, hours and bookings. A booking is an
        agreement between the customer and the shop. BooKanto is not the provider of the service and
        isn&apos;t a party to that agreement.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>
          You must be 18 or older to create an account. Younger customers should book with a parent
          or guardian.
        </li>
        <li>Give accurate information and keep it up to date.</li>
        <li>
          Keep access to your phone and email secure. You are responsible for what happens in your
          account.
        </li>
        <li>You can delete your account at any time in your account settings.</li>
      </ul>

      <h2>3. For customers</h2>
      <ul>
        <li>
          A booking request is not confirmed until the shop accepts it. Requests the shop
          doesn&apos;t answer in time expire on their own.
        </li>
        <li>
          Cancel within the shop&apos;s cancellation window if your plans change. Late cancellations
          and no-shows are recorded and may limit future bookings.
        </li>
        <li>You pay the shop directly. Prices shown are set by the shop.</li>
      </ul>

      <h2>4. For shops</h2>
      <ul>
        <li>
          Keep your listing accurate: services, prices, hours, location and photos you have the
          right to use.
        </li>
        <li>Hold the permits and licenses your business needs.</li>
        <li>
          Answer booking requests promptly, and honor bookings you accept or cancel them with a
          reason.
        </li>
        <li>
          Use customers&apos; information only to provide the booked service, and protect it as the
          Data Privacy Act requires.
        </li>
        <li>Verification documents you upload must be genuine and belong to your business.</li>
      </ul>

      <h2>5. Fees</h2>
      <p>
        BooKanto is free for shops and customers during the pilot, with no fees and no commissions.
        If we introduce paid plans later, we will give shops at least 30 days&apos; notice, and the
        basic listing will stay free. Customers book for free, with no convenience fees during the
        pilot.
      </p>

      <h2>6. Reviews and content</h2>
      <ul>
        <li>Only customers with a completed booking can review a shop.</li>
        <li>
          Reviews must be honest and about the service. No insults, threats, personal information or
          advertising.
        </li>
        <li>Shops may reply to reviews. We may hide reviews or messages that break these rules.</li>
        <li>
          You keep ownership of what you post. You allow us to host, show and share it as needed to
          run and promote BooKanto.
        </li>
      </ul>

      <h2>7. What you must not do</h2>
      <ul>
        <li>Make fake bookings or reviews, or pretend to be someone else.</li>
        <li>
          Send spam, harass other users or ask them to move payments off-platform to scam them.
        </li>
        <li>Offer illegal services.</li>
        <li>Copy data from BooKanto in bulk, or try to break or get around its security.</li>
      </ul>

      <h2>8. Suspension</h2>
      <p>
        We may suspend or remove accounts, listings or content that break these terms or put other
        users at risk. Where we can, we&apos;ll tell you why.
      </p>

      <h2>9. The pilot and our liability</h2>
      <p>
        BooKanto is in a pilot and is still changing. We work to keep it available and accurate, but
        we provide it as is and can&apos;t promise it will always work without errors. Shops are
        responsible for the services they provide. To the extent the law allows, BooKanto is not
        liable for indirect or consequential losses, or for disputes between customers and shops.
      </p>

      <h2>10. Privacy</h2>
      <p>
        Our <Link href="/privacy">Privacy Policy</Link> explains how we handle personal information.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        If we make important changes, we&apos;ll tell you in the app or by email before they take
        effect. Using BooKanto after that means you accept the new terms.
      </p>

      <h2>12. Governing law</h2>
      <p>These terms are governed by the laws of the Republic of the Philippines.</p>

      <h2>13. Contact us</h2>
      <p>
        Questions about these terms? Contact us through <ContactLink />.
      </p>
    </LegalPage>
  );
}
