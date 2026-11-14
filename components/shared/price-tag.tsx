import type { PriceType } from "@/lib/db/schema/enums";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";

export function priceLabel(centavos: number | null, type: PriceType): string {
  if (type === "quote" || centavos === null) return "Get a quote";
  return type === "starts_at" ? `From ${formatPeso(centavos)}` : formatPeso(centavos);
}

/** "₱150", "From ₱150" or "Get a quote". */
export function PriceTag({
  centavos,
  type,
  className,
}: {
  centavos: number | null;
  type: PriceType;
  className?: string;
}) {
  return <span className={cn("font-semibold", className)}>{priceLabel(centavos, type)}</span>;
}
