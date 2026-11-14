import type { Metadata } from "next";

import { AddressList } from "@/features/account/components/address-list";
import { getCitiesWithBarangays, getSavedAddresses } from "@/features/account/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Saved Addresses",
  description: "Manage your saved addresses for home service bookings on BooKanto.",
};

export default async function AddressesPage() {
  const user = await requireUser();
  const [addresses, cities] = await Promise.all([
    getSavedAddresses(user.id),
    getCitiesWithBarangays(),
  ]);

  return <AddressList addresses={addresses} cities={cities} />;
}
