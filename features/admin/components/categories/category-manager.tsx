"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Edit2, Plus, Store, Trash2 } from "lucide-react";

import { CategoryIcon } from "@/components/shared/category-icon";
import { Button } from "@/components/ui/button";
import type { BookingType } from "@/lib/db/schema/enums";

import { deleteCategory, toggleCategoryActive } from "../../actions";
import { CategoryModal } from "./category-modal";

type CategoryItem = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  icon: string | null;
  defaultBookingType: BookingType;
  sortOrder: number;
  active: boolean;
  shopsCount: number;
};

type CategoryManagerProps = {
  categories: CategoryItem[];
};

export function CategoryManager({ categories }: CategoryManagerProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryItem | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleToggle = async (id: string, currentActive: boolean) => {
    setBusyId(id);
    setDeleteError(null);
    try {
      const res = await toggleCategoryActive({ id, active: !currentActive });
      if (res.ok) router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (cat: CategoryItem) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    setBusyId(cat.id);
    setDeleteError(null);
    try {
      const res = await deleteCategory({ id: cat.id });
      if (res.ok) {
        router.refresh();
      } else {
        setDeleteError(res.message);
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Platform Categories</h2>
          <p className="text-xs text-neutral-500">
            Define local service categories, icons, booking flow defaults, and sort order.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setModalOpen(true);
          }}
          size="sm"
          className="bg-green-700 text-xs text-white hover:bg-green-800"
        >
          <Plus className="mr-1.5 size-4" /> Add Category
        </Button>
      </div>

      {deleteError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          {deleteError}
        </div>
      )}

      {/* Categories Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold tracking-wider text-neutral-600 uppercase">
              <tr>
                <th className="w-16 px-4 py-3 text-center">Order</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Booking Type</th>
                <th className="px-4 py-3">Shops</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-normal">
              {categories.map((cat) => (
                <tr key={cat.id} className="transition-colors hover:bg-neutral-50/50">
                  <td className="px-4 py-3 text-center font-mono font-bold text-neutral-500">
                    {cat.sortOrder}
                  </td>

                  <td className="px-4 py-3 font-semibold text-neutral-900">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-md border border-green-200 bg-green-50 text-green-700">
                        <CategoryIcon icon={cat.icon} className="size-3.5" />
                      </div>
                      <span>{cat.name}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-mono text-[11px] text-neutral-600">
                    /c/{cat.slug}
                  </td>

                  <td className="px-4 py-3">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-neutral-700 uppercase">
                      {cat.defaultBookingType}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 font-semibold text-neutral-700">
                      <Store className="size-3.5 text-neutral-400" />
                      {cat.shopsCount} {cat.shopsCount === 1 ? "shop" : "shops"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busyId === cat.id}
                      onClick={() => handleToggle(cat.id, cat.active)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors ${
                        cat.active
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-neutral-200 text-neutral-600 hover:bg-neutral-300"
                      }`}
                    >
                      {cat.active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingCategory(cat);
                          setModalOpen(true);
                        }}
                        className="h-7 px-2 text-neutral-600 hover:text-neutral-900"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === cat.id}
                        onClick={() => handleDelete(cat)}
                        className="h-7 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        category={editingCategory}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
