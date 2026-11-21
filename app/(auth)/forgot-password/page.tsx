import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Get a link to choose a new password for your BooKanto account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
