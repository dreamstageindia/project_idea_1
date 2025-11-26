import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, X, ImageIcon, ArrowLeft, ArrowRight, Trash } from "lucide-react";
import { uploadFiles, move, removeAt } from "@/lib/admin-utils";
import type { Product } from "./types";
import type { Category } from "@/components/admin/categories/types";

interface ProductEditModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  products: Product[];
  categories: Category[];
}

export function ProductEditModal({ open, onClose, product, products, categories }: ProductEditModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editDraft, setEditDraft] = useState<Partial<Product>>({});
  const [editImages, setEditImages] = useState<string[]>([]);
  const [colorsInput, setColorsInput] = useState<string>("");
  const [packagesInput, setPackagesInput] = useState<string>("");
  const [specificationsInput, setSpecificationsInput] = useState<string>("");

  useEffect(() => {
    if (product) {
      setEditDraft({
        name: product.name,
        price: product.price,
        colors: product.colors ?? [],
        stock: product.stock ?? 0,
        packagesInclude: product.packagesInclude ?? [],
        specifications: product.specifications ?? {},
        sku: product.sku,
        isActive: product.isActive,
        backupProductId: product.backupProductId ?? null,
        categoryId: product.categoryId ?? null,
      });
      setEditImages(product.images ? product.images.slice() : []);
      setColorsInput((product.colors ?? []).join(", "));
      setPackagesInput((product.packagesInclude ?? []).join("\n"));
      setSpecificationsInput(
        Object.entries(product.specifications ?? {})
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      );
    }
  }, [product]);

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<Product> }) => {
      console.log("Updating product with data:", payload.updates);
      console.log("Specifications being sent:", payload.updates.specifications);
      const res = await apiRequest("PUT", `/api/admin/products/${payload.id}`, payload.updates);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product updated successfully" });
      onClose();
    },
    onError: (e: any) => toast({ 
      title: "Update failed", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  // Parse specifications from text input to object
  const parseSpecifications = (input: string): Record<string, string> => {
    const obj: Record<string, string> = {};
    if (!input.trim()) return obj;
    
    input.split("\n").forEach((line) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;
      
      const idx = trimmedLine.indexOf(":");
      if (idx > 0) {
        const key = trimmedLine.slice(0, idx).trim();
        const value = trimmedLine.slice(idx + 1).trim();
        if (key) obj[key] = value;
      }
    });
    return obj;
  };

  const handleSave = () => {
    if (!product) return;
    
    // Build the complete update data
    const updates: Partial<Product> = {
      name: editDraft.name || "",
      price: editDraft.price || "0.00",
      sku: editDraft.sku || "",
      stock: editDraft.stock || 0,
      categoryId: editDraft.categoryId || null,
      backupProductId: editDraft.backupProductId || null,
      isActive: editDraft.isActive !== false,
      images: editImages,
      colors: colorsInput.split(",").map(s => s.trim()).filter(Boolean),
      packagesInclude: packagesInput.split("\n").map(s => s.trim()).filter(Boolean),
      specifications: parseSpecifications(specificationsInput),
    };

    console.log("Final update data:", updates);
    
    updateProductMutation.mutate({ id: product.id, updates });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold">Edit Product</h3>
          <p className="text-sm text-muted-foreground">
            SKU: <span className="font-mono">{product.sku}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={editDraft.name ?? ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                step="0.01"
                value={String(editDraft.price ?? "")}
                onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
              />
            </div>

            <div>
              <Label>Category</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editDraft.categoryId ?? ""}
                onChange={(e) =>
                  setEditDraft((d) => ({
                    ...d,
                    categoryId: e.target.value ? e.target.value : null,
                  }))
                }
              >
                <option value="">— No Category —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>SKU</Label>
              <Input
                value={editDraft.sku ?? ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, sku: e.target.value }))}
              />
            </div>

            <div>
              <Label>Colors (comma-separated)</Label>
              <Input
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                placeholder="Red, Blue, Green"
              />
            </div>
            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={String(editDraft.stock ?? 0)}
                onChange={(e) => setEditDraft((d) => ({ ...d, stock: Number(e.target.value) || 0 }))}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Backup Product (optional)</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editDraft.backupProductId ?? ""}
                onChange={(e) =>
                  setEditDraft((d) => ({
                    ...d,
                    backupProductId: e.target.value ? e.target.value : null,
                  }))
                }
              >
                <option value="">— None —</option>
                {products
                  .filter((pp) => pp.id !== product?.id)
                  .map((bp) => (
                    <option key={bp.id} value={bp.id}>
                      {bp.name} ({bp.sku})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label>Active</Label>
              <div className="flex items-center gap-2">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(editDraft.isActive)}
                  onChange={(e) => setEditDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                <Label htmlFor="isActive" className="text-sm">Is Active</Label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label>Packages Include (one per line)</Label>
              <Textarea
                value={packagesInput}
                onChange={(e) => setPackagesInput(e.target.value)}
                placeholder="Item 1&#10;Item 2&#10;Item 3"
                rows={3}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Specifications (key:value, one per line)</Label>
              <Textarea
                value={specificationsInput}
                onChange={(e) => setSpecificationsInput(e.target.value)}
                placeholder="Weight: 2kg&#10;Dimensions: 10x20x5cm&#10;Material: Plastic"
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Format: Key: Value (one specification per line)
              </p>
            </div>

            <div className="md:col-span-2">
              <Label>Images</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (!files.length) return;
                    try {
                      const urls = await uploadFiles(files);
                      setEditImages((prev) => [...prev, ...urls]);
                      toast({ title: "Images uploaded", description: `${urls.length} new file(s).` });
                    } catch (err: any) {
                      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                    }
                  }}
                />
                <ImageIcon className="h-4 w-4 opacity-60" />
              </div>
              {!!editImages.length && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {editImages.map((u, idx) => (
                    <div key={`${u}-${idx}`} className="relative">
                      <div className="w-20 h-20 rounded border overflow-hidden bg-muted">
                        <img src={u} alt="img" className="object-cover w-full h-full" />
                      </div>
                      <div className="flex justify-center gap-1 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => setEditImages((prev) => move(prev, idx, idx - 1))}
                          title="Move left"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={idx === editImages.length - 1}
                          onClick={() => setEditImages((prev) => move(prev, idx, idx + 1))}
                          title="Move right"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => setEditImages((prev) => removeAt(prev, idx))}
                          title="Remove"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-center text-[10px] text-muted-foreground mt-1">#{idx}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateProductMutation.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
