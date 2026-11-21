import * as React from "react";

import { formatPeso } from "@/lib/money";

import { EmptyChart, Panel, PanelHeader } from "./panel";

type RankedItem = {
  id: string;
  name: string;
  bookingsCount: number;
  gmvCentavos: number;
};

type RankedBarsProps = {
  id: string;
  title: string;
  description: string;
  items: RankedItem[];
  emptyIcon: React.ComponentType<{ className?: string }>;
  emptyTitle: string;
  /** Rows shown before the rest fold into one "Other" row. */
  limit?: number;
};

/** Bookings per category or city, longest first, values at the bar tips. */
export function RankedBars({
  id,
  title,
  description,
  items,
  emptyIcon,
  emptyTitle,
  limit = 8,
}: RankedBarsProps) {
  const sorted = [...items].sort((a, b) => b.bookingsCount - a.bookingsCount);
  const shown = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const rows: RankedItem[] =
    rest.length > 0
      ? [
          ...shown,
          {
            id: "other",
            name: `${rest.length} more`,
            bookingsCount: rest.reduce((sum, r) => sum + r.bookingsCount, 0),
            gmvCentavos: rest.reduce((sum, r) => sum + r.gmvCentavos, 0),
          },
        ]
      : shown;
  const maxCount = Math.max(...rows.map((r) => r.bookingsCount), 1);

  return (
    <Panel aria-labelledby={id}>
      <PanelHeader id={id} title={title} description={description} />

      {rows.length === 0 ? (
        <EmptyChart icon={emptyIcon} title={emptyTitle} />
      ) : (
        <table className="mt-5 w-full text-sm">
          <thead className="sr-only">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Bookings</th>
              <th scope="col">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="align-middle">
                <th
                  scope="row"
                  className="w-[38%] max-w-0 truncate py-2 pr-3 text-left font-medium text-foreground sm:w-[32%]"
                  title={row.name}
                >
                  {row.name}
                </th>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 shrink-0 rounded-r-[4px] bg-green-600"
                      // Leaves room for the count at the tip of the longest bar.
                      style={{
                        width: `max(2px, calc((100% - 3.5rem) * ${row.bookingsCount / maxCount}))`,
                      }}
                      aria-hidden
                    />
                    <span className="shrink-0 font-semibold text-foreground tabular-nums">
                      {row.bookingsCount.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="w-[5.5rem] py-2 text-right text-muted-foreground tabular-nums">
                  {formatPeso(row.gmvCentavos)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
