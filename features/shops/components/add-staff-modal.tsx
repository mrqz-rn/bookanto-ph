"use client";

import * as React from "react";
import { AlertCircle, Loader2, UserPlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addStaffMember } from "../actions";

type AddStaffModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  onSuccess?: () => void;
};

export function AddStaffModal({ isOpen, onClose, shopId, onSuccess }: AddStaffModalProps) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"manager" | "staff">("staff");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setName("");
      setPhone("");
      setEmail("");
      setRole("staff");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name.");
      return;
    }
    if (!phone.trim()) {
      setError("Please provide a Philippine mobile number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await addStaffMember({
        shopId,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        role,
      });

      if (!res.ok) {
        setError(res.message);
        setLoading(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add team member.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-2xs fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <UserPlus className="size-4" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-neutral-900">Add Team Member</h2>
              <p className="text-xs text-neutral-500">Invite a staff member or shop manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Full Name <span className="text-red-600">*</span>
            </label>
            <Input
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maria Santos"
              className="mt-1 h-10 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Philippine Mobile Phone <span className="text-red-600">*</span>
            </label>
            <Input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0917 123 4567"
              className="mt-1 h-10 text-sm"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Used to link their account and receive schedule notifications.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900">
              Email Address (Optional)
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="maria@example.com"
              className="mt-1 h-10 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-900">Role in Shop</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`rounded-xl border p-3 text-left transition-all ${
                  role === "staff"
                    ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="block text-xs font-bold text-neutral-900">Staff Member</span>
                <span className="mt-0.5 block text-[11px] text-neutral-500">
                  Takes appointments & walk-ins, marks services complete.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole("manager")}
                className={`rounded-xl border p-3 text-left transition-all ${
                  role === "manager"
                    ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                }`}
              >
                <span className="block text-xs font-bold text-neutral-900">Shop Manager</span>
                <span className="mt-0.5 block text-[11px] text-neutral-500">
                  Full access to services, prices, reports, and staff.
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-green-600 text-xs font-bold text-white hover:bg-green-500"
            >
              {loading && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Add to Team
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
