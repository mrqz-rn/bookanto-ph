"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/account/actions";
import { formatPhone } from "@/lib/phone";
import { formatManila } from "@/lib/time";
import { DeleteAccountDialog } from "./delete-account-dialog";

type UserProfileData = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  platformRole: string;
  status: string;
  createdAt: Date | string;
};

type ProfileFormProps = {
  user: UserProfileData;
};

export function ProfileForm({ user }: ProfileFormProps) {
  const [name, setName] = React.useState(user.name ?? "");
  const [phone, setPhone] = React.useState(user.phone ? formatPhone(user.phone) : "");
  const [email, setEmail] = React.useState(user.email ?? "");
  const [loading, setLoading] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const result = await updateProfile({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      });

      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.message);
      }
    } catch {
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formattedJoinDate = user.createdAt ? formatManila(user.createdAt, "MMMM d, yyyy") : null;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xs sm:p-8">
        <div className="border-b border-border pb-5">
          <h2 className="font-display text-2xl font-bold text-navy-900">Personal Information</h2>
          <p className="mt-1 text-sm text-slate-600">
            Keep your contact details up to date for bookings and notifications.
          </p>
        </div>

        {success && (
          <div
            role="status"
            className="mt-6 rounded-lg border border-success/30 bg-green-50 p-4 text-sm font-medium text-success"
          >
            ✓ Profile updated successfully!
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-danger/30 bg-red-50 p-4 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="name-input" className="mb-1.5 block text-sm font-medium text-navy-900">
              Full name <span className="text-danger">*</span>
            </label>
            <Input
              id="name-input"
              type="text"
              autoComplete="name"
              placeholder="e.g. Maria Santos"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSuccess(false);
              }}
              required
              disabled={loading}
            />
          </div>

          {/* Phone Number */}
          <div>
            <label
              htmlFor="profile-phone-input"
              className="mb-1.5 block text-sm font-medium text-navy-900"
            >
              Mobile number
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 flex items-center gap-1 text-sm font-medium text-slate-500">
                🇵🇭 +63
              </span>
              <Input
                id="profile-phone-input"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="917 123 4567"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setSuccess(false);
                }}
                className="pl-20"
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Shared with a shop only after it accepts your booking, so it can reach you.
            </p>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="profile-email-input"
              className="mb-1.5 block text-sm font-medium text-navy-900"
            >
              Email address
            </label>
            <Input
              id="profile-email-input"
              type="email"
              autoComplete="email"
              placeholder="maria@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSuccess(false);
              }}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-slate-500">
              Used for booking receipts and email sign-in.
            </p>
          </div>

          {/* Account Metadata */}
          <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
            <div className="rounded-lg bg-muted/60 p-3">
              <span className="block text-xs text-slate-500">Role</span>
              <span className="font-semibold text-navy-900 capitalize">
                {user.platformRole.replace("_", " ")}
              </span>
            </div>
            {formattedJoinDate && (
              <div className="rounded-lg bg-muted/60 p-3">
                <span className="block text-xs text-slate-500">Member since</span>
                <span className="font-semibold text-navy-900">{formattedJoinDate}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="h-11 bg-primary px-6 font-semibold text-white hover:bg-primary/90"
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <DeleteAccountDialog />
    </div>
  );
}
