import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UserDetailView } from "@/features/admin/components/users/user-detail-view";
import { getAdminUserById } from "@/features/admin/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "User Profile | BooKanto Admin",
};

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;
  const user = await getAdminUserById(id);
  const currentUser = await getCurrentUser();

  if (!user) {
    notFound();
  }

  return <UserDetailView user={user} isSuperAdmin={currentUser?.platformRole === "super_admin"} />;
}
