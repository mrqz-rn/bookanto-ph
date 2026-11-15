import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

import { AuditLogViewer } from "@/features/admin/components/audit/audit-log-viewer";
import { getAdminAuditLogs } from "@/features/admin/queries";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Audit Log | BooKanto Admin",
};

type AdminAuditPageProps = {
  searchParams: Promise<{
    action?: string;
    targetType?: string;
  }>;
};

export default async function AdminAuditPage({ searchParams }: AdminAuditPageProps) {
  const { action, targetType } = await searchParams;
  const user = await getCurrentUser();

  const isSuperAdmin = user?.platformRole === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center">
        <ShieldAlert className="mx-auto mb-2 size-10 text-rose-600" />
        <h2 className="text-base font-bold text-rose-950">Super Administrator Access Required</h2>
        <p className="mx-auto mt-1 max-w-md text-xs text-rose-800">
          In accordance with BooKanto security policy, viewing the immutable audit log requires
          Super Admin platform privileges.
        </p>
      </div>
    );
  }

  const { logs, total } = await getAdminAuditLogs({
    action,
    targetType,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-neutral-900">
          Platform Audit Log
        </h1>
        <p className="mt-1 text-xs text-neutral-500">
          Append-only, immutable record of sensitive platform actions, role elevations, and admin
          operations.
        </p>
      </div>

      <AuditLogViewer
        logs={logs}
        total={total}
        currentAction={action ?? ""}
        currentTargetType={targetType ?? "all"}
      />
    </div>
  );
}
