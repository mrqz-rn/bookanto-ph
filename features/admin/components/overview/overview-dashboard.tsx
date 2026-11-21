import Link from "next/link";
import { cn } from "cn";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  Scale,
  ShieldAlert,
  Store,
  type LucideIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { formatPeso } from "@/lib/money";
import { formatTimeAgo } from "@/lib/time";

import { auditActionLabel, FRAUD_SIGNAL_LABELS } from "../../constants";
import type { AdminOverviewStats, WeekOverWeek } from "../../queries";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2";

/** One card style for the whole page. */
const card = "rounded-xl border border-neutral-200 bg-white";

// ---------------------------------------------------------------------------
// Needs your attention

function AttentionTile({
  href,
  icon: Icon,
  count,
  label,
  waitingText,
  clearText,
}: {
  href: string;
  icon: LucideIcon;
  count: number;
  label: string;
  waitingText: string;
  clearText: string;
}) {
  const waiting = count > 0;
  return (
    <Link
      href={href}
      className={cn(
        card,
        "group flex flex-col gap-3 p-5 transition-[transform,box-shadow,border-color] duration-200 hover:border-neutral-300 hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
        focusRing,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-700">
          <Icon aria-hidden className="size-[18px] text-neutral-500" />
          {label}
        </span>
        {waiting ? (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <span aria-hidden className="size-2 rounded-full bg-amber-500" />
            Waiting
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
            <CheckCircle2 aria-hidden className="size-3.5" />
            All clear
          </span>
        )}
      </div>
      <p className="font-display text-4xl font-bold text-navy-900 tabular-nums">{count}</p>
      <p className="flex items-center justify-between gap-2 text-sm text-neutral-600">
        <span>{waiting ? waitingText : clearText}</span>
        <ArrowRight
          aria-hidden
          className="size-4 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:text-green-700 motion-safe:group-hover:translate-x-0.5"
        />
      </p>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Last 7 days

function Change({ figure, format }: { figure: WeekOverWeek; format: (n: number) => string }) {
  const diff = figure.current - figure.previous;
  if (diff === 0) {
    return <p className="text-xs text-neutral-500">Same as the 7 days before</p>;
  }
  const up = diff > 0;
  return (
    <p className={cn("text-xs font-medium", up ? "text-green-700" : "text-neutral-600")}>
      <span aria-hidden>{up ? "▲" : "▼"} </span>
      {format(Math.abs(diff))} {up ? "more" : "fewer"} than the 7 days before
    </p>
  );
}

function WeekTile({
  label,
  figure,
  format = (n) => n.toLocaleString("en-PH"),
}: {
  label: string;
  figure: WeekOverWeek;
  format?: (n: number) => string;
}) {
  return (
    <div className={cn(card, "flex flex-col gap-1.5 p-5")}>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="font-display text-3xl font-bold text-navy-900 tabular-nums">
        {format(figure.current)}
      </p>
      <Change figure={figure} format={format} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Queues and activity

function Panel({
  title,
  link,
  children,
}: {
  title: string;
  link: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className={cn(card, "flex flex-col")} aria-label={title}>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3">
        <h3 className="text-base font-semibold text-navy-900">{title}</h3>
        <Link
          href={link.href}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-sm font-medium text-green-700 hover:underline",
            focusRing,
          )}
        >
          {link.label}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex flex-1 items-center justify-center px-5 py-10 text-center text-sm text-neutral-500">
      {children}
    </p>
  );
}

const rowLink = cn(
  "flex min-h-14 items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-neutral-50",
  focusRing,
  "focus-visible:ring-inset focus-visible:ring-offset-0",
);

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-50 text-red-800",
  high: "bg-orange-50 text-orange-800",
  medium: "bg-amber-50 text-amber-900",
  low: "bg-neutral-100 text-neutral-700",
};

function DocumentCount({ count, className }: { count: number; className?: string }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1 text-xs font-medium",
        count > 0 ? "text-neutral-600" : "text-amber-800",
        className,
      )}
    >
      <FileText aria-hidden className="size-3.5" />
      {count > 0 ? `${count} ${count === 1 ? "document" : "documents"}` : "No documents"}
    </span>
  );
}

function PendingShops({ shops }: { shops: AdminOverviewStats["recentPending"] }) {
  if (shops.length === 0) {
    return <Empty>No shops waiting. New registrations appear here.</Empty>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {shops.map((shop) => (
        <li key={shop.id}>
          <Link href={`/admin/shops/${shop.id}`} className={rowLink}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900">{shop.name}</p>
              <p className="truncate text-xs text-neutral-600">
                {[shop.ownerName, shop.cityName].filter(Boolean).join(" · ") || "Owner not named"}
                {" · "}registered {formatTimeAgo(shop.createdAt)}
              </p>
              {/* Under the name on phones; beside it from 640px. */}
              <DocumentCount count={shop.documentCount} className="mt-1 sm:hidden" />
            </div>
            <DocumentCount count={shop.documentCount} className="hidden shrink-0 sm:flex" />
            <ChevronRight aria-hidden className="size-4 shrink-0 text-neutral-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function OpenDisputes({ reports }: { reports: AdminOverviewStats["recentReports"] }) {
  if (reports.length === 0) {
    return <Empty>No open disputes or reports.</Empty>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {reports.map((report) => {
        const target = report.bookingId ? "booking" : "review";
        return (
          <li key={report.id}>
            <Link href={`/admin/disputes?status=open&target=${target}`} className={rowLink}>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm text-navy-900">{report.reason}</p>
                <p className="mt-0.5 truncate text-xs text-neutral-600">
                  {target === "booking" ? "Booking dispute" : "Review report"} from{" "}
                  {report.reporterName || "a customer"} · {formatTimeAgo(report.createdAt)}
                </p>
              </div>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-neutral-400" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function FraudSignals({ signals }: { signals: AdminOverviewStats["recentSignals"] }) {
  if (signals.length === 0) {
    return <Empty>No active fraud signals.</Empty>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {signals.map((signal) => (
        <li key={signal.id}>
          <Link href="/admin/fraud" className={rowLink}>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900">
                {FRAUD_SIGNAL_LABELS[signal.signalType] ?? signal.signalType}
              </p>
              <p className="truncate text-xs text-neutral-600">
                On a {signal.targetType} · score {signal.score} · {formatTimeAgo(signal.createdAt)}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
                SEVERITY_STYLE[signal.severity] ?? SEVERITY_STYLE.low,
              )}
            >
              {signal.severity}
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-neutral-400" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RecentActivity({ entries }: { entries: NonNullable<AdminOverviewStats["recentAudit"]> }) {
  if (entries.length === 0) {
    return <Empty>No activity recorded yet.</Empty>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-h-14 items-center gap-3 px-5 py-3">
          <p className="min-w-0 flex-1 text-sm text-neutral-800">
            <span className="font-semibold text-navy-900">
              {entry.actorName || entry.actorEmail || "BooKanto"}
            </span>{" "}
            {auditActionLabel(entry.action)}
          </p>
          <time
            dateTime={entry.createdAt.toISOString()}
            className="shrink-0 text-xs text-neutral-500"
          >
            {formatTimeAgo(entry.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

export function OverviewDashboard({ stats }: { stats: AdminOverviewStats }) {
  const { attention, lastWeek, totals } = stats;
  const pesos = (centavos: number) => formatPeso(centavos);

  return (
    <div className="space-y-10">
      <section aria-labelledby="attention-heading">
        <h2 id="attention-heading" className="text-lg font-semibold text-navy-900">
          Needs your attention
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <AttentionTile
            href="/admin/shops?status=pending"
            icon={Store}
            count={attention.pendingShops}
            label="Shops to review"
            waitingText="Check documents and approve"
            clearText="No registrations waiting"
          />
          <AttentionTile
            href="/admin/disputes?status=open"
            icon={Scale}
            count={attention.openReports}
            label="Open disputes"
            waitingText="Bookings and reviews to settle"
            clearText="Nothing to settle"
          />
          <AttentionTile
            href="/admin/fraud"
            icon={ShieldAlert}
            count={attention.activeFraud}
            label="Fraud signals"
            waitingText="Patterns to look into"
            clearText="No active signals"
          />
        </div>
      </section>

      <section aria-labelledby="week-heading">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 id="week-heading" className="text-lg font-semibold text-navy-900">
            Last 7 days
          </h2>
          <Link
            href="/admin/analytics"
            className={cn(
              "inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-green-700 hover:underline",
              focusRing,
            )}
          >
            Pilot metrics
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <WeekTile label="Bookings made" figure={lastWeek.bookingsMade} />
          <WeekTile label="Bookings completed" figure={lastWeek.bookingsCompleted} />
          <WeekTile
            label="Value of completed bookings"
            figure={lastWeek.completedValueCentavos}
            format={pesos}
          />
          <WeekTile label="New customers" figure={lastWeek.newCustomers} />
        </div>
        <p className="mt-3 text-sm text-neutral-600">
          All time: {totals.liveShops.toLocaleString("en-PH")} live shops ·{" "}
          {totals.users.toLocaleString("en-PH")} accounts ·{" "}
          {totals.bookings.toLocaleString("en-PH")} bookings
        </p>
      </section>

      <section aria-labelledby="queues-heading">
        <h2 id="queues-heading" className="text-lg font-semibold text-navy-900">
          Queues
        </h2>
        <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          <Panel
            title="Shops waiting longest"
            link={{ href: "/admin/shops?status=pending", label: "All pending" }}
          >
            <PendingShops shops={stats.recentPending} />
          </Panel>
          <Panel
            title="Oldest open disputes"
            link={{ href: "/admin/disputes?status=open", label: "All disputes" }}
          >
            <OpenDisputes reports={stats.recentReports} />
          </Panel>
          <Panel title="Top fraud signals" link={{ href: "/admin/fraud", label: "All signals" }}>
            <FraudSignals signals={stats.recentSignals} />
          </Panel>
          {stats.recentAudit && (
            <Panel title="Recent activity" link={{ href: "/admin/audit", label: "Audit log" }}>
              <RecentActivity entries={stats.recentAudit} />
            </Panel>
          )}
        </div>
      </section>
    </div>
  );
}

/** Shown while the figures load. */
export function OverviewDashboardSkeleton() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Loading the overview">
      <div>
        <Skeleton className="h-6 w-48" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-32" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
