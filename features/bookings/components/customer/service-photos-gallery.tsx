"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";

export type ServicePhoto = {
  id: string;
  path: string;
  url: string;
};

type Props = {
  photos: ServicePhoto[];
  serviceName: string;
  className?: string;
};

export function ServicePhotosGallery({ photos, serviceName, className = "" }: Props) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [failedImages, setFailedImages] = React.useState<Record<string, boolean>>({});

  const validPhotos = React.useMemo(
    () => photos.filter((p) => !failedImages[p.id]),
    [photos, failedImages],
  );

  // Sync active index if photos change
  React.useEffect(() => {
    if (activeIndex >= validPhotos.length && validPhotos.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, validPhotos.length]);

  // Handle keyboard navigation for lightbox
  React.useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
      } else if (e.key === "ArrowLeft" && validPhotos.length > 1) {
        setActiveIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight" && validPhotos.length > 1) {
        setActiveIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, validPhotos.length]);

  if (!photos || photos.length === 0 || validPhotos.length === 0) {
    return null;
  }

  const currentPhoto = validPhotos[activeIndex] ?? validPhotos[0];
  if (!currentPhoto) {
    return null;
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? validPhotos.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === validPhotos.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Main Image Display */}
      <div
        onClick={() => setLightboxOpen(true)}
        className="group relative aspect-[16/10] w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-slate-100 shadow-2xs transition-all hover:border-slate-300 sm:aspect-[16/9]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentPhoto.url}
          alt={`${serviceName} sample photo ${activeIndex + 1}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          onError={() => {
            setFailedImages((prev) => ({ ...prev, [currentPhoto.id]: true }));
          }}
        />

        {/* Counter Badge */}
        {validPhotos.length > 1 && (
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-navy-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-xs">
            {activeIndex + 1} / {validPhotos.length}
          </span>
        )}

        {/* Expand / View Hint */}
        <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-navy-900/75 px-2.5 py-1 text-xs font-medium text-white opacity-90 backdrop-blur-xs transition-opacity group-hover:opacity-100">
          <Eye className="size-3.5" />
          <span>View</span>
        </span>

        {/* Navigation Arrows for Carousel */}
        {validPhotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous photo"
              className="absolute top-1/2 left-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy-900 opacity-90 shadow-sm transition-all hover:bg-white hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next photo"
              className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy-900 opacity-90 shadow-sm transition-all hover:bg-white hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Strip */}
      {validPhotos.length > 1 && (
        <div className="flex scrollbar-thin items-center gap-2 overflow-x-auto pb-1">
          {validPhotos.map((photo, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`View photo ${index + 1}`}
                aria-current={isSelected}
                className={`relative size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:size-16 ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="size-full object-cover"
                  onError={() => {
                    setFailedImages((prev) => ({ ...prev, [photo.id]: true }));
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${serviceName} photo fullscreen preview`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close photo preview"
            className="absolute top-4 right-4 z-50 flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="size-6" />
          </button>

          {/* Active Photo Container */}
          <div
            className="relative flex max-h-[85vh] max-w-4xl flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentPhoto.url}
              alt={`${serviceName} full preview`}
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
            />

            <div className="mt-3 flex items-center justify-between gap-4 text-xs font-medium text-slate-300">
              <span>{serviceName}</span>
              {validPhotos.length > 1 && (
                <span>
                  Photo {activeIndex + 1} of {validPhotos.length}
                </span>
              )}
            </div>

            {/* Prev/Next buttons in lightbox */}
            {validPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous photo"
                  className="absolute top-1/2 -left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 focus:outline-none sm:-left-12 sm:size-12"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next photo"
                  className="absolute top-1/2 -right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30 focus:outline-none sm:-right-12 sm:size-12"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
