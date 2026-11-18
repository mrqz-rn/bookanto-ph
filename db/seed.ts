// Demo data for local development and staging: categories, cities, and 30
// demo shops with services, hours and reviews. Production never gets this.
//
//   pnpm db:seed
//
// Categories and cities are upserted, so re-running refreshes them. Demo shops
// are added once. Refuses a non-local database unless SEED_REMOTE=staging.
import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../lib/db/schema";
import type { BookingType, PriceType } from "../lib/db/schema/enums";
import { SAMPLE_ACCOUNTS } from "../features/auth/constants";
import { HOLIDAY_TEMPLATES } from "../features/availability/holidays";

loadEnvConfig(process.cwd());

type ServiceSeed = [name: string, pesos: number | null, durationMin: number, type?: PriceType];

const CATEGORIES: Array<{
  slug: string;
  name: string;
  icon: string;
  bookingType: BookingType;
  services: ServiceSeed[];
  shops: string[];
}> = [
  {
    slug: "barbershop",
    name: "Barbershop",
    icon: "scissors",
    bookingType: "slot",
    services: [
      ["Haircut", 150, 30],
      ["Haircut and shave", 220, 45],
      ["Kids haircut", 120, 30],
    ],
    shops: [
      "Kuya Jun's Barbershop",
      "Kanto Cuts",
      "Barbero ni Mang Ben",
      "Fade Station",
      "Gupit Pinoy",
    ],
  },
  {
    slug: "hair-salon",
    name: "Hair salon",
    icon: "sparkles",
    bookingType: "slot",
    services: [
      ["Haircut and blow-dry", 350, 60, "starts_at"],
      ["Hair color", 1200, 120, "starts_at"],
      ["Rebond", 2500, 180, "starts_at"],
    ],
    shops: ["Ate Lorna's Salon", "Ganda Hair Studio", "Suklay Salon", "Bagong Look Salon"],
  },
  {
    slug: "nail-salon",
    name: "Nail salon",
    icon: "hand",
    bookingType: "slot",
    services: [
      ["Manicure", 150, 45],
      ["Pedicure", 180, 45],
      ["Gel polish", 450, 60],
    ],
    shops: ["Kuko Nail Bar", "Pink Tips Nail Spa", "Polish and Co."],
  },
  {
    slug: "massage",
    name: "Massage and spa",
    icon: "flower-2",
    bookingType: "slot",
    services: [
      ["Swedish massage, 1 hour", 500, 60],
      ["Hilot, 1 hour", 450, 60],
      ["Foot spa", 350, 45],
    ],
    shops: ["Hilot Haven", "Ginhawa Spa", "Relax Lang Massage"],
  },
  {
    slug: "aircon-cleaning",
    name: "Aircon cleaning",
    icon: "air-vent",
    bookingType: "home",
    services: [
      ["Window-type cleaning", 800, 60],
      ["Split-type cleaning", 1500, 90, "starts_at"],
      ["Freon recharge", null, 60, "quote"],
    ],
    shops: ["Lamig Aircon Services", "Presko Aircon Care", "Malamig Cooling Experts"],
  },
  {
    slug: "auto-repair",
    name: "Auto repair",
    icon: "wrench",
    bookingType: "quote",
    services: [
      ["Change oil", 1800, 60, "starts_at"],
      ["Brake check", 500, 45],
      ["Engine diagnosis", null, 60, "quote"],
    ],
    shops: ["Kanto Motors", "Bilis Auto Repair", "Tiwala Car Care"],
  },
  {
    slug: "car-wash",
    name: "Car wash",
    icon: "car",
    bookingType: "queue",
    services: [
      ["Basic wash, sedan", 180, 30],
      ["Wash and wax", 450, 60],
      ["Interior detailing", 1500, 120, "starts_at"],
    ],
    shops: ["Kinang Car Wash", "Bula Car Wash", "Sparkle Auto Spa"],
  },
  {
    slug: "laundry",
    name: "Laundry",
    icon: "shirt",
    bookingType: "queue",
    services: [
      ["Wash, dry and fold, per 8 kg", 200, 120],
      ["Dry cleaning", 250, 1440, "starts_at"],
    ],
    shops: ["Labada Express", "Bango Laundry Hub"],
  },
  {
    slug: "pet-grooming",
    name: "Pet grooming",
    icon: "paw-print",
    bookingType: "slot",
    services: [
      ["Bath and blow-dry, small dog", 400, 60, "starts_at"],
      ["Full grooming", 700, 90, "starts_at"],
    ],
    shops: ["Paw-some Grooming", "Aso't Pusa Pet Spa"],
  },
  {
    slug: "home-cleaning",
    name: "Home cleaning",
    icon: "spray-can",
    bookingType: "home",
    services: [
      ["General cleaning, studio", 1200, 180, "starts_at"],
      ["Deep cleaning", null, 240, "quote"],
    ],
    shops: ["Linis Bahay Services", "Kalinisan Home Care"],
  },
];

type Point = { lat: number; lng: number };

const CITIES: Array<{
  slug: string;
  name: string;
  province: string;
  center: Point;
  barangays: Array<{ slug: string; name: string; center: Point }>;
}> = [
  {
    slug: "marikina",
    name: "Marikina",
    province: "Metro Manila",
    center: { lat: 14.6507, lng: 121.1029 },
    barangays: [
      { slug: "concepcion-uno", name: "Concepcion Uno", center: { lat: 14.6498, lng: 121.1112 } },
      { slug: "santo-nino", name: "Santo Niño", center: { lat: 14.6386, lng: 121.0965 } },
      { slug: "parang", name: "Parang", center: { lat: 14.6612, lng: 121.1098 } },
      { slug: "malanday", name: "Malanday", center: { lat: 14.6553, lng: 121.0958 } },
    ],
  },
  {
    slug: "quezon-city",
    name: "Quezon City",
    province: "Metro Manila",
    center: { lat: 14.676, lng: 121.0437 },
    barangays: [
      { slug: "socorro", name: "Socorro", center: { lat: 14.6178, lng: 121.056 } },
      { slug: "kamuning", name: "Kamuning", center: { lat: 14.629, lng: 121.039 } },
      {
        slug: "teachers-village-east",
        name: "Teachers Village East",
        center: { lat: 14.643, lng: 121.064 },
      },
    ],
  },
  {
    slug: "pasig",
    name: "Pasig",
    province: "Metro Manila",
    center: { lat: 14.5764, lng: 121.0851 },
    barangays: [
      { slug: "kapitolyo", name: "Kapitolyo", center: { lat: 14.5711, lng: 121.06 } },
      { slug: "san-antonio", name: "San Antonio", center: { lat: 14.583, lng: 121.061 } },
    ],
  },
];

const FIRST_NAMES = [
  "Maria",
  "Juan",
  "Ana",
  "Mark",
  "Joy",
  "Paolo",
  "Liza",
  "Carlo",
  "Bea",
  "Rico",
];
const LAST_NAMES = ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Ramos", "Torres"];
const STREETS = ["Rizal", "Mabini", "Bonifacio", "Luna", "Del Pilar", "Burgos", "Aguinaldo"];
const COMMENTS = [
  "Ang galing! Sulit sa presyo.",
  "Mabilis at maayos ang serbisyo.",
  "On time and very friendly.",
  "Medyo matagal maghintay pero sulit naman.",
  "Malinis ang lugar. Babalik ako.",
  "Great work, will book again.",
  null,
  null,
];
const RATINGS = [5, 5, 5, 5, 4, 4, 4, 3, 5, 4];
const REVIEW_COUNTS = [0, 0, 1, 2, 3, 4, 5, 6, 8, 10, 12];

// Deterministic, so every seeded database looks the same.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(20261114);
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function daysAgo(days: number, hour = 10): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  // Manila is UTC+8, so 02:00 UTC is 10:00 in Manila.
  date.setUTCHours(hour - 8, 0, 0, 0);
  return date;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) fail("Set DATABASE_URL first (see .env.example).");
  const host = new URL(url).hostname;
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(host);
  const allowRemote = process.env.SEED_REMOTE === "staging" || process.argv.includes("--remote");
  if (!local && !allowRemote) {
    fail(
      `Refusing to seed ${host}: demo data is for local and staging databases only.\n` +
        "If this is a staging project, run again with SEED_REMOTE=staging.",
    );
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  const { categories, cities, barangays, users, shops, shopMembers, shopCategories } = schema;
  const { services, businessHours, bookings, bookingEvents, reviews, shopHolidayRules } = schema;

  await db.transaction(async (tx) => {
    const categoryRows = await tx
      .insert(categories)
      .values(
        CATEGORIES.map((category, index) => ({
          slug: category.slug,
          name: category.name,
          icon: category.icon,
          defaultBookingType: category.bookingType,
          sortOrder: index,
        })),
      )
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: sql`excluded.name`,
          icon: sql`excluded.icon`,
          defaultBookingType: sql`excluded.default_booking_type`,
          sortOrder: sql`excluded.sort_order`,
          active: true,
        },
      })
      .returning({ id: categories.id, slug: categories.slug });
    const categoryId = new Map(categoryRows.map((row) => [row.slug, row.id]));

    const cityRows = await tx
      .insert(cities)
      .values(
        CITIES.map(({ slug, name, province, center }) => ({
          slug,
          name,
          province,
          center,
          isActive: true,
        })),
      )
      .onConflictDoUpdate({
        target: cities.slug,
        set: {
          name: sql`excluded.name`,
          province: sql`excluded.province`,
          center: sql`excluded.center`,
          isActive: true,
        },
      })
      .returning({ id: cities.id, slug: cities.slug });
    const cityId = new Map(cityRows.map((row) => [row.slug, row.id]));

    const barangayRows = await tx
      .insert(barangays)
      .values(
        CITIES.flatMap((city) =>
          city.barangays.map(({ slug, name, center }) => ({
            cityId: cityId.get(city.slug)!,
            slug,
            name,
            center,
            isActive: true,
          })),
        ),
      )
      .onConflictDoUpdate({
        target: [barangays.cityId, barangays.slug],
        set: { name: sql`excluded.name`, center: sql`excluded.center`, isActive: true },
      })
      .returning({ id: barangays.id, cityId: barangays.cityId, slug: barangays.slug });
    const barangayId = new Map(barangayRows.map((row) => [`${row.cityId}/${row.slug}`, row.id]));

    console.log(
      `Categories: ${categoryRows.length}. Cities: ${cityRows.length}. Barangays: ${barangayRows.length}.`,
    );

    const [{ seeded } = { seeded: 0 }] = await tx
      .select({ seeded: sql<number>`count(*)::int` })
      .from(users)
      .where(
        sql`${users.authId} like 'seed:%' or ${users.authId} = ${SAMPLE_ACCOUNTS.store.authId}`,
      );
    if (seeded > 0) {
      console.log("Demo shops are already there; leaving them as they are.");
    } else {
      // Most shops go to Marikina, so its city-and-category pages have enough
      // shops to be published.
      const places = CITIES.flatMap((city) =>
        city.barangays.map((barangay) => ({ city, barangay })),
      );
      const marikina = places.filter((place) => place.city.slug === "marikina");
      const elsewhere = places.filter((place) => place.city.slug !== "marikina");

      const customerRows = Array.from({ length: 20 }, (_, i) => ({
        id: randomUUID(),
        authId: `seed:customer-${i + 1}`,
        phone: `+639180${String(i + 1).padStart(6, "0")}`,
        name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[(i * 3) % LAST_NAMES.length]}`,
      }));
      const ownerRows: (typeof users.$inferInsert)[] = [];
      const shopRows: (typeof shops.$inferInsert)[] = [];
      const memberRows: (typeof shopMembers.$inferInsert)[] = [];
      const shopCategoryRows: (typeof shopCategories.$inferInsert)[] = [];
      const serviceRows: (typeof services.$inferInsert)[] = [];
      const hourRows: (typeof businessHours.$inferInsert)[] = [];
      const holidayRows: (typeof shopHolidayRules.$inferInsert)[] = [];
      const bookingRows: (typeof bookings.$inferInsert)[] = [];
      const eventRows: (typeof bookingEvents.$inferInsert)[] = [];
      const reviewRows: (typeof reviews.$inferInsert)[] = [];

      let shopNumber = 0;
      CATEGORIES.forEach((category, categoryIndex) => {
        category.shops.forEach((shopName, j) => {
          shopNumber += 1;
          const place =
            j < 3
              ? marikina[(j + categoryIndex) % marikina.length]!
              : elsewhere[(j + categoryIndex) % elsewhere.length]!;
          // The last shop of a short category is still waiting for approval.
          const active = !(category.shops.length === 2 && j === 1 && categoryIndex >= 7);

          const ownerId = randomUUID();
          ownerRows.push({
            id: ownerId,
            authId: `seed:owner-${shopNumber}`,
            phone: `+639170${String(shopNumber).padStart(6, "0")}`,
            name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          });

          const shopId = randomUUID();
          shopRows.push({
            id: shopId,
            ownerId,
            slug: slugify(`${shopName} ${place.city.name}`),
            name: shopName,
            description: `${category.name} in ${place.barangay.name}, ${place.city.name}.`,
            address: `${between(10, 250)} ${pick(STREETS)} St., ${place.barangay.name}, ${place.city.name}`,
            cityId: cityId.get(place.city.slug)!,
            barangayId: barangayId.get(`${cityId.get(place.city.slug)}/${place.barangay.slug}`)!,
            location: {
              lat: place.barangay.center.lat + (random() - 0.5) * 0.008,
              lng: place.barangay.center.lng + (random() - 0.5) * 0.008,
            },
            phone: `+639190${String(shopNumber).padStart(6, "0")}`,
            status: active ? "active" : "pending",
            verifiedAt: active ? daysAgo(shopNumber * 3) : null,
          });
          memberRows.push({ shopId, userId: ownerId, role: "owner" });
          shopCategoryRows.push({ shopId, categoryId: categoryId.get(category.slug)! });

          const shopServices = category.services.map(([name, pesos, durationMin, type], order) => {
            const priceType = type ?? "fixed";
            const price =
              pesos === null ? null : Math.round((pesos * (0.9 + random() * 0.3)) / 10) * 1000;
            const row = {
              id: randomUUID(),
              shopId,
              categoryId: categoryId.get(category.slug)!,
              name,
              priceType,
              priceCentavos: price,
              durationMin,
              bookingType: priceType === "quote" ? ("quote" as const) : category.bookingType,
              sortOrder: order,
            };
            serviceRows.push(row);
            return row;
          });

          const opensSunday = random() < 0.5;
          const hasBreak = random() < 0.33;
          for (let weekday = 0; weekday <= 6; weekday++) {
            if (weekday === 0 && !opensSunday) continue;
            hourRows.push({
              shopId,
              weekday,
              opens: weekday === 0 ? "10:00" : "09:00",
              closes: weekday === 0 ? "17:00" : "19:00",
              breakStart: hasBreak ? "12:00" : null,
              breakEnd: hasBreak ? "13:00" : null,
            });
          }

          // No random() here, so the rest of the demo data stays the same. Every
          // third shop closes on all regular holidays; the rest only on the big
          // days, with short hours on Christmas Eve.
          const template = HOLIDAY_TEMPLATES.find(
            (entry) => entry.id === (shopNumber % 3 === 0 ? "regular" : "big_days"),
          )!;
          holidayRows.push(
            ...template.closedOn.map((holidayKey) => ({ shopId, holidayKey })),
            ...(shopNumber % 3 === 0
              ? []
              : [{ shopId, holidayKey: "christmas_eve", opens: "09:00", closes: "15:00" }]),
          );

          if (!active) return;
          for (let r = 0, count = pick(REVIEW_COUNTS); r < count; r++) {
            const customer = pick(customerRows);
            const service = pick(shopServices);
            const startAt = daysAgo(between(3, 120), between(9, 17));
            const total = service.priceCentavos ?? 150_000;
            const bookingId = randomUUID();
            bookingRows.push({
              id: bookingId,
              refCode: `BK-SEED-${String(bookingRows.length + 1).padStart(4, "0")}`,
              customerId: customer.id,
              shopId,
              serviceId: service.id,
              startAt,
              endAt: new Date(startAt.getTime() + service.durationMin * 60_000),
              status: "completed",
              quotedPriceCentavos: service.priceCentavos === null ? total : null,
              totalCentavos: total,
              createdAt: new Date(startAt.getTime() - 2 * 86_400_000),
            });
            const hoursBefore = (hours: number) => new Date(startAt.getTime() - hours * 3_600_000);
            eventRows.push(
              {
                bookingId,
                toStatus: "requested",
                actorId: customer.id,
                createdAt: hoursBefore(48),
              },
              {
                bookingId,
                fromStatus: "requested",
                toStatus: "confirmed",
                actorId: ownerId,
                createdAt: hoursBefore(47),
              },
              {
                bookingId,
                fromStatus: "confirmed",
                toStatus: "completed",
                actorId: ownerId,
                createdAt: hoursBefore(-2),
              },
            );
            reviewRows.push({
              bookingId,
              customerId: customer.id,
              shopId,
              rating: pick(RATINGS),
              comment: pick(COMMENTS),
              createdAt: hoursBefore(-26),
            });
          }
        });
      });

      await tx.insert(users).values([...customerRows, ...ownerRows]);
      await tx.insert(shops).values(shopRows);
      await tx.insert(shopMembers).values(memberRows);
      await tx.insert(shopCategories).values(shopCategoryRows);
      await tx.insert(services).values(serviceRows);
      await tx.insert(businessHours).values(hourRows);
      await tx.insert(shopHolidayRules).values(holidayRows);
      if (bookingRows.length > 0) {
        await tx.insert(bookings).values(bookingRows);
        await tx.insert(bookingEvents).values(eventRows);
        await tx.insert(reviews).values(reviewRows);
      }

      // shops.rating_avg and rating_count are kept in step with reviews.
      await tx.execute(sql`
        update ${shops} set
          rating_count = stats.count,
          rating_avg = stats.average
        from (
          select shop_id, count(*)::int as count, round(avg(rating), 2) as average
          from ${reviews} where not hidden group by shop_id
        ) as stats
        where ${shops.id} = stats.shop_id`);

      console.log(
        `Demo data: ${shopRows.length} shops, ${serviceRows.length} services, ` +
          `${customerRows.length} customers, ${reviewRows.length} reviews.`,
      );
    }

    // Always ensure the interactive sample store account and sample user account exist
    // in Supabase Auth (auth.users / auth.identities) and are linked in public.users.
    for (const account of [SAMPLE_ACCOUNTS.store, SAMPLE_ACCOUNTS.customer]) {
      await tx.execute(sql`
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          is_super_admin,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          email_change_token_current,
          recovery_token,
          reauthentication_token,
          phone_change,
          phone_change_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          ${account.authId}::uuid,
          'authenticated',
          'authenticated',
          ${account.email},
          extensions.crypt(${account.password}, extensions.gen_salt('bf')),
          now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object(
            'sub', ${account.authId}::text,
            'email', ${account.email}::text,
            'full_name', ${account.name}::text,
            'email_verified', true,
            'phone_verified', false
          ),
          false,
          now(),
          now(),
          '', '', '', '', '', '', '', ''
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          encrypted_password = EXCLUDED.encrypted_password,
          email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
          raw_user_meta_data = EXCLUDED.raw_user_meta_data,
          updated_at = now()
      `);

      await tx.execute(sql`
        INSERT INTO auth.identities (
          id,
          user_id,
          provider_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${account.authId}::uuid,
          ${account.authId}::text,
          jsonb_build_object(
            'sub', ${account.authId}::text,
            'email', ${account.email}::text,
            'full_name', ${account.name}::text,
            'email_verified', true,
            'phone_verified', false
          ),
          'email',
          now(),
          now(),
          now()
        )
        ON CONFLICT (provider_id, provider) DO UPDATE SET
          identity_data = EXCLUDED.identity_data,
          updated_at = now()
      `);
    }

    await tx.execute(sql`
      UPDATE ${users}
      SET
        auth_id = ${SAMPLE_ACCOUNTS.store.authId},
        email = ${SAMPLE_ACCOUNTS.store.email},
        name = ${SAMPLE_ACCOUNTS.store.name},
        phone = ${SAMPLE_ACCOUNTS.store.phone},
        status = 'active',
        deleted_at = NULL
      WHERE auth_id IN ('seed:owner-1', ${SAMPLE_ACCOUNTS.store.authId})
         OR phone = ${SAMPLE_ACCOUNTS.store.phone}
    `);

    await tx.execute(sql`
      UPDATE ${users}
      SET
        auth_id = ${SAMPLE_ACCOUNTS.customer.authId},
        email = ${SAMPLE_ACCOUNTS.customer.email},
        name = ${SAMPLE_ACCOUNTS.customer.name},
        phone = ${SAMPLE_ACCOUNTS.customer.phone},
        status = 'active',
        deleted_at = NULL
      WHERE auth_id IN ('seed:customer-1', ${SAMPLE_ACCOUNTS.customer.authId})
         OR phone = ${SAMPLE_ACCOUNTS.customer.phone}
    `);

    // Ensure any newer schema tables (0003, 0004, 0007) exist on the target database
    await tx.execute(sql`
      DO $$
      BEGIN
        CREATE TABLE IF NOT EXISTS "user_addresses" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
          "label" text NOT NULL,
          "recipient_name" text,
          "phone" text,
          "street_address" text NOT NULL,
          "city_id" uuid REFERENCES "public"."cities"("id") ON DELETE set null,
          "barangay_id" uuid REFERENCES "public"."barangays"("id") ON DELETE set null,
          "notes" text,
          "location" geography(Point,4326),
          "is_default" boolean DEFAULT false NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
          CONSTRAINT "user_addresses_label_len_check" CHECK (char_length("user_addresses"."label") <= 50),
          CONSTRAINT "user_addresses_street_len_check" CHECK (char_length("user_addresses"."street_address") <= 300)
        );
        ALTER TABLE "user_addresses" ENABLE ROW LEVEL SECURITY;
        CREATE INDEX IF NOT EXISTS "user_addresses_user_id_idx" ON "user_addresses" USING btree ("user_id");

        CREATE TABLE IF NOT EXISTS "service_addons" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "service_id" uuid NOT NULL REFERENCES "public"."services"("id") ON DELETE cascade,
          "name" text NOT NULL,
          "description" text,
          "price_centavos" integer DEFAULT 0 NOT NULL,
          "duration_min" integer DEFAULT 0 NOT NULL,
          "active" boolean DEFAULT true NOT NULL,
          "sort_order" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "service_addons" ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS "packages" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "shop_id" uuid NOT NULL REFERENCES "public"."shops"("id") ON DELETE cascade,
          "name" text NOT NULL,
          "description" text,
          "price_centavos" integer NOT NULL,
          "original_price_centavos" integer,
          "active" boolean DEFAULT true NOT NULL,
          "sort_order" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "packages" ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS "package_items" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "package_id" uuid NOT NULL REFERENCES "public"."packages"("id") ON DELETE cascade,
          "service_id" uuid NOT NULL REFERENCES "public"."services"("id") ON DELETE cascade,
          "quantity" integer DEFAULT 1 NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "package_items" ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS "memberships" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "shop_id" uuid NOT NULL REFERENCES "public"."shops"("id") ON DELETE cascade,
          "name" text NOT NULL,
          "description" text,
          "price_centavos" integer NOT NULL,
          "cadence" text DEFAULT 'monthly' NOT NULL,
          "session_credits" integer,
          "validity_days" integer,
          "perks" text,
          "active" boolean DEFAULT true NOT NULL,
          "sort_order" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;

        CREATE TABLE IF NOT EXISTS "notification_preferences" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
          "preferred_channel" text DEFAULT 'email' NOT NULL,
          "sms_enabled" boolean DEFAULT false NOT NULL,
          "email_enabled" boolean DEFAULT true NOT NULL,
          "push_enabled" boolean DEFAULT true NOT NULL,
          "whatsapp_enabled" boolean DEFAULT false NOT NULL,
          "viber_enabled" boolean DEFAULT false NOT NULL,
          "booking_confirmations" boolean DEFAULT true NOT NULL,
          "booking_reminders" boolean DEFAULT true NOT NULL,
          "booking_auto_expiry" boolean DEFAULT true NOT NULL,
          "marketing_promos" boolean DEFAULT false NOT NULL,
          "whatsapp_phone" text,
          "viber_phone" text,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
        CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_id_key" ON "notification_preferences" USING btree ("user_id");

        ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "booking_type" text DEFAULT 'slot' NOT NULL;
        ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "queue_number" integer;
        ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "late_cancel" boolean DEFAULT false NOT NULL;
        ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "reschedule_count" integer DEFAULT 0 NOT NULL;
        ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "deposit_centavos" integer DEFAULT 0 NOT NULL;
        ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "paid_centavos" integer DEFAULT 0 NOT NULL;

        CREATE TABLE IF NOT EXISTS "booking_policies" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "shop_id" uuid NOT NULL REFERENCES "public"."shops"("id") ON DELETE cascade,
          "cancel_window_hours" integer DEFAULT 2 NOT NULL,
          "max_reschedules" integer DEFAULT 2 NOT NULL,
          "quote_valid_hours" integer DEFAULT 24 NOT NULL,
          "payment_mode" text DEFAULT 'none' NOT NULL,
          "deposit_type" text DEFAULT 'percent' NOT NULL,
          "deposit_value" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "booking_policies" ENABLE ROW LEVEL SECURITY;
        CREATE UNIQUE INDEX IF NOT EXISTS "booking_policies_shop_id_key" ON "booking_policies" USING btree ("shop_id");

        CREATE TABLE IF NOT EXISTS "payments" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "booking_id" uuid NOT NULL REFERENCES "public"."bookings"("id"),
          "customer_id" uuid NOT NULL REFERENCES "public"."users"("id"),
          "amount_centavos" integer NOT NULL,
          "status" text DEFAULT 'pending' NOT NULL,
          "provider" text DEFAULT 'paymongo' NOT NULL,
          "provider_session_id" text NOT NULL,
          "provider_payment_id" text,
          "checkout_url" text,
          "paid_at" timestamp with time zone,
          "refunded_at" timestamp with time zone,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );
        ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
        CREATE UNIQUE INDEX IF NOT EXISTS "payments_provider_session_id_key" ON "payments" USING btree ("provider_session_id");
      END $$;
    `);

    const [customerUser] = await tx
      .select({ id: users.id })
      .from(users)
      .where(sql`${users.authId} = ${SAMPLE_ACCOUNTS.customer.authId}`)
      .limit(1);

    if (customerUser) {
      const marikinaId = cityId.get("marikina")!;
      const concepcionId = barangayId.get(`${marikinaId}/concepcion-uno`)!;
      await tx.execute(sql`
        INSERT INTO ${schema.userAddresses} (
          user_id, label, recipient_name, phone, street_address, city_id, barangay_id, notes, location, is_default
        )
        SELECT
          ${customerUser.id}::uuid,
          'Home',
          ${SAMPLE_ACCOUNTS.customer.name},
          ${SAMPLE_ACCOUNTS.customer.phone},
          '42 Rizal St., Concepcion Uno, Marikina',
          ${marikinaId}::uuid,
          ${concepcionId}::uuid,
          'Green gate near the bakery',
          ST_SetSRID(ST_MakePoint(121.1112, 14.6498), 4326)::geography,
          true
        WHERE NOT EXISTS (
          SELECT 1 FROM ${schema.userAddresses} WHERE user_id = ${customerUser.id}::uuid
        )
      `);
    }

    // Seed sample today/upcoming bookings for Kuya Jun's Barbershop & Maria Santos
    const [sampleShop] = await tx
      .select({ id: shops.id, ownerId: shops.ownerId })
      .from(shops)
      .where(sql`${shops.slug} = 'kuya-juns-barbershop-marikina'`)
      .limit(1);

    if (sampleShop && customerUser) {
      const [sampleService] = await tx
        .select({
          id: services.id,
          durationMin: services.durationMin,
          priceCentavos: services.priceCentavos,
        })
        .from(services)
        .where(sql`${services.shopId} = ${sampleShop.id}`)
        .limit(1);

      if (sampleService) {
        const todayConfirmedStart = daysAgo(0, 14);
        const todayRequestedStart = daysAgo(0, 16);
        const price = sampleService.priceCentavos ?? 15000;

        await tx
          .insert(bookings)
          .values([
            {
              refCode: "BK-DEMO-0001",
              customerId: customerUser.id,
              shopId: sampleShop.id,
              serviceId: sampleService.id,
              staffId: sampleShop.ownerId,
              startAt: todayConfirmedStart,
              endAt: new Date(todayConfirmedStart.getTime() + sampleService.durationMin * 60_000),
              status: "confirmed",
              totalCentavos: price,
              notes: "Regular clean fade please",
            },
            {
              refCode: "BK-DEMO-0002",
              customerId: customerUser.id,
              shopId: sampleShop.id,
              serviceId: sampleService.id,
              startAt: todayRequestedStart,
              endAt: new Date(todayRequestedStart.getTime() + sampleService.durationMin * 60_000),
              status: "requested",
              totalCentavos: price,
              notes: "Booking for my brother",
            },
          ])
          .onConflictDoNothing();
      }
    }

    console.log(
      `Sample accounts ready:\n` +
        `  Store Account: ${SAMPLE_ACCOUNTS.store.email} / ${SAMPLE_ACCOUNTS.store.password} (${SAMPLE_ACCOUNTS.store.shopName})\n` +
        `  User Account:  ${SAMPLE_ACCOUNTS.customer.email} / ${SAMPLE_ACCOUNTS.customer.password} (${SAMPLE_ACCOUNTS.customer.name})`,
    );
  });

  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
