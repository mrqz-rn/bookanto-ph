"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnnouncementAudience, AnnouncementKind } from "@/lib/db/schema/enums";

import { upsertAnnouncement } from "../../actions";

type AnnouncementData = {
  id?: string;
  title: string;
  message: string;
  kind: AnnouncementKind;
  targetAudience: AnnouncementAudience;
  actionUrl: string | null;
  actionLabel: string | null;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
};

type AnnouncementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  announcement?: AnnouncementData | null;
  onSuccess: () => void;
};

export function AnnouncementModal({
  isOpen,
  onClose,
  announcement,
  onSuccess,
}: AnnouncementModalProps) {
  const [title, setTitle] = React.useState(announcement?.title ?? "");
  const [message, setMessage] = React.useState(announcement?.message ?? "");
  const [kind, setKind] = React.useState<AnnouncementKind>(announcement?.kind ?? "info");
  const [targetAudience, setTargetAudience] = React.useState<AnnouncementAudience>(
    announcement?.targetAudience ?? "all",
  );
  const [actionUrl, setActionUrl] = React.useState(announcement?.actionUrl ?? "");
  const [actionLabel, setActionLabel] = React.useState(announcement?.actionLabel ?? "");
  const [isActive, setIsActive] = React.useState(announcement?.isActive ?? true);
  const [startsAt, setStartsAt] = React.useState(
    announcement?.startsAt ? new Date(announcement.startsAt).toISOString().slice(0, 16) : "",
  );
  const [endsAt, setEndsAt] = React.useState(
    announcement?.endsAt ? new Date(announcement.endsAt).toISOString().slice(0, 16) : "",
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (announcement) {
      setTitle(announcement.title);
      setMessage(announcement.message);
      setKind(announcement.kind);
      setTargetAudience(announcement.targetAudience);
      setActionUrl(announcement.actionUrl ?? "");
      setActionLabel(announcement.actionLabel ?? "");
      setIsActive(announcement.isActive);
      setStartsAt(
        announcement.startsAt ? new Date(announcement.startsAt).toISOString().slice(0, 16) : "",
      );
      setEndsAt(
        announcement.endsAt ? new Date(announcement.endsAt).toISOString().slice(0, 16) : "",
      );
    } else {
      setTitle("");
      setMessage("");
      setKind("info");
      setTargetAudience("all");
      setActionUrl("");
      setActionLabel("");
      setIsActive(true);
      setStartsAt("");
      setEndsAt("");
    }
    setError(null);
  }, [announcement, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await upsertAnnouncement({
        id: announcement?.id,
        title: title.trim(),
        message: message.trim(),
        kind,
        targetAudience,
        actionUrl: actionUrl.trim() || null,
        actionLabel: actionLabel.trim() || null,
        isActive,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.message);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-neutral-900">
            {announcement ? "Edit Announcement" : "Create Platform Announcement"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-neutral-700">Announcement Title</label>
            <Input
              required
              placeholder="e.g. Scheduled System Maintenance"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-700">Message Content</label>
            <Textarea
              required
              rows={3}
              placeholder="e.g. BooKanto will undergo scheduled maintenance this Sunday from 2 AM to 4 AM Manila time."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700">Banner Severity</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as AnnouncementKind)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
              >
                <option value="info">Info (Blue)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="critical">Critical (Rose)</option>
                <option value="maintenance">Maintenance (Purple)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700">Target Audience</label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as AnnouncementAudience)}
                className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700"
              >
                <option value="all">All Visitors & Users</option>
                <option value="customers">Customers Only</option>
                <option value="shops">Shops & Merchants Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700">Optional Action URL</label>
              <Input
                type="url"
                placeholder="https://... or /explore"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700">Button Label</label>
              <Input
                placeholder="e.g. Learn More"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-700">Starts At (Optional)</label>
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700">Ends At (Optional)</label>
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 rounded border-neutral-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-xs font-semibold text-neutral-800">
                Active (Display immediately if within date range)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !title.trim() || !message.trim()}
              className="bg-green-700 text-xs text-white hover:bg-green-800"
            >
              {loading ? "Saving..." : announcement ? "Update Announcement" : "Create Announcement"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
