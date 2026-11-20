"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Clock, FileSpreadsheet, Plus, Scissors, Sparkles, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPeso } from "@/lib/money";
import { archiveService, deleteService } from "../actions";
import { BOOKING_TYPE_LABELS } from "../constants";
import { BulkImportModal } from "./bulk-import-modal";
import { CategoryTemplatesModal } from "./category-templates-modal";
import { MembershipsManager } from "./memberships-manager";
import { PackagesManager } from "./packages-manager";
import { ServiceModal } from "./service-modal";
import { ServicePhotosAddons } from "./service-photos-addons";

type ServiceItem = {
  id: string;
  shopId: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  priceType: "fixed" | "starts_at" | "quote";
  priceCentavos: number | null;
  durationMin: number;
  bookingType: "slot" | "home" | "quote" | "queue";
  capacity: number;
  bufferMin: number;
  active: boolean;
  sortOrder: number;
  photos: Array<{ id: string; path: string; sortOrder: number }>;
  addons: Array<{
    id: string;
    serviceId: string;
    name: string;
    description: string | null;
    priceCentavos: number;
    durationMin: number;
    active: boolean;
  }>;
};

type PackageItem = {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  originalPriceCentavos: number | null;
  active: boolean;
  items: Array<{
    id: string;
    packageId: string;
    serviceId: string;
    serviceName: string;
    servicePriceCentavos: number | null;
    durationMin: number;
    quantity: number;
  }>;
};

type MembershipItem = {
  id: string;
  name: string;
  description: string | null;
  priceCentavos: number;
  cadence: "weekly" | "monthly" | "quarterly" | "yearly" | "sessions_pack";
  sessionCredits: number | null;
  validityDays: number | null;
  perks: string | null;
  active: boolean;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type ServicesManagerProps = {
  shopId: string;
  initialServices: ServiceItem[];
  initialPackages: PackageItem[];
  initialMemberships: MembershipItem[];
  shopCategories: CategoryOption[];
};

export function ServicesManager({
  shopId,
  initialServices,
  initialPackages,
  initialMemberships,
  shopCategories,
}: ServicesManagerProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = React.useState<
    "services" | "photos_addons" | "packages" | "memberships"
  >("services");

  const [services, setServices] = React.useState<ServiceItem[]>(initialServices);
  const [packagesList, setPackagesList] = React.useState<PackageItem[]>(initialPackages);
  const [membershipsList, setMembershipsList] =
    React.useState<MembershipItem[]>(initialMemberships);

  React.useEffect(() => {
    setServices(initialServices);
  }, [initialServices]);

  React.useEffect(() => {
    setPackagesList(initialPackages);
  }, [initialPackages]);

  React.useEffect(() => {
    setMembershipsList(initialMemberships);
  }, [initialMemberships]);

  const [isServiceModalOpen, setIsServiceModalOpen] = React.useState(false);
  const [editingService, setEditingService] = React.useState<ServiceItem | null>(null);

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = React.useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = React.useState(false);

  const refreshPage = () => {
    router.refresh();
  };

  const handleUpdateService = React.useCallback(
    (
      serviceId: string,
      updater: (prev: {
        id: string;
        name: string;
        photos: Array<{ id: string; path: string; sortOrder: number }>;
        addons: Array<{
          id: string;
          serviceId: string;
          name: string;
          description: string | null;
          priceCentavos: number;
          durationMin: number;
          active: boolean;
        }>;
      }) => {
        id: string;
        name: string;
        photos: Array<{ id: string; path: string; sortOrder: number }>;
        addons: Array<{
          id: string;
          serviceId: string;
          name: string;
          description: string | null;
          priceCentavos: number;
          durationMin: number;
          active: boolean;
        }>;
      },
    ) => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== serviceId) return s;
          const updated = updater(s);
          return {
            ...s,
            photos: updated.photos,
            addons: updated.addons,
          };
        }),
      );
    },
    [],
  );

  const handleCreateService = () => {
    setEditingService(null);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (svc: ServiceItem) => {
    setEditingService(svc);
    setIsServiceModalOpen(true);
  };

  const handleToggleArchive = async (svc: ServiceItem) => {
    try {
      const res = await archiveService({
        serviceId: svc.id,
        shopId,
        active: !svc.active,
      });

      if (res.ok) {
        setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, active: !s.active } : s)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    try {
      const res = await deleteService({ serviceId, shopId });
      if (res.ok) {
        setServices((prev) => prev.filter((s) => s.id !== serviceId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl text-neutral-900 sm:text-3xl">Services & Pricing</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage your service menu, pricing tiers, photos, packages, and passes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTemplatesModalOpen(true)}
            className="text-xs font-semibold text-navy-900"
          >
            <Sparkles className="mr-1.5 size-3.5 text-orange-500" />
            Category Templates
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBulkImportOpen(true)}
            className="text-xs font-semibold text-navy-900"
          >
            <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600" />
            Bulk Import
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleCreateService}
            className="text-navy-950 bg-orange-600 text-xs font-bold hover:bg-orange-500"
          >
            <Plus className="mr-1.5 size-4" />
            Add Service
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="border-b border-neutral-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px" aria-label="Services Navigation Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={`border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "services"
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            All Services ({services.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("photos_addons")}
            className={`border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "photos_addons"
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Service Photos & Add-ons
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("packages")}
            className={`border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "packages"
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Packages ({packagesList.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("memberships")}
            className={`border-b-2 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "memberships"
                ? "border-navy-900 text-navy-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Memberships & Passes ({membershipsList.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Services List */}
      {activeTab === "services" && (
        <div className="space-y-4">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-12 text-center">
              <Scissors className="size-12 text-neutral-300" />
              <h3 className="mt-4 text-base font-semibold text-neutral-800">
                No Services Added Yet
              </h3>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-neutral-500">
                Add your shop&apos;s offerings so customers can browse and book appointments online.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="text-navy-950 bg-orange-600 text-xs font-bold hover:bg-orange-500"
                >
                  <Sparkles className="mr-1.5 size-4" />
                  Apply Category Templates
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCreateService}
                  className="text-xs text-navy-900"
                >
                  <Plus className="mr-1.5 size-4" />
                  Add Custom Service
                </Button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 bg-white">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className={`flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center ${
                    !svc.active ? "bg-neutral-50/60 opacity-60" : ""
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-semibold text-neutral-900">{svc.name}</h4>

                      {/* Price badge */}
                      <span className="bg-navy-100 rounded-full px-2.5 py-0.5 text-xs font-bold text-navy-900">
                        {svc.priceType === "quote"
                          ? "Quote Required"
                          : svc.priceCentavos !== null
                            ? `${svc.priceType === "starts_at" ? "Starts at " : ""}${formatPeso(svc.priceCentavos)}`
                            : "Quote"}
                      </span>

                      {/* Booking type badge */}
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 capitalize">
                        {BOOKING_TYPE_LABELS[svc.bookingType]}
                      </span>

                      {!svc.active && (
                        <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600 uppercase">
                          Archived
                        </span>
                      )}
                    </div>

                    {svc.description && (
                      <p className="line-clamp-1 text-xs text-neutral-500">{svc.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" /> {svc.durationMin} mins
                        {svc.bufferMin > 0 && ` (+${svc.bufferMin}m buffer)`}
                      </span>

                      {svc.capacity > 1 && (
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" /> Capacity: {svc.capacity}
                        </span>
                      )}

                      {svc.photos.length > 0 && <span>📷 {svc.photos.length} photo(s)</span>}

                      {svc.addons.length > 0 && <span>✨ {svc.addons.length} add-on(s)</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleArchive(svc)}
                      className="text-xs text-neutral-700"
                    >
                      {svc.active ? "Archive" : "Activate"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditService(svc)}
                      className="text-xs text-navy-900"
                    >
                      Edit
                    </Button>

                    <button
                      type="button"
                      onClick={() => handleDeleteService(svc.id)}
                      className="rounded p-2 text-neutral-400 hover:text-red-600"
                      title="Delete service"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Photos & Add-ons */}
      {activeTab === "photos_addons" && (
        <ServicePhotosAddons
          shopId={shopId}
          services={services}
          onRefresh={refreshPage}
          onUpdateService={handleUpdateService}
        />
      )}

      {/* Tab 3: Packages */}
      {activeTab === "packages" && (
        <PackagesManager
          shopId={shopId}
          packages={packagesList}
          availableServices={services.map((s) => ({
            id: s.id,
            name: s.name,
            priceCentavos: s.priceCentavos,
          }))}
          onRefresh={refreshPage}
        />
      )}

      {/* Tab 4: Memberships */}
      {activeTab === "memberships" && (
        <MembershipsManager shopId={shopId} memberships={membershipsList} onRefresh={refreshPage} />
      )}

      {/* Modals */}
      <ServiceModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        shopId={shopId}
        categories={shopCategories}
        initialService={editingService}
        onSaved={refreshPage}
      />

      <CategoryTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        shopId={shopId}
        shopCategorySlugs={shopCategories.map((c) => c.slug)}
        onApplied={refreshPage}
      />

      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        shopId={shopId}
        onImported={refreshPage}
      />
    </div>
  );
}
