"use client";

import * as React from "react";
import { CircleAlert, CircleCheck, Download, FileUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { bulkImportServices } from "../actions";
import { generateSampleCsvTemplate, parseServiceCsv } from "../bulk-import";
import { BOOKING_TYPE_LABELS } from "../constants";
import { durationLabel, plural, servicePrice } from "../menu";
import { ActionError, Busy, FOCUS_RING, PRESS, Sheet } from "./services-ui";

type BulkImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  /** Called after the import, with the line to show on the page. */
  onImported: (message: string) => void;
};

const PREVIEW_ROWS = 10;
const ERROR_ROWS = 5;
/** The most bulkImportServices takes in one go (features/services/schema.ts). */
const MAX_ROWS = 100;

export function BulkImportModal({ isOpen, onClose, shopId, onImported }: BulkImportModalProps) {
  const id = React.useId();
  const [csvText, setCsvText] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setCsvText("");
    setFileName(null);
    setError(null);
  }, [isOpen]);

  const parsed = React.useMemo(() => (csvText.trim() ? parseServiceCsv(csvText) : null), [csvText]);
  const validCount = parsed?.valid.length ?? 0;
  const tooMany = validCount > MAX_ROWS;

  function downloadTemplate() {
    const blob = new Blob([generateSampleCsvTemplate()], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bookanto-services-template.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setFileName(file.name);
    };
    reader.onerror = () => setError("Couldn't read that file. Save it as CSV and try again.");
    reader.readAsText(file);
    event.target.value = "";
  }

  async function onImport() {
    if (!parsed || validCount === 0) return;
    setError(null);
    setSaving(true);
    try {
      const result = await bulkImportServices({ shopId, services: parsed.valid });
      if (result.ok) {
        onImported(`Imported ${plural(validCount, "service")}.`);
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Couldn't import the services. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      busy={saving}
      wide
      title="Import a spreadsheet"
      description="Add many services at once from a CSV file. Rows with mistakes are skipped and listed."
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onImport}
            disabled={saving || validCount === 0 || tooMany}
            className={PRESS}
          >
            <Busy busy={saving}>
              {validCount > 0 ? `Import ${plural(validCount, "service")}` : "Import services"}
            </Busy>
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && <ActionError message={error} onDismiss={() => setError(null)} />}

        <ol className="space-y-5">
          <li className="space-y-2">
            <p className="text-sm font-semibold text-navy-900">
              1. Fill in our template in Excel or Google Sheets
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              className={cn("w-full sm:w-auto", PRESS)}
            >
              <Download aria-hidden />
              Download the template
            </Button>
          </li>

          <li className="space-y-2">
            <p className="text-sm font-semibold text-navy-900">2. Upload it as a CSV file</p>
            <input
              ref={fileInputRef}
              id={`${id}-file`}
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="sr-only"
              tabIndex={-1}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-6 text-center transition-colors hover:border-green-600 hover:bg-accent",
                FOCUS_RING,
              )}
            >
              <FileUp aria-hidden className="size-6 text-green-700" />
              <span className="text-base font-semibold text-navy-900">
                {fileName ? `Replace ${fileName}` : "Choose a CSV file"}
              </span>
              <span className="text-sm text-slate-600">Up to {MAX_ROWS} services at a time</span>
            </button>
          </li>
        </ol>

        <details className="group rounded-2xl border border-border">
          <summary
            className={cn(
              "flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-semibold text-navy-900",
              FOCUS_RING,
            )}
          >
            Or paste the rows instead
          </summary>
          <div className="px-4 pb-4">
            <label htmlFor={`${id}-paste`} className="sr-only">
              CSV rows
            </label>
            <Textarea
              id={`${id}-paste`}
              rows={6}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setFileName(null);
              }}
              placeholder="Name,Price Type,Price,Duration,Booking Type"
              className="font-mono text-sm"
              spellCheck={false}
            />
          </div>
        </details>

        {parsed && (
          <section aria-label="Check the rows" className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-semibold text-green-700">
                <CircleCheck aria-hidden className="size-5" />
                {plural(validCount, "service")} ready
              </span>
              {parsed.invalid.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
                  <CircleAlert aria-hidden className="size-5" />
                  {plural(parsed.invalid.length, "row")} skipped
                </span>
              )}
              <span className="text-slate-600">{plural(parsed.totalRows, "row")} in the file</span>
            </div>

            {tooMany && (
              <ActionError
                message={`That's ${validCount} services. Import up to ${MAX_ROWS} at a time: split the file and upload each part.`}
              />
            )}

            {parsed.invalid.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-danger">
                <p className="font-semibold">Fix these rows and upload again to include them:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {parsed.invalid.slice(0, ERROR_ROWS).map((row) => (
                    <li key={row.row}>
                      Row {row.row}: {row.errors.join(", ")}
                    </li>
                  ))}
                  {parsed.invalid.length > ERROR_ROWS && (
                    <li>{plural(parsed.invalid.length - ERROR_ROWS, "more row")}</li>
                  )}
                </ul>
              </div>
            )}

            {validCount > 0 && (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {parsed.valid.slice(0, PREVIEW_ROWS).map((row, index) => (
                  <li key={index} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900">{row.name}</p>
                      <p className="text-sm text-slate-600">
                        {durationLabel(row.durationMin)} · {BOOKING_TYPE_LABELS[row.bookingType]}
                        {row.capacity > 1 && ` · ${row.capacity} at once`}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold text-navy-900 tabular-nums">
                      {servicePrice(row.priceType, row.priceCentavos)}
                    </p>
                  </li>
                ))}
                {validCount > PREVIEW_ROWS && (
                  <li className="px-4 py-3 text-sm text-slate-600">
                    And {plural(validCount - PREVIEW_ROWS, "more service")}
                  </li>
                )}
              </ul>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}
