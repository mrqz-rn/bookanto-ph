"use client";

import { CircleCheck, LoaderCircle, Lock, Mail } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/features/account/actions";
import { formatManila } from "@/lib/time";
import { cn } from "@/lib/utils";

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

type FieldName = "name" | "phone";
type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string; fields: Partial<Record<FieldName, string>> };

/** "+639171234567" → "917 123 4567", the part typed after the fixed +63. */
function localPhone(e164: string | null): string {
  const digits = e164?.match(/^\+63(9\d{9})$/)?.[1];
  if (!digits) return e164 ?? "";
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

export function ProfileForm({ user }: { user: UserProfileData }) {
  const initial = React.useMemo(
    () => ({ name: user.name ?? "", phone: localPhone(user.phone) }),
    [user.name, user.phone],
  );
  const [saved, setSaved] = React.useState(initial);
  const [name, setName] = React.useState(initial.name);
  const [phone, setPhone] = React.useState(initial.phone);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });

  const saving = status.kind === "saving";
  const changed = name.trim() !== saved.name.trim() || phone.trim() !== saved.phone.trim();
  const fieldError = (field: FieldName) =>
    status.kind === "error" ? status.fields[field] : undefined;

  const edit =
    (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      if (status.kind !== "saving") setStatus({ kind: "idle" });
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus({ kind: "saving" });

    try {
      const result = await updateProfile({ name: name.trim(), phone: phone.trim() || null });
      if (result.ok) {
        setSaved({ name: name.trim(), phone: phone.trim() });
        setName(name.trim());
        setPhone(phone.trim());
        setStatus({ kind: "saved" });
        return;
      }
      setStatus({
        kind: "error",
        message: result.message,
        fields: {
          name: result.fieldErrors?.name?.[0],
          phone: result.fieldErrors?.phone?.[0],
        },
      });
    } catch {
      setStatus({
        kind: "error",
        message: "We couldn't save your details. Check your connection and try again.",
        fields: {},
      });
    }
  };

  const displayName = saved.name.trim() || user.email || "Your account";
  const memberSince = user.createdAt ? formatManila(user.createdAt, "MMMM yyyy") : null;
  const formError =
    status.kind === "error" && !status.fields.name && !status.fields.phone ? status.message : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900 sm:text-3xl">
          Personal information
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          A shop sees your name and mobile number once it accepts your booking.
        </p>
      </div>

      <section
        aria-labelledby="details-heading"
        className="overflow-hidden rounded-2xl border bg-card shadow-2xs"
      >
        <div className="flex items-center gap-4 border-b bg-accent/50 p-5 sm:p-6">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white font-display text-2xl font-bold text-green-700 shadow-xs ring-1 ring-border sm:size-16 sm:text-3xl"
          >
            {displayName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 id="details-heading" className="truncate font-display text-xl font-bold">
              {displayName}
            </h2>
            {memberSince && (
              <p className="text-sm text-slate-600">On BooKanto since {memberSince}</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="profile-name" label="Full name" error={fieldError("name")}>
              <Input
                id="profile-name"
                type="text"
                autoComplete="name"
                placeholder="Maria Santos"
                maxLength={100}
                value={name}
                onChange={edit(setName)}
                required
                aria-required
                aria-invalid={!!fieldError("name")}
                aria-describedby={fieldError("name") ? "profile-name-error" : undefined}
                disabled={saving}
                className="h-11"
              />
            </Field>

            <Field
              id="profile-phone"
              label="Mobile number"
              hint="Optional. Shops call or text this number about your booking."
              error={fieldError("phone")}
            >
              <div
                className={cn(
                  "flex h-11 items-stretch overflow-hidden rounded-md border border-input bg-background shadow-xs transition-[box-shadow,border-color] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
                  fieldError("phone") && "border-destructive",
                  saving && "opacity-50",
                )}
              >
                <span className="flex items-center border-r bg-muted px-3 text-sm font-semibold text-slate-600">
                  +63
                </span>
                <input
                  id="profile-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="917 123 4567"
                  maxLength={16}
                  value={phone}
                  onChange={edit(setPhone)}
                  aria-invalid={!!fieldError("phone")}
                  aria-describedby={
                    fieldError("phone") ? "profile-phone-error" : "profile-phone-hint"
                  }
                  disabled={saving}
                  className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
                />
              </div>
            </Field>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span id="profile-email-label" className="text-sm font-semibold text-navy-900">
                Email address
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                <Lock aria-hidden className="size-3.5" />
                Can&apos;t be changed
              </span>
            </div>
            <div
              role="group"
              aria-labelledby="profile-email-label"
              aria-describedby="profile-email-hint"
              className="flex min-h-11 items-center gap-3 rounded-md border border-dashed bg-muted/60 px-3"
            >
              <Mail aria-hidden className="size-5 shrink-0 text-slate-600" />
              <span className={cn("min-w-0 flex-1 break-all", !user.email && "text-slate-600")}>
                {user.email ?? "No email on this account"}
              </span>
            </div>
            <p id="profile-email-hint" className="text-sm text-slate-600">
              {user.email
                ? "You sign in with this email, and your receipts go to it."
                : "You sign in with your mobile number."}
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" aria-live="polite" className="min-h-6 text-sm">
              {status.kind === "saved" && !changed && (
                <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                  <CircleCheck aria-hidden className="size-4" />
                  Your details are saved.
                </span>
              )}
              {formError && <span className="font-medium text-danger">{formError}</span>}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {changed && !saving && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setName(saved.name);
                    setPhone(saved.phone);
                    setStatus({ kind: "idle" });
                  }}
                  className="active:scale-[0.98]"
                >
                  Undo changes
                </Button>
              )}
              <Button
                type="submit"
                disabled={saving || !changed || !name.trim()}
                className="w-full active:scale-[0.98] sm:w-auto"
              >
                {saving && <LoaderCircle aria-hidden className="animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </form>
      </section>

      <DeleteAccountDialog />
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-navy-900">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-slate-600">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
