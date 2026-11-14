import { z } from "zod";

import { PH_BOUNDS } from "@/lib/geo";

export const nearbyShopsInput = z.strictObject({
  lat: z.number().min(PH_BOUNDS.minLat).max(PH_BOUNDS.maxLat),
  lng: z.number().min(PH_BOUNDS.minLng).max(PH_BOUNDS.maxLng),
});
