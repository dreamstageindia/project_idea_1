import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, UploadIcon, ArrowLeft, ArrowRight, Trash } from "lucide-react";
import { uploadFiles, move, removeAt } from "@/lib/admin-utils";
import type { Product } from "./types";
import type { Category } from "@/components/admin/categories/types";

const defaultNewProduct: Partial<Product> = {
  name: "",
  price: "0.00",
  images: [],
  colors: [],
  stock: 0,
  packagesInclude: [],
  specifications: {},
  sku: "",
  isActive: true,
  backupProductId: null,
  categoryId: null,
};

export function ProductCreate() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newProduct, setNewProduct] = useState<Partial<Product>>(defaultNewProduct);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [colorsInput, setColorsInput] = useState<string>("");
  const [packagesInput, setPackagesInput] = useState<string>("");
  const [specificationsInput, setSpecificationsInput] = useState<string>("");
  
  const { data: products = [] } = useQuery<Product[]>({ 
    queryKey: ["/api/products-admin"] 
  });

  const { data: categories = [] } = useQuery<Category[]>({ 
    queryKey: ["/api/categories"] 
  });

  const createProductMutation = useMutation({
    mutationFn: async (body: Partial<Product>) => {
      const res = await apiRequest("POST", `/api/admin/products`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product created" });
      setNewProduct(defaultNewProduct);
      setNewProductImages([]);
      setColorsInput("");
      setPackagesInput("");
      setSpecificationsInput("");
    },
    onError: (e: any) => toast({ 
      title: "Create failed", 
      description: e.message, 
      variant: "destructive" 
    }),
  });

  // Update colors when colorsInput changes
  const updateColorsFromInput = useCallback((input: string) => {
    const colorsArray = input.split(",").map(s => s.trim()).filter(Boolean);
    setNewProduct(prev => ({ ...prev, colors: colorsArray }));
  }, []);

  // Update packages when packagesInput changes
  const updatePackagesFromInput = useCallback((input: string) => {
    const packagesArray = input.split("\n").map(s => s.trim()).filter(Boolean);
    setNewProduct(prev => ({ ...prev, packagesInclude: packagesArray }));
  }, []);

  // Update specifications when specificationsInput changes
  const updateSpecificationsFromInput = useCallback((input: string) => {
    const obj: Record<string, string> = {};
    input.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx > 0) {
        const k = line.slice(0, idx).trim();
        const v = line.slice(idx + 1).trim();
        if (k) obj[k] = v;
      }
    });
    setNewProduct(prev => ({ ...prev, specifications: obj }));
  }, []);

  const handleCreate = () => {
    // Ensure all fields are synced before submission
    updateColorsFromInput(colorsInput);
    updatePackagesFromInput(packagesInput);
    updateSpecificationsFromInput(specificationsInput);
    
    createProductMutation.mutate({
      ...newProduct,
      images: newProductImages,
    });
  };

  // Initialize inputs when data loads or changes
  useState(() => {
    if (newProduct.colors && newProduct.colors.length > 0 && !colorsInput) {
      setColorsInput(newProduct.colors.join(", "));
    }
    if (newProduct.packagesInclude && newProduct.packagesInclude.length > 0 && !packagesInput) {
      setPackagesInput(newProduct.packagesInclude.join("\n"));
    }
    if (newProduct.specifications && Object.keys(newProduct.specifications).length > 0 && !specificationsInput) {
      setSpecificationsInput(
        Object.entries(newProduct.specifications)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      );
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={newProduct.name || ""}
              onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter product name"
            />
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="product-price">Price</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              value={newProduct.price || ""}
              onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
              placeholder="0.00"
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="product-category">Category</Label>
            <select
              id="product-category"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newProduct.categoryId ?? ""}
              onChange={(e) =>
                setNewProduct((p) => ({
                  ...p,
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

          {/* SKU */}
          <div>
            <Label htmlFor="product-sku">SKU</Label>
            <Input
              id="product-sku"
              value={newProduct.sku || ""}
              onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
              placeholder="Enter SKU"
            />
          </div>
          
          {/* Images */}
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
                    setNewProductImages((prev) => [...prev, ...urls]);
                    toast({ title: "Images uploaded", description: `${urls.length} file(s) ready.` });
                  } catch (err: any) {
                    toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                  }
                }}
              />
              <UploadIcon className="h-5 w-5 opacity-60" />
            </div>
            {!!newProductImages.length && (
              <div className="mt-3 flex flex-wrap gap-3">
                {newProductImages.map((u, idx) => (
                  <div key={`${u}-${idx}`} className="relative">
                    <div className="w-20 h-20 rounded border overflow-hidden bg-muted flex items-center justify-center">
                      <img src={u} alt="preview" className="object-cover w-full h-full" />
                    </div>
                    <div className="flex justify-center gap-1 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => setNewProductImages((prev) => move(prev, idx, idx - 1))}
                        title="Move left"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        disabled={idx === newProductImages.length - 1}
                        onClick={() => setNewProductImages((prev) => move(prev, idx, idx + 1))}
                        title="Move right"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => setNewProductImages((prev) => removeAt(prev, idx))}
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

          {/* Colors - Using separate state for input */}
          <div>
            <Label htmlFor="product-colors">Colors (comma-separated)</Label>
            <Input
              id="product-colors"
              value={colorsInput}
              onChange={(e) => {
                setColorsInput(e.target.value);
                updateColorsFromInput(e.target.value);
              }}
              onBlur={() => updateColorsFromInput(colorsInput)}
              placeholder="Red, Blue, Green"
            />
          </div>

          {/* Stock */}
          <div>
            <Label htmlFor="product-stock">Stock</Label>
            <Input
              id="product-stock"
              type="number"
              value={String(newProduct.stock ?? 0)}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, stock: Number(e.target.value) || 0 }))
              }
              placeholder="0"
            />
          </div>

          {/* Packages Include - Using separate state for input */}
          <div className="md:col-span-2">
            <Label htmlFor="product-packages">Packages Include (one per line)</Label>
            <Textarea
              id="product-packages"
              value={packagesInput}
              onChange={(e) => {
                setPackagesInput(e.target.value);
                updatePackagesFromInput(e.target.value);
              }}
              onBlur={() => updatePackagesFromInput(packagesInput)}
              placeholder="Item 1\nItem 2\nItem 3"
              rows={4}
            />
          </div>

          {/* Specifications - Using separate state for input */}
          <div className="md:col-span-2">
            <Label htmlFor="product-specifications">Specifications (key:value, one per line)</Label>
            <Textarea
              id="product-specifications"
              value={specificationsInput}
              onChange={(e) => {
                setSpecificationsInput(e.target.value);
                updateSpecificationsFromInput(e.target.value);
              }}
              onBlur={() => updateSpecificationsFromInput(specificationsInput)}
              placeholder="Weight: 2kg\nDimensions: 10x20x5cm\nMaterial: Plastic"
              rows={4}
            />
          </div>

          {/* Backup Product */}
          <div>
            <Label htmlFor="product-backup">Backup Product (optional)</Label>
            <select
              id="product-backup"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newProduct.backupProductId ?? ""}
              onChange={(e) =>
                setNewProduct((p) => ({
                  ...p,
                  backupProductId: e.target.value ? e.target.value : null,
                }))
              }
            >
              <option value="">— None —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          </div>

          {/* Active Status */}
          <div>
            <Label>Active Status</Label>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="isActive"
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(newProduct.isActive)}
                onChange={(e) => setNewProduct((p) => ({ ...p, isActive: e.target.checked }))}
              />
              <Label htmlFor="isActive" className="text-sm">Product is active</Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleCreate}
            disabled={createProductMutation.isPending}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Product
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}