// src/components/product/product-detail-modal.tsx
import { memo, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCarousel } from "./product-carousel";
import { X, ShoppingCart, CheckCircle, Plus, Minus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  selectedColor: string;
  onColorChange: (color: string) => void;
  quantity: number;
  onQuantityChange: (qty: number) => void;
  onAddToCart: (product: any, color: string, quantity: number) => void;
}

function _ProductDetailModal({
  isOpen,
  onClose,
  product,
  selectedColor,
  onColorChange,
  quantity,
  onQuantityChange,
  onAddToCart,
}: ProductDetailModalProps) {
  const { toast } = useToast();

  if (!product) return null;

  const { data: branding } = useQuery({
    queryKey: ["/api/admin/branding"],
  });

  const inrPerPoint = parseFloat(branding?.inrPerPoint || "1");
  const pointsRequired = Math.ceil(parseFloat(product.price) / inrPerPoint);

  useEffect(() => {
    if (!isOpen || !product) return;
    const first = product.colors?.[0] || "";
    if (first && selectedColor !== first) onColorChange(first);
  }, [isOpen, product?.id, product?.colors, selectedColor, onColorChange]);

  const getColorStyle = (color: string) => {
    if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return "";
    }
    const colorMap: Record<string, string> = {
      black: "bg-black",
      white: "bg-white border-2 border-gray-300",
      blue: "bg-blue-600",
      charcoal: "bg-gray-800",
      navy: "bg-blue-900",
      "space-gray": "bg-gray-600",
      silver: "bg-gray-300",
      "rose-gold": "bg-gradient-to-br from-rose-300 to-amber-200",
    };
    return colorMap[color] || "bg-gray-400";
  };

  const getColorInlineStyle = (color: string) => {
    if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return { backgroundColor: color };
    }
    return {};
  };

  const handleAddToCart = () => {
    if (product.colors?.length > 0 && !selectedColor) {
      toast({
        title: "Error",
        description: "Please select a color before adding to cart.",
        variant: "destructive",
      });
      return;
    }
    if (quantity < 1 || quantity > product.stock) {
      toast({
        title: "Error",
        description: `Please select a valid quantity (1 to ${product.stock}).`,
        variant: "destructive",
      });
      return;
    }
    onAddToCart(product, selectedColor || null, quantity);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0" data-testid="modal-product-detail" style={{ zIndex: 1002 }}>
        <div className="grid md:grid-cols-2 gap-0 min-h-[600px]">
          {/* Image Section - Fixed layout */}
          <div className="flex flex-col p-6 bg-white">
            <div className="flex-1 flex items-center justify-center min-h-[400px] bg-gray-50 rounded-lg mb-4">
              <ProductCarousel images={product.images || []} alt={product.name} />
            </div>
            <div className="flex space-x-2 overflow-x-auto pt-4">
              {(product.images || []).map((image: string, index: number) => (
                <div key={index} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-colors">
                  <img
                    src={image}
                    alt={`${product.name} thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`thumbnail-${index}`}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Details Section */}
          <div className="p-8 bg-muted/30 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold" data-testid="text-product-detail-name">
                {product.name}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-product-detail"
                aria-label="Close"
                className="hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            
            <p className="text-3xl font-bold text-blue-600 mb-6" data-testid="text-product-detail-points-required">
              {pointsRequired} points
            </p>
            
            {/* Specifications Section */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">Specifications:</h4>
                <div className="grid grid-cols-1 gap-3 text-sm bg-white rounded-lg p-4 shadow-sm">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between border-b pb-2 last:border-b-0">
                      <span className="text-muted-foreground font-medium">{key}:</span>
                      <span className="font-medium text-right">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Packages Include Section */}
            {Array.isArray(product.packagesInclude) && product.packagesInclude.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">Packages Include:</h4>
                <div className="space-y-2 text-sm bg-white rounded-lg p-4 shadow-sm">
                  {product.packagesInclude.map((item: string, index: number) => (
                    <div key={index} className="flex items-start">
                      <CheckCircle className="text-green-600 mr-3 h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Color Selection */}
            {Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-lg mb-3">Choose Color:</h4>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color: string) => {
                    const selected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`w-12 h-12 rounded-full border-2 transition-all duration-200 ${
                          selected ? "ring-2 ring-blue-500 ring-offset-2" : "border-gray-300 hover:border-blue-400"
                        } ${getColorStyle(color)}`}
                        style={getColorInlineStyle(color)}
                        onClick={() => {
                          if (!selected) onColorChange(color);
                        }}
                        aria-pressed={selected}
                        aria-label={`Select color ${color}`}
                        data-testid={`detail-color-option-${color}`}
                        title={color}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Quantity Selection */}
            <div className="mb-8">
              <h4 className="font-semibold text-lg mb-3">Quantity:</h4>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="rounded-full w-10 h-10"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  className="w-20 text-center text-lg font-semibold"
                  value={quantity}
                  onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
                  min={1}
                  max={product.stock}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onQuantityChange(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="rounded-full w-10 h-10"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  {product.stock} available
                </span>
              </div>
            </div>
            
            {/* Add to Cart Button */}
            <div className="mt-auto">
              <Button
                className="w-full py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={handleAddToCart}
                data-testid="button-add-to-cart-from-detail"
                disabled={product.colors?.length > 0 && !selectedColor}
                size="lg"
              >
                <ShoppingCart className="mr-3 h-6 w-6" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const ProductDetailModal = memo(_ProductDetailModal);
