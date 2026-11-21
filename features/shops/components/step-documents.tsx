"use client";

import * as React from "react";
import { CheckCircle2, FileCheck, FileText, ShieldCheck, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DOCUMENT_FILE_TYPES, isDocumentMimeType, MAX_FILE_SIZE_BYTES } from "@/lib/file-types";

import {
  confirmShopDocument,
  removeShopMedia,
  startShopDocumentUpload,
  submitForVerification,
} from "../actions";
import { DOCUMENT_TYPES, type DocumentTypeId } from "../constants";

const ACCEPT = Object.keys(DOCUMENT_FILE_TYPES).join(",");

/** Sends the file straight to storage through the one-time URL (same form as supabase-js). */
async function putToSignedUrl(uploadUrl: string, file: File): Promise<boolean> {
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body,
    headers: { "x-upsert": "false" },
  });
  return response.ok;
}

type MediaItem = {
  id: string;
  path: string;
  sortOrder: number;
};

type StepDocumentsProps = {
  shopId: string;
  initialDocuments?: MediaItem[];
  onBack: () => void;
  onSubmitted: () => void;
};

export function StepDocuments({
  shopId,
  initialDocuments = [],
  onBack,
  onSubmitted,
}: StepDocumentsProps) {
  const [documents, setDocuments] = React.useState<MediaItem[]>(initialDocuments);
  const [uploadingType, setUploadingType] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileUpload = async (type: DocumentTypeId, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("That file is larger than 8 MB. Take a smaller photo or compress the PDF.");
      return;
    }
    if (!isDocumentMimeType(file.type)) {
      setError("Upload a PDF, JPEG, PNG or WebP file.");
      return;
    }

    setUploadingType(type);

    try {
      const started = await startShopDocumentUpload({
        shopId,
        documentType: type,
        contentType: file.type,
        size: file.size,
      });
      if (!started.ok) {
        setError(started.message);
        return;
      }

      if (!(await putToSignedUrl(started.data.uploadUrl, file))) {
        setError("The upload didn't go through. Check your connection and try again.");
        return;
      }

      const confirmed = await confirmShopDocument({
        shopId,
        documentType: type,
        path: started.data.path,
      });
      if (confirmed.ok) {
        setDocuments((prev) => [
          ...prev,
          { id: confirmed.data.mediaId, path: confirmed.data.path, sortOrder: prev.length },
        ]);
      } else {
        setError(confirmed.message);
      }
    } catch {
      setError("Could not upload document. Please try again.");
    } finally {
      setUploadingType(null);
      if (fileInputRefs.current[type]) {
        fileInputRefs.current[type]!.value = "";
      }
    }
  };

  const handleRemoveDoc = async (mediaId: string) => {
    try {
      const result = await removeShopMedia({ shopId, mediaId });
      if (result.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== mediaId));
      } else {
        setError(result.message);
      }
    } catch {
      setError("Could not remove document.");
    }
  };

  const handleSubmitForReview = async () => {
    if (documents.length === 0) {
      setError(
        "Please upload at least one verification document (e.g. Mayor's permit or Government ID).",
      );
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = await submitForVerification({ shopId });
      if (result.ok) {
        onSubmitted();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to submit verification request. Please check all steps.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Trust Notice */}
      <div className="border-navy-200 bg-navy-50/60 text-navy-950 flex items-start gap-3 rounded-xl border p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-navy-900" />
        <div>
          <h4 className="font-semibold">Why do we need verification documents?</h4>
          <p className="text-navy-800 mt-1 text-xs leading-relaxed">
            BooKanto verifies every shop before making it fully public to protect customers and
            build trust. Verified shops display the official verification checkmark and receive top
            search ranking.
          </p>
        </div>
      </div>

      {/* Document Types List */}
      <div className="space-y-3">
        {DOCUMENT_TYPES.map((docType) => {
          const isUploaded = documents.some((d) => d.path.includes(docType.type));

          return (
            <div
              key={docType.type}
              className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${
                    isUploaded
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {isUploaded ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    <FileText className="size-4.5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900">{docType.name}</span>
                    {docType.required && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">{docType.description}</p>
                </div>
              </div>

              <div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[docType.type] = el;
                  }}
                  type="file"
                  accept={ACCEPT}
                  onChange={(e) => handleFileUpload(docType.type, e)}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant={isUploaded ? "secondary" : "outline"}
                  size="sm"
                  disabled={uploadingType === docType.type}
                  onClick={() => fileInputRefs.current[docType.type]?.click()}
                  className="w-full text-xs sm:w-auto"
                >
                  <Upload className="mr-1.5 size-3.5" />
                  {uploadingType === docType.type
                    ? "Uploading..."
                    : isUploaded
                      ? "Upload Replacement"
                      : "Upload File"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
          <h4 className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
            Attached Documents ({documents.length})
          </h4>
          <ul className="mt-2 divide-y divide-neutral-200">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between py-2 text-xs text-neutral-700"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCheck className="size-4 shrink-0 text-emerald-600" />
                  <span className="truncate font-mono">{doc.path.split("/").pop()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(doc.id)}
                  className="p-1 text-red-600 hover:text-red-800"
                  title="Remove document"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Final Submission Card */}
      <div className="rounded-xl border-2 border-orange-500/30 bg-orange-50/30 p-5">
        <h4 className="font-display text-lg text-neutral-900">Ready to Submit for Verification?</h4>
        <p className="mt-1 text-xs text-neutral-600">
          Once submitted, our team will review your business credentials within 24 to 48 hours. In
          the meantime, you can add your services, pricing, and staff!
        </p>
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse justify-between gap-3 pt-4 sm:flex-row">
        <Button type="button" variant="outline" onClick={onBack} size="lg">
          ← Back to Photos
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={handleSubmitForReview}
          size="lg"
          className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
        >
          {submitting ? "Submitting Application..." : "Submit for Verification 🚀"}
        </Button>
      </div>
    </div>
  );
}
