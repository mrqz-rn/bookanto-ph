import type { BookingType, PriceType } from "@/lib/db/schema/enums";

export type ServiceTemplateItem = {
  name: string;
  description: string;
  priceType: PriceType;
  priceCentavos: number | null;
  durationMin: number;
  bookingType: BookingType;
  capacity: number;
  bufferMin: number;
  suggestedAddons?: Array<{
    name: string;
    description?: string;
    priceCentavos: number;
    durationMin: number;
  }>;
};

export type CategoryTemplateGroup = {
  categorySlug: string;
  categoryName: string;
  services: ServiceTemplateItem[];
};

export const CATEGORY_SERVICE_TEMPLATES: Record<string, CategoryTemplateGroup> = {
  barbershop: {
    categorySlug: "barbershop",
    categoryName: "Barbershop",
    services: [
      {
        name: "Standard Haircut",
        description: "Classic clipper or scissor haircut with neck shave and hair wash.",
        priceType: "fixed",
        priceCentavos: 15000, // ₱150
        durationMin: 30,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 5,
        suggestedAddons: [
          {
            name: "Hair Pomade Styling",
            priceCentavos: 5000,
            durationMin: 5,
            description: "Premium water-based pomade styling",
          },
          {
            name: "Scalp Massage",
            priceCentavos: 8000,
            durationMin: 10,
            description: "Invigorating mint cooling scalp massage",
          },
        ],
      },
      {
        name: "Haircut & Beard Sculpting",
        description: "Full haircut paired with beard trimming, shaping, and hot towel treatment.",
        priceType: "fixed",
        priceCentavos: 25000, // ₱250
        durationMin: 45,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 5,
        suggestedAddons: [{ name: "Beard Oil Application", priceCentavos: 4000, durationMin: 5 }],
      },
      {
        name: "Kids Haircut",
        description: "Patient and friendly haircut for children ages 12 and under.",
        priceType: "fixed",
        priceCentavos: 12000, // ₱120
        durationMin: 30,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 5,
      },
      {
        name: "Hot Towel Shave",
        description: "Traditional straight razor hot lather shave with soothing aftershave lotion.",
        priceType: "fixed",
        priceCentavos: 18000, // ₱180
        durationMin: 30,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 5,
      },
      {
        name: "Grey Blending / Hair Color",
        description: "Natural-looking grey coverage or hair darkening for men.",
        priceType: "starts_at",
        priceCentavos: 40000, // ₱400
        durationMin: 60,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 10,
      },
    ],
  },
  "hair-salon": {
    categorySlug: "hair-salon",
    categoryName: "Hair Salon",
    services: [
      {
        name: "Haircut and Blow-Dry",
        description:
          "Precision haircut tailored to face shape, includes shampoo and professional blow-dry.",
        priceType: "starts_at",
        priceCentavos: 35000, // ₱350
        durationMin: 60,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 10,
        suggestedAddons: [
          { name: "Deep Conditioning Treatment", priceCentavos: 30000, durationMin: 20 },
          { name: "Curling / Iron Styling", priceCentavos: 15000, durationMin: 15 },
        ],
      },
      {
        name: "Full Hair Color",
        description: "Single-process all-over hair color with ammonia-free formulation.",
        priceType: "starts_at",
        priceCentavos: 120000, // ₱1,200
        durationMin: 120,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 15,
      },
      {
        name: "Keratin Blowout / Treatment",
        description: "Smoothes frizzy hair, locks in shine and makes hair manageable for months.",
        priceType: "starts_at",
        priceCentavos: 180000, // ₱1,800
        durationMin: 150,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 15,
      },
      {
        name: "Japanese Rebonding",
        description: "Permanent hair straightening treatment for sleek, pin-straight hair.",
        priceType: "starts_at",
        priceCentavos: 250000, // ₱2,500
        durationMin: 180,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 15,
      },
    ],
  },
  "nail-salon": {
    categorySlug: "nail-salon",
    categoryName: "Nail Salon",
    services: [
      {
        name: "Classic Manicure",
        description: "Nail shaping, cuticle cleanup, hand massage, and regular polish.",
        priceType: "fixed",
        priceCentavos: 15000, // ₱150
        durationMin: 45,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 5,
        suggestedAddons: [
          { name: "Nail Art / Accent (per nail)", priceCentavos: 5000, durationMin: 10 },
          { name: "Paraffin Hand Dip", priceCentavos: 15000, durationMin: 15 },
        ],
      },
      {
        name: "Classic Pedicure",
        description: "Soothing foot soak, nail trimming, callus smoothing, and polish.",
        priceType: "fixed",
        priceCentavos: 18000, // ₱180
        durationMin: 45,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 5,
      },
      {
        name: "Gel Polish (Hands or Feet)",
        description: "Long-lasting chip-free gel manicure with UV/LED curing.",
        priceType: "fixed",
        priceCentavos: 45000, // ₱450
        durationMin: 60,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 10,
        suggestedAddons: [{ name: "Gel Removal", priceCentavos: 10000, durationMin: 15 }],
      },
      {
        name: "Deluxe Foot Spa with Scrub",
        description: "Exfoliating sea salt scrub, relaxing foot massage, and dead skin removal.",
        priceType: "fixed",
        priceCentavos: 35000, // ₱350
        durationMin: 60,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 10,
      },
    ],
  },
  massage: {
    categorySlug: "massage",
    categoryName: "Massage & Spa",
    services: [
      {
        name: "Swedish Massage (60 mins)",
        description: "Gentle, flowing strokes using essential aromatic oils to ease tension.",
        priceType: "fixed",
        priceCentavos: 50000, // ₱500
        durationMin: 60,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 10,
        suggestedAddons: [
          { name: "Extra 30 Minutes", priceCentavos: 25000, durationMin: 30 },
          { name: "Hot Stone Therapy Add-on", priceCentavos: 20000, durationMin: 15 },
        ],
      },
      {
        name: "Traditional Pinoy Hilot (60 mins)",
        description:
          "Authentic Filipino healing massage with warm banana leaves and virgin coconut oil.",
        priceType: "fixed",
        priceCentavos: 45000, // ₱450
        durationMin: 60,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 10,
      },
      {
        name: "Deep Tissue Massage (90 mins)",
        description: "Firm pressure targeting chronic muscle knots and postural tension.",
        priceType: "fixed",
        priceCentavos: 75000, // ₱750
        durationMin: 90,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 15,
      },
      {
        name: "Foot Reflexology (45 mins)",
        description: "Targeted acupressure on foot pressure points to restore bodily balance.",
        priceType: "fixed",
        priceCentavos: 35000, // ₱350
        durationMin: 45,
        bookingType: "slot",
        capacity: 3,
        bufferMin: 10,
      },
    ],
  },
  "aircon-cleaning": {
    categorySlug: "aircon-cleaning",
    categoryName: "Aircon Cleaning",
    services: [
      {
        name: "Window-Type Aircon Cleaning",
        description:
          "Complete pull-down, high-pressure washing, chemical coil cleaning, and filter sanitation.",
        priceType: "fixed",
        priceCentavos: 80000, // ₱800
        durationMin: 60,
        bookingType: "home",
        capacity: 1,
        bufferMin: 30,
        suggestedAddons: [
          { name: "Anti-Bacterial Coil Spray", priceCentavos: 20000, durationMin: 10 },
        ],
      },
      {
        name: "Split-Type Aircon Cleaning",
        description:
          "Deep clean for indoor blower unit and outdoor compressor using specialized catch bags.",
        priceType: "starts_at",
        priceCentavos: 150000, // ₱1,500
        durationMin: 90,
        bookingType: "home",
        capacity: 1,
        bufferMin: 30,
      },
      {
        name: "Freon Recharge & Leak Check",
        description:
          "System pressure test, leak detection, and refrigerant refilling (R22/R410A/R32).",
        priceType: "quote",
        priceCentavos: null,
        durationMin: 60,
        bookingType: "quote",
        capacity: 1,
        bufferMin: 30,
      },
    ],
  },
  "auto-repair": {
    categorySlug: "auto-repair",
    categoryName: "Auto Repair & Maintenance",
    services: [
      {
        name: "Change Oil (Fully Synthetic)",
        description:
          "Engine oil replacement, oil filter replacement, and 25-point vehicle safety check.",
        priceType: "starts_at",
        priceCentavos: 180000, // ₱1,800
        durationMin: 60,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 15,
      },
      {
        name: "Brake Cleaning & Inspection",
        description:
          "Front and rear brake pad check, rotor rotor resurfacing inspection, and brake fluid top-up.",
        priceType: "fixed",
        priceCentavos: 50000, // ₱500
        durationMin: 45,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 10,
      },
      {
        name: "Engine Diagnostics & Troubleshooting",
        description:
          "OBD-2 computerized scanner diagnosis for check-engine light and sensor faults.",
        priceType: "quote",
        priceCentavos: null,
        durationMin: 60,
        bookingType: "quote",
        capacity: 2,
        bufferMin: 15,
      },
    ],
  },
  "car-wash": {
    categorySlug: "car-wash",
    categoryName: "Car Wash",
    services: [
      {
        name: "Basic Foam Wash & Tire Black (Sedan)",
        description:
          "Snow foam wash, high pressure rinse, interior vacuum, and tire black dressing.",
        priceType: "fixed",
        priceCentavos: 18000, // ₱180
        durationMin: 30,
        bookingType: "queue",
        capacity: 4,
        bufferMin: 5,
        suggestedAddons: [
          { name: "Spray Wax Protection", priceCentavos: 10000, durationMin: 10 },
          { name: "Interior Antibacterial Fogging", priceCentavos: 25000, durationMin: 15 },
        ],
      },
      {
        name: "Wash and Hand Wax",
        description:
          "Complete wash, interior detail, and hand application of carnauba wax protection.",
        priceType: "fixed",
        priceCentavos: 45000, // ₱450
        durationMin: 60,
        bookingType: "queue",
        capacity: 3,
        bufferMin: 10,
      },
      {
        name: "Full Interior Detailing",
        description:
          "Deep upholstery shampoo, leather conditioning, ceiling stain removal, and ozone treatment.",
        priceType: "starts_at",
        priceCentavos: 150000, // ₱1,500
        durationMin: 180,
        bookingType: "slot",
        capacity: 1,
        bufferMin: 30,
      },
    ],
  },
  laundry: {
    categorySlug: "laundry",
    categoryName: "Laundry",
    services: [
      {
        name: "Wash, Dry & Fold (up to 8 kg)",
        description: "Complete laundry service with premium detergent and fabric conditioner.",
        priceType: "fixed",
        priceCentavos: 20000, // ₱200
        durationMin: 120,
        bookingType: "queue",
        capacity: 10,
        bufferMin: 0,
        suggestedAddons: [
          { name: "Extra Fabric Softener", priceCentavos: 3000, durationMin: 0 },
          { name: "Bleach for Whites", priceCentavos: 4000, durationMin: 0 },
        ],
      },
      {
        name: "Comforter / Blanket Washing",
        description: "Deep wash and gentle tumble drying for queen or king-sized comforters.",
        priceType: "starts_at",
        priceCentavos: 25000, // ₱250
        durationMin: 180,
        bookingType: "queue",
        capacity: 5,
        bufferMin: 0,
      },
    ],
  },
  "pet-grooming": {
    categorySlug: "pet-grooming",
    categoryName: "Pet Grooming",
    services: [
      {
        name: "Bath and Blow-Dry (Small Dog)",
        description: "Hypoallergenic bath, blow dry, ear cleaning, and nail clipping.",
        priceType: "starts_at",
        priceCentavos: 40000, // ₱400
        durationMin: 60,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 10,
      },
      {
        name: "Full Grooming Package",
        description:
          "Breed-specific stylish haircut, bath, blow dry, anal gland expression, and cologne spritz.",
        priceType: "starts_at",
        priceCentavos: 70000, // ₱700
        durationMin: 90,
        bookingType: "slot",
        capacity: 2,
        bufferMin: 15,
        suggestedAddons: [
          { name: "Teeth Brushing", priceCentavos: 10000, durationMin: 10 },
          { name: "Tick & Flea Treatment Dip", priceCentavos: 25000, durationMin: 15 },
        ],
      },
    ],
  },
  "home-cleaning": {
    categorySlug: "home-cleaning",
    categoryName: "Home Cleaning",
    services: [
      {
        name: "General Cleaning (Studio / 1BR)",
        description:
          "Sweeping, mopping, dusting, surface wipe down, trash disposal, and bathroom sanitation.",
        priceType: "starts_at",
        priceCentavos: 120000, // ₱1,200
        durationMin: 180,
        bookingType: "home",
        capacity: 2,
        bufferMin: 30,
      },
      {
        name: "Deep Cleaning / Post-Move In",
        description:
          "Intensive top-to-bottom scrub, kitchen degreasing, window cleaning, and grout scrubbing.",
        priceType: "quote",
        priceCentavos: null,
        durationMin: 240,
        bookingType: "quote",
        capacity: 2,
        bufferMin: 30,
      },
    ],
  },
};

/**
 * Returns available templates for a specific category slug or all templates.
 */
export function getCategoryTemplates(slug?: string): CategoryTemplateGroup[] {
  if (slug && CATEGORY_SERVICE_TEMPLATES[slug]) {
    return [CATEGORY_SERVICE_TEMPLATES[slug]];
  }
  return Object.values(CATEGORY_SERVICE_TEMPLATES);
}
