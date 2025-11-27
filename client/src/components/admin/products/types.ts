import type { Category } from "@/components/admin/categories/types";

export type Product = {
  id: string;
  name: string;
  price: string;
  images: string[];
  colors: string[];
  stock: number;
  packagesInclude: string[];
  specifications: Record<string, string> | string;
  sku: string;
  isActive: boolean;
  backupProductId: string | null;
  createdAt: string;
  categoryIds: string[];
  categories?: Category[];
  category?: Category | null;
  isBackup?: boolean;
  originalProductId?: string | null;
};
