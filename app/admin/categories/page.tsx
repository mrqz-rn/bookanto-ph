import type { Metadata } from "next";

import { CategoryManager } from "@/features/admin/components/categories/category-manager";
import { getAdminCategories } from "@/features/admin/queries";

export const metadata: Metadata = {
  title: "Category Management | BooKanto Admin",
};

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <div className="space-y-6">
      <CategoryManager categories={categories} />
    </div>
  );
}
