import type { BookingType, PriceType } from "@/lib/db/schema/enums";
import { pesosToCentavos } from "@/lib/money";

export type ParsedImportService = {
  name: string;
  description?: string | null;
  priceType: PriceType;
  priceCentavos: number | null;
  durationMin: number;
  bookingType: BookingType;
  capacity: number;
  bufferMin: number;
  categoryName?: string | null;
};

export type RowError = {
  row: number;
  data: Record<string, string>;
  errors: string[];
};

export type CsvParseResult = {
  valid: ParsedImportService[];
  invalid: RowError[];
  totalRows: number;
};

/**
 * Splits CSV lines safely, taking into account quoted fields with commas.
 */
export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parses raw CSV text into validated service rows.
 */
export function parseServiceCsv(csvText: string): CsvParseResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { valid: [], invalid: [], totalRows: 0 };
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return { valid: [], invalid: [], totalRows: 0 };
  }
  const rawHeaders = splitCsvLine(headerLine).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const rows = lines.slice(1);
  const valid: ParsedImportService[] = [];
  const invalid: RowError[] = [];

  rows.forEach((line, index) => {
    const rowNum = index + 2; // header is row 1
    const cols = splitCsvLine(line);
    const rowObj: Record<string, string> = {};

    rawHeaders.forEach((header, i) => {
      rowObj[header] = cols[i] ?? "";
    });

    const errors: string[] = [];

    // 1. Name
    const name = (rowObj.name || rowObj.servicename || rowObj.service || rowObj.title || "").trim();

    if (!name || name.length < 2) {
      errors.push("Service name is required (min 2 characters).");
    }

    // 2. Price Type
    let priceType: PriceType = "fixed";
    const rawPriceType = (rowObj.pricetype || rowObj.type || "").toLowerCase();

    if (rawPriceType.includes("start") || rawPriceType === "starts_at") {
      priceType = "starts_at";
    } else if (rawPriceType.includes("quote")) {
      priceType = "quote";
    } else if (rawPriceType && !rawPriceType.includes("fix")) {
      errors.push(`Invalid price type "${rawPriceType}". Use fixed, starts_at, or quote.`);
    }

    // 3. Price
    let priceCentavos: number | null = null;
    const rawPrice = (
      rowObj.price ||
      rowObj.pricecentavos ||
      rowObj.pricepesos ||
      rowObj.amount ||
      ""
    ).trim();

    if (priceType !== "quote") {
      if (!rawPrice) {
        errors.push("Price is required for fixed and starts-at services.");
      } else {
        try {
          const cleanPrice = rawPrice.replace(/[₱,\s]/g, "");
          const num = Number(cleanPrice);
          if (isNaN(num) || num < 0) {
            errors.push("Price must be a positive number.");
          } else {
            priceCentavos = pesosToCentavos(num);
          }
        } catch {
          errors.push(`Invalid price format "${rawPrice}".`);
        }
      }
    }

    // 4. Duration
    let durationMin = 30;
    const rawDuration = (
      rowObj.duration ||
      rowObj.durationmin ||
      rowObj.durationmins ||
      rowObj.minutes ||
      ""
    ).trim();

    if (rawDuration) {
      const parsedDur = parseInt(rawDuration, 10);
      if (isNaN(parsedDur) || parsedDur < 5 || parsedDur > 1440) {
        errors.push("Duration must be between 5 and 1440 minutes.");
      } else {
        durationMin = parsedDur;
      }
    }

    // 5. Booking Type
    let bookingType: BookingType = "slot";
    const rawBookingType = (rowObj.bookingtype || rowObj.booking || "").toLowerCase();

    if (rawBookingType) {
      if (rawBookingType.includes("home")) {
        bookingType = "home";
      } else if (rawBookingType.includes("quote")) {
        bookingType = "quote";
      } else if (rawBookingType.includes("queue") || rawBookingType.includes("walkin")) {
        bookingType = "queue";
      } else if (!rawBookingType.includes("slot") && !rawBookingType.includes("shop")) {
        errors.push(`Invalid booking type "${rawBookingType}". Use slot, home, quote, or queue.`);
      }
    }

    // 6. Capacity
    let capacity = 1;
    const rawCapacity = (rowObj.capacity || "").trim();
    if (rawCapacity) {
      const parsedCap = parseInt(rawCapacity, 10);
      if (isNaN(parsedCap) || parsedCap < 1) {
        errors.push("Capacity must be at least 1.");
      } else {
        capacity = parsedCap;
      }
    }

    // 7. Buffer
    let bufferMin = 0;
    const rawBuffer = (rowObj.buffer || rowObj.buffermin || "").trim();
    if (rawBuffer) {
      const parsedBuf = parseInt(rawBuffer, 10);
      if (isNaN(parsedBuf) || parsedBuf < 0) {
        errors.push("Buffer minutes cannot be negative.");
      } else {
        bufferMin = parsedBuf;
      }
    }

    const description = (rowObj.description || rowObj.desc || "").trim() || null;
    const categoryName = (rowObj.category || rowObj.categoryname || "").trim() || null;

    if (errors.length > 0) {
      invalid.push({ row: rowNum, data: rowObj, errors });
    } else {
      valid.push({
        name,
        description,
        priceType,
        priceCentavos,
        durationMin,
        bookingType,
        capacity,
        bufferMin,
        categoryName,
      });
    }
  });

  return {
    valid,
    invalid,
    totalRows: rows.length,
  };
}

/**
 * Returns a ready-to-download sample CSV template.
 */
export function generateSampleCsvTemplate(): string {
  return [
    "Name,Price Type,Price (₱),Duration (mins),Booking Type,Capacity,Buffer (mins),Description",
    'Standard Haircut,fixed,150,30,slot,1,5,"Classic haircut with hair wash and styling"',
    'Hair Coloring,starts_at,1200,120,slot,1,10,"Full hair color treatment"',
    'Aircon Cleaning,fixed,800,60,home,1,30,"Window type aircon cleaning at home"',
    'Custom Engine Repair,quote,,60,quote,1,15,"Detailed engine troubleshooting"',
  ].join("\n");
}
