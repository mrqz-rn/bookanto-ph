import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { TwoFactorForm } from "@/features/auth/components/two-factor-form";
import { getCurrentUser, getTwoFactorStatus } from "@/lib/auth";
import { can } from "@/lib/authz";
import { homePathFor, resolvePostLoginPath } from "@/lib/home";

export const metadata: Metadata = {
  title: "Two-factor sign-in",
  description: "Second sign-in step for the BooKanto admin console.",
  robots: { index: false, follow: false },
};

type TwoFactorPageProps = {
  searchParams: Promise<{ next?: string }>;
};

/** Middleware sends admins here when the session hasn't passed a second factor. */
export default async function TwoFactorPage({ searchParams }: TwoFactorPageProps) {
  const { next: rawNext } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    const back = `/two-factor${rawNext ? `?next=${encodeURIComponent(rawNext)}` : ""}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }
  if (!can(user, "admin:two_factor.manage")) {
    redirect(homePathFor(user));
  }

  const next = resolvePostLoginPath(user, rawNext ?? "/admin");
  const status = await getTwoFactorStatus();
  if (status.level === "aal2") {
    redirect(next);
  }

  return <TwoFactorForm factorId={status.factorId} next={next} />;
}
