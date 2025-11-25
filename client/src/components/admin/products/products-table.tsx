import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash } from "lucide-react";
import { ProductEditModal } from "./product-edit-modal";
import { useState } from "react";
import type { Product } from "./types";
import type { Category } from "@/components/admin/categories/types";

export function ProductsTable() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useQuery<Product[]>({ 
    queryKey: ["/api/products-admin"] 
  });
  
  const { data: categories = [] } = useQuery<Category[]>({ 
    queryKey: ["/api/categories"] 
  });
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/products/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product deleted" });
    },
    onError: (e: any) => toast({ 
      title: "Delete failed", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingProduct(null);
  };

  const labelForProduct = (prodId: string | null | undefined) => {
    if (!prodId) return "—";
    const p = products.find((pp) => pp.id === prodId);
    return p ? `${p.name} (${p.sku})` : "—";
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return "—";
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "—";
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Backup</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[260px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="font-mono">{p.sku}</TableCell>
                    <TableCell>₹{p.price}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>{getCategoryName(p.categoryId)}</TableCell>
                    <TableCell>{labelForProduct(p.backupProductId)}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? "default" : "destructive"}>
                        {p.isActive ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(p)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProductMutation.mutate(p.id)}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProductEditModal
        open={editModalOpen}
        onClose={closeEditModal}
        product={editingProduct}
        products={products}
        categories={categories}
      />
    </>
  );
}