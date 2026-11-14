"use client";

import * as React from "react";
import { Package as PackageIcon, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, pesosToCentavos } from "@/lib/money";
import { createPackage, deletePackage, updatePackage } from "../actions";

type ServiceItemOption = {
  id: string;
  name: string;
  priceCentavos: number | null;
};

type PackageItem = {
  id: string;
  packageId: string;
  serviceId: string;
  serviceName: string;
  servicePriceCentavos: number | null;
  durationMin: number;
  quantity: number;
};

type PackageData = {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  originalPriceCentavos: number | null;
  active: boolean;
  items: PackageItem[];
};

type PackagesManagerProps = {
  shopId: string;
  packages: PackageData[];
  availableServices: ServiceItemOption[];
  onRefresh: () => void;
};

export function PackagesManager({
  shopId,
  packages,
  availableServices,
  onRefresh,
}: PackagesManagerProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingPackageId, setEditingPackageId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pricePesos, setPricePesos] = React.useState("");
  const [originalPricePesos, setOriginalPricePesos] = React.useState("");
  const [selectedItems, setSelectedItems] = React.useState<
    Array<{ serviceId: string; quantity: number }>
  >([]);
  const [active, setActive] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const openCreateModal = () => {
    setEditingPackageId(null);
    setName("");
    setDescription("");
    setPricePesos("350");
    setOriginalPricePesos("");
    const firstSvc = availableServices[0];
    setSelectedItems(firstSvc ? [{ serviceId: firstSvc.id, quantity: 1 }] : []);
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (pkg: PackageData) => {
    setEditingPackageId(pkg.id);
    setName(pkg.name);
    setDescription(pkg.description || "");
    setPricePesos((pkg.priceCentavos / 100).toString());
    setOriginalPricePesos(
      pkg.originalPriceCentavos !== null ? (pkg.originalPriceCentavos / 100).toString() : "",
    );
    setSelectedItems(pkg.items.map((it) => ({ serviceId: it.serviceId, quantity: it.quantity })));
    setActive(pkg.active);
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    const firstService = availableServices[0];
    if (!firstService) return;
    setSelectedItems((prev) => [...prev, { serviceId: firstService.id, quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (
    index: number,
    updates: Partial<{ serviceId: string; quantity: number }>,
  ) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedItems.length === 0) {
      setError("Please include at least one service in the package bundle.");
      return;
    }

    setLoading(true);

    try {
      const priceCentavos = pesosToCentavos(pricePesos);
      const originalPriceCentavos = originalPricePesos ? pesosToCentavos(originalPricePesos) : null;

      if (editingPackageId) {
        const res = await updatePackage({
          packageId: editingPackageId,
          shopId,
          name: name.trim(),
          description: description.trim() || null,
          priceCentavos,
          originalPriceCentavos,
          serviceItems: selectedItems,
          active,
        });

        if (res.ok) {
          setIsModalOpen(false);
          onRefresh();
        } else {
          setError(res.message);
        }
      } else {
        const res = await createPackage({
          shopId,
          name: name.trim(),
          description: description.trim() || null,
          priceCentavos,
          originalPriceCentavos,
          serviceItems: selectedItems,
          active,
        });

        if (res.ok) {
          setIsModalOpen(false);
          onRefresh();
        } else {
          setError(res.message);
        }
      }
    } catch {
      setError("Could not save package. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (packageId: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;
    try {
      const res = await deletePackage({ packageId, shopId });
      if (res.ok) onRefresh();
    } catch {
      setError("Failed to delete package.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Service Packages & Bundles</h3>
          <p className="text-xs text-neutral-500">
            Combine multiple services into bundled deals with discounted package pricing.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          disabled={availableServices.length === 0}
          className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
        >
          <Plus className="mr-1.5 size-4" />
          Create Package Bundle
        </Button>
      </div>

      {availableServices.length === 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Tip: You need to create at least one service before setting up bundled packages.
        </p>
      )}

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-10 text-center">
          <PackageIcon className="size-12 text-neutral-300" />
          <h4 className="mt-3 text-sm font-semibold text-neutral-800">No Packages Created</h4>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            Encourage higher customer spend by bundling popular services (e.g. &quot;Haircut + Beard
            Trim + Shampoo&quot; combo).
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            disabled={availableServices.length === 0}
            className="mt-4 text-xs text-navy-900"
          >
            Create First Package
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => {
            const hasDiscount =
              pkg.originalPriceCentavos && pkg.originalPriceCentavos > pkg.priceCentavos;
            const discountPct = hasDiscount
              ? Math.round(
                  ((pkg.originalPriceCentavos! - pkg.priceCentavos) / pkg.originalPriceCentavos!) *
                    100,
                )
              : null;

            return (
              <div
                key={pkg.id}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-base font-semibold text-neutral-900">{pkg.name}</h4>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        pkg.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {pkg.active ? "Active" : "Archived"}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                    {pkg.description || "Bundled package"}
                  </p>

                  {/* Bundled Services */}
                  <div className="mt-3 border-t border-neutral-100 pt-3">
                    <span className="text-[11px] font-semibold tracking-wider text-neutral-700 uppercase">
                      Included Services:
                    </span>
                    <ul className="mt-1 space-y-1 text-xs text-neutral-600">
                      {pkg.items.map((it) => (
                        <li key={it.id} className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-orange-500" />
                          <span>
                            {it.quantity > 1 ? `${it.quantity}x ` : ""}
                            {it.serviceName}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-navy-900">
                      {formatPeso(pkg.priceCentavos)}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-xs text-neutral-400 line-through">
                          {formatPeso(pkg.originalPriceCentavos!)}
                        </span>
                        <span className="py-0.2 rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">
                          Save {discountPct}%
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(pkg)}
                      className="text-xs text-navy-900"
                    >
                      Edit Package
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDelete(pkg.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Delete package"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Package Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-display text-xl text-neutral-900">
                {editingPackageId ? "Edit Package" : "Create Package Bundle"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
              >
                <X className="size-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-900">Package Name</label>
                <Input
                  required
                  placeholder="e.g. VIP Grooming Package"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900">Description</label>
                <textarea
                  rows={2}
                  placeholder="Haircut, beard trim, and relaxing scalp massage combo."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 p-2.5 text-xs text-neutral-900 outline-none focus-visible:border-neutral-950"
                />
              </div>

              {/* Bundled Services Selection */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-900">
                    Included Services ({selectedItems.length})
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddItem}
                    className="text-xs text-orange-700 hover:bg-orange-50"
                  >
                    <Plus className="mr-1 size-3.5" /> Add Another Service
                  </Button>
                </div>

                <div className="mt-2 space-y-2">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.serviceId}
                        onChange={(e) => handleUpdateItem(idx, { serviceId: e.target.value })}
                        className="h-10 flex-1 rounded-md border border-neutral-300 bg-white px-3 text-xs text-neutral-900 outline-none"
                      >
                        {availableServices.map((svc) => (
                          <option key={svc.id} value={svc.id}>
                            {svc.name}{" "}
                            {svc.priceCentavos ? `(${formatPeso(svc.priceCentavos)})` : ""}
                          </option>
                        ))}
                      </select>

                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={item.quantity}
                        onChange={(e) =>
                          handleUpdateItem(idx, {
                            quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                          })
                        }
                        className="h-10 w-16 text-center text-xs"
                        title="Quantity"
                      />

                      {selectedItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="rounded p-2 text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Package Price (₱) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={pricePesos}
                    onChange={(e) => setPricePesos(e.target.value)}
                    placeholder="350.00"
                    className="mt-1 h-10 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Original Value (₱){" "}
                    <span className="font-normal text-neutral-400">(Optional)</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={originalPricePesos}
                    onChange={(e) => setOriginalPricePesos(e.target.value)}
                    placeholder="e.g. 450.00"
                    className="mt-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pkg-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="pkg-active" className="text-xs font-medium text-neutral-700">
                  Active for online purchase
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
                >
                  {loading ? "Saving..." : editingPackageId ? "Save Changes" : "Create Package"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
