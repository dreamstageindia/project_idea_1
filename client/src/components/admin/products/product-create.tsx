import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, UploadIcon, ArrowLeft, ArrowRight, Trash, Heart } from "lucide-react";
import { uploadFiles, move, removeAt } from "@/lib/admin-utils";
import type { Product, PriceSlab } from "./types";
import type { Category } from "@/components/admin/categories/types";

const defaultNewProduct: Partial<Product> = {
  name: "",
  price: "0.00",
  images: [],
  colors: [],
  stock: 0,
  packagesInclude: [],
  specifications: "",
  sku: "",
  isActive: true,
  csrSupport: false,
  backupProductId: null,
  categoryIds: [],
  priceSlabs: [], // ✅ NEW
};

function normalizeSlabs(slabs: PriceSlab[]): PriceSlab[] {
  // Remove empty rows, normalize numbers, sort and validate duplicates later
  const cleaned = slabs
    .map((s) => ({
      minQty: Number(s.minQty || 0),
      price: String(s.price ?? "0"),
    }))
    .filter((s) => Number.isFinite(s.minQty) && s.minQty > 0 && s.price !== "");

  // sort ascending by minQty
  cleaned.sort((a, b) => a.minQty - b.minQty);
  return cleaned;
}

export function ProductCreate() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newProduct, setNewProduct] = useState<Partial<Product>>(defaultNewProduct);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [colorsInput, setColorsInput] = useState<string>("");
  const [packagesInput, setPackagesInput] = useState<string>("");
  const [specificationsInput, setSpecificationsInput] = useState<string>("");

  // ✅ NEW: slabs state (kept separate for easy UI)
  const [priceSlabs, setPriceSlabs] = useState<PriceSlab[]>([]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products-admin"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (body: Partial<Product>) => {
      console.log("Submitting product data:", JSON.stringify(body, null, 2));
      const res = await apiRequest("POST", `/api/admin/products`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product created successfully" });
      setNewProduct(defaultNewProduct);
      setNewProductImages([]);
      setColorsInput("");
      setPackagesInput("");
      setSpecificationsInput("");
      setPriceSlabs([]); // ✅ reset slabs
    },
    onError: (e: any) =>
      toast({
        title: "Create failed",
        description: e.message,
        variant: "destructive",
      }),
  });

  const toggleCategorySelection = (categoryId: string) => {
    setNewProduct((prev) => {
      const current = prev.categoryIds ?? [];
      const exists = current.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists ? current.filter((id) => id !== categoryId) : [...current, categoryId],
      };
    });
  };

  const selectedCategoryIds = newProduct.categoryIds ?? [];

  // ✅ derived validation for slabs
  const slabValidation = useMemo(() => {
    const normalized = normalizeSlabs(priceSlabs);

    // duplicates check
    const seen = new Set<number>();
    const dup = normalized.find((s) => {
      if (seen.has(s.minQty)) return true;
      seen.add(s.minQty);
      return false;
    });

    // price must be a valid number >= 0
    const badPrice = normalized.find((s) => {
      const p = Number(s.price);
      return !Number.isFinite(p) || p < 0;
    });

    return {
      normalized,
      hasDuplicateMinQty: Boolean(dup),
      badPrice: Boolean(badPrice),
    };
  }, [priceSlabs]);

  const addSlabRow = () => {
    setPriceSlabs((prev) => [
      ...prev,
      { minQty: prev.length ? prev[prev.length - 1].minQty + 1 : 1, price: newProduct.price ?? "0.00" },
    ]);
  };

  const removeSlabRow = (idx: number) => {
    setPriceSlabs((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlabRow = (idx: number, patch: Partial<PriceSlab>) => {
    setPriceSlabs((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const handleCreate = () => {
    // Validate required fields
    if (!newProduct.name?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!newProduct.sku?.trim()) {
      toast({ title: "SKU is required", variant: "destructive" });
      return;
    }

    // Validate slab pricing rows (if any)
    if (slabValidation.hasDuplicateMinQty) {
      toast({
        title: "Invalid slab pricing",
        description: "Duplicate minimum quantity found. Each slab must have a unique Min Qty.",
        variant: "destructive",
      });
      return;
    }
    if (slabValidation.badPrice) {
      toast({
        title: "Invalid slab pricing",
        description: "One or more slab prices are invalid. Prices must be a number ≥ 0.",
        variant: "destructive",
      });
      return;
    }

    // Build the complete product data
    const productData: Partial<Product> = {
      name: newProduct.name.trim(),
      price: newProduct.price || "0.00",
      sku: newProduct.sku.trim(),
      stock: newProduct.stock || 0,
      categoryIds: newProduct.categoryIds ?? [],
      backupProductId: newProduct.backupProductId || null,
      isActive: newProduct.isActive !== false,
      csrSupport: newProduct.csrSupport || false,
      images: newProductImages,
      colors: colorsInput.split(",").map((s) => s.trim()).filter(Boolean),
      packagesInclude: packagesInput.split("\n").map((s) => s.trim()).filter(Boolean),
      specifications: specificationsInput.trim(),

      // ✅ NEW
      // Example semantics:
      // If slabs exist: price for qty >= minQty is slab.price (pick highest minQty <= qty)
      priceSlabs: slabValidation.normalized,
    };

    console.log("Final product data to submit:", productData);

    createProductMutation.mutate(productData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Product</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <Label htmlFor="product-name">Name *</Label>
            <Input
              id="product-name"
              value={newProduct.name || ""}
              onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
              placeholder="Enter product name"
            />
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="product-price">Base Price *</Label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              value={newProduct.price || ""}
              onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Used when slab pricing is not applicable (or as the default tier).
            </p>
          </div>

          {/* Categories */}
          <div className="md:col-span-2">
            <Label>Categories</Label>
            {categories.length ? (
              <div className="mt-2 grid sm:grid-cols-2 gap-2">
                {categories.map((category) => {
                  const selected = selectedCategoryIds.includes(category.id);
                  return (
                    <label
                      key={category.id}
                      className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selected}
                        onChange={() => toggleCategorySelection(category.id)}
                      />
                      <span>{category.name}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No categories available.</p>
            )}
            {!!selectedCategoryIds.length && (
              <p className="text-xs text-muted-foreground mt-2">
                Selected categories: {selectedCategoryIds.length}
              </p>
            )}
          </div>

          {/* SKU */}
          <div>
            <Label htmlFor="product-sku">SKU *</Label>
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

          {/* Colors */}
          <div>
            <Label htmlFor="product-colors">Colors (comma-separated)</Label>
            <Input
              id="product-colors"
              value={colorsInput}
              onChange={(e) => setColorsInput(e.target.value)}
              placeholder="Red, Blue, Green"
            />
          </div>

          {/* Stock */}
          <div>
            <Label htmlFor="product-stock">Stock</Label>
            <Input
              id="product-stock"
              type="number"
              min="0"
              value={String(newProduct.stock ?? 0)}
              onChange={(e) => setNewProduct((p) => ({ ...p, stock: Number(e.target.value) || 0 }))}
              placeholder="0"
            />
          </div>

          {/* ✅ Slab Pricing */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <Label>Slab Pricing (optional)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Define price tiers by minimum quantity. Example: Min Qty 5 → price applies when user buys 5 or more.
                </p>
              </div>
              <Button type="button" variant="outline" onClick={addSlabRow}>
                <Plus className="h-4 w-4 mr-2" />
                Add Slab
              </Button>
            </div>

            {priceSlabs.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">No slabs added. Base price will be used.</p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
                  <div className="col-span-4">Min Qty *</div>
                  <div className="col-span-6">Price *</div>
                  <div className="col-span-2 text-right">Action</div>
                </div>

                {priceSlabs.map((slab, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-4">
                      <Input
                        type="number"
                        min={1}
                        value={String(slab.minQty ?? "")}
                        onChange={(e) => updateSlabRow(idx, { minQty: Number(e.target.value) || 0 })}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div className="col-span-6">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={String(slab.price ?? "")}
                        onChange={(e) => updateSlabRow(idx, { price: e.target.value })}
                        placeholder="e.g., 199.00"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => removeSlabRow(idx)}
                        title="Remove slab"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {(slabValidation.hasDuplicateMinQty || slabValidation.badPrice) && (
                  <div className="text-sm text-red-500">
                    {slabValidation.hasDuplicateMinQty && <div>• Duplicate Min Qty found. Each slab must be unique.</div>}
                    {slabValidation.badPrice && <div>• Invalid price in one or more slabs (must be number ≥ 0).</div>}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Tip: system should apply the slab with the highest Min Qty that is ≤ selected quantity.
                </p>
              </div>
            )}
          </div>

          {/* Packages Include */}
          <div className="md:col-span-2">
            <Label htmlFor="product-packages">Packages Include (one per line)</Label>
            <Textarea
              id="product-packages"
              value={packagesInput}
              onChange={(e) => setPackagesInput(e.target.value)}
              placeholder="Item 1&#10;Item 2&#10;Item 3"
              rows={3}
            />
          </div>

          {/* Specifications */}
          <div className="md:col-span-2">
            <Label htmlFor="product-specifications">Specifications (plain text with line breaks)</Label>
            <Textarea
              id="product-specifications"
              value={specificationsInput}
              onChange={(e) => setSpecificationsInput(e.target.value)}
              placeholder="Enter detailed specifications here...&#10;You can use multiple lines&#10;And any format you want"
              rows={4}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter specifications as plain text. Each line will be preserved.
            </p>
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
              <Label htmlFor="isActive" className="text-sm">
                Product is active
              </Label>
            </div>
          </div>

          {/* CSR Support */}
          <div>
            <Label>CSR Support</Label>
            <div className="flex items-center gap-2 mt-2">
              <input
                id="csrSupport"
                type="checkbox"
                className="h-4 w-4"
                checked={Boolean(newProduct.csrSupport)}
                onChange={(e) => setNewProduct((p) => ({ ...p, csrSupport: e.target.checked }))}
              />
              <Label htmlFor="csrSupport" className="text-sm flex items-center gap-1">
                <Heart className="h-3 w-3 text-red-500" />
                Available for CSR Support
              </Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              If checked, this product will appear in CSR Support page
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleCreate} disabled={createProductMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            {createProductMutation.isPending ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
