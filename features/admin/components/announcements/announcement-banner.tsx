"use client";

import Link from "next/link";
import * as React from "react";
import { AlertCircle, AlertTriangle, ExternalLink, Info, Wrench, X } from "lucide-react";

import type { Announcement } from "@/lib/db/schema";
import type { AnnouncementKind } from "@/lib/db/schema/enums";

type AnnouncementBannerProps = {
  announcements: Announcement[];
};

const KIND_STYLES: Record<
  AnnouncementKind,
  { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  info: { bg: "bg-blue-600 text-white", text: "text-blue-100", icon: Info },
  warning: { bg: "bg-amber-600 text-white", text: "text-amber-100", icon: AlertTriangle },
  critical: { bg: "bg-rose-700 text-white", text: "text-rose-100", icon: AlertCircle },
  maintenance: { bg: "bg-purple-700 text-white", text: "text-purple-100", icon: Wrench },
};

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = React.useState<string[]>([]);

  if (!announcements || announcements.length === 0) return null;

  const visible = announcements.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col">
      {visible.map((item) => {
        const style = KIND_STYLES[item.kind] || KIND_STYLES.info;
        const Icon = style.icon;

        return (
          <div
            key={item.id}
            className={`relative flex items-center justify-between px-4 py-2.5 text-xs shadow-xs ${style.bg}`}
          >
            <div className="mx-auto flex max-w-7xl items-center gap-2 pr-6">
              <Icon className="size-4 shrink-0" />
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-bold">{item.title}:</span>
                <span>{item.message}</span>
                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:opacity-80"
                  >
                    {item.actionLabel || "Learn more"} <ExternalLink className="size-3" />
                  </Link>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDismissed((prev) => [...prev, item.id])}
              className="absolute top-2.5 right-3 rounded p-0.5 opacity-80 hover:opacity-100"
              aria-label="Dismiss banner"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
