"use client";

import * as React from "react";
import { BadgeCheck, CalendarClock, Pencil, Plus, Ticket, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MEMBERSHIP_CADENCES, type MembershipCadence } from "@/lib/db/schema/enums";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createMembership, deleteMembership, updateMembership } from "../actions";
import { CADENCE_LABELS } from "../constants";
import { cadenceSuffix, parsePesos, plural, type MenuMembership } from "../menu";
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

// Memberships: a monthly (or weekly, yearly) plan, or a pass for a set number
// of sessions, paid up front.

type MembershipsManagerProps = {
  shopId: string;
  memberships: MenuMembership[];
  onRefresh: () => void;
  onNotice?: (message: string) => void;
};

export function MembershipsManager({
  shopId,
  memberships,
  onRefresh,
  onNotice,
}: MembershipsManagerProps) {
  const [editing, setEditing] = React.useState<MenuMembership | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function openForm(membership: MenuMembership | null) {
    setEditing(membership);
    setFormOpen(true);
  }

  async function onDelete(membership: MenuMembership) {
    setDeletingId(membership.id);
    setError(null);
    try {
      const result = await deleteMembership({ membershipId: membership.id, shopId });
      if (result.ok) {
        setConfirmingId(null);
        onNotice?.(`Deleted ${membership.name}.`);
        onRefresh();
      } else {
        setError(result.message);
      }
    } catch {
      setError(`Couldn't delete ${membership.name}. Try again.`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-navy-900">Memberships and passes</h2>
          <p className="text-base text-slate-600">
            Regulars pay up front, for a month of visits or a set number of sessions.
          </p>
        </div>
        {memberships.length > 0 && (
          <Button type="button" onClick={() => openForm(null)} className={PRESS}>
            <Plus aria-hidden />
            Add a membership
          </Button>
        )}
      </div>

      {error && <ActionError message={error} onDismiss={() => setError(null)} />}

      {memberships.length === 0 ? (
        <EmptyPanel
          icon={<Ticket aria-hidden className="size-7" />}
          title="No memberships yet"
          actions={
            <Button type="button" onClick={() => openForm(null)} className={PRESS}>
              <Plus aria-hidden />
              Add a membership
            </Button>
          }
        >
          A five-session pass or a monthly plan gives your regulars a reason to come back.
        </EmptyPanel>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map((membership) => (
            <li
              key={membership.id}
              className={cn(CARD, "flex flex-col p-5", !membership.active && "bg-neutral-50")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-navy-900">{membership.name}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-green-700">
                    {CADENCE_LABELS[membership.cadence]}
                  </p>
                </div>
                {!membership.active && <Chip>Hidden</Chip>}
              </div>
              {membership.description && (
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">{membership.description}</p>
              )}

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-navy-900">
                  <BadgeCheck aria-hidden className="size-4 shrink-0 text-green-700" />
                  <dt className="sr-only">Sessions</dt>
                  <dd>
                    {membership.sessionCredits
                      ? plural(membership.sessionCredits, "session")
                      : "Unlimited sessions"}
                  </dd>
                </div>
                {membership.validityDays && (
                  <div className="flex items-center gap-2 text-navy-900">
                    <CalendarClock aria-hidden className="size-4 shrink-0 text-green-700" />
                    <dt className="sr-only">Valid for</dt>
                    <dd>Valid for {plural(membership.validityDays, "day")}</dd>
                  </div>
                )}
              </dl>

              {membership.perks && (
                <p className="mt-3 rounded-xl bg-accent/60 p-3 text-sm text-navy-900">
                  {membership.perks}
                </p>
              )}

              <div className="mt-auto pt-5">
                <p className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-navy-900 tabular-nums">
                    {formatPeso(membership.priceCentavos)}
                  </span>
                  <span className="text-sm text-slate-600">
                    {cadenceSuffix(membership.cadence)}
                  </span>
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  {confirmingId === membership.id ? (
                    <ConfirmDelete
                      what={membership.name}
                      busy={deletingId === membership.id}
                      onCancel={() => setConfirmingId(null)}
                      onConfirm={() => onDelete(membership)}
                    />
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => openForm(membership)}
                        aria-label={`Edit ${membership.name}`}
                        className={cn("flex-1", PRESS)}
                      >
                        <Pencil aria-hidden className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmingId(membership.id)}
                        aria-label={`Delete ${membership.name}`}
                        className="text-slate-600 hover:bg-red-50 hover:text-danger"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MembershipForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        shopId={shopId}
        initial={editing}
        onSaved={(message) => {
          onNotice?.(message);
          onRefresh();
        }}
      />
    </div>
  );
}

const FORM_ID = "membership-form";

function MembershipForm({
  open,
  onClose,
  shopId,
  initial,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  shopId: string;
  initial: MenuMembership | null;
  onSaved: (message: string) => void;
}) {
  const id = React.useId();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [cadence, setCadence] = React.useState<MembershipCadence>("monthly");
  const [sessions, setSessions] = React.useState("");
  const [validityDays, setValidityDays] = React.useState("");
  const [perks, setPerks] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [priceError, setPriceError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setPrice(initial ? String(initial.priceCentavos / 100) : "");
    setCadence(initial?.cadence ?? "monthly");
    setSessions(initial?.sessionCredits ? String(initial.sessionCredits) : "");
    setValidityDays(initial ? (initial.validityDays ? String(initial.validityDays) : "") : "30");
    setPerks(initial?.perks ?? "");
    setActive(initial?.active ?? true);
    setError(null);
    setPriceError(null);
  }, [open, initial]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const priceCentavos = parsePesos(price);
    if (priceCentavos === null) {
      setPriceError("Enter a price in pesos, like 999.");
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
      cadence,
      sessionCredits: sessions ? parseInt(sessions, 10) : null,
      validityDays: validityDays ? parseInt(validityDays, 10) : null,
      perks: perks.trim() || null,
      active,
    };
    try {
      const result = initial
        ? await updateMembership({ ...input, membershipId: initial.id })
        : await createMembership(input);
      if (result.ok) {
        onSaved(initial ? `Saved ${input.name}.` : `Added ${input.name}.`);
        onClose();
      } else {
        setError(result.message);
      }
    } catch {
      setError("Couldn't save the membership. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      busy={saving}
      title={initial ? `Edit ${initial.name}` : "Add a membership"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={saving} className={PRESS}>
            <Busy busy={saving}>{initial ? "Save changes" : "Add membership"}</Busy>
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={onSubmit} className="space-y-6">
        {error && <ActionError message={error} onDismiss={() => setError(null)} />}

        <Field label="Name" htmlFor={`${id}-name`}>
          <Input
            id={`${id}-name`}
            required
            minLength={2}
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Suki pass, 5 haircuts"
            autoComplete="off"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Price" htmlFor={`${id}-price`}>
            <PesoInput
              id={`${id}-price`}
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="999"
              aria-invalid={priceError ? true : undefined}
              aria-describedby={priceError ? `${id}-price-error` : undefined}
            />
            {priceError && (
              <p id={`${id}-price-error`} className="text-sm text-danger">
                {priceError}
              </p>
            )}
          </Field>
          <Field label="Billed" htmlFor={`${id}-cadence`}>
            <select
              id={`${id}-cadence`}
              value={cadence}
              onChange={(e) => setCadence(e.target.value as MembershipCadence)}
              className={SELECT}
            >
              {MEMBERSHIP_CADENCES.map((c) => (
                <option key={c} value={c}>
                  {CADENCE_LABELS[c]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Sessions" htmlFor={`${id}-sessions`} hint="Empty means unlimited.">
            <Input
              id={`${id}-sessions`}
              type="number"
              inputMode="numeric"
              min="1"
              value={sessions}
              onChange={(e) => setSessions(e.target.value)}
              placeholder="5"
            />
          </Field>
          <Field label="Valid for" htmlFor={`${id}-validity`} hint="Days after purchase.">
            <Input
              id={`${id}-validity`}
              type="number"
              inputMode="numeric"
              min="1"
              value={validityDays}
              onChange={(e) => setValidityDays(e.target.value)}
              placeholder="30"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor={`${id}-description`} optional>
          <Textarea
            id={`${id}-description`}
            rows={2}
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Perks" htmlFor={`${id}-perks`} optional>
          <Textarea
            id={`${id}-perks`}
            rows={2}
            maxLength={1000}
            value={perks}
            onChange={(e) => setPerks(e.target.value)}
            placeholder="Priority booking, 10% off hair products"
          />
        </Field>

        <Toggle
          checked={active}
          onChange={setActive}
          label="Show on your menu"
          description="Hidden memberships stay saved but customers can't buy them."
        />
      </form>
    </Sheet>
  );
}
