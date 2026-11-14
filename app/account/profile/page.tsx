import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileForm } from "@/features/account/components/profile-form";
import { getUserProfile } from "@/features/account/queries";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "My Profile",
  description: "Manage your personal profile and account settings on BooKanto.",
};

export default async function ProfilePage() {
  const currentUser = await requireUser();
  const profile = await getUserProfile(currentUser.id);

  if (!profile) {
    notFound();
  }

  return <ProfileForm user={profile} />;
}
