"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteAccount } from "@/features/account/actions";

export function DeleteAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmation !== "DELETE") {
      setError('Please type "DELETE" exactly to confirm.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await deleteAccount({ confirmation });
      if (result.ok) {
        setOpen(false);
        router.push("/?deleted=true");
        router.refresh();
      } else {
        setError(result.message);
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
        <h3 className="font-semibold text-danger">Danger Zone</h3>
        <p className="mt-1 text-sm text-slate-600">
          Once you delete your account, your profile and saved addresses will be removed. This
          action cannot be undone.
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setOpen(true);
              setConfirmation("");
              setError(null);
            }}
            className="h-11 bg-danger text-white hover:bg-danger/90"
          >
            Delete account
          </Button>
        </div>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
            <h2 id="delete-dialog-title" className="text-xl font-bold text-danger">
              Delete account confirmation
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to permanently delete your BooKanto account? You will be signed
              out immediately and all your saved addresses will be cleared.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-4 rounded-lg border border-danger/30 bg-red-50 p-3 text-sm text-danger"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleDelete} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="delete-confirm-input"
                  className="mb-1.5 block text-xs font-semibold tracking-wider text-slate-700 uppercase"
                >
                  Type <strong className="font-mono font-bold text-danger">DELETE</strong> to
                  confirm
                </label>
                <Input
                  id="delete-confirm-input"
                  type="text"
                  placeholder="DELETE"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoFocus
                  required
                  disabled={loading}
                  className="font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={loading || confirmation !== "DELETE"}
                  className="bg-danger text-white hover:bg-danger/90"
                >
                  {loading ? "Deleting..." : "Permanently delete"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
