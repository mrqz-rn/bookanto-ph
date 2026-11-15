import { NextResponse } from "next/server";

export async function GET() {
  const appleAppSiteAssociation = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: ["TEAMID1234.ph.bookanto.app"],
          components: [
            { "/": "/shop/*", comment: "Shop profile deep links" },
            { "/": "/book/*", comment: "Booking flow deep links" },
            { "/": "/dashboard/*", comment: "Shop manager dashboard deep links" },
            { "/": "/account/*", comment: "User account and bookings deep links" },
            { "/": "/explore*", comment: "Discovery page" },
          ],
        },
      ],
    },
    webcredentials: {
      apps: ["TEAMID1234.ph.bookanto.app"],
    },
  };

  return NextResponse.json(appleAppSiteAssociation, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
