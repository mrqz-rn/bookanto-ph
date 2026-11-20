"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/media";
import { addShopPhoto, removeShopMedia, reorderShopMedia } from "../actions";

type MediaItem = {
  id: string;
  path: string;
  sortOrder: number;
};

type StepPhotosProps = {
  shopId: string;
  initialPhotos?: MediaItem[];
  onBack: () => void;
  onComplete: () => void;
};

export function StepPhotos({ shopId, initialPhotos = [], onBack, onComplete }: StepPhotosProps) {
  const [photos, setPhotos] = React.useState<MediaItem[]>(initialPhotos);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const fileList = Array.from(files);
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (!file) continue;

        // 8MB limit
        if (file.size > 8 * 1024 * 1024) {
          setError(`"${file.name}" exceeds the 8 MB limit.`);
          continue;
        }

        // Check image types
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          setError(`"${file.name}" is not a supported format (JPEG, PNG, WebP only).`);
          continue;
        }

        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            const b64 = res.split(",")[1];
            if (b64) resolve(b64);
            else reject(new Error("Failed to read image data"));
          };
          reader.onerror = () => reject(reader.error);
        });
        reader.readAsDataURL(file);

        const imageBase64 = await base64Promise;

        const result = await addShopPhoto({
          shopId,
          imageBase64,
          sortOrder: photos.length + i,
        });

        if (result.ok) {
          setPhotos((prev) => [
            ...prev,
            { id: result.data.mediaId, path: result.data.path, sortOrder: prev.length },
          ]);
        } else {
          setError(result.message);
        }
      }
    } catch {
      setError("Failed to upload photo. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (mediaId: string) => {
    try {
      const result = await removeShopMedia({ shopId, mediaId });
      if (result.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== mediaId));
      }
    } catch {
      setError("Could not remove photo.");
    }
  };

  const handleMove = async (index: number, direction: "prev" | "next") => {
    const targetIndex = direction === "prev" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= photos.length) return;

    const currentItem = photos[index];
    const targetItem = photos[targetIndex];
    if (!currentItem || !targetItem) return;

    const newPhotos = [...photos];
    newPhotos[index] = targetItem;
    newPhotos[targetIndex] = currentItem;

    setPhotos(newPhotos);

    try {
      await reorderShopMedia({
        shopId,
        mediaIds: newPhotos.map((p) => p.id),
      });
    } catch {
      // rollback if failed
      setPhotos(photos);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 p-8 text-center transition-colors hover:border-orange-500 hover:bg-orange-50/20"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex size-12 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <UploadCloud className="size-6" />
        </div>
        <p className="mt-3 text-sm font-semibold text-neutral-900">Click to upload shop photos</p>
        <p className="mt-1 text-xs text-neutral-500">
          JPEG, PNG, or WebP up to 8 MB. Add your storefront, interior, and work samples.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          className="pointer-events-none mt-4 text-xs text-navy-900"
        >
          {uploading ? "Uploading..." : "Select Photos from Device"}
        </Button>
      </div>

      {/* Photos Grid */}
      <div>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-neutral-900">
            Uploaded Photos ({photos.length})
          </h4>
          <span className="text-xs text-neutral-500">
            First photo will be your shop cover image.
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-8 text-center">
            <ImageIcon className="size-10 text-neutral-300" />
            <p className="mt-2 text-sm text-neutral-500">No photos uploaded yet.</p>
            <p className="text-xs text-neutral-400">
              Shops with photos get 3x more customer bookings!
            </p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo, idx) => (
              <div
                key={photo.id}
                className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-xs"
              >
                <div className="aspect-4/3 w-full overflow-hidden bg-neutral-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(photo.path)}
                    alt={`Shop photo ${idx + 1}`}
                    className="size-full object-cover transition-transform group-hover:scale-105"
                    onError={(e) => {
                      // Fallback visual placeholder if image path is mocked
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  <div className="flex size-full items-center justify-center text-xs text-neutral-400">
                    Photo {idx + 1}
                  </div>
                </div>

                {idx === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-navy-900/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs backdrop-blur-xs">
                    Cover Photo
                  </span>
                )}

                {/* Actions overlay */}
                <div className="flex items-center justify-between border-t border-neutral-200 bg-white p-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, "prev")}
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                      title="Move earlier"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === photos.length - 1}
                      onClick={() => handleMove(idx, "next")}
                      className="rounded p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                      title="Move later"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(photo.id)}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    title="Remove photo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse justify-between gap-3 pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          ← Back to Business Hours
        </Button>
        <Button type="button" onClick={onComplete} size="lg">
          Save & Continue to Documents →
        </Button>
      </div>
    </div>
  );
}
