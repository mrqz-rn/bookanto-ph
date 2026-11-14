/**
 * Normalizes user-entered Philippine phone numbers to E.164 format (+639XXXXXXXXX).
 * Accepts: "09171234567", "9171234567", "639171234567", "+639171234567", with
 * optional spaces, hyphens, or parentheses.
 */
export function normalizePhone(raw: string): string {
  const digitsOnly = raw.replace(/[^\d+]/g, "");

  if (digitsOnly.startsWith("+639") && digitsOnly.length === 13) {
    return digitsOnly;
  }

  const withoutPlus = digitsOnly.replace(/^\+/, "");

  if (withoutPlus.startsWith("639") && withoutPlus.length === 12) {
    return `+${withoutPlus}`;
  }

  if (withoutPlus.startsWith("09") && withoutPlus.length === 11) {
    return `+63${withoutPlus.slice(1)}`;
  }

  if (withoutPlus.startsWith("9") && withoutPlus.length === 10) {
    return `+63${withoutPlus}`;
  }

  // Fallback if already valid international E.164
  if (digitsOnly.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(digitsOnly)) {
    return digitsOnly;
  }

  return raw.trim();
}

/**
 * Checks whether the phone number is a valid Philippine mobile number in E.164 (+639XXXXXXXXX).
 */
export function isValidPhilippinePhone(phone: string): boolean {
  return /^\+639\d{9}$/.test(phone);
}

/**
 * Formats an E.164 Philippine mobile number into a readable local format (e.g. 0917 123 4567 or +63 917 123 4567).
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const normalized = normalizePhone(phone);
  if (/^\+639\d{9}$/.test(normalized)) {
    const p1 = normalized.slice(3, 6); // 917
    const p2 = normalized.slice(6, 9); // 123
    const p3 = normalized.slice(9, 13); // 4567
    return `+63 ${p1} ${p2} ${p3}`;
  }
  return phone;
}
