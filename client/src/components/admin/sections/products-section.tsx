import { useState } from "react";
import { ProductCreate } from "@/components/admin/products/product-create";
import { ProductsTable } from "@/components/admin/products/products-table";
import { CategoriesManagement } from "@/components/admin/categories/categories-management";
import { Button } from "@/components/ui/button";

export function ProductsSection() {
  const [activeTab, setActiveTab] = useState<"categories" | "create" | "list">("list");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Products & Categories</h1>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "list"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("list")}
          >
            All Products
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "create"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("create")}
          >
            Create Product
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${
              activeTab === "categories"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab("categories")}
          >
            Categories
          </button>
        </div>
      </div>

      {activeTab === "categories" && <CategoriesManagement />}
      {activeTab === "create" && <ProductCreate />}
      {activeTab === "list" && <ProductsTable />}
    </div>
  );
}