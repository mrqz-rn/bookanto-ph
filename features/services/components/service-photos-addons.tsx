"use client";

import * as React from "react";
import { Image as ImageIcon, Plus, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, pesosToCentavos } from "@/lib/money";
import { mediaUrl } from "@/lib/storage";
import {
  addServicePhoto,
  createServiceAddon,
  deleteServiceAddon,
  removeServicePhoto,
  updateServiceAddon,
} from "../actions";

type ServicePhoto = {
  id: string;
  path: string;
  sortOrder: number;
};

type ServiceAddon = {
  id: string;
  serviceId: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  durationMin: number;
  active: boolean;
};

type ServiceOption = {
  id: string;
  name: string;
  photos: ServicePhoto[];
  addons: ServiceAddon[];
};

type ServicePhotosAddonsProps = {
  shopId: string;
  services: ServiceOption[];
  onRefresh: () => void;
};

export function ServicePhotosAddons({ shopId, services, onRefresh }: ServicePhotosAddonsProps) {
  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(services[0]?.id || "");
  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];

  // Add-on Form state
  const [isAddingAddon, setIsAddingAddon] = React.useState(false);
  const [addonName, setAddonName] = React.useState("");
  const [addonDesc, setAddonDesc] = React.useState("");
  const [addonPrice, setAddonPrice] = React.useState("50");
  const [addonDuration, setAddonDuration] = React.useState("10");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (services.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-neutral-500">
        <p className="font-semibold text-neutral-800">No services yet.</p>
        <p className="mt-1 text-xs">
          Create services first in the Services tab before adding photos or add-ons.
        </p>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedService) return;

    if (file.size > 8 * 1024 * 1024) {
      setError("File exceeds 8 MB maximum size.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `services/${selectedService.id}/photo-${Date.now()}.${ext}`;

      const res = await addServicePhoto({
        serviceId: selectedService.id,
        shopId,
        path,
        sortOrder: selectedService.photos.length,
      });

      if (res.ok) {
        onRefresh();
      } else {
        setError(res.message);
      }
    } catch {
      setError("Failed to upload service photo.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async (mediaId: string) => {
    if (!selectedService) return;
    try {
      const res = await removeServicePhoto({
        serviceId: selectedService.id,
        shopId,
        mediaId,
      });
      if (res.ok) onRefresh();
    } catch {
      setError("Failed to delete photo.");
    }
  };

  const handleCreateAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setError(null);
    setLoading(true);

    try {
      const priceCentavos = pesosToCentavos(addonPrice);
      const durationMin = parseInt(addonDuration, 10) || 0;

      const res = await createServiceAddon({
        serviceId: selectedService.id,
        shopId,
        name: addonName.trim(),
        description: addonDesc.trim() || null,
        priceCentavos,
        durationMin,
        active: true,
      });

      if (res.ok) {
        setIsAddingAddon(false);
        setAddonName("");
        setAddonDesc("");
        setAddonPrice("50");
        setAddonDuration("10");
        onRefresh();
      } else {
        setError(res.message);
      }
    } catch {
      setError("Could not create add-on.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddon = async (addonId: string) => {
    try {
      const res = await deleteServiceAddon({ addonId, shopId });
      if (res.ok) onRefresh();
    } catch {
      setError("Could not delete add-on.");
    }
  };

  const handleToggleAddon = async (addon: ServiceAddon) => {
    try {
      const res = await updateServiceAddon({
        addonId: addon.id,
        shopId,
        name: addon.name,
        priceCentavos: addon.priceCentavos,
        durationMin: addon.durationMin,
        active: !addon.active,
      });
      if (res.ok) onRefresh();
    } catch {
      setError("Could not update add-on status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Service Selector */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <label className="block text-xs font-semibold tracking-wider text-neutral-500 uppercase">
          Select Service to Manage
        </label>
        <select
          value={selectedServiceId}
          onChange={(e) => setSelectedServiceId(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm font-semibold text-neutral-900 outline-none"
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.photos.length} photos, {s.addons.length} add-ons)
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}

      {selectedService && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Photos Column */}
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-neutral-900">Service Photos</h4>
                <p className="text-xs text-neutral-500">
                  Showcase past work for this specific service.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-navy-900"
              >
                <UploadCloud className="mr-1.5 size-3.5" />
                Add Photo
              </Button>
            </div>

            {selectedService.photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-6 text-center text-neutral-400">
                <ImageIcon className="size-8" />
                <p className="mt-1 text-xs">No photos attached to this service.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {selectedService.photos.map((p) => (
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(p.path)}
                      alt="Service photo"
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handlePhotoDelete(p.id)}
                      className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                      title="Delete photo"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add-ons Column */}
          <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-neutral-900">Service Add-ons</h4>
                <p className="text-xs text-neutral-500">
                  Upgrades customers can add during booking.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddingAddon(!isAddingAddon)}
                className="text-xs text-navy-900"
              >
                <Plus className="mr-1.5 size-3.5" />
                {isAddingAddon ? "Close" : "New Add-on"}
              </Button>
            </div>

            {/* Create Add-on form */}
            {isAddingAddon && (
              <form
                onSubmit={handleCreateAddon}
                className="space-y-3 rounded-lg border border-orange-200 bg-orange-50/30 p-3.5"
              >
                <h5 className="text-xs font-bold text-neutral-800">
                  Add an upgrade / extra service
                </h5>
                <div className="space-y-2">
                  <Input
                    required
                    placeholder="Add-on Name (e.g. Scalp Treatment, Hair Wash)"
                    value={addonName}
                    onChange={(e) => setAddonName(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Input
                    placeholder="Optional description"
                    value={addonDesc}
                    onChange={(e) => setAddonDesc(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-neutral-500">Price (₱)</label>
                      <Input
                        type="number"
                        min="0"
                        value={addonPrice}
                        onChange={(e) => setAddonPrice(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-neutral-500">Extra Time (mins)</label>
                      <Input
                        type="number"
                        min="0"
                        value={addonDuration}
                        onChange={(e) => setAddonDuration(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsAddingAddon(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="bg-navy-900 text-xs text-white"
                  >
                    Save Add-on
                  </Button>
                </div>
              </form>
            )}

            {/* Existing Add-ons List */}
            {selectedService.addons.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">
                No add-ons configured for this service yet.
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {selectedService.addons.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900">{a.name}</span>
                        <span className="font-bold text-navy-900">
                          +{formatPeso(a.priceCentavos)}
                        </span>
                        {a.durationMin > 0 && (
                          <span className="text-neutral-500">(+{a.durationMin}m)</span>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-[11px] text-neutral-500">{a.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAddon(a)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          a.active
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        {a.active ? "Active" : "Off"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddon(a.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete add-on"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
