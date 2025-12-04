// src/pages/occasional-campaigns.tsx
import { useState, useCallback, useMemo, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, Calendar, Users, Gift, Package, ShoppingCart, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

type Campaign = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Product = {
  id: string;
  name: string;
  price: string;
  images: string[];
  colors: string[];
  stock: number;
  sku: string;
  categoryIds: string[];
  categories?: Array<{ id: string; name: string }>;
  isActive: boolean;
};

type Branding = {
  id: string;
  logoUrl: string | null;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  bannerUrl: string | null;
  bannerText: string | null;
  updatedAt: string;
};

// Campaign Card Component
function CampaignCard({ 
  campaign, 
  onSelect,
  isSelected 
}: { 
  campaign: Campaign;
  onSelect: (campaign: Campaign) => void;
  isSelected: boolean;
}) {
  const isActiveCampaign = useMemo(() => {
    if (!campaign.isActive) return false;
    const now = new Date();
    const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
    const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
    
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
  }, [campaign]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div 
      className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-300 cursor-pointer hover:shadow-lg ${
        isSelected 
          ? 'border-blue-600 ring-4 ring-blue-100' 
          : 'border-gray-200 hover:border-blue-300'
      } ${!isActiveCampaign ? 'opacity-70' : ''}`}
      onClick={() => isActiveCampaign && onSelect(campaign)}
    >
      <div className="relative">
        {campaign.imageUrl ? (
          <img
            src={campaign.imageUrl}
            alt={campaign.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=No+Image";
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center">
            <Gift className="w-16 h-16 text-blue-300" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isActiveCampaign 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isActiveCampaign ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{campaign.name}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{campaign.description || "No description provided"}</p>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>Start: {formatDate(campaign.startDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>End: {formatDate(campaign.endDate)}</span>
          </div>
        </div>
        
        <Button
          className={`w-full mt-4 ${
            isSelected 
              ? 'bg-blue-600 hover:bg-blue-700' 
              : isActiveCampaign 
                ? 'bg-gray-100 text-gray-900 hover:bg-gray-200' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          size="lg"
          disabled={!isActiveCampaign}
        >
          {isSelected ? 'Viewing Products' : 'View Products'}
        </Button>
      </div>
    </div>
  );
}

// Product Card Component
function ProductCard({ 
  product, 
  onSelect,
  isSelected,
  onAddToCart,
  isAddingToCart 
}: { 
  product: Product;
  onSelect: (product: Product) => void;
  isSelected: boolean;
  onAddToCart: (product: Product) => void;
  isAddingToCart: boolean;
}) {
  return (
    <div 
      className={`bg-white rounded-xl border-2 overflow-hidden transition-all duration-300 ${
        isSelected 
          ? 'border-green-500 ring-2 ring-green-100' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="relative">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=No+Image";
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gradient-to-r from-gray-100 to-gray-200 flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <div className="absolute top-4 right-4">
          <Badge variant={product.stock > 0 ? "default" : "destructive"}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </Badge>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">{product.name}</h4>
            <p className="text-sm text-gray-500 mb-2">{product.sku}</p>
          </div>
          <div className="text-lg font-bold text-blue-600">
            ₹{parseFloat(product.price).toFixed(2)}
          </div>
        </div>
        
        {product.categories && product.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {product.categories.slice(0, 2).map((category) => (
              <Badge key={category.id} variant="outline" className="text-xs">
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
        
        {product.colors && product.colors.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 mb-1">Available Colors:</p>
            <div className="flex flex-wrap gap-1">
              {product.colors.slice(0, 3).map((color, idx) => (
                <span 
                  key={idx}
                  className="px-2 py-1 text-xs bg-gray-100 rounded"
                >
                  {color}
                </span>
              ))}
              {product.colors.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                  +{product.colors.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="flex gap-2 mt-4">
          <Button
            variant={isSelected ? "default" : "outline"}
            className="flex-1"
            onClick={() => onSelect(product)}
            disabled={product.stock === 0}
          >
            {isSelected ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Selected
              </>
            ) : (
              'Select Product'
            )}
          </Button>
          <Button
            variant="default"
            className="flex-1"
            onClick={() => onAddToCart(product)}
            disabled={product.stock === 0 || isAddingToCart}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {isAddingToCart ? 'Adding...' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Campaign Hero Component
function CampaignHero({ 
  backgroundImage, 
  companyName 
}: { 
  backgroundImage?: string; 
  companyName: string;
}) {
  const heroStyle = useMemo<React.CSSProperties>(() => {
    if (backgroundImage) {
      return {
        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 100%), url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      };
    }
    return {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    };
  }, [backgroundImage]);

  return (
    <div 
      className="relative h-64 rounded-2xl mx-4 mt-4 mb-8 overflow-hidden shadow-xl"
      style={heroStyle}
    >
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 h-full flex items-center justify-center text-center text-white">
        <div className="max-w-4xl px-6">
          <div className="flex justify-center mb-4">
            <Gift className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Special Campaigns
          </h1>
          <p className="text-2xl font-semibold mb-6 drop-shadow-md">
            {companyName} Exclusive Campaigns
          </p>
          <p className="text-xl opacity-90 drop-shadow-md">
            Select a campaign and choose your favorite product
          </p>
        </div>
      </div>
    </div>
  );
}

// Products Modal Component
function ProductsModal({
  campaign,
  isOpen,
  onClose,
  selectedProduct,
  onSelectProduct,
  onAddToCart,
  isAddingToCart
}: {
  campaign: Campaign;
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  isAddingToCart: boolean;
}) {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [`/api/campaigns/${campaign.id}/products`],
    enabled: isOpen,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{campaign.name}</h2>
            <p className="text-gray-600">{campaign.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading products...</div>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No products available in this campaign</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Available Products ({products.length})
                </h3>
                <p className="text-gray-600">
                  Select one product from this campaign to order
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                    isSelected={selectedProduct?.id === product.id}
                    onAddToCart={onAddToCart}
                    isAddingToCart={isAddingToCart}
                  />
                ))}
              </div>
              
              {selectedProduct && (
                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-800">Product Selected</span>
                      </div>
                      <p className="text-green-700">
                        You've selected <span className="font-bold">{selectedProduct.name}</span> 
                        for ₹{parseFloat(selectedProduct.price).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => onAddToCart(selectedProduct)}
                      disabled={isAddingToCart}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {isAddingToCart ? 'Processing...' : 'Order Now'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OccasionalCampaigns() {
  const { employee } = useAuth();
  const { toast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductsModal, setShowProductsModal] = useState(false);

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
  });

  // Sort campaigns by date (newest first)
  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [campaigns]);

  // Filter active campaigns
  const activeCampaigns = useMemo(() => {
    return sortedCampaigns.filter(campaign => {
      if (!campaign.isActive) return false;
      const now = new Date();
      const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
      const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
      
      if (startDate && now < startDate) return false;
      if (endDate && now > endDate) return false;
      return true;
    });
  }, [sortedCampaigns]);

  const addToCartMutation = useMutation({
    mutationFn: async (product: Product) => {
      if (!employee) throw new Error("You must be logged in to add items to cart");
      
      const res = await apiRequest("POST", "/api/cart", {
        productId: product.id,
        quantity: 1,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Product added to cart. You can now proceed to checkout.",
      });
      setSelectedProduct(null);
      setSelectedCampaign(null);
      setShowProductsModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product to cart",
        variant: "destructive",
      });
    },
  });

  const handleCampaignSelect = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setSelectedProduct(null);
    setShowProductsModal(true);
  }, []);

  const handleProductSelect = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    if (!employee) {
      toast({
        title: "Login Required",
        description: "Please log in to add products to cart",
        variant: "destructive",
      });
      return;
    }
    
    if (product.stock === 0) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock",
        variant: "destructive",
      });
      return;
    }
    
    addToCartMutation.mutate(product);
  }, [employee, addToCartMutation, toast]);

  const companyName = branding?.companyName || "Your Company";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <CampaignHero 
        companyName={companyName}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Campaigns
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover our exclusive campaigns. Select any campaign to view available products and place your order.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Note: You can select only one product per campaign
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading campaigns...</div>
          </div>
        ) : activeCampaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-gray-200">
            <Gift className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">No active campaigns available at the moment</p>
            <p className="text-gray-400 mt-2">Check back soon for new campaigns!</p>
          </div>
        ) : (
          <>
            {/* Campaigns Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {activeCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onSelect={handleCampaignSelect}
                  isSelected={selectedCampaign?.id === campaign.id}
                />
              ))}
            </div>

            {/* Selected Campaign Info */}
            {selectedCampaign && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Selected Campaign: {selectedCampaign.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{selectedCampaign.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>From: {new Date(selectedCampaign.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>To: {new Date(selectedCampaign.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Order Instructions */}
        <Card className="mt-12">
          <CardHeader>
            <CardTitle>How to Order from Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-xl">1</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Select a Campaign</h4>
                <p className="text-gray-600">Browse active campaigns and click on any campaign to view products</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-xl">2</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Choose a Product</h4>
                <p className="text-gray-600">Select one product from the campaign that you want to order</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold text-xl">3</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Add to Cart & Checkout</h4>
                <p className="text-gray-600">Add the product to your cart and proceed to checkout</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Modal */}
      {selectedCampaign && (
        <ProductsModal
          campaign={selectedCampaign}
          isOpen={showProductsModal}
          onClose={() => {
            setShowProductsModal(false);
            setSelectedProduct(null);
          }}
          selectedProduct={selectedProduct}
          onSelectProduct={handleProductSelect}
          onAddToCart={handleAddToCart}
          isAddingToCart={addToCartMutation.isPending}
        />
      )}
      
      <Footer />
    </div>
  );
}