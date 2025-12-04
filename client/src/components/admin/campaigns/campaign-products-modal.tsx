import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Trash, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Campaign } from "./types";
import type { Product } from "../products/types";

interface CampaignProductsModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export function CampaignProductsModal({ campaign, onClose }: CampaignProductsModalProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get campaign products
  const { data: campaignProducts = [], refetch: refetchCampaignProducts } = useQuery<Product[]>({ 
    queryKey: [`/api/campaigns/${campaign.id}/products`] 
  });
  
  // Get all products for adding
  const { data: allProducts = [] } = useQuery<Product[]>({ 
    queryKey: ["/api/products-admin"] 
  });

  // Filter products that are not already in campaign
  const availableProducts = allProducts.filter(
    product => !campaignProducts.some(cp => cp.id === product.id)
  );

  // Filter by search
  const filteredProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("POST", `/api/admin/campaigns/${campaign.id}/products`, {
        productId,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}/products`] });
      refetchCampaignProducts();
      toast({ title: "Product added to campaign" });
    },
    onError: (e: any) => {
      console.error("Add product error:", e);
      toast({ 
        title: "Add failed", 
        description: e.message || "Failed to add product to campaign", 
        variant: "destructive" 
      });
    },
  });

  const removeProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest(
        "DELETE", 
        `/api/admin/campaigns/${campaign.id}/products/${productId}`
      );
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/campaigns/${campaign.id}/products`] });
      refetchCampaignProducts();
      toast({ title: "Product removed from campaign" });
    },
    onError: (e: any) => {
      console.error("Remove product error:", e);
      toast({ 
        title: "Remove failed", 
        description: e.message || "Failed to remove product from campaign", 
        variant: "destructive" 
      });
    },
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Products for "{campaign.name}"</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Campaign Products */}
          <div>
            <h3 className="font-semibold mb-3">Current Products ({campaignProducts.length})</h3>
            {campaignProducts.length === 0 ? (
              <p className="text-muted-foreground">No products in this campaign yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">{product.sku}</p>
                        {product.categories && product.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {product.categories.slice(0, 2).map((category: any) => (
                              <Badge key={category.id} variant="secondary" className="text-xs">
                                {category.name}
                              </Badge>
                            ))}
                            {product.categories.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{product.categories.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeProductMutation.mutate(product.id)}
                        disabled={removeProductMutation.isPending}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold">₹{product.price}</span>
                      <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
                        Stock: {product.stock}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Products Section */}
          <div>
            <h3 className="font-semibold mb-3">Add Products to Campaign</h3>
            
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {availableProducts.length} products available to add
              </p>
            </div>

            {/* Available Products */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto p-2">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">{product.sku}</p>
                      {product.categories && product.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {product.categories.slice(0, 2).map((category: any) => (
                            <Badge key={category.id} variant="secondary" className="text-xs">
                              {category.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addProductMutation.mutate(product.id)}
                      disabled={addProductMutation.isPending}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-semibold">₹{product.price}</span>
                    <Badge variant={product.stock > 0 ? "outline" : "destructive"}>
                      Stock: {product.stock}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    {product.colors && product.colors.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Colors:</span>
                        <div className="flex flex-wrap gap-1">
                          {product.colors.slice(0, 2).map((color, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {color}
                            </Badge>
                          ))}
                          {product.colors.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.colors.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {filteredProducts.length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  {searchQuery ? "No products found matching your search." : "No products available to add."}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}