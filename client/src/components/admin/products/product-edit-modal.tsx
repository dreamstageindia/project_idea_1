import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Save, X, Trash, ArrowLeft, ArrowRight, UploadIcon, Tag, Heart, Badge } from "lucide-react";
import { uploadFiles, move, removeAt } from "@/lib/admin-utils";
import type { Product } from "./types";
import type { Category } from "@/components/admin/categories/types";
import type { Campaign } from "@/components/admin/campaigns/types";

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
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [images, setImages] = useState<string[]>([]);
  const [colorsInput, setColorsInput] = useState<string>("");
  const [packagesInput, setPackagesInput] = useState<string>("");
  const [specificationsInput, setSpecificationsInput] = useState<string>("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  
  // Get campaigns for this product
  const { data: productCampaigns = [] } = useQuery<Campaign[]>({ 
    queryKey: product ? [`/api/admin/products/${product.id}/campaigns`] : ["no-query"],
    enabled: !!product
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        price: product.price,
        sku: product.sku,
        stock: product.stock,
        isActive: product.isActive,
        csrSupport: product.csrSupport || false, // Added CSR Support
        backupProductId: product.backupProductId,
        categoryIds: product.categoryIds || [],
      });
      setImages(product.images || []);
      setColorsInput((product.colors || []).join(", "));
      setPackagesInput((product.packagesInclude || []).join("\n"));
      
      // Format specifications for textarea
      if (product.specifications && typeof product.specifications === 'object') {
        const specObj = product.specifications as Record<string, string>;
        setSpecificationsInput(
          Object.entries(specObj)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
        );
      } else if (typeof product.specifications === 'string') {
        setSpecificationsInput(product.specifications);
      } else {
        setSpecificationsInput("");
      }
      
      setSelectedCategoryIds(product.categoryIds || []);
    }
  }, [product]);

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/admin/products/${product!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/product-campaigns"] });
      toast({ title: "Product updated successfully" });
      onClose();
    },
    onError: (e: any) => {
      toast({ 
        title: "Update failed", 
        description: e.message, 
        variant: "destructive" 
      });
    },
  });

  const toggleCategorySelection = (categoryId: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!formData.sku?.trim()) {
      toast({ title: "SKU is required", variant: "destructive" });
      return;
    }

    const productData = {
      name: formData.name.trim(),
      price: formData.price || "0.00",
      sku: formData.sku.trim(),
      stock: formData.stock || 0,
      categoryIds: selectedCategoryIds,
      backupProductId: formData.backupProductId || null,
      isActive: formData.isActive !== false,
      csrSupport: formData.csrSupport || false, // Added CSR Support
      images: images,
      colors: colorsInput.split(",").map(s => s.trim()).filter(Boolean),
      packagesInclude: packagesInput.split("\n").map(s => s.trim()).filter(Boolean),
      specifications: parseSpecifications(specificationsInput),
    };

    updateProductMutation.mutate(productData);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product: {product.name}</DialogTitle>
        </DialogHeader>
        
        {/* Campaigns Info */}
        {productCampaigns.length > 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4" />
              <span className="font-medium">Campaigns</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {productCampaigns.map((campaign) => (
                <Badge key={campaign.id} variant="secondary">
                  {campaign.name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: To manage campaigns, go to the Campaigns section.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Price */}
            <div>
              <Label htmlFor="edit-price">Price *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || ""}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
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
              {selectedCategoryIds.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Selected categories: {selectedCategoryIds.length}
                </p>
              )}
            </div>

            {/* SKU */}
            <div>
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input
                id="edit-sku"
                value={formData.sku || ""}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
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
                      setImages((prev) => [...prev, ...urls]);
                      toast({ title: "Images uploaded", description: `${urls.length} file(s) ready.` });
                    } catch (err: any) {
                      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                    }
                  }}
                />
                <UploadIcon className="h-5 w-5 opacity-60" />
              </div>
              {images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {images.map((url, idx) => (
                    <div key={`${url}-${idx}`} className="relative">
                      <div className="w-20 h-20 rounded border overflow-hidden bg-muted flex items-center justify-center">
                        <img src={url} alt="preview" className="object-cover w-full h-full" />
                      </div>
                      <div className="flex justify-center gap-1 mt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={idx === 0}
                          onClick={() => setImages((prev) => move(prev, idx, idx - 1))}
                          title="Move left"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={idx === images.length - 1}
                          onClick={() => setImages((prev) => move(prev, idx, idx + 1))}
                          title="Move right"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => setImages((prev) => removeAt(prev, idx))}
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
              <Label htmlFor="edit-colors">Colors (comma-separated)</Label>
              <Input
                id="edit-colors"
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                placeholder="Red, Blue, Green"
              />
            </div>

            {/* Stock */}
            <div>
              <Label htmlFor="edit-stock">Stock</Label>
              <Input
                id="edit-stock"
                type="number"
                min="0"
                value={String(formData.stock ?? 0)}
                onChange={(e) =>
                  setFormData({ ...formData, stock: Number(e.target.value) || 0 })
                }
              />
            </div>

            {/* Packages Include */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-packages">Packages Include (one per line)</Label>
              <Textarea
                id="edit-packages"
                value={packagesInput}
                onChange={(e) => setPackagesInput(e.target.value)}
                placeholder="Item 1&#10;Item 2&#10;Item 3"
                rows={3}
              />
            </div>

            {/* Specifications */}
            <div className="md:col-span-2">
              <Label htmlFor="edit-specifications">Specifications (key:value, one per line)</Label>
              <Textarea
                id="edit-specifications"
                value={specificationsInput}
                onChange={(e) => setSpecificationsInput(e.target.value)}
                placeholder="Weight: 2kg&#10;Dimensions: 10x20x5cm&#10;Material: Plastic"
                rows={4}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Format: Key: Value (one specification per line)
              </p>
            </div>

            {/* Backup Product */}
            <div>
              <Label htmlFor="edit-backup">Backup Product (optional)</Label>
              <select
                id="edit-backup"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.backupProductId ?? ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    backupProductId: e.target.value ? e.target.value : null,
                  })
                }
              >
                <option value="">— None —</option>
                {products
                  .filter(p => p.id !== product.id)
                  .map((p) => (
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
                  id="edit-isActive"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(formData.isActive)}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="edit-isActive" className="text-sm">Product is active</Label>
              </div>
            </div>

            {/* CSR Support */}
            <div>
              <Label>CSR Support</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="edit-csrSupport"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(formData.csrSupport)}
                  onChange={(e) => setFormData({ ...formData, csrSupport: e.target.checked })}
                />
                <Label htmlFor="edit-csrSupport" className="text-sm flex items-center gap-1">
                  <Heart className="h-3 w-3 text-red-500" />
                  Available for CSR Support
                </Label>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateProductMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateProductMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}