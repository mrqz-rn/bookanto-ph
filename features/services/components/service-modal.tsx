"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_TYPES, PRICE_TYPES } from "@/lib/db/schema/enums";
import type { BookingType, PriceType } from "@/lib/db/schema/enums";
import { cn } from "@/lib/utils";
import { createService, updateService } from "../actions";
import {
  BOOKING_TYPE_DESCRIPTIONS,
  BOOKING_TYPE_LABELS,
  BUFFER_OPTIONS,
  DURATION_OPTIONS,
  PRICE_TYPE_HINTS,
  PRICE_TYPE_LABELS,
} from "../constants";
import { durationLabel, parsePesos } from "../menu";
import {
  ActionError,
  Busy,
  Field,
  FOCUS_RING,
  PesoInput,
  PRESS,
  SELECT,
  Sheet,
  Toggle,
} from "./services-ui";

type CategoryOption = { id: string; name: string };

type ServiceData = {
  id?: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  priceType: PriceType;
  priceCentavos?: number | null;
  durationMin: number;
  bookingType: BookingType;
  capacity: number;
  bufferMin: number;
  active: boolean;
};

type ServiceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  categories: CategoryOption[];
  initialService?: ServiceData | null;
  /** Called after a save with the line to show on the page. */
  onSaved: (message: string) => void;
};

const FORM_ID = "service-form";

export function ServiceModal({
  isOpen,
  onClose,
  shopId,
  categories,
  initialService,
  onSaved,
}: ServiceModalProps) {
  const isEditing = !!initialService?.id;
  const id = React.useId();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [priceType, setPriceType] = React.useState<PriceType>("fixed");
  const [pricePesos, setPricePesos] = React.useState("");
  const [durationMin, setDurationMin] = React.useState<number>(30);
  const [bookingType, setBookingType] = React.useState<BookingType>("slot");
  const [capacity, setCapacity] = React.useState("1");
  const [bufferMin, setBufferMin] = React.useState<number>(0);
  const [active, setActive] = React.useState<boolean>(true);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    if (initialService) {
      setName(initialService.name);
      setDescription(initialService.description || "");
      setCategoryId(initialService.categoryId || "");
      setPriceType(initialService.priceType);
      setPricePesos(
        initialService.priceCentavos !== null && initialService.priceCentavos !== undefined
          ? (initialService.priceCentavos / 100).toString()
          : "",
      );
      setDurationMin(initialService.durationMin);
      setBookingType(initialService.bookingType);
      setCapacity(String(initialService.capacity));
      setBufferMin(initialService.bufferMin);
      setActive(initialService.active);
    } else {
      setName("");
      setDescription("");
      setCategoryId(categories[0]?.id || "");
      setPriceType("fixed");
      setPricePesos("");
      setDurationMin(30);
      setBookingType("slot");
      setCapacity("1");
      setBufferMin(0);
      setActive(true);
    }
    setError(null);
    setPriceError(null);
  }, [initialService, categories, isOpen]);

  // A saved duration that isn't in the list (an import, a template) still shows.
  const durations = DURATION_OPTIONS.some((d) => d.value === durationMin)
    ? DURATION_OPTIONS
    : [...DURATION_OPTIONS, { value: durationMin, label: durationLabel(durationMin) }].sort(
        (a, b) => a.value - b.value,
      );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    let priceCentavos: number | null = null;
    if (priceType !== "quote") {
      priceCentavos = parsePesos(pricePesos);
      if (priceCentavos === null) {
        setPriceError("Enter a price in pesos, like 250.");
        return;
      }
    }
    setPriceError(null);

    const input = {
      shopId,
      name: name.trim(),
      description: description.trim() || null,
      categoryId: categoryId || null,
      priceType,
      priceCentavos,
      durationMin,
      bookingType,
      capacity: Math.min(50, Math.max(1, parseInt(capacity, 10) || 1)),
      bufferMin,
      active,
    };

    setSaving(true);
    try {
      const result =
        isEditing && initialService?.id
          ? await updateService({ ...input, serviceId: initialService.id })
          : await createService(input);
      if (result.ok) {
        onSaved(
          isEditing
            ? `Saved ${input.name}.`
            : `Added ${input.name} to your menu${active ? "" : ", hidden for now"}.`,
        );
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Couldn't save the service. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      busy={saving}
      title={isEditing ? `Edit ${initialService?.name}` : "Add a service"}
      description={isEditing ? undefined : "What customers book. You can change any of this later."}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving} className={PRESS}>
            <Busy busy={saving}>{isEditing ? "Save changes" : "Add service"}</Busy>
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-6">
        {error && <ActionError message={error} onDismiss={() => setError(null)} />}

        <Field label="Service name" htmlFor={`${id}-name`}>
          <Input
            id={`${id}-name`}
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Haircut and blow-dry"
            autoComplete="off"
          />
        </Field>

        {categories.length > 0 && (
          <Field label="Category" htmlFor={`${id}-category`}>
            <select
              id={`${id}-category`}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={SELECT}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-navy-900">Price</legend>
          <div className="grid grid-cols-3 gap-2">
            {PRICE_TYPES.map((type) => (
              <ChoiceCard
                key={type}
                name={`${id}-price-type`}
                value={type}
                checked={priceType === type}
                onChange={() => setPriceType(type)}
                label={PRICE_TYPE_LABELS[type]}
                compact
              />
            ))}
          </div>
          <p className="text-sm text-slate-600">{PRICE_TYPE_HINTS[priceType]}</p>
          {priceType !== "quote" && (
            <div className="space-y-1.5">
              <label htmlFor={`${id}-price`} className="sr-only">
                Price in pesos
              </label>
              <PesoInput
                id={`${id}-price`}
                required
                value={pricePesos}
                onChange={(e) => setPricePesos(e.target.value)}
                placeholder="250"
                aria-invalid={priceError ? true : undefined}
                aria-describedby={priceError ? `${id}-price-error` : undefined}
              />
              {priceError && (
                <p id={`${id}-price-error`} className="text-sm text-danger">
                  {priceError}
                </p>
              )}
            </div>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="How long it takes" htmlFor={`${id}-duration`}>
            <select
              id={`${id}-duration`}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className={SELECT}
            >
              {durations.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Break after" htmlFor={`${id}-buffer`}>
            <select
              id={`${id}-buffer`}
              value={bufferMin}
              onChange={(e) => setBufferMin(Number(e.target.value))}
              className={SELECT}
            >
              {BUFFER_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-navy-900">
            How customers book it
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BOOKING_TYPES.map((type) => (
              <ChoiceCard
                key={type}
                name={`${id}-booking-type`}
                value={type}
                checked={bookingType === type}
                onChange={() => setBookingType(type)}
                label={BOOKING_TYPE_LABELS[type]}
                description={BOOKING_TYPE_DESCRIPTIONS[type]}
              />
            ))}
          </div>
        </fieldset>

        <Field
          label="Customers at once"
          htmlFor={`${id}-capacity`}
          hint="How many people you can serve in the same time slot."
        >
          <Input
            id={`${id}-capacity`}
            type="number"
            inputMode="numeric"
            min="1"
            max="50"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-28"
          />
        </Field>

        <Field label="Description" htmlFor={`${id}-description`} optional>
          <Textarea
            id={`${id}-description`}
            rows={3}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's included, and anything customers should bring."
          />
        </Field>

        <Toggle
          checked={active}
          onChange={setActive}
          label="Show on your menu"
          description="Hidden services stay saved but customers can't book them."
        />
      </form>
    </Sheet>
  );
}

/** A radio button drawn as a card; the native input keeps keyboard and screen reader support. */
function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  compact = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-11 cursor-pointer rounded-xl border bg-white transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50",
        compact ? "items-center justify-center px-2 py-2 text-center" : "flex-col p-3",
        checked
          ? "border-green-600 bg-accent ring-1 ring-green-600"
          : "border-border hover:border-neutral-400",
        FOCUS_RING,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span className="text-sm font-semibold text-navy-900">{label}</span>
      {description && <span className="mt-0.5 text-sm text-slate-600">{description}</span>}
    </label>
  );
}
