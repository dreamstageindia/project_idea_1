import { memo, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "./product-carousel";
import { X, Check, CheckCircle } from "lucide-react";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  selectedColor: string;
  onColorChange: (color: string) => void;
  onSelect: (product: any, color: string) => void;
}

function _ProductDetailModal({
  isOpen,
  onClose,
  product,
  selectedColor,
  onColorChange,
  onSelect,
}: ProductDetailModalProps) {
  if (!product) return null;

  // Optional: choose a default color only once per product open
  useEffect(() => {
    if (!isOpen || !product) return;
    const first = product.colors?.[0] || "";
    if (first && selectedColor !== first) onColorChange(first);
    // depend on product identity and isOpen; avoid selectedColor to prevent ping-pong
  }, [isOpen, product?.id]); 

  const getColorStyle = (color: string) => {
    // Check if it's a hex color (starts with # and is 6-7 characters)
    if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return "";
    }
    
    // Fallback to named colors for backward compatibility
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
    // If it's a hex color, return inline style
    if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return { backgroundColor: color };
    }
    return {};
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Only close when Dialog requests closing; do nothing on "open=true"
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0" data-testid="modal-product-detail">
        <div className="grid md:grid-cols-2 gap-0">
          {/* Product Images */}
          <div className="p-6">
            <div className="h-80 bg-gray-100 rounded-lg mb-4">
              <ProductCarousel images={product.images || []} alt={product.name} />
            </div>
            <div className="flex space-x-2 overflow-x-auto">
              {(product.images || []).map((image: string, index: number) => (
                <div key={index} className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
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

          {/* Product Details */}
          <div className="p-6 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold" data-testid="text-product-detail-name">
                {product.name}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-testid="button-close-product-detail"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            

            {/* Packages Include */}
            {Array.isArray(product.packagesInclude) && product.packagesInclude.length > 0 && (
              <div className="space-y-2 mb-6">
                <h4 className="font-semibold">Packages Include:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {product.packagesInclude.map((item: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="text-green-600 mr-2 h-4 w-4 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specifications */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-2">Specifications:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-muted-foreground">{key}</p>
                      <p className="font-medium">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selection */}
            {Array.isArray(product.colors) && product.colors.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold mb-3">Choose Color:</h4>
                <div className="flex space-x-3">
                  {product.colors.map((color: string) => {
                    const selected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`color-option ${getColorStyle(color)} ${selected ? "selected ring-2 ring-primary" : ""}`}
                        style={getColorInlineStyle(color)}
                        onClick={() => {
                          if (!selected) onColorChange(color);
                        }}
                        aria-pressed={selected}
                        aria-label={`Select color ${color}`}
                        data-testid={`detail-color-option-${color}`}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock Status */}
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="text-green-600 mr-2 h-5 w-5" />
                <span className="text-green-800 font-medium">
                  <span data-testid="text-detail-stock">{product.stock}</span> units available
                </span>
              </div>
            </div>

            {/* Action Button */}
            <Button
              className="w-full py-4 text-lg font-semibold"
              onClick={() => onSelect(product, selectedColor)}
              data-testid="button-select-from-detail"
              disabled={!selectedColor && Array.isArray(product.colors) && product.colors.length > 0}
            >
              <Check className="mr-2 h-5 w-5" />
              Select This Product
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const ProductDetailModal = memo(_ProductDetailModal);
