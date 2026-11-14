"use client";

import * as React from "react";
import { Award, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPeso, pesosToCentavos } from "@/lib/money";
import { createMembership, deleteMembership, updateMembership } from "../actions";
import { CADENCE_LABELS } from "../constants";

type MembershipData = {
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

type MembershipsManagerProps = {
  shopId: string;
  memberships: MembershipData[];
  onRefresh: () => void;
};

export function MembershipsManager({ shopId, memberships, onRefresh }: MembershipsManagerProps) {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [pricePesos, setPricePesos] = React.useState("999");
  const [cadence, setCadence] = React.useState<
    "weekly" | "monthly" | "quarterly" | "yearly" | "sessions_pack"
  >("monthly");
  const [sessionCredits, setSessionCredits] = React.useState("");
  const [validityDays, setValidityDays] = React.useState("30");
  const [perks, setPerks] = React.useState("");
  const [active, setActive] = React.useState(true);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const openCreateModal = () => {
    setEditingId(null);
    setName("");
    setDescription("");
    setPricePesos("999");
    setCadence("monthly");
    setSessionCredits("");
    setValidityDays("30");
    setPerks("Priority lane booking, 10% off retail products, Free hair styling pomade");
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (mem: MembershipData) => {
    setEditingId(mem.id);
    setName(mem.name);
    setDescription(mem.description || "");
    setPricePesos((mem.priceCentavos / 100).toString());
    setCadence(mem.cadence);
    setSessionCredits(mem.sessionCredits ? mem.sessionCredits.toString() : "");
    setValidityDays(mem.validityDays ? mem.validityDays.toString() : "");
    setPerks(mem.perks || "");
    setActive(mem.active);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const priceCentavos = pesosToCentavos(pricePesos);
      const credits = sessionCredits ? parseInt(sessionCredits, 10) : null;
      const days = validityDays ? parseInt(validityDays, 10) : null;

      if (editingId) {
        const res = await updateMembership({
          membershipId: editingId,
          shopId,
          name: name.trim(),
          description: description.trim() || null,
          priceCentavos,
          cadence,
          sessionCredits: credits,
          validityDays: days,
          perks: perks.trim() || null,
          active,
        });

        if (res.ok) {
          setIsModalOpen(false);
          onRefresh();
        } else {
          setError(res.message);
        }
      } else {
        const res = await createMembership({
          shopId,
          name: name.trim(),
          description: description.trim() || null,
          priceCentavos,
          cadence,
          sessionCredits: credits,
          validityDays: days,
          perks: perks.trim() || null,
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
      setError("Failed to save membership plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (membershipId: string) => {
    if (!confirm("Are you sure you want to delete this membership plan?")) return;
    try {
      const res = await deleteMembership({ membershipId, shopId });
      if (res.ok) onRefresh();
    } catch {
      setError("Failed to delete membership plan.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Memberships & Session Passes</h3>
          <p className="text-xs text-neutral-500">
            Build predictable recurring revenue with prepaid passes and VIP membership tiers.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="text-navy-950 bg-orange-600 font-bold hover:bg-orange-500"
        >
          <Plus className="mr-1.5 size-4" />
          Create Membership Plan
        </Button>
      </div>

      {memberships.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-white p-10 text-center">
          <Award className="size-12 text-neutral-300" />
          <h4 className="mt-3 text-sm font-semibold text-neutral-800">No Memberships Yet</h4>
          <p className="mt-1 max-w-sm text-xs text-neutral-500">
            Create multi-session packages (e.g. &quot;5-Session Massage Pass&quot;) or monthly
            subscriptions to turn casual walk-ins into loyal regular customers.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="mt-4 text-xs text-navy-900"
          >
            Create First Membership
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((mem) => (
            <div
              key={mem.id}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-base font-semibold text-neutral-900">{mem.name}</h4>
                    <span className="bg-navy-100 mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold text-navy-900">
                      {CADENCE_LABELS[mem.cadence]}
                    </span>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      mem.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {mem.active ? "Active" : "Archived"}
                  </span>
                </div>

                <p className="mt-2 line-clamp-2 text-xs text-neutral-600">
                  {mem.description || "Membership plan"}
                </p>

                {/* Details list */}
                <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3 text-xs text-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-500">Credits / Sessions:</span>
                    <span className="font-semibold">
                      {mem.sessionCredits ? `${mem.sessionCredits} sessions` : "Unlimited"}
                    </span>
                  </div>
                  {mem.validityDays && (
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-500">Validity:</span>
                      <span className="font-semibold">{mem.validityDays} days</span>
                    </div>
                  )}
                </div>

                {/* Perks */}
                {mem.perks && (
                  <div className="mt-3 rounded-lg bg-neutral-50 p-2 text-[11px] text-neutral-600">
                    <span className="font-semibold text-neutral-800">Perks:</span> {mem.perks}
                  </div>
                )}
              </div>

              <div className="mt-5 border-t border-neutral-100 pt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-navy-900">
                    {formatPeso(mem.priceCentavos)}
                  </span>
                  <span className="text-xs text-neutral-500">
                    / {mem.cadence === "sessions_pack" ? "pass" : mem.cadence.replace("ly", "")}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(mem)}
                    className="text-xs text-navy-900"
                  >
                    Edit Plan
                  </Button>
                  <button
                    type="button"
                    onClick={() => handleDelete(mem.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                    title="Delete membership"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Membership Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-display text-xl text-neutral-900">
                {editingId ? "Edit Membership Plan" : "Create Membership Plan"}
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
                <label className="block text-xs font-semibold text-neutral-900">Plan Name</label>
                <Input
                  required
                  placeholder="e.g. Suki Haircut Pass (5 Sessions)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 h-10 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900">Description</label>
                <textarea
                  rows={2}
                  placeholder="Prepaid bundle for 5 standard cuts valid within 6 months."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 p-2.5 text-xs text-neutral-900 outline-none focus-visible:border-neutral-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Price (₱) <span className="text-red-600">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={pricePesos}
                    onChange={(e) => setPricePesos(e.target.value)}
                    placeholder="999.00"
                    className="mt-1 h-10 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Billing Cadence
                  </label>
                  <select
                    value={cadence}
                    onChange={(e) =>
                      setCadence(
                        e.target.value as
                          "weekly" | "monthly" | "quarterly" | "yearly" | "sessions_pack",
                      )
                    }
                    className="mt-1 h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none"
                  >
                    <option value="monthly">{CADENCE_LABELS.monthly}</option>
                    <option value="weekly">{CADENCE_LABELS.weekly}</option>
                    <option value="quarterly">{CADENCE_LABELS.quarterly}</option>
                    <option value="yearly">{CADENCE_LABELS.yearly}</option>
                    <option value="sessions_pack">{CADENCE_LABELS.sessions_pack}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Session Credits{" "}
                    <span className="font-normal text-neutral-400">
                      (Leave blank for unlimited)
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={sessionCredits}
                    onChange={(e) => setSessionCredits(e.target.value)}
                    placeholder="e.g. 5"
                    className="mt-1 h-10 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-900">
                    Validity (Days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    placeholder="e.g. 30 or 180"
                    className="mt-1 h-10 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-900">
                  Perks & Benefits
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 10% discount on hair products, free scalp massage, priority booking"
                  value={perks}
                  onChange={(e) => setPerks(e.target.value)}
                  className="mt-1 w-full rounded-md border border-neutral-300 p-2.5 text-xs text-neutral-900 outline-none focus-visible:border-neutral-950"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mem-active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                />
                <label htmlFor="mem-active" className="text-xs font-medium text-neutral-700">
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
                  {loading ? "Saving..." : editingId ? "Save Changes" : "Create Plan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
