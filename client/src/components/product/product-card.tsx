// src/components/product/product-card.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProductCarousel } from "./product-carousel";
import { Eye, ShoppingCart, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ProductCardProps {
  product: any;
  onView: (product: any) => void;
  onAddToCart: (product: any, color: string, quantity: number) => void;
}

export function ProductCard({ product, onView, onAddToCart }: ProductCardProps) {
  const [selectedColor, setSelectedColor] = useState(product.colors?.[0] || "");

  const { data: branding } = useQuery({
    queryKey: ["/api/admin/branding"],
  });

  const inrPerPoint = parseFloat(branding?.inrPerPoint || "1");
  const pointsRequired = Math.ceil(parseFloat(product.price) / inrPerPoint);

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

  const isOutOfStock = product.stock === 0;

  return (
    <Card
      className={`product-card shadow-md overflow-hidden border border-border ${
        product.isBackup ? "border-dashed opacity-75" : ""
      }`}
      data-testid={`card-product-${product.id}`}
    >
      <div className="h-64 bg-gray-100 relative">
        <ProductCarousel images={product.images || []} alt={product.name} />
        {product.isBackup && <div className="absolute top-2 left-2"></div>}
      </div>

      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-semibold" data-testid={`text-product-name-${product.id}`}>
            {product.name}
          </h3>
        </div>

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

        <p className="text-2xl font-bold text-primary mb-4" data-testid={`text-points-required-${product.id}`}>
          {pointsRequired} points
        </p>

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
              onClick={() => onAddToCart(product, selectedColor, 1)}
              data-testid={`button-add-to-cart-${product.id}`}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Add to Cart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}