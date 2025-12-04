import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Users, Heart, Globe, Shield } from "lucide-react";

type Product = {
  id: string;
  name: string;
  price: string;
  images: string[];
  colors: string[];
  stock: number;
  packagesInclude: string[];
  specifications: Record<string, string>;
  sku: string;
  csrSupport: boolean;
  categoryIds: string[];
  categories?: Array<{ id: string; name: string }>;
};

function CSRProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow border-green-100">
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-64 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=CSR+Product";
            }}
          />
        ) : (
          <div className="w-full h-64 bg-gradient-to-r from-green-50 to-blue-50 flex items-center justify-center">
            <Package className="w-16 h-16 text-green-300" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <Badge className="bg-green-100 text-green-800 border-green-200">
            CSR Support
          </Badge>
        </div>
      </div>
      
      <CardHeader>
        <CardTitle className="text-xl">{product.name}</CardTitle>
        <p className="text-sm text-gray-500">{product.sku}</p>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Specifications</h4>
              <div className="space-y-1">
                {Object.entries(product.specifications).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="text-gray-900 font-medium">{value}</span>
                  </div>
                ))}
                {Object.keys(product.specifications).length > 3 && (
                  <div className="text-sm text-gray-500 text-center pt-1">
                    +{Object.keys(product.specifications).length - 3} more specifications
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Packages Include */}
          {product.packagesInclude && product.packagesInclude.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Packages Include</h4>
              <ul className="space-y-1">
                {product.packagesInclude.slice(0, 3).map((item, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
                {product.packagesInclude.length > 3 && (
                  <li className="text-sm text-gray-500 text-center pt-1">
                    +{product.packagesInclude.length - 3} more items
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {/* Categories */}
          {product.categories && product.categories.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Categories</h4>
              <div className="flex flex-wrap gap-2">
                {product.categories.map((category) => (
                  <Badge key={category.id} variant="outline" className="bg-blue-50">
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Colors */}
          {product.colors && product.colors.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Available Colors</h4>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color, index) => (
                  <div
                    key={index}
                    className="px-3 py-1 text-xs bg-gray-100 rounded-full"
                  >
                    {color}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* CSR Initiative Info */}
          <div className="pt-4 border-t border-green-100">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                Part of our CSR Initiative
              </span>
            </div>
            <p className="text-xs text-gray-600">
              This product supports our Corporate Social Responsibility programs focused on 
              environmental sustainability and community development.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CSRSupportPage() {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/csr-products"],
  });

  // Filter products with csrSupport flag set to true
  const csrProducts = products.filter(product => product.csrSupport === true);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <Heart className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6">CSR Support Initiative</h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Our commitment to Corporate Social Responsibility through sustainable products and community support
            </p>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="bg-white border-green-100">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{csrProducts.length}</div>
              <p className="text-gray-600">CSR Products</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-blue-100">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {new Set(csrProducts.flatMap(p => p.categories || [])).size}
              </div>
              <p className="text-gray-600">Categories Covered</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-purple-100">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">100%</div>
              <p className="text-gray-600">Sustainable Sourcing</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-amber-100">
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">100%</div>
              <p className="text-gray-600">Ethically Produced</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Our CSR Product Collection
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            These products are specially designated for our Corporate Social Responsibility initiatives. 
            They represent our commitment to sustainability, community support, and ethical practices.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Eco-Friendly Materials
            </Badge>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Community Support
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Sustainable Sourcing
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              Ethical Manufacturing
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading CSR products...</div>
          </div>
        ) : csrProducts.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                No CSR Products Available
              </h3>
              <p className="text-gray-600 mb-6">
                Currently there are no products designated for CSR support.
                Check back soon or contact us for more information.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {csrProducts.map((product) => (
              <CSRProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* CSR Info Section */}
        <Card className="mt-16 bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
          <CardContent className="p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  About Our CSR Initiative
                </h3>
                <p className="text-gray-700 mb-4">
                  Our Corporate Social Responsibility program focuses on creating positive social impact 
                  through carefully selected products. These items are chosen based on their environmental 
                  sustainability, ethical production standards, and community benefits.
                </p>
                <p className="text-gray-700 mb-4">
                  By designating specific products for CSR support, we ensure that every purchase contributes 
                  to our broader mission of social responsibility and sustainable development.
                </p>
                <p className="text-gray-700">
                  <strong>Note:</strong> CSR Support products are informational only and are not available 
                  for purchase through the regular employee portal. For inquiries about CSR products, 
                  please contact our CSR department.
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-green-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Environmental Impact</h4>
                    <p className="text-sm text-gray-600">Reduced carbon footprint and sustainable materials</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Community Support</h4>
                    <p className="text-sm text-gray-600">Products that benefit local communities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-purple-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Ethical Standards</h4>
                    <p className="text-sm text-gray-600">Fair labor practices and ethical sourcing</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-amber-600 font-bold">✓</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Transparent Reporting</h4>
                    <p className="text-sm text-gray-600">Regular CSR impact reports and audits</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
}