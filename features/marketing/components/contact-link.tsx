import Link from "next/link";

import { CONTACT } from "../content";

/** How to reach us in running text: the email once it's set, else the contact form. */
export function ContactLink() {
  if (CONTACT.email) return <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>;
  return <Link href="/#contact">the contact form on our home page</Link>;
}
