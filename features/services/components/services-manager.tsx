"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LayoutTemplate, Plus, Scissors } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { archiveService, deleteService } from "../actions";
import {
  groupByCategory,
  menuSummary,
  plural,
  type MenuCategory,
  type MenuMembership,
  type MenuPackage,
  type MenuService,
} from "../menu";
import { BulkImportModal } from "./bulk-import-modal";
import { CategoryTemplatesModal } from "./category-templates-modal";
import { MembershipsManager } from "./memberships-manager";
import { PackagesManager } from "./packages-manager";
import { ServiceList, type ServiceRowActions } from "./service-list";
import { ServiceModal } from "./service-modal";
import { ServicePhotosAddons, type ServiceOption } from "./service-photos-addons";
import {
  ActionError,
  EmptyPanel,
  FOCUS_RING,
  PRESS,
  Sheet,
  SuccessNotice,
  useNotice,
} from "./services-ui";

// Services & prices: the shop's menu of services, its packages and its
// memberships. This file holds the state and the server calls; the lists and
// forms only draw.

type Tab = "services" | "packages" | "memberships";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "services", label: "Services" },
  { id: "packages", label: "Packages" },
  { id: "memberships", label: "Memberships" },
];

type ServicesManagerProps = {
  shopId: string;
  initialServices: MenuService[];
  initialPackages: MenuPackage[];
  initialMemberships: MenuMembership[];
  shopCategories: Array<Omit<MenuCategory, "icon"> & { icon?: string | null }>;
};

export function ServicesManager({
  shopId,
  initialServices,
  initialPackages,
  initialMemberships,
  shopCategories,
}: ServicesManagerProps) {
  const router = useRouter();

  const [tab, setTab] = React.useState<Tab>("services");
  const [services, setServices] = React.useState<MenuService[]>(initialServices);
  React.useEffect(() => setServices(initialServices), [initialServices]);

  const [editing, setEditing] = React.useState<MenuService | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [extrasId, setExtrasId] = React.useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);

  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = useNotice();

  const categories: MenuCategory[] = shopCategories.map((c) => ({ ...c, icon: c.icon ?? null }));
  const groups = groupByCategory(services, categories);
  const extrasService = services.find((s) => s.id === extrasId) ?? null;

  function done(message: string) {
    setError(null);
    setNotice(message);
    router.refresh();
  }

  function openForm(service: MenuService | null) {
    setEditing(service);
    setFormOpen(true);
  }

  async function toggleService(service: MenuService) {
    const active = !service.active;
    setBusyId(service.id);
    setError(null);
    setNotice(null);
    // Flip it now; put it back if the server says no.
    setServices((prev) => prev.map((s) => (s.id === service.id ? { ...s, active } : s)));
    try {
      const result = await archiveService({ serviceId: service.id, shopId, active });
      if (!result.ok) throw new Error(result.message);
      setNotice(
        active ? `${service.name} is back on your menu.` : `Hid ${service.name} from customers.`,
      );
    } catch (cause) {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, active: service.active } : s)),
      );
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : `Couldn't update ${service.name}. Try again.`,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function removeService(service: MenuService) {
    setBusyId(service.id);
    setError(null);
    setNotice(null);
    try {
      const result = await deleteService({ serviceId: service.id, shopId });
      if (result.ok) {
        setConfirmingId(null);
        setServices((prev) => prev.filter((s) => s.id !== service.id));
        done(`Deleted ${service.name}.`);
      } else {
        setError(result.message);
      }
    } catch {
      setError(`Couldn't delete ${service.name}. Try again.`);
    } finally {
      setBusyId(null);
    }
  }

  const updateExtras = React.useCallback(
    (serviceId: string, updater: (prev: ServiceOption) => ServiceOption) => {
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== serviceId) return s;
          const next = updater(s);
          return { ...s, photos: next.photos, addons: next.addons };
        }),
      );
    },
    [],
  );

  const rowActions: ServiceRowActions = {
    busyId,
    confirmingId,
    onEdit: openForm,
    onExtras: (s) => setExtrasId(s.id),
    onToggle: (s) => void toggleService(s),
    onAskDelete: (s) => setConfirmingId(s.id),
    onCancelDelete: () => setConfirmingId(null),
    onDelete: (s) => void removeService(s),
  };

  const counts: Record<Tab, number> = {
    services: services.length,
    packages: initialPackages.length,
    memberships: initialMemberships.length,
  };
  const hasServices = services.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl">
            Services & prices
          </h1>
          <p className="mt-1 text-base text-slate-600">{menuSummary(services)}</p>
        </div>
        {hasServices && (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:justify-end">
            <Button
              type="button"
              onClick={() => openForm(null)}
              className={cn("col-span-2 sm:order-last", PRESS)}
            >
              <Plus aria-hidden />
              Add a service
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplatesOpen(true)}
              className={PRESS}
            >
              <LayoutTemplate aria-hidden className="text-green-700" />
              Templates
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
              className={PRESS}
            >
              <FileSpreadsheet aria-hidden className="text-green-700" />
              Import
            </Button>
          </div>
        )}
      </header>

      {error && <ActionError message={error} onDismiss={() => setError(null)} />}
      {notice && <SuccessNotice message={notice} onDismiss={() => setNotice(null)} />}

      <ServicesTabs tab={tab} counts={counts} onChange={setTab} />

      <div
        role="tabpanel"
        id="services-panel"
        aria-labelledby={`services-tab-${tab}`}
        className="pt-2 outline-none"
      >
        {tab === "services" &&
          (hasServices ? (
            <ServiceList groups={groups} actions={rowActions} />
          ) : (
            <EmptyPanel
              icon={<Scissors aria-hidden className="size-7" />}
              title="Add your first service"
              actions={
                <>
                  <Button type="button" onClick={() => setTemplatesOpen(true)} className={PRESS}>
                    <LayoutTemplate aria-hidden />
                    Start from a template
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openForm(null)}
                    className={PRESS}
                  >
                    <Plus aria-hidden />
                    Add a service
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                    className={PRESS}
                  >
                    <FileSpreadsheet aria-hidden />
                    Import a spreadsheet
                  </Button>
                </>
              }
            >
              Customers can book you once your menu has a service. Templates fill in common services
              for your category with typical prices you can edit.
            </EmptyPanel>
          ))}

        {tab === "packages" && (
          <PackagesManager
            shopId={shopId}
            packages={initialPackages}
            availableServices={services.map((s) => ({
              id: s.id,
              name: s.name,
              priceCentavos: s.priceCentavos,
            }))}
            onRefresh={() => router.refresh()}
            onNotice={setNotice}
            onShowServices={() => setTab("services")}
          />
        )}

        {tab === "memberships" && (
          <MembershipsManager
            shopId={shopId}
            memberships={initialMemberships}
            onRefresh={() => router.refresh()}
            onNotice={setNotice}
          />
        )}
      </div>

      <ServiceModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        shopId={shopId}
        categories={categories}
        initialService={editing}
        onSaved={done}
      />

      <Sheet
        open={extrasService !== null}
        onClose={() => setExtrasId(null)}
        title="Photos & add-ons"
        description={
          extrasService
            ? `${extrasService.name}: ${plural(extrasService.photos.length, "photo")}, ${plural(extrasService.addons.length, "add-on")}`
            : undefined
        }
        footer={
          <Button type="button" onClick={() => setExtrasId(null)} className={PRESS}>
            Done
          </Button>
        }
      >
        {extrasService && (
          <ServicePhotosAddons
            shopId={shopId}
            service={extrasService}
            onUpdateService={updateExtras}
          />
        )}
      </Sheet>

      <CategoryTemplatesModal
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        shopId={shopId}
        shopCategorySlugs={categories.map((c) => c.slug)}
        onApplied={done}
      />

      <BulkImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        shopId={shopId}
        onImported={done}
      />
    </div>
  );
}

function ServicesTabs({
  tab,
  counts,
  onChange,
}: {
  tab: Tab;
  counts: Record<Tab, number>;
  onChange: (tab: Tab) => void;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(event: React.KeyboardEvent, index: number) {
    const last = TABS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    onChange(TABS[next]!.id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Services & prices"
      className="flex [scrollbar-width:none] overflow-x-auto border-b border-border"
    >
      {TABS.map(({ id, label }, index) => {
        const active = tab === id;
        return (
          <button
            key={id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`services-tab-${id}`}
            aria-selected={active}
            aria-controls="services-panel"
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative -mb-px flex h-12 flex-auto items-center justify-center gap-1 rounded-t-lg px-1 text-sm font-semibold whitespace-nowrap transition-colors min-[400px]:gap-1.5 min-[400px]:text-[0.9375rem] sm:flex-none sm:gap-2 sm:px-5 sm:text-base",
              FOCUS_RING,
              active ? "text-navy-900" : "text-slate-600 hover:bg-neutral-100 hover:text-navy-900",
            )}
          >
            {label}
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-muted px-1.5 text-xs font-bold text-slate-600 tabular-nums sm:h-6 sm:min-w-6 sm:text-sm">
              {counts[id]}
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-green-600 transition-transform duration-200 sm:inset-x-3",
                active ? "scale-x-100" : "scale-x-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
