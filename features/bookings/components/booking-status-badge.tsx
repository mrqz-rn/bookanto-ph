import * as React from "react";

import type { BookingStatus } from "@/lib/db/schema/enums";
import { BOOKING_STATUS_CONFIG } from "../constants";

export function BookingStatusBadge({
  status,
  className = "",
}: {
  status: BookingStatus;
  className?: string;
}) {
  const config = BOOKING_STATUS_CONFIG[status] || {
    label: status,
    badgeClass: "bg-neutral-100 text-neutral-800 border-neutral-200",
    dotClass: "bg-neutral-400",
    description: "",
  };

  return (
    <span
      title={config.description}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
}
