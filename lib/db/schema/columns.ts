import { sql, type SQL } from "drizzle-orm";
import { customType, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

export const id = () => uuid("id").primaryKey().defaultRandom();

// updated_at is kept current by the set_updated_at trigger, so updates made
// inside database functions are covered too.
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** CHECK expression limiting a text column to a fixed list of values. */
export function oneOf(column: AnyPgColumn, values: readonly string[]): SQL {
  // The values are constants from enums.ts, never user input.
  const list = values.map((value) => `'${value}'`).join(", ");
  return sql`${column} in (${sql.raw(list)})`;
}

/** CHECK expression for URL slugs such as "kuya-jun-barbershop-marikina". */
export function isSlug(column: AnyPgColumn): SQL {
  return sql`${column} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`;
}

export type LngLat = { lng: number; lat: number };

/**
 * A PostGIS geography point (WGS 84). Distances on it are in meters.
 * drizzle-kit wraps this type in quotes in generated SQL; remove them by hand
 * (tests/unit/db/migrations.test.ts fails until you do).
 */
export const geographyPoint = customType<{ data: LngLat; driverData: string }>({
  dataType() {
    return "geography(Point,4326)";
  },
  toDriver({ lng, lat }) {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw new RangeError("Coordinates must be finite numbers");
    }
    return `SRID=4326;POINT(${lng} ${lat})`;
  },
  fromDriver(value) {
    return parseEwkbPoint(value);
  },
});

/** Decodes the hex EWKB that Postgres returns for a geography point. */
export function parseEwkbPoint(hex: string): LngLat {
  const bytes = Buffer.from(hex, "hex");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const littleEndian = view.getUint8(0) === 1;
  const type = view.getUint32(1, littleEndian);
  if ((type & 0xff) !== 1) throw new TypeError("Not a point");
  const hasSrid = (type & 0x20000000) !== 0;
  const offset = hasSrid ? 9 : 5;
  return {
    lng: view.getFloat64(offset, littleEndian),
    lat: view.getFloat64(offset + 8, littleEndian),
  };
}
