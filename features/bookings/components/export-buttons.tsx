"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Printer, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatManila } from "@/lib/time";
import type { BookingListItem, ShopRevenueStats } from "../constants";

type ExportButtonsProps = {
  bookings: BookingListItem[];
  stats: ShopRevenueStats;
  shopName: string;
};

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, " ");
  return `"${str}"`;
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ExportButtons({ bookings, stats, shopName }: ExportButtonsProps) {
  const sanitizedShopSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const todayDateStr = new Date().toISOString().slice(0, 10);

  const downloadBookingsCsv = () => {
    const headers = [
      "Reference Code",
      "Date & Time (Manila)",
      "Service Name",
      "Customer Name",
      "Phone",
      "Staff Assigned",
      "Status",
      "Amount (PHP)",
      "Type",
      "Notes",
    ];

    const rows = bookings.map((b) => [
      escapeCsv(b.refCode),
      escapeCsv(formatManila(b.startAt, "yyyy-MM-dd HH:mm")),
      escapeCsv(b.serviceName),
      escapeCsv(b.customerName),
      escapeCsv(b.customerPhone || ""),
      escapeCsv(b.staffName || "Unassigned"),
      escapeCsv(b.status),
      b.totalCentavos !== null ? (b.totalCentavos / 100).toFixed(2) : "0.00",
      escapeCsv(b.isWalkIn ? "Walk-in" : "Online Booking"),
      escapeCsv(b.notes || ""),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    triggerDownload(csvContent, `bookings-${sanitizedShopSlug}-${todayDateStr}.csv`);
  };

  const downloadRevenueSummaryCsv = () => {
    const headers = [
      "Period",
      "Service Name",
      "Completed Bookings",
      "Gross Revenue (PHP)",
      "Revenue Share (%)",
    ];

    const rows = stats.topServices.map((s) => [
      escapeCsv(stats.periodLabel),
      escapeCsv(s.serviceName),
      s.bookingsCount,
      (s.grossCentavos / 100).toFixed(2),
      `${s.sharePercentage}%`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    triggerDownload(csvContent, `revenue-summary-${sanitizedShopSlug}-${stats.period}.csv`);
  };

  const downloadStaffPerformanceCsv = () => {
    const headers = [
      "Team Member",
      "Role",
      "Assigned Bookings",
      "Completed Bookings",
      "Completion Rate (%)",
      "Gross Revenue (PHP)",
    ];

    const rows = stats.staffPerformance.map((s) => {
      const rate = s.assignedCount > 0 ? Math.round((s.completedCount / s.assignedCount) * 100) : 0;
      return [
        escapeCsv(s.staffName),
        escapeCsv(s.role),
        s.assignedCount,
        s.completedCount,
        `${rate}%`,
        (s.grossCentavos / 100).toFixed(2),
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    triggerDownload(csvContent, `staff-performance-${sanitizedShopSlug}-${stats.period}.csv`);
  };

  const downloadDailyTrendCsv = () => {
    const headers = ["Date (Manila)", "Day Label", "Completed Bookings", "Gross Revenue (PHP)"];

    const rows = stats.dailyTrend.map((d) => [
      escapeCsv(d.date),
      escapeCsv(d.label),
      d.bookingsCount,
      (d.grossCentavos / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    triggerDownload(csvContent, `daily-trend-${sanitizedShopSlug}-${stats.period}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={downloadBookingsCsv}
        className="bg-white text-xs text-neutral-700 shadow-2xs hover:bg-neutral-50"
        title="Export full appointment records"
      >
        <Download className="mr-1.5 size-3.5 text-neutral-500" />
        Bookings (CSV)
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={downloadRevenueSummaryCsv}
        className="bg-white text-xs text-neutral-700 shadow-2xs hover:bg-neutral-50"
        title="Export service breakdown summary"
      >
        <FileSpreadsheet className="mr-1.5 size-3.5 text-neutral-500" />
        Services (CSV)
      </Button>

      {stats.staffPerformance.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadStaffPerformanceCsv}
          className="bg-white text-xs text-neutral-700 shadow-2xs hover:bg-neutral-50"
          title="Export team member performance and revenue"
        >
          <Users className="mr-1.5 size-3.5 text-neutral-500" />
          Staff (CSV)
        </Button>
      )}

      {stats.dailyTrend.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={downloadDailyTrendCsv}
          className="bg-white text-xs text-neutral-700 shadow-2xs hover:bg-neutral-50"
          title="Export daily revenue trend"
        >
          <Download className="mr-1.5 size-3.5 text-neutral-500" />
          Daily Trend (CSV)
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="bg-white text-xs text-neutral-700 shadow-2xs hover:bg-neutral-50"
      >
        <Printer className="mr-1.5 size-3.5 text-neutral-500" />
        Print Report
      </Button>
    </div>
  );
}
