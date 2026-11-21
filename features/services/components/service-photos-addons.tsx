"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ImageOff, ImagePlus, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso } from "@/lib/money";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import {
  addServicePhoto,
  createServiceAddon,
  deleteServiceAddon,
  removeServicePhoto,
  updateServiceAddon,
} from "../actions";
import { parsePesos, type ServiceAddon, type ServicePhoto } from "../menu";
import {
  ActionError,
  Busy,
  ConfirmDelete,
  Field,
  FOCUS_RING,
  PesoInput,
  PRESS,
  Toggle,
} from "./services-ui";

// One service's photos and add-ons. Both save as soon as they change, so this
// opens in a sheet of its own rather than inside the service's form.

export type { ServiceAddon, ServicePhoto };

export type ServiceOption = {
  id: string;
  name: string;
  photos: ServicePhoto[];
  addons: ServiceAddon[];
};

export type ServicePhotosAddonsProps = {
  shopId: string;
  service: ServiceOption;
  onUpdateService?: (serviceId: string, updater: (prev: ServiceOption) => ServiceOption) => void;
};

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(",")[1];
      if (base64) resolve(base64);
      else reject(new Error("Empty image"));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ServicePhotosAddons({
  shopId,
  service: initialService,
  onUpdateService,
}: ServicePhotosAddonsProps) {
  const router = useRouter();
  // A local copy, so the sheet updates at once even when no parent listens.
  const [service, setService] = React.useState(initialService);
  React.useEffect(() => setService(initialService), [initialService]);

  const [error, setError] = React.useState<string | null>(null);

  const update = (updater: (prev: ServiceOption) => ServiceOption) => {
    setService(updater);
    onUpdateService?.(service.id, updater);
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {error && <ActionError message={error} onDismiss={() => setError(null)} />}
      <PhotosSection shopId={shopId} service={service} update={update} onError={setError} />
      <AddonsSection shopId={shopId} service={service} update={update} onError={setError} />
    </div>
  );
}

type SectionProps = {
  shopId: string;
  service: ServiceOption;
  update: (updater: (prev: ServiceOption) => ServiceOption) => void;
  onError: (message: string | null) => void;
};

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

function PhotosSection({ shopId, service, update, onError }: SectionProps) {
  const inputId = React.useId();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const reset = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onError(null);

    if (!PHOTO_TYPES.includes(file.type)) {
      onError("That file isn't a photo we can use. Pick a JPEG, PNG or WebP.");
      return reset();
    }
    if (file.size > MAX_PHOTO_BYTES) {
      onError("That photo is over 8 MB. Pick a smaller one.");
      return reset();
    }

    setUploading(true);
    try {
      const imageBase64 = await readAsBase64(file);
      const sortOrder = service.photos.length;
      const result = await addServicePhoto({
        serviceId: service.id,
        shopId,
        imageBase64,
        sortOrder,
      });
      if (result.ok) {
        const photo: ServicePhoto = { id: result.data.mediaId, path: result.data.path, sortOrder };
        update((s) => ({ ...s, photos: [...s.photos, photo] }));
      } else {
        onError(result.message);
      }
    } catch {
      onError("Couldn't upload the photo. Check your connection and try again.");
    } finally {
      setUploading(false);
      reset();
    }
  }

  async function onRemove(photo: ServicePhoto) {
    setRemovingId(photo.id);
    onError(null);
    try {
      const result = await removeServicePhoto({
        serviceId: service.id,
        shopId,
        mediaId: photo.id,
      });
      if (result.ok) {
        update((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== photo.id) }));
      } else {
        onError(result.message);
      }
    } catch {
      onError("Couldn't remove the photo. Try again.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section aria-labelledby={`${inputId}-title`} className="space-y-3">
      <div>
        <h3 id={`${inputId}-title`} className="text-lg font-bold text-navy-900">
          Photos
          <span className="ml-2 text-sm font-semibold text-slate-600 tabular-nums">
            {service.photos.length}
          </span>
        </h3>
        <p className="text-sm text-slate-600">
          Past work for this service. JPEG, PNG or WebP, up to 8 MB each.
        </p>
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={PHOTO_TYPES.join(",")}
        onChange={onFile}
        className="sr-only"
        tabIndex={-1}
      />

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {service.photos.map((photo, index) => (
          <li key={photo.id} className="relative aspect-square">
            <PhotoTile path={photo.path} />
            <button
              type="button"
              disabled={removingId === photo.id}
              onClick={() => onRemove(photo)}
              aria-label={`Remove photo ${index + 1}`}
              title="Remove photo"
              className={cn(
                "group/remove absolute top-0 right-0 grid size-11 place-items-center rounded-full text-navy-900 disabled:opacity-60",
                FOCUS_RING,
              )}
            >
              <span className="grid size-7 place-items-center rounded-full bg-white/95 shadow-sm group-hover/remove:bg-red-50 group-hover/remove:text-danger">
                {removingId === photo.id ? (
                  <Loader2 aria-hidden className="size-3.5 animate-spin" />
                ) : (
                  <X aria-hidden className="size-3.5" />
                )}
              </span>
            </button>
          </li>
        ))}
        <li className="aspect-square">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "flex size-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-2 text-center text-sm font-semibold text-green-700 transition-colors hover:border-green-600 hover:bg-accent disabled:cursor-wait",
              FOCUS_RING,
            )}
          >
            {uploading ? (
              <>
                <Loader2 aria-hidden className="size-6 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <ImagePlus aria-hidden className="size-6" />
                Add a photo
              </>
            )}
          </button>
        </li>
      </ul>
    </section>
  );
}

function PhotoTile({ path }: { path: string }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-1 rounded-xl bg-neutral-100 p-2 text-center text-xs text-slate-600">
        <ImageOff aria-hidden className="size-5" />
        Couldn&apos;t load
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mediaUrl(path)}
      alt="Service photo"
      width={160}
      height={160}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full rounded-xl bg-neutral-100 object-cover"
    />
  );
}

// ---------------------------------------------------------------------------
// Add-ons
// ---------------------------------------------------------------------------

function AddonsSection({ shopId, service, update, onError }: SectionProps) {
  const titleId = React.useId();
  const [adding, setAdding] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  async function onToggle(addon: ServiceAddon) {
    setBusyId(addon.id);
    onError(null);
    const active = !addon.active;
    try {
      const result = await updateServiceAddon({
        addonId: addon.id,
        shopId,
        name: addon.name,
        priceCentavos: addon.priceCentavos,
        durationMin: addon.durationMin,
        active,
      });
      if (result.ok) {
        update((s) => ({
          ...s,
          addons: s.addons.map((a) => (a.id === addon.id ? { ...a, active } : a)),
        }));
      } else {
        onError(result.message);
      }
    } catch {
      onError(`Couldn't update ${addon.name}. Try again.`);
    } finally {
      setBusyId(null);
    }
  }

  async function onDelete(addon: ServiceAddon) {
    setBusyId(addon.id);
    onError(null);
    try {
      const result = await deleteServiceAddon({ addonId: addon.id, shopId });
      if (result.ok) {
        setConfirmingId(null);
        update((s) => ({ ...s, addons: s.addons.filter((a) => a.id !== addon.id) }));
      } else {
        onError(result.message);
      }
    } catch {
      onError(`Couldn't delete ${addon.name}. Try again.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 id={titleId} className="text-lg font-bold text-navy-900">
            Add-ons
            <span className="ml-2 text-sm font-semibold text-slate-600 tabular-nums">
              {service.addons.length}
            </span>
          </h3>
          <p className="text-sm text-slate-600">
            Extras customers can add when they book, like a hair wash.
          </p>
        </div>
        {!adding && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setAdding(true)}
            className={cn("w-full sm:w-auto", PRESS)}
          >
            <Plus aria-hidden />
            Add an add-on
          </Button>
        )}
      </div>

      {adding && (
        <AddonForm
          shopId={shopId}
          serviceId={service.id}
          onCancel={() => setAdding(false)}
          onError={onError}
          onCreated={(addon) => {
            setAdding(false);
            update((s) => ({ ...s, addons: [...s.addons, addon] }));
          }}
        />
      )}

      {service.addons.length === 0 && !adding ? (
        <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-4 text-sm text-slate-600">
          <Sparkles aria-hidden className="size-5 shrink-0 text-green-700" />
          No add-ons for {service.name} yet.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {service.addons.map((addon) => (
            <li key={addon.id} className="p-3 sm:p-4">
              {confirmingId === addon.id ? (
                <ConfirmDelete
                  what={addon.name}
                  busy={busyId === addon.id}
                  onCancel={() => setConfirmingId(null)}
                  onConfirm={() => onDelete(addon)}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900">{addon.name}</p>
                    <p className="text-sm text-slate-600 tabular-nums">
                      +{formatPeso(addon.priceCentavos)}
                      {addon.durationMin > 0 && ` · +${addon.durationMin} min`}
                    </p>
                    {addon.description && (
                      <p className="mt-0.5 text-sm text-slate-600">{addon.description}</p>
                    )}
                  </div>
                  <Toggle
                    checked={addon.active}
                    disabled={busyId === addon.id}
                    onChange={() => onToggle(addon)}
                    label="Offered"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmingId(addon.id)}
                    aria-label={`Delete ${addon.name}`}
                    title="Delete add-on"
                    className="text-slate-600 hover:bg-red-50 hover:text-danger"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AddonForm({
  shopId,
  serviceId,
  onCancel,
  onCreated,
  onError,
}: {
  shopId: string;
  serviceId: string;
  onCancel: () => void;
  onCreated: (addon: ServiceAddon) => void;
  onError: (message: string | null) => void;
}) {
  const id = React.useId();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [minutes, setMinutes] = React.useState("10");
  const [saving, setSaving] = React.useState(false);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const priceCentavos = parsePesos(price);
    if (priceCentavos === null) {
      setPriceError("Enter a price in pesos, like 50.");
      return;
    }
    setPriceError(null);
    onError(null);
    setSaving(true);
    const durationMin = Math.max(0, parseInt(minutes, 10) || 0);
    const trimmed = { name: name.trim(), description: description.trim() || null };
    try {
      const result = await createServiceAddon({
        serviceId,
        shopId,
        ...trimmed,
        priceCentavos,
        durationMin,
        active: true,
      });
      if (result.ok) {
        onCreated({
          id: result.data.addonId,
          serviceId,
          ...trimmed,
          priceCentavos,
          durationMin,
          active: true,
        });
      } else {
        onError(result.message);
      }
    } catch {
      onError("Couldn't save the add-on. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="New add-on"
      className="space-y-4 rounded-xl border border-green-600/30 bg-accent/40 p-4"
    >
      <Field label="Add-on name" htmlFor={`${id}-name`}>
        <Input
          id={`${id}-name`}
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Hair wash"
          autoFocus
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price" htmlFor={`${id}-price`}>
          <PesoInput
            id={`${id}-price`}
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="50"
            aria-invalid={priceError ? true : undefined}
            aria-describedby={priceError ? `${id}-price-error` : undefined}
          />
          {priceError && (
            <p id={`${id}-price-error`} className="text-sm text-danger">
              {priceError}
            </p>
          )}
        </Field>
        <Field label="Extra time" htmlFor={`${id}-minutes`} hint="Minutes">
          <Input
            id={`${id}-minutes`}
            type="number"
            inputMode="numeric"
            min="0"
            max="240"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Description" htmlFor={`${id}-description`} optional>
        <Input
          id={`${id}-description`}
          maxLength={300}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className={PRESS}>
          <Busy busy={saving}>Save add-on</Busy>
        </Button>
      </div>
    </form>
  );
}
