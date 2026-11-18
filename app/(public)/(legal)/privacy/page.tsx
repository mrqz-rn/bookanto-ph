import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/shared/legal-page";
import { ContactLink } from "@/features/marketing/components/contact-link";

// Written from how BooKanto works (development plan, security and privacy
// sections). Have it reviewed by a lawyer, and name the Data Protection
// Officer, before the public pilot.

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How BooKanto collects, uses and protects your personal information under the Data Privacy Act of 2012.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="November 18, 2026">
      <p>
        BooKanto is an online marketplace where customers find and book local service shops in the
        Philippines, and where shops manage those bookings. This policy explains what personal
        information we collect, why, and the choices you have. We follow the Data Privacy Act of
        2012 (Republic Act No. 10173).
      </p>

      <h2>1. Information we collect</h2>
      <h3>When you create an account</h3>
      <ul>
        <li>Your name, mobile number and email address.</li>
        <li>Basic profile details from Google or Facebook, if you choose to sign in with them.</li>
        <li>Addresses you save for home-service bookings.</li>
      </ul>
      <h3>When you book or run a shop</h3>
      <ul>
        <li>
          Booking details: the service, date and time, notes, and for home services the address and
          map location.
        </li>
        <li>Messages and photos you send in a booking&apos;s chat, and reviews you post.</li>
        <li>
          For shops: business name, address, map location, hours, services, prices, photos, and
          verification documents (DTI, SEC or Mayor&apos;s permit) if you upload them.
        </li>
      </ul>
      <h3>When you contact us</h3>
      <ul>
        <li>Your name, email or mobile number, business name, city and message.</li>
      </ul>
      <h3>Automatically</h3>
      <ul>
        <li>
          Your IP address, device and browser type, the pages you visit, and error reports, to keep
          the service working and secure.
        </li>
        <li>
          Your location only if you tap &ldquo;Use my location&rdquo;. We round it to about 1 km,
          keep it on your device, and use it only to sort shops by distance.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create your account and sign you in, including emailing you one-time codes.</li>
        <li>
          To make, confirm, change and remind you about bookings, by email or app notification.
        </li>
        <li>To let customers and shops chat about a booking, and to show reviews.</li>
        <li>To verify shops that upload business documents.</li>
        <li>To answer messages sent through our contact form.</li>
        <li>To prevent fraud, spam and abuse, and to keep accounts secure.</li>
        <li>To understand how BooKanto is used, in aggregate, so we can improve it.</li>
        <li>To meet our legal obligations.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>3. What shops and other users see</h2>
      <ul>
        <li>
          When you request a booking, the shop sees your name and the booking details. Your mobile
          number and exact address are shown to the shop only after it accepts the booking.
        </li>
        <li>Chat happens inside BooKanto, so you don&apos;t have to share your personal number.</li>
        <li>
          Reviews are public on the shop&apos;s page, with the name on your profile. Reviews can
          only come from completed bookings.
        </li>
        <li>A shop&apos;s listing, photos, prices, hours and reviews are public.</li>
      </ul>

      <h2>4. Who we share it with</h2>
      <p>
        We share personal information only with service providers that help us run BooKanto, under
        agreements that require them to protect it, and with authorities when the law requires it.
        Our providers include:
      </p>
      <ul>
        <li>Vercel and Supabase, for hosting, our database, sign-in and file storage.</li>
        <li>Resend, for email, including sign-in codes, booking confirmations and reminders.</li>
        <li>Google Maps, for maps and addresses.</li>
        <li>Cloudflare Turnstile, to block automated sign-ups.</li>
        <li>Sentry and PostHog, for error reports and usage statistics.</li>
      </ul>

      <h2>5. Where we store it and how we protect it</h2>
      <p>
        Our servers are in Singapore. Data is encrypted in transit and at rest. Access is limited to
        people who need it, and administrator access to bookings is logged. Verification documents
        are kept in private storage and opened only through links that expire after a few minutes.
      </p>

      <h2>6. How long we keep it</h2>
      <p>
        We keep your information while your account is open and only as long as we need it for the
        purposes above. When you delete your account, we delete or anonymize your personal
        information, except records we must keep to meet legal obligations, resolve disputes or
        prevent fraud. Contact form messages are kept only as long as needed to follow up.
      </p>

      <h2>7. Cookies and device storage</h2>
      <p>
        We use cookies to keep you signed in. They can&apos;t be read by other websites. Your chosen
        city or location is saved in your browser&apos;s storage so you don&apos;t have to pick it
        again.
      </p>

      <h2>8. Your rights</h2>
      <p>Under the Data Privacy Act, you have the right to:</p>
      <ul>
        <li>be informed about how your data is processed;</li>
        <li>access your personal information and get a copy of it;</li>
        <li>correct information that is wrong or out of date;</li>
        <li>object to processing, and ask us to delete or block your data;</li>
        <li>take your data to another service;</li>
        <li>
          file a complaint with the{" "}
          <a href="https://privacy.gov.ph" rel="noopener noreferrer">
            National Privacy Commission
          </a>
          .
        </li>
      </ul>
      <p>
        You can edit your profile or delete your account in your{" "}
        <Link href="/account">account settings</Link>. For anything else, contact us through{" "}
        <ContactLink />.
      </p>

      <h2>9. Data breaches</h2>
      <p>
        If a breach puts your personal information at risk, we will notify the National Privacy
        Commission and the people affected within 72 hours of finding out, as the law requires.
      </p>

      <h2>10. Children</h2>
      <p>
        BooKanto is for people 18 and older. Younger customers should book with a parent or
        guardian.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        If we make important changes, we&apos;ll tell you in the app or by email before they take
        effect. The date at the top shows the latest version.
      </p>

      <h2>12. Contact us</h2>
      <p>
        For privacy questions or requests, or to reach our Data Protection Officer, contact us
        through <ContactLink />.
      </p>
    </LegalPage>
  );
}
