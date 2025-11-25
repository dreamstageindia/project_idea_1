import { ProductCreate } from "@/components/admin/products/product-create";
import { ProductsTable } from "@/components/admin/products/products-table";
import { CategoriesManagement } from "@/components/admin/categories/categories-management";

export function ProductsSection() {
  return (
    <div className="space-y-8">
      <CategoriesManagement />
      <ProductCreate />
      <ProductsTable />
    </div>
  );
}