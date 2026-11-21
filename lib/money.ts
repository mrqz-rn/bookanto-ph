// Money is integer centavos everywhere (₱1 = 100 centavos). Never store or
// add prices as floating-point pesos.

export type Centavos = number;

const PESO_INPUT = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/** Converts typed peso amounts such as "1,250.50" or "₱100" to centavos. */
export function pesosToCentavos(pesos: string | number): Centavos {
  const text = typeof pesos === "number" ? pesos.toFixed(2) : pesos.replace(/[₱,\s]/g, "");
  const match = PESO_INPUT.exec(text);
  if (!match) throw new RangeError(`Not a peso amount: ${String(pesos)}`);

  const [, sign, whole = "0", fraction = ""] = match;
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos)) throw new RangeError("Peso amount is too large");
  return sign ? -centavos : centavos;
}

const wholePesos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const pesosWithCentavos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
});

/** Formats centavos as pesos, with decimals only when needed: "₱1,500", "₱150.50". */
export function formatPeso(centavos: Centavos): string {
  if (!Number.isSafeInteger(centavos)) throw new RangeError("Centavos must be an integer");
  const formatter = centavos % 100 === 0 ? wholePesos : pesosWithCentavos;
  return formatter.format(centavos / 100);
}

export const formatCentavos = formatPeso;

const compactPesos = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Formats centavos as short pesos for chart axes and tight spaces: "₱950", "₱12.5K", "₱1.2M". */
export function formatPesoCompact(centavos: Centavos): string {
  if (!Number.isSafeInteger(centavos)) throw new RangeError("Centavos must be an integer");
  return compactPesos.format(centavos / 100);
}
