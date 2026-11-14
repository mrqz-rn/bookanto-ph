"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { bulkImportServices } from "../actions";
import { generateSampleCsvTemplate, parseServiceCsv, type CsvParseResult } from "../bulk-import";

type BulkImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onImported: () => void;
};

export function BulkImportModal({ isOpen, onClose, shopId, onImported }: BulkImportModalProps) {
  const [csvText, setCsvText] = React.useState<string>("");
  const [parseResult, setParseResult] = React.useState<CsvParseResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (csvText.trim()) {
      const result = parseServiceCsv(csvText);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, [csvText]);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    const template = generateSampleCsvTemplate();
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bookanto_services_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) {
      setError("No valid services available to import.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await bulkImportServices({
        shopId,
        services: parseResult.valid,
      });

      if (result.ok) {
        onImported();
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to import services. Please check formatting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-xl text-neutral-900">Bulk Import Services</h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                Quickly import multiple service offerings via CSV.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Action bar with template download */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50 px-6 py-3">
          <span className="text-xs text-neutral-600">
            Need the right format? Use our standard spreadsheet template:
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs text-navy-900"
          >
            <Download className="mr-1.5 size-3.5" />
            Download CSV Template
          </Button>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

          {/* Upload or paste area */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-6 text-center hover:border-orange-500 hover:bg-orange-50/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="size-6 text-neutral-400" />
              <span className="mt-2 text-xs font-semibold text-neutral-900">Upload CSV File</span>
              <span className="mt-0.5 text-[11px] text-neutral-500">
                Click to browse or drop .csv file here
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-900">
                Or Paste CSV text directly
              </label>
              <textarea
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Name,Price Type,Price (₱),Duration (mins),Booking Type..."
                className="mt-1 w-full rounded-xl border border-neutral-300 p-2.5 font-mono text-xs text-neutral-900 outline-none focus-visible:border-neutral-950"
              />
            </div>
          </div>

          {/* Validation & Preview Section */}
          {parseResult && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 pt-4">
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="size-4" /> {parseResult.valid.length} Valid Services
                  </span>
                  {parseResult.invalid.length > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-red-600">
                      <AlertCircle className="size-4" /> {parseResult.invalid.length} Errors Found
                    </span>
                  )}
                </div>

                <span className="text-xs text-neutral-500">
                  Total rows detected: {parseResult.totalRows}
                </span>
              </div>

              {/* Error messages if any */}
              {parseResult.invalid.length > 0 && (
                <div className="space-y-1 rounded-xl border border-red-200 bg-red-50/70 p-3 text-xs text-red-800">
                  <p className="font-semibold">Issues found in some rows (they will be skipped):</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-[11px]">
                    {parseResult.invalid.slice(0, 5).map((inv, idx) => (
                      <li key={idx}>
                        Row {inv.row}: {inv.errors.join(", ")}
                      </li>
                    ))}
                    {parseResult.invalid.length > 5 && (
                      <li>...and {parseResult.invalid.length - 5} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Preview Table */}
              <div className="overflow-x-auto rounded-xl border border-neutral-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-100 font-semibold text-neutral-700">
                    <tr>
                      <th className="px-3 py-2">Service Name</th>
                      <th className="px-3 py-2">Price Type</th>
                      <th className="px-3 py-2">Price</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Booking Type</th>
                      <th className="px-3 py-2">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {parseResult.valid.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-neutral-50">
                        <td className="px-3 py-2 font-medium text-neutral-900">{row.name}</td>
                        <td className="px-3 py-2 capitalize">{row.priceType}</td>
                        <td className="px-3 py-2">
                          {row.priceType === "quote"
                            ? "Quote"
                            : row.priceCentavos !== null
                              ? formatPeso(row.priceCentavos)
                              : "-"}
                        </td>
                        <td className="px-3 py-2">{row.durationMin} mins</td>
                        <td className="px-3 py-2 capitalize">{row.bookingType}</td>
                        <td className="px-3 py-2">{row.capacity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 p-4 sm:p-5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="button"
            disabled={loading || !parseResult || parseResult.valid.length === 0}
            onClick={handleImport}
            className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
          >
            {loading ? "Importing..." : `Import ${parseResult?.valid.length ?? 0} Services`}
          </Button>
        </div>
      </div>
    </div>
  );
}
