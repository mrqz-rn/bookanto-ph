"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Edit2, ExternalLink, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AnnouncementAudience, AnnouncementKind } from "@/lib/db/schema/enums";
import { formatDate } from "@/lib/time";

import { deleteAnnouncement, toggleAnnouncementActive } from "../../actions";
import { ANNOUNCEMENT_KIND_COLORS } from "../../constants";
import { AnnouncementModal } from "./announcement-modal";

type AnnouncementItem = {
  id: string;
  title: string;
  message: string;
  kind: AnnouncementKind;
  targetAudience: AnnouncementAudience;
  actionUrl: string | null;
  actionLabel: string | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  authorName: string | null;
  authorEmail: string | null;
};

type AnnouncementsManagerProps = {
  announcements: AnnouncementItem[];
};

export function AnnouncementsManager({ announcements }: AnnouncementsManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<AnnouncementItem | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleToggle = async (id: string, currentActive: boolean) => {
    setBusyId(id);
    try {
      const res = await toggleAnnouncementActive({ id, isActive: !currentActive });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete announcement "${title}"?`)) return;
    setBusyId(id);
    try {
      const res = await deleteAnnouncement({ id });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Platform Announcements</h2>
          <p className="text-xs text-neutral-500">
            Publish site-wide alert banners, maintenance notices, and marketing messages.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          size="sm"
          className="bg-green-700 text-xs text-white hover:bg-green-800"
        >
          <Plus className="mr-1.5 size-4" /> New Announcement
        </Button>
      </div>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center text-xs text-neutral-500 shadow-2xs">
            No announcements created yet. Click &ldquo;New Announcement&rdquo; to publish one.
          </div>
        ) : (
          announcements.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border bg-white p-5 shadow-2xs transition-shadow hover:shadow-sm ${
                item.isActive ? "border-neutral-200" : "border-neutral-200 opacity-60"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                        ANNOUNCEMENT_KIND_COLORS[item.kind]
                      }`}
                    >
                      {item.kind}
                    </span>

                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-700 uppercase">
                      Audience: {item.targetAudience}
                    </span>

                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => handleToggle(item.id, item.isActive)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                        item.isActive
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </button>

                    <span className="text-[11px] text-neutral-400">
                      Created {formatDate(item.createdAt)}
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-neutral-900">{item.title}</h3>
                  <p className="mt-1 text-xs whitespace-pre-line text-neutral-700">
                    {item.message}
                  </p>

                  {(item.startsAt || item.endsAt) && (
                    <p className="mt-2 text-[11px] text-neutral-500">
                      Schedule: {item.startsAt ? formatDate(item.startsAt) : "Immediate"} →{" "}
                      {item.endsAt ? formatDate(item.endsAt) : "Indefinite"}
                    </p>
                  )}

                  {item.actionUrl && (
                    <div className="mt-2">
                      <Link
                        href={item.actionUrl}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 hover:underline"
                      >
                        {item.actionLabel || "Action Link"} <ExternalLink className="size-3" />
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingItem(item);
                      setModalOpen(true);
                    }}
                    className="h-8 px-2.5 text-neutral-700 hover:text-neutral-900"
                  >
                    <Edit2 className="mr-1 size-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === item.id}
                    onClick={() => handleDelete(item.id, item.title)}
                    className="h-8 px-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="mr-1 size-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnnouncementModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        announcement={editingItem}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
