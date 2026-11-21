import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SHOP_REGISTRATION_ROUTE } from "@/lib/home";

/** Invitation to shop owners. Leads to the registration explainer, then the wizard. */
export function ListYourShop() {
  return (
    <section
      aria-labelledby="list-your-shop-heading"
      className="rounded-xl bg-navy-900 px-5 py-8 text-white sm:px-10 sm:py-10"
    >
      <p className="text-sm font-semibold text-yellow-400">May shop ka?</p>
      <h2 id="list-your-shop-heading" className="mt-1 font-display text-3xl font-bold sm:text-4xl">
        List your shop on BooKanto
      </h2>
      <p className="mt-3 max-w-prose text-white/85">
        Get bookings from customers nearby. Accept requests, add walk-ins and see your whole day
        from your phone.
      </p>
      <Button asChild size="lg" className="mt-6">
        <Link href={SHOP_REGISTRATION_ROUTE}>List your shop</Link>
      </Button>
    </section>
  );
}
