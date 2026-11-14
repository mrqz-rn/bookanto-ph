# Marketing

The business landing page at `/`: features, pilot offer, pricing, investor pitch, FAQ and the contact form. Customers browse shops at `/explore`.

- Copy lives in `content.ts`. Every claim comes from the development plan and the pilot plan; change them together. Direct contact details (`CONTACT`) show beside the form once filled in.
- Action: `submitInquiry` stores messages in the `inquiries` table. It is public, so spam control is a hidden honeypot field plus 5 messages an hour per IP.
- No testimonials, customer logos or usage numbers until real pilot shops provide them.
