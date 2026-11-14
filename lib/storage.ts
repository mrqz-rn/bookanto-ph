import "server-only";

import { publicEnv } from "@/lib/public-env";

// Storage adapter. Supabase Storage today; S3 behind CloudFront after the AWS
// move, when only this file changes.

/** Public bucket for shop, service and review photos. */
const MEDIA_BUCKET = "media";

/** The public URL of a photo stored at `path` in the media bucket. */
export function mediaUrl(path: string): string {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${publicEnv.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${encodedPath}`;
}
