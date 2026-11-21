"use client";

import * as React from "react";
import { Clock, Images, Pencil, Trash2, Users } from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { Button } from "@/components/ui/button";
import { mediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { BOOKING_TYPE_LABELS } from "../constants";
import {
  durationLabel,
  extrasLabel,
  plural,
  servicePrice,
  type MenuGroup,
  type MenuService,
} from "../menu";
import { CARD, Chip, ConfirmDelete, FOCUS_RING, PRESS, Toggle } from "./services-ui";

// The shop's menu, one card per category. State and server calls live in
// services-manager.tsx; these only draw.

export type ServiceRowActions = {
  busyId: string | null;
  confirmingId: string | null;
  onEdit: (service: MenuService) => void;
  onExtras: (service: MenuService) => void;
  onToggle: (service: MenuService) => void;
  onAskDelete: (service: MenuService) => void;
  onCancelDelete: () => void;
  onDelete: (service: MenuService) => void;
};

export function ServiceList({
  groups,
  actions,
}: {
  groups: MenuGroup[];
  actions: ServiceRowActions;
}) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`group-${group.key}`} className="space-y-3">
          <h2
            id={`group-${group.key}`}
            className="flex items-baseline gap-2 text-lg font-bold text-navy-900"
          >
            {group.name}
            <span className="text-sm font-semibold text-slate-600 tabular-nums">
              {group.services.length}
            </span>
          </h2>
          <ul className={cn(CARD, "divide-y divide-border overflow-hidden")}>
            {group.services.map((service) => (
              <li key={service.id}>
                <ServiceRow service={service} icon={group.icon} actions={actions} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ServiceRow({
  service,
  icon,
  actions,
}: {
  service: MenuService;
  icon: string | null;
  actions: ServiceRowActions;
}) {
  const busy = actions.busyId === service.id;
  const confirming = actions.confirmingId === service.id;
  const extras = extrasLabel(service);
  const cover = service.photos[0];

  return (
    <article
      aria-label={service.name}
      className={cn("p-4 sm:p-5", !service.active && "bg-neutral-50")}
    >
      <div className="flex gap-4">
        <Thumbnail
          path={cover?.path ?? null}
          icon={icon}
          dimmed={!service.active}
          onClick={() => actions.onExtras(service)}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold text-navy-900">
                <span className="break-words">{service.name}</span>
                {!service.active && <Chip>Hidden</Chip>}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1 whitespace-nowrap">
                  <Clock aria-hidden className="size-4" />
                  {durationLabel(service.durationMin)}
                  {service.bufferMin > 0 && ` + ${service.bufferMin} min break`}
                </span>
                <span className="whitespace-nowrap">
                  {BOOKING_TYPE_LABELS[service.bookingType]}
                </span>
                {service.capacity > 1 && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <Users aria-hidden className="size-4" />
                    {plural(service.capacity, "customer")} at once
                  </span>
                )}
              </p>
            </div>
            <p className="shrink-0 text-right text-lg font-bold text-navy-900 tabular-nums">
              {servicePrice(service.priceType, service.priceCentavos)}
            </p>
          </div>

          {service.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">{service.description}</p>
          )}
          <p className="mt-1.5 text-sm text-slate-600">{extras ?? "No photos or add-ons yet"}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3 sm:mt-4 sm:gap-2">
        {confirming ? (
          <ConfirmDelete
            what={service.name}
            busy={busy}
            onCancel={actions.onCancelDelete}
            onConfirm={() => actions.onDelete(service)}
          />
        ) : (
          <>
            <Toggle
              checked={service.active}
              disabled={busy}
              onChange={() => actions.onToggle(service)}
              label="On menu"
              className="mr-auto max-[359px]:basis-full"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => actions.onExtras(service)}
              aria-label={`Photos and add-ons for ${service.name}`}
              className={cn("w-11 px-0 sm:w-auto sm:px-4", PRESS)}
            >
              <Images aria-hidden />
              <span className="hidden sm:inline">Photos & add-ons</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => actions.onEdit(service)}
              aria-label={`Edit ${service.name}`}
              className={PRESS}
            >
              <Pencil aria-hidden className="hidden size-4 min-[400px]:block" />
              Edit
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => actions.onAskDelete(service)}
              aria-label={`Delete ${service.name}`}
              className="text-slate-600 hover:bg-red-50 hover:text-danger"
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </div>
    </article>
  );
}

/**
 * The service's first photo, or its category's icon until it has one. Tapping
 * it opens the photos; it stays out of the tab order and the accessibility tree
 * because the row's "Photos & add-ons" button does the same.
 */
function Thumbnail({
  path,
  icon,
  dimmed,
  onClick,
}: {
  path: string | null;
  icon: string | null;
  dimmed: boolean;
  onClick: () => void;
}) {
  const [failed, setFailed] = React.useState(false);
  const showPhoto = path !== null && !failed;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-hidden
      tabIndex={-1}
      className={cn(
        "group relative size-16 shrink-0 overflow-hidden rounded-xl bg-accent sm:size-20",
        FOCUS_RING,
      )}
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl(path)}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]",
            dimmed && "grayscale",
          )}
        />
      ) : (
        <span className="grid size-full place-items-center text-green-700">
          <CategoryIcon icon={icon} className="size-7" />
        </span>
      )}
    </button>
  );
}
