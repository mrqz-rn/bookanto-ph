import { describe, expect, it } from "vitest";

import { parseEwkbPoint } from "@/lib/db/schema/columns";

function ewkbPoint(lng: number, lat: number, { srid = true, littleEndian = true } = {}): string {
  const bytes = Buffer.alloc(srid ? 25 : 21);
  const offset = srid ? 9 : 5;
  bytes.writeUInt8(littleEndian ? 1 : 0, 0);
  const type = srid ? 0x20000001 : 1;
  if (littleEndian) {
    bytes.writeUInt32LE(type, 1);
    if (srid) bytes.writeUInt32LE(4326, 5);
    bytes.writeDoubleLE(lng, offset);
    bytes.writeDoubleLE(lat, offset + 8);
  } else {
    bytes.writeUInt32BE(type, 1);
    if (srid) bytes.writeUInt32BE(4326, 5);
    bytes.writeDoubleBE(lng, offset);
    bytes.writeDoubleBE(lat, offset + 8);
  }
  return bytes.toString("hex");
}

// Marikina City Hall.
const marikina = { lng: 121.1029, lat: 14.6507 };

describe("parseEwkbPoint", () => {
  it("reads points with an SRID, as PostGIS returns them", () => {
    expect(parseEwkbPoint(ewkbPoint(marikina.lng, marikina.lat))).toEqual(marikina);
  });

  it("reads points without an SRID and in big-endian order", () => {
    expect(parseEwkbPoint(ewkbPoint(marikina.lng, marikina.lat, { srid: false }))).toEqual(
      marikina,
    );
    expect(parseEwkbPoint(ewkbPoint(marikina.lng, marikina.lat, { littleEndian: false }))).toEqual(
      marikina,
    );
  });
});
