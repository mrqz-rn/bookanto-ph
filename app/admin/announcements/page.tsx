import type { Metadata } from "next";

import { AnnouncementsManager } from "@/features/admin/components/announcements/announcements-manager";
import { getAdminAnnouncements } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Announcements | BooKanto Admin",
};

export default async function AdminAnnouncementsPage() {
  const announcements = await getAdminAnnouncements();

  return (
    <div className="space-y-6">
      <AnnouncementsManager announcements={announcements} />
    </div>
  );
}
