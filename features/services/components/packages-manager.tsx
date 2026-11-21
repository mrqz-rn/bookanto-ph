"use client";

import * as React from "react";
import { Check, Package as PackageIcon, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createPackage, deletePackage, updatePackage } from "../actions";
import { packageSaving, parsePesos, type MenuPackage } from "../menu";
import {
  ActionError,
  Busy,
  CARD,
  Chip,
  ConfirmDelete,
  EmptyPanel,
  Field,
  PesoInput,
  PRESS,
  SELECT,
  Sheet,
  Toggle,
} from "./services-ui";

// Packages: several services sold together at one price.

type ServiceItemOption = { id: string; name: string; priceCentavos: number | null };

type PackagesManagerProps = {
  shopId: string;
  packages: MenuPackage[];
  availableServices: ServiceItemOption[];
  onRefresh: () => void;
  onNotice?: (message: string) => void;
  onShowServices?: () => void;
};

export function PackagesManager({
  shopId,
  packages,
  availableServices,
  onRefresh,
  onNotice,
  onShowServices,
}: PackagesManagerProps) {
  const [editing, setEditing] = React.useState<MenuPackage | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const canCreate = availableServices.length > 0;

  function openForm(pkg: MenuPackage | null) {
    setEditing(pkg);
    setFormOpen(true);
  }

  async function onDelete(pkg: MenuPackage) {
    setDeletingId(pkg.id);
    setError(null);
    try {
      const result = await deletePackage({ packageId: pkg.id, shopId });
      if (result.ok) {
        setConfirmingId(null);
        onNotice?.(`Deleted ${pkg.name}.`);
        onRefresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError(`Couldn't delete ${pkg.name}. Try again.`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-navy-900">Packages</h2>
          <p className="text-base text-slate-600">
            Services sold together at one price, like a haircut with a beard trim.
          </p>
        </div>
        {packages.length > 0 && (
          <Button type="button" onClick={() => openForm(null)} className={PRESS}>
            <Plus aria-hidden />
            Add a package
          </Button>
        )}
      </div>

      {error && <ActionError message={error} onDismiss={() => setError(null)} />}

      {packages.length === 0 ? (
        <EmptyPanel
          icon={<PackageIcon aria-hidden className="size-7" />}
          title={canCreate ? "No packages yet" : "Add a service first"}
          actions={
            canCreate ? (
              <Button type="button" onClick={() => openForm(null)} className={PRESS}>
                <Plus aria-hidden />
                Add a package
              </Button>
            ) : (
              onShowServices && (
                <Button type="button" variant="outline" onClick={onShowServices} className={PRESS}>
                  See your services
                </Button>
              )
            )
          }
        >
          {canCreate
            ? "Bundle services customers often book together and set one price for the set."
            : "A package is made of services on your menu, so it needs at least one."}
        </EmptyPanel>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg) => {
            const saving = packageSaving(pkg.priceCentavos, pkg.originalPriceCentavos);
            return (
              <li
                key={pkg.id}
                className={cn(CARD, "flex flex-col p-5", !pkg.active && "bg-neutral-50")}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-navy-900">{pkg.name}</h3>
                  {!pkg.active && <Chip>Hidden</Chip>}
                </div>
                {pkg.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{pkg.description}</p>
                )}

                <ul className="mt-4 space-y-1.5 text-sm text-navy-900">
                  {pkg.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" />
                      <span>
                        {item.quantity > 1 && (
                          <span className="font-semibold tabular-nums">{item.quantity} × </span>
                        )}
                        {item.serviceName}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-2xl font-bold text-navy-900 tabular-nums">
                      {formatPeso(pkg.priceCentavos)}
                    </span>
                    {saving !== null && pkg.originalPriceCentavos !== null && (
                      <>
                        <span className="text-sm text-slate-600 tabular-nums line-through">
                          {formatPeso(pkg.originalPriceCentavos)}
                        </span>
                        <Chip tone="highlight">Save {saving}%</Chip>
                      </>
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                    {confirmingId === pkg.id ? (
                      <ConfirmDelete
                        what={pkg.name}
                        busy={deletingId === pkg.id}
                        onCancel={() => setConfirmingId(null)}
                        onConfirm={() => onDelete(pkg)}
                      />
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openForm(pkg)}
                          aria-label={`Edit ${pkg.name}`}
                          className={cn("flex-1", PRESS)}
                        >
                          <Pencil aria-hidden className="size-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmingId(pkg.id)}
                          aria-label={`Delete ${pkg.name}`}
                          className="text-slate-600 hover:bg-red-50 hover:text-danger"
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PackageForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        shopId={shopId}
        initial={editing}
        services={availableServices}
        onSaved={(message) => {
          onNotice?.(message);
          onRefresh();
        }}
      />
    </div>
  );
}

const FORM_ID = "package-form";

function PackageForm({
  open,
  onClose,
  shopId,
  initial,
  services,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string;
  initial: MenuPackage | null;
  services: ServiceItemOption[];
  onSaved: (message: string) => void;
}) {
  const id = React.useId();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [original, setOriginal] = React.useState("");
  const [items, setItems] = React.useState<Array<{ serviceId: string; quantity: number }>>([]);
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setPrice(initial ? String(initial.priceCentavos / 100) : "");
    setOriginal(
      initial?.originalPriceCentavos != null ? String(initial.originalPriceCentavos / 100) : "",
    );
    setItems(
      initial
        ? initial.items.map((it) => ({ serviceId: it.serviceId, quantity: it.quantity }))
        : services[0]
          ? [{ serviceId: services[0].id, quantity: 1 }]
          : [],
    );
    setActive(initial?.active ?? true);
    setError(null);
    setPriceError(null);
  }, [open, initial, services]);

  // What the services would cost one by one, to suggest the "was" price.
  const separately = items.reduce((sum, item) => {
    const service = services.find((s) => s.id === item.serviceId);
    return sum + (service?.priceCentavos ?? 0) * item.quantity;
  }, 0);

  function setItem(index: number, patch: Partial<{ serviceId: string; quantity: number }>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (items.length === 0) {
      setError("Add at least one service to the package.");
      return;
    }
    const priceCentavos = parsePesos(price);
    if (priceCentavos === null) {
      setPriceError("Enter a price in pesos, like 450.");
      return;
    }
    const originalPriceCentavos = original.trim() ? parsePesos(original) : null;
    if (original.trim() && originalPriceCentavos === null) {
      setPriceError("Enter the usual price in pesos, or leave it empty.");
      return;
    }
    setPriceError(null);
    setError(null);
    setSaving(true);

    const input = {
      shopId,
      name: name.trim(),
      description: description.trim() || null,
      priceCentavos,
      originalPriceCentavos,
      serviceItems: items,
      active,
    };
    try {
      const result = initial
        ? await updatePackage({ ...input, packageId: initial.id })
        : await createPackage(input);
      if (result.ok) {
        onSaved(initial ? `Saved ${input.name}.` : `Added the ${input.name} package.`);
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Couldn't save the package. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={saving}
      title={initial ? `Edit ${initial.name}` : "Add a package"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving} className={PRESS}>
            <Busy busy={saving}>{initial ? "Save changes" : "Add package"}</Busy>
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-6">
        {error && <ActionError message={error} onDismiss={() => setError(null)} />}

        <Field label="Package name" htmlFor={`${id}-name`}>
          <Input
            id={`${id}-name`}
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cut and shave"
            autoComplete="off"
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-navy-900">
            Services in the package
          </legend>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                <label htmlFor={`${id}-item-${index}`} className="sr-only">
                  Service {index + 1}
                </label>
                <select
                  id={`${id}-item-${index}`}
                  value={item.serviceId}
                  onChange={(e) => setItem(index, { serviceId: e.target.value })}
                  className={cn(SELECT, "min-w-0 flex-1")}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.priceCentavos !== null ? ` (${formatPeso(s.priceCentavos)})` : ""}
                    </option>
                  ))}
                </select>
                <label htmlFor={`${id}-qty-${index}`} className="sr-only">
                  How many of service {index + 1}
                </label>
                <Input
                  id={`${id}-qty-${index}`}
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10"
                  value={item.quantity}
                  onChange={(e) =>
                    setItem(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
                  }
                  className="w-16 text-center tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                  aria-label={`Remove service ${index + 1}`}
                  className="text-slate-600 hover:bg-red-50 hover:text-danger"
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              services[0] &&
              setItems((prev) => [...prev, { serviceId: services[0]!.id, quantity: 1 }])
            }
            className={cn("w-full sm:w-auto", PRESS)}
          >
            <Plus aria-hidden />
            Add another service
          </Button>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Package price" htmlFor={`${id}-price`}>
            <PesoInput
              id={`${id}-price`}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="450"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `${id}-price-error` : undefined}
            />
          </Field>
          <Field
            label="Usual price"
            htmlFor={`${id}-original`}
            optional
            hint={separately > 0 ? `One by one: ${formatPeso(separately)}` : undefined}
          >
            <PesoInput
              id={`${id}-original`}
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder={separately > 0 ? String(separately / 100) : ""}
            />
          </Field>
        </div>
        {priceError && (
          <p id={`${id}-price-error`} className="-mt-3 text-sm text-danger">
            {priceError}
          </p>
        )}

        <Field label="Description" htmlFor={`${id}-description`} optional>
          <Textarea
            id={`${id}-description`}
            rows={2}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Toggle
          checked={active}
          onChange={setActive}
          label="Show on your menu"
          description="Hidden packages stay saved but customers can't buy them."
        />
      </form>
    </Sheet>
  );
}
