"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions";

type AdminHeaderProps = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    platformRole: string;
  };
};

export function AdminHeader({ user }: AdminHeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
    router.push("/login");
    router.refresh();
  };

  const isSuperAdmin = user.platformRole === "super_admin";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white shadow-2xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoMark className="h-8" />
            <Wordmark className="text-lg font-bold" />
          </Link>

          <div className="flex items-center gap-2 border-l border-neutral-200 pl-3 sm:pl-4">
            <span className="flex items-center gap-1.5 rounded-md bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-900">
              <ShieldCheck className="size-3.5 text-purple-700" />
              {isSuperAdmin ? "Super Admin" : "Admin Console"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" size="sm" className="hidden text-xs sm:inline-flex">
            <Link href="/" target="_blank">
              View Site <ExternalLink className="ml-1 size-3" />
            </Link>
          </Button>

          <div className="hidden items-center gap-2 border-l border-neutral-200 pl-3 md:flex">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-neutral-900">
                {user.name || "Administrator"}
              </span>
              <span className="text-[10px] text-neutral-500">{user.email}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            className="text-xs text-neutral-700 hover:border-rose-300 hover:text-rose-700"
          >
            <LogOut className="mr-1.5 size-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
