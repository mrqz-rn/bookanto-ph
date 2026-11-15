"use client";

import * as React from "react";
import { Camera, X } from "lucide-react";

import { ALLOWED_PHOTO_MIME_TYPES, MAX_PHOTO_SIZE_BYTES, MAX_REVIEW_PHOTOS } from "../constants";

export type StagedPhoto = {
  id: string;
  file?: File;
  previewUrl: string;
  path?: string;
};

type ReviewPhotosUploaderProps = {
  photos: StagedPhoto[];
  onChange: (photos: StagedPhoto[]) => void;
  disabled?: boolean;
};

export function ReviewPhotosUploader({
  photos,
  onChange,
  disabled = false,
}: ReviewPhotosUploaderProps) {
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const availableSlots = MAX_REVIEW_PHOTOS - photos.length;
    if (availableSlots <= 0) {
      setError(`You can upload a maximum of ${MAX_REVIEW_PHOTOS} photos.`);
      return;
    }

    const filesToProcess = Array.from(fileList).slice(0, availableSlots);
    const newPhotos: StagedPhoto[] = [];

    for (const file of filesToProcess) {
      // Validate type
      if (
        !ALLOWED_PHOTO_MIME_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_MIME_TYPES)[number])
      ) {
        setError(`"${file.name}" is not a supported image format. Please use JPEG, PNG, or WebP.`);
        continue;
      }

      // Validate size
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the 8 MB limit.`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `reviews/staged-${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${sanitizedName}`;

      newPhotos.push({
        id: `photo-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        path,
      });
    }

    if (newPhotos.length > 0) {
      onChange([...photos, ...newPhotos]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idToRemove: string) => {
    const photoToRemove = photos.find((p) => p.id === idToRemove);
    if (photoToRemove?.previewUrl && photoToRemove.file) {
      URL.revokeObjectURL(photoToRemove.previewUrl);
    }
    onChange(photos.filter((p) => p.id !== idToRemove));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">Photos (optional)</label>
        <span className="text-xs text-slate-500">
          {photos.length} / {MAX_REVIEW_PHOTOS}
        </span>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-danger"
        >
          {error}
        </div>
      )}

      {/* Grid of uploaded thumbnails and add button */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-slate-100 shadow-2xs"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.previewUrl}
              alt={`Review photo ${index + 1}`}
              className="size-full object-cover"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => removePhoto(photo.id)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute top-1 right-1 flex size-7 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-navy-900/80 text-white transition-opacity hover:bg-navy-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:opacity-90"
            >
              <X className="size-4" />
            </button>
          </div>
        ))}

        {photos.length < MAX_REVIEW_PHOTOS && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-square min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-slate-600 transition-colors hover:border-primary hover:bg-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Camera className="size-5 text-slate-500" />
            <span className="text-[11px] font-medium text-slate-600">Add Photo</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_PHOTO_MIME_TYPES.join(",")}
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="text-[11px] text-slate-500">
        Add up to 5 clear photos of your experience (JPEG, PNG, or WebP up to 8 MB each).
      </p>
    </div>
  );
}
