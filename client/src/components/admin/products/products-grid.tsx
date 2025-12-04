import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Product } from "./types";
import type { Category } from "@/components/admin/categories/types";

export function ProductsGrid() {
  const { data: categories = [] } = useQuery<Category[]>({ 
    queryKey: ["/api/categories"] 
  });

  const { data: products = [] } = useQuery<Product[]>({ 
    queryKey: ["/api/products"] 
  });

  // Group products by category
  const productsByCategory = categories.map(category => ({
    ...category,
    products: products.filter(product => (product.categoryIds ?? []).includes(category.id))
  }));

  const uncategorizedProducts = products.filter(product => (product.categoryIds?.length ?? 0) === 0);

  return (
    <div className="space-y-8">
      {/* Categorized Products */}
      {productsByCategory.map(category => (
        <div key={category.id} className="space-y-4">
          <div className="flex items-center space-x-4">
            {category.imageUrl && (
              <img
                src={category.imageUrl}
                alt={category.name}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <div>
              <h2 className="text-2xl font-bold">{category.name}</h2>
              {category.description && (
                <p className="text-muted-foreground">{category.description}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ))}

      {/* Uncategorized Products */}
      {uncategorizedProducts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Other Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {uncategorizedProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-square overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-2">{product.name}</h3>
        <p className="text-2xl font-bold text-primary mb-2">₹{product.price}</p>
        <div className="flex items-center justify-between">
          <Badge variant={product.stock > 0 ? "default" : "destructive"}>
            {product.stock > 0 ? `In Stock (${product.stock})` : "Out of Stock"}
          </Badge>
          <Button disabled={product.stock === 0}>
            Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}