"use client";

import { CircleCheck, Send } from "lucide-react";
import Link from "next/link";
import { cloneElement, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { submitInquiry, type InquiryFormState } from "../actions";

const KINDS = [
  { value: "shop", label: "Shop owner", hint: "Join the pilot" },
  { value: "business", label: "Business or partner", hint: "Work with us" },
  { value: "investor", label: "Investor", hint: "Talk about funding" },
  { value: "other", label: "Something else", hint: "Ask anything" },
] as const;

const initialState: InquiryFormState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitInquiry, initialState);

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-xl border bg-white p-6">
        <CircleCheck aria-hidden className="size-8 text-green-700" />
        <p className="font-display text-2xl font-bold">Salamat! We got your message.</p>
        <p className="text-slate-600">
          We&apos;ll get back to you soon at the email or number you gave us.
        </p>
      </div>
    );
  }

  const values = state.values ?? {};
  const errors = state.fieldErrors ?? {};
  const errorFor = (field: string) => errors[field]?.[0];

  return (
    <form
      action={formAction}
      noValidate
      className="flex flex-col gap-5 rounded-xl border bg-white p-5 sm:p-6"
    >
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={errorFor("kind") ? "kind-error" : undefined}
      >
        <legend className="mb-2 text-sm font-semibold">I am a…</legend>
        <div className="grid grid-cols-2 gap-2">
          {KINDS.map((kind) => (
            <label
              key={kind.value}
              className="flex min-h-11 cursor-pointer flex-col rounded-lg border border-input px-3 py-2 has-[:checked]:border-green-700 has-[:checked]:bg-accent has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="kind"
                  value={kind.value}
                  defaultChecked={(values.kind || "shop") === kind.value}
                  className="size-4 accent-green-700"
                />
                <span className="text-sm font-semibold">{kind.label}</span>
              </span>
              <span className="pl-6 text-xs text-slate-600">{kind.hint}</span>
            </label>
          ))}
        </div>
        <FieldError id="kind-error" message={errorFor("kind")} />
      </fieldset>

      <Field label="Your name" name="name" error={errorFor("name")}>
        <Input id="name" name="name" autoComplete="name" defaultValue={values.name} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" error={errorFor("email")}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={values.email}
          />
        </Field>
        <Field label="Mobile number" name="phone" error={errorFor("phone")}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0917 123 4567"
            defaultValue={values.phone}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Shop or company"
          name="businessName"
          optional
          error={errorFor("businessName")}
        >
          <Input
            id="businessName"
            name="businessName"
            autoComplete="organization"
            defaultValue={values.businessName}
          />
        </Field>
        <Field label="City" name="city" optional error={errorFor("city")}>
          <Input id="city" name="city" autoComplete="address-level2" defaultValue={values.city} />
        </Field>
      </div>

      <Field label="Message" name="message" error={errorFor("message")}>
        <Textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Tell us about your shop, your business or what you'd like to discuss."
          defaultValue={values.message}
          required
          className="min-h-32"
        />
      </Field>

      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-fit">
          <Send aria-hidden />
          {pending ? "Sending…" : "Send message"}
        </Button>
        <p className="text-xs text-slate-600">
          We use your details only to reply to you (see our{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          ). Add an email or a mobile number, or both.
        </p>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  optional,
  error,
  children,
}: {
  label: string;
  name: string;
  optional?: boolean;
  error?: string;
  children: React.ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>;
}) {
  const errorId = `${name}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-semibold">
        {label}
        {optional && <span className="font-normal text-slate-600"> (optional)</span>}
      </label>
      {/* The input announces its own error and shows the error border. */}
      {cloneElement(children, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-sm text-danger">
      {message}
    </p>
  );
}
