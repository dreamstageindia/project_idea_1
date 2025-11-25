export type Product = {
    id: string;
    name: string;
    price: string;
    images: string[];
    colors: string[];
    stock: number;
    packagesInclude: string[];
    specifications: Record<string, string>;
    sku: string;
    isActive: boolean;
    backupProductId: string | null;
    createdAt: string;
  };