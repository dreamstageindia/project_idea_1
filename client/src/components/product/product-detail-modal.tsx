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

// Debug component for specifications
const SpecificationsDebug = ({ input }: { input: string }) => {
  const parseSpecifications = (input: string): Record<string, string> => {
    console.log("=== PARSING SPECIFICATIONS ===");
    console.log("Raw input:", input);
    
    const obj: Record<string, string> = {};
    
    if (!input || !input.trim()) {
      console.log("Empty input, returning empty object");
      return obj;
    }
    
    const lines = input.split("\n");
    console.log("Total lines:", lines.length);
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      console.log(`Line ${index + 1}: "${trimmedLine}"`);
      
      if (!trimmedLine) {
        console.log(`Line ${index + 1}: Empty, skipping`);
        return;
      }
      
      // Handle both colon and equals sign as separators
      const separatorIndex = trimmedLine.search(/[:=]/);
      console.log(`Line ${index + 1}: Separator position: ${separatorIndex}`);
      
      if (separatorIndex > 0) {
        // Has separator - split into key:value
        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim();
        console.log(`Line ${index + 1}: Parsed as key="${key}", value="${value}"`);
        
        if (key) {
          obj[key] = value;
          console.log(`Line ${index + 1}: Added to object`);
        } else {
          console.log(`Line ${index + 1}: Empty key, skipping`);
        }
      } else if (separatorIndex === -1) {
        // No separator - use the whole line as key with empty value
        console.log(`Line ${index + 1}: No separator found, using as key with empty value`);
        obj[trimmedLine] = "";
      } else {
        // Separator at start (like ":value") - skip or handle as malformed
        console.log(`Line ${index + 1}: Separator at start, skipping`);
      }
    });
    
    console.log("Final parsed object:", obj);
    console.log("Object keys:", Object.keys(obj));
    return obj;
  };

  const parsedSpecs = parseSpecifications(input);
  
  return (
    <div className="md:col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h4 className="font-semibold text-yellow-800 mb-2">Debug: Specifications</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="font-medium">Raw Input:</p>
          <pre className="bg-white p-2 rounded border text-xs overflow-auto">
            {input || '(empty)'}
          </pre>
        </div>
        <div>
          <p className="font-medium">Parsed Object:</p>
          <pre className="bg-white p-2 rounded border text-xs overflow-auto">
            {JSON.stringify(parsedSpecs, null, 2)}
          </pre>
        </div>
      </div>
      <div className="mt-2 text-xs text-yellow-600">
        <p>Lines: {input.split('\n').length} | Non-empty lines: {input.split('\n').filter(line => line.trim()).length}</p>
        <p>Contains colon: {input.includes(':') ? 'Yes' : 'No'}</p>
        <p>Parsed specifications: {Object.keys(parsedSpecs).length}</p>
      </div>
    </div>
  );
};

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
      console.log("Initializing edit modal with product:", product);
      console.log("Product specifications:", product.specifications);
      console.log("Product colors:", product.colors);
      console.log("Product packagesInclude:", product.packagesInclude);
      
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
      
      // Format specifications for display
      const specsText = Object.entries(product.specifications ?? {})
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
      console.log("Formatted specifications text:", specsText);
      setSpecificationsInput(specsText);
    }
  }, [product]);

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<Product> }) => {
      console.log("=== SENDING UPDATE REQUEST ===");
      console.log("Product ID:", payload.id);
      console.log("Full update data:", payload.updates);
      console.log("Specifications being sent:", payload.updates.specifications);
      console.log("Colors being sent:", payload.updates.colors);
      console.log("PackagesInclude being sent:", payload.updates.packagesInclude);
      
      const res = await apiRequest("PUT", `/api/admin/products/${payload.id}`, payload.updates);
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || "Failed to update product");
      }
      
      return result;
    },
    onSuccess: (data) => {
      console.log("=== UPDATE SUCCESSFUL ===");
      console.log("Response data:", data);
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product updated successfully" });
      onClose();
    },
    onError: (e: any) => {
      console.error("=== UPDATE ERROR ===", e);
      toast({ 
        title: "Update failed", 
        description: e.message, 
        variant: "destructive" 
      });
    },
  });

  // Parse specifications from text input to object
  const parseSpecifications = (input: string): Record<string, string> => {
    console.log("=== PARSING SPECIFICATIONS ===");
    console.log("Raw input:", input);
    
    const obj: Record<string, string> = {};
    
    if (!input || !input.trim()) {
      console.log("Empty input, returning empty object");
      return obj;
    }
    
    const lines = input.split("\n");
    console.log("Total lines:", lines.length);
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      console.log(`Line ${index + 1}: "${trimmedLine}"`);
      
      if (!trimmedLine) {
        console.log(`Line ${index + 1}: Empty, skipping`);
        return;
      }
      
      // Handle both colon and equals sign as separators
      const separatorIndex = trimmedLine.search(/[:=]/);
      console.log(`Line ${index + 1}: Separator position: ${separatorIndex}`);
      
      if (separatorIndex > 0) {
        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim();
        console.log(`Line ${index + 1}: Parsed as key="${key}", value="${value}"`);
        
        if (key) {
          obj[key] = value;
          console.log(`Line ${index + 1}: Added to object`);
        } else {
          console.log(`Line ${index + 1}: Empty key, skipping`);
        }
      } else {
        console.log(`Line ${index + 1}: No separator found or separator at start, skipping`);
      }
    });
    
    console.log("Final parsed object:", obj);
    console.log("Object keys:", Object.keys(obj));
    return obj;
  };

  const handleSave = () => {
    if (!product) return;
    
    console.log("=== STARTING SAVE PROCESS ===");
    
    // Parse the current inputs
    const parsedColors = colorsInput.split(",").map(s => s.trim()).filter(Boolean);
    const parsedPackages = packagesInput.split("\n").map(s => s.trim()).filter(Boolean);
    const parsedSpecifications = parseSpecifications(specificationsInput);
    
    console.log("=== PARSED DATA ===");
    console.log("Colors input:", colorsInput);
    console.log("Parsed colors:", parsedColors);
    console.log("Packages input:", packagesInput);
    console.log("Parsed packages:", parsedPackages);
    console.log("Specifications input:", specificationsInput);
    console.log("Parsed specifications:", parsedSpecifications);
    
    // Validate required fields
    if (!editDraft.name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!editDraft.sku?.trim()) {
      toast({
        title: "Validation Error",
        description: "SKU is required",
        variant: "destructive",
      });
      return;
    }
    
    // Build the complete update data
    const updates: Partial<Product> = {
      name: editDraft.name.trim(),
      price: editDraft.price || "0.00",
      sku: editDraft.sku.trim(),
      stock: editDraft.stock || 0,
      categoryId: editDraft.categoryId || null,
      backupProductId: editDraft.backupProductId || null,
      isActive: editDraft.isActive !== false,
      images: editImages,
      colors: parsedColors,
      packagesInclude: parsedPackages,
      specifications: parsedSpecifications,
    };

    console.log("=== FINAL UPDATE PAYLOAD ===");
    console.log("Updates object:", updates);
    console.log("JSON stringified:", JSON.stringify(updates, null, 2));
    
    updateProductMutation.mutate({ id: product.id, updates });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <div className="mb-4 flex-shrink-0">
          <h3 className="text-lg font-semibold">Edit Product</h3>
          <p className="text-sm text-muted-foreground">
            SKU: <span className="font-mono">{product.sku}</span> | ID: <span className="font-mono text-xs">{product.id}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editDraft.name ?? ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Product name"
              />
            </div>
            <div>
              <Label htmlFor="edit-price">Price *</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={String(editDraft.price ?? "")}
                onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
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
              <Label htmlFor="edit-sku">SKU *</Label>
              <Input
                id="edit-sku"
                value={editDraft.sku ?? ""}
                onChange={(e) => setEditDraft((d) => ({ ...d, sku: e.target.value }))}
                placeholder="Product SKU"
              />
            </div>

            <div>
              <Label htmlFor="edit-colors">Colors (comma-separated)</Label>
              <Input
                id="edit-colors"
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                placeholder="Red, Blue, Green"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separate colors with commas
              </p>
            </div>
            <div>
              <Label htmlFor="edit-stock">Stock</Label>
              <Input
                id="edit-stock"
                type="number"
                min="0"
                value={String(editDraft.stock ?? 0)}
                onChange={(e) => setEditDraft((d) => ({ ...d, stock: Number(e.target.value) || 0 }))}
                placeholder="0"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="edit-backup">Backup Product (optional)</Label>
              <select
                id="edit-backup"
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
              <Label>Active Status</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="edit-isActive"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={Boolean(editDraft.isActive)}
                  onChange={(e) => setEditDraft((d) => ({ ...d, isActive: e.target.checked }))}
                />
                <Label htmlFor="edit-isActive" className="text-sm">Product is active</Label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="edit-packages">Packages Include (one per line)</Label>
              <Textarea
                id="edit-packages"
                value={packagesInput}
                onChange={(e) => setPackagesInput(e.target.value)}
                placeholder="Item 1&#10;Item 2&#10;Item 3"
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter one item per line
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="edit-specifications">Specifications (key:value, one per line)</Label>
              <Textarea
                id="edit-specifications"
                value={specificationsInput}
                onChange={(e) => setSpecificationsInput(e.target.value)}
                placeholder="Weight: 2kg&#10;Dimensions: 10x20x5cm&#10;Material: Plastic"
                rows={4}
              />
              <div className="text-xs text-muted-foreground mt-1 space-y-1">
                <p>Format: <strong>Key: Value</strong> (one specification per line)</p>
                <p>Example: <code>Weight: 2kg</code></p>
                <p>Current specifications count: <strong>{Object.keys(parseSpecifications(specificationsInput)).length}</strong></p>
              </div>
              
              {/* Debug component */}
              <SpecificationsDebug input={specificationsInput} />
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
