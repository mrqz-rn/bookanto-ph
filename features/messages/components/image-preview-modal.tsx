"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

type ImagePreviewModalProps = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

export function ImagePreviewModal({
  src,
  alt = "Attached photo",
  onClose,
}: ImagePreviewModalProps) {
  React.useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/80 p-4 backdrop-blur-xs fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top actions bar */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 rounded-full bg-black/50 text-white hover:bg-black/75"
            onClick={onClose}
            aria-label="Close image preview"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Image display */}
        <div className="relative flex max-h-[85vh] max-w-[85vw] items-center justify-center overflow-auto p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={alt} className="max-h-[80vh] max-w-full rounded-lg object-contain" />
        </div>
      </div>
    </div>
  );
}
