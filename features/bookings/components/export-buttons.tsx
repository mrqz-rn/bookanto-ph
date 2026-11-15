"use client";

import * as React from "react";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatManila } from "@/lib/time";
import type { BookingListItem, ShopRevenueStats } from "../constants";

type ExportButtonsProps = {
  bookings: BookingListItem[];
  stats: ShopRevenueStats;
  shopName: string;
};

export function ExportButtons({ bookings, stats, shopName }: ExportButtonsProps) {
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
      `"${b.refCode}"`,
      `"${formatManila(b.startAt, "yyyy-MM-dd HH:mm")}"`,
      `"${b.serviceName.replace(/"/g, '""')}"`,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${b.customerPhone || ""}"`,
      `"${(b.staffName || "Unassigned").replace(/"/g, '""')}"`,
      `"${b.status}"`,
      b.totalCentavos !== null ? (b.totalCentavos / 100).toFixed(2) : "0.00",
      b.isWalkIn ? "Walk-in" : "Online Booking",
      `"${(b.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `bookings-${shopName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadRevenueSummaryCsv = () => {
    const headers = ["Period / Date", "Service Name", "Completed Bookings", "Gross Revenue (PHP)"];
    const rows = stats.topServices.map((s) => [
      `"${stats.periodLabel}"`,
      `"${s.serviceName.replace(/"/g, '""')}"`,
      s.bookingsCount,
      (s.grossCentavos / 100).toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `revenue-${shopName.toLowerCase().replace(/\s+/g, "-")}-${stats.period}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        className="bg-white text-xs text-neutral-700 shadow-2xs"
      >
        <Download className="mr-1.5 size-3.5" />
        Export Bookings (CSV)
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={downloadRevenueSummaryCsv}
        className="bg-white text-xs text-neutral-700 shadow-2xs"
      >
        <Download className="mr-1.5 size-3.5" />
        Export Revenue Summary (CSV)
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="bg-white text-xs text-neutral-700 shadow-2xs"
      >
        <Printer className="mr-1.5 size-3.5" />
        Print Report
      </Button>
    </div>
  );
}
