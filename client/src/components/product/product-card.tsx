import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCarousel } from "./product-carousel";
import { CheckCircle, CircleAlert, Eye, Check, X } from "lucide-react";

interface ProductCardProps {
  product: any;
  onView: (product: any) => void;
  onSelect: (product: any, color?: string) => void;
}

export function ProductCard({ product, onView, onSelect }: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");

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

  const isOutOfStock = product.stock === 0;

  return (
    <Card 
      className={`product-card shadow-md overflow-hidden border border-border ${
        product.isBackup ? "border-dashed opacity-75" : ""
      }`}
      data-testid={`card-product-${product.id}`}
    >
      {/* Image Carousel */}
      <div className="h-64 bg-gray-100 relative">
        <ProductCarousel images={product.images || []} alt={product.name} />
        {product.isBackup && (
          <div className="absolute top-2 left-2">
            
          </div>
        )}
      </div>

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-semibold" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
        </div>
        
        
        
        {/* Color Options */}
        {product.colors && product.colors.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Available Colors:</p>
            <div className="flex space-x-2">
              {product.colors.map((color: string) => (
                <div
                  key={color}
                  className={`color-option ${getColorStyle(color)} ${
                    selectedColor === color ? "selected" : ""
                  }`}
                  style={getColorInlineStyle(color)}
                  onClick={() => setSelectedColor(color)}
                  data-testid={`color-option-${color}-${product.id}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stock Status */}
        <div className="flex items-center justify-between mb-4">
          {isOutOfStock ? (
            <span className="text-sm text-red-600 font-medium flex items-center">
              <CircleAlert className="mr-1 h-4 w-4" />
              Out of stock
            </span>
          ) : (
            <span className="text-sm text-green-600 font-medium flex items-center">
              <CheckCircle className="mr-1 h-4 w-4" />
              <span data-testid={`text-stock-${product.id}`}>{product.stock}</span> in stock
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            SKU: <span data-testid={`text-sku-${product.id}`}>{product.sku}</span>
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => onView(product)}
            data-testid={`button-view-${product.id}`}
          >
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          
          {isOutOfStock ? (
            <Button
              variant="secondary"
              className="flex-1"
              disabled
              data-testid={`button-unavailable-${product.id}`}
            >
              <X className="mr-2 h-4 w-4" />
              Unavailable
            </Button>
          ) : (
            <Button
              variant="default"
              className="flex-1"
              onClick={() => onSelect(product, selectedColor)}
              data-testid={`button-select-${product.id}`}
            >
              <Check className="mr-2 h-4 w-4" />
              Select
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
