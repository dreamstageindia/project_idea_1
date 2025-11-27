// src/pages/dashboard.tsx
import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailModal } from "@/components/product/product-detail-modal";
import { ConfirmationModal } from "@/components/admin/orders/confirmation-modal";
import { OrderConfirmationModal } from "@/components/admin/orders/order-confirmation-modal";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, X, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { SiApple, SiSamsung, SiSony, SiNike, SiAdidas, SiPuma } from "react-icons/si";

// Import images
import heroImg from '@assets/generated_images/corporate_gifting_hero_image.png';
import backpackImg from '@assets/generated_images/professional_laptop_backpack_product.png';

type Branding = {
  id: string;
  logoUrl: string | null;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  bannerUrl: string | null;
  bannerText: string | null;
  updatedAt: string;
  inrPerPoint: string;
  maxSelectionsPerUser: number;
};

type Product = {
  id: string;
  name: string;
  price: string;
  images: string[];
  colors: string[];
  stock: number;
  packagesInclude?: string[];
  specifications?: Record<string, string>;
  sku?: string;
  isActive?: boolean;
  backupProductId?: string | null;
  isBackup?: boolean;
  originalProductId?: string | null;
  categoryIds?: string[];
  categories?: Category[];
  category?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
  } | null;
};

type Category = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
  createdAt?: string;
};

// Brands Showcase Component
function BrandsShowcase() {
  const brands = [
    { icon: SiApple, name: "Apple" },
    { icon: SiSamsung, name: "Samsung" },
    { icon: SiSony, name: "Sony" },
    { icon: SiNike, name: "Nike" },
    { icon: SiAdidas, name: "Adidas" },
    { icon: SiPuma, name: "Puma" },
  ];

  return (
    <div className="py-12 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold text-center mb-8" data-testid="text-brands-title">
          Brands we deal in
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {brands.map((brand) => (
            <div 
              key={brand.name} 
              className="flex items-center justify-center grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
              data-testid={`brand-${brand.name.toLowerCase()}`}
            >
              <brand.icon className="w-12 h-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Category Sidebar Component
function CategorySidebar({ 
  selectedCategory, 
  onSelectCategory,
  categories 
}: { 
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  categories: Category[];
}) {
  return (
    <div className="w-full lg:w-64 bg-white rounded-xl shadow-sm border p-6 sticky top-24">
      <h3 className="font-semibold text-lg mb-6 text-gray-900">Categories</h3>
      <div className="space-y-3">
        <button
          onClick={() => onSelectCategory("all")}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
            selectedCategory === "all"
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-700 hover:bg-gray-50 hover:text-blue-600 border border-gray-200"
          }`}
        >
          All Products
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
              selectedCategory === category.id
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-700 hover:bg-gray-50 hover:text-blue-600 border border-gray-200"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// Product of the Month Component
function ProductOfTheMonth() {
  return (
    <div className="w-full lg:w-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-24">
      <div className="text-center mb-4">
        <h3 className="font-bold text-xl text-gray-900 mb-2">Product of the Month</h3>
        <div className="w-16 h-1 bg-blue-600 mx-auto rounded-full"></div>
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <img 
          src={backpackImg} 
          alt="Product of the Month" 
          className="w-full h-48 object-contain mb-4 rounded-lg"
        />
        <h4 className="font-semibold text-gray-900 text-center mb-2">
          Professional Laptop Backpack
        </h4>
        <p className="text-gray-600 text-sm text-center mb-3">
          Premium quality with ergonomic design
        </p>
        <div className="flex justify-center items-center space-x-2">
          <span className="text-2xl font-bold text-blue-600">1200</span>
          <span className="text-gray-500 line-through text-sm">1500</span>
          <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-1 rounded-full">
            -20%
          </span>
        </div>
      </div>
      
      <Button 
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
      >
        View Details
      </Button>
    </div>
  );
}

// Hero Component
function Hero({ backgroundImage, companyName, employeeName }: { 
  backgroundImage?: string; 
  companyName: string;
  employeeName: string;
}) {
  const heroStyle = useMemo<React.CSSProperties>(() => {
    if (backgroundImage) {
      return {
        backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.3) 100%), url(${backgroundImage})`,
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
      className="relative h-96 rounded-2xl mx-4 mt-4 mb-8 overflow-hidden shadow-xl"
      style={heroStyle}
    >
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative z-10 h-full flex items-center justify-center text-center text-white">
        <div className="max-w-4xl px-6">
          <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">
            Welcome to {companyName}
          </h1>
          <p className="text-2xl font-semibold mb-6 drop-shadow-md">
          CORPORATE BRAND STORE
          </p>
          <p className="text-xl opacity-90 drop-shadow-md">
            Dear {employeeName}, choose from our exclusive collection of premium gifts
          </p>
        </div>
      </div>
    </div>
  );
}

export function SimplePrompt({
  open,
  onClose,
  children,
  primaryActionLabel = "OK",
  onPrimaryAction,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!open || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 1000 }}
    >
      <div
        className="absolute inset-0 bg-black/50"
        style={{ zIndex: 1000 }}
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border p-6"
        style={{ zIndex: 1001 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground z-10"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="space-y-4">
          <div className="text-base text-foreground">{children}</div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted z-10"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 z-10"
              onClick={onPrimaryAction ?? onClose}
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

export default function Dashboard() {
  const { employee, token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [orderData, setOrderData] = useState<any>(null);
  const [showCopayPrompt, setShowCopayPrompt] = useState(false);
  const [copayAmount, setCopayAmount] = useState(0);
  const [showLogoutInPrompt, setShowLogoutInPrompt] = useState(false);
  const [showPleaseSelectPrompt, setShowPleaseSelectPrompt] = useState(false);
  const [showRecordedPrompt, setShowRecordedPrompt] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const companyName = branding?.companyName || "TechCorp";
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const bannerUrl = branding?.bannerUrl || null;
  const bannerText = branding?.bannerText || "";
  const inrPerPoint = parseFloat(branding?.inrPerPoint || "1");
  const maxSelections = branding?.maxSelectionsPerUser ?? 1;

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: myOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders/my-orders"],
    retry: false,
  });

  const reachedLimit = maxSelections !== -1 && myOrders.length >= maxSelections;

  const displayProducts = useMemo(() => {
    const list = products as Product[];
    const originalsToHide = new Set(
      list.filter((p) => p.isBackup && p.originalProductId).map((p) => p.originalProductId as string)
    );
    
    const filteredList = list
      .filter((p) => {
        if (!p.stock || p.stock <= 0) return false;
        if (!p.isBackup && originalsToHide.has(p.id)) return false;
        
        // Filter by category
        if (selectedCategory !== "all") {
          const ids = p.categoryIds ?? [];
          if (ids.includes(selectedCategory)) return true;
          if (p.categories?.some((cat) => cat.id === selectedCategory)) return true;
          if (p.category?.id === selectedCategory) return true;
          return false;
        }
        return true;
      })
      .map((p) => ({
        ...p,
        pointsRequired: Math.ceil(parseFloat(p.price) / inrPerPoint),
      }));

    return filteredList;
  }, [products, inrPerPoint, selectedCategory]);

  const addToCartMutation = useMutation({
    mutationFn: async (data: { productId: string; selectedColor: string | null; quantity: number }) => {
      if (!employee?.id) {
        throw new Error("No employee ID found. Please log in again.");
      }
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: data.productId,
          selectedColor: data.selectedColor,
          quantity: data.quantity,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add to cart");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error adding to cart", description: error.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    const loadScript = () => {
      if (!document.getElementById("razorpay-script")) {
        const script = document.createElement("script");
        script.id = "razorpay-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
      }
    };
    loadScript();
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor((prev) => (prev === color ? prev : color));
  }, []);

  const handleViewProduct = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      handleColorChange(product?.colors?.[0] || "");
      setQuantity(1);
      setShowProductDetail(true);
    },
    [handleColorChange]
  );

  const handleAddToCart = useCallback(
    (product: Product, color: string | null, qty: number) => {
      if (!token) {
        toast({ title: "Error", description: "Not authenticated. Please log in.", variant: "destructive" });
        return;
      }
      if (!employee?.id) {
        toast({ title: "Error", description: "Employee ID not found. Please log in again.", variant: "destructive" });
        return;
      }
      if (qty < 1 || qty > product.stock) {
        toast({
          title: "Error",
          description: `Please select a quantity between 1 and ${product.stock}`,
          variant: "destructive",
        });
        return;
      }
      if (product.colors?.length > 0 && !color) {
        toast({
          title: "Error",
          description: "Please select a color",
          variant: "destructive",
        });
        return;
      }
      addToCartMutation.mutate({
        productId: product.id,
        selectedColor: color || null,
        quantity: qty,
      });
    },
    [addToCartMutation, token, employee]
  );

  const handleConfirmSelection = useCallback(
    (orderResult: any) => {
      const willReachLimit = maxSelections !== -1 && myOrders.length + 1 >= maxSelections;
      setOrderData(orderResult);
      setShowConfirmation(false);
      setShowOrderConfirmation(true);
      setShowLogoutInPrompt(willReachLimit);
      setShowRecordedPrompt(true);
    },
    [maxSelections, myOrders.length]
  );

  const handleDeclineSelection = useCallback(() => {
    setShowConfirmation(false);
    setShowProductDetail(false);
    setShowPleaseSelectPrompt(true);
  }, []);

  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const maxDisplay = maxSelections === -1 ? "∞" : maxSelections;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {reachedLimit ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="text-green-600 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Selections Complete</h2>
            <p className="text-muted-foreground mb-6">
              You have reached the selection limit ({myOrders.length}/{maxDisplay}).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myOrders.map((o: any, idx: number) => (
                <div key={idx} className="bg-card rounded-xl shadow-sm border p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={o.product?.images?.[0]}
                        alt={o.product?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="font-semibold">{o.product?.name}</h4>
                      {o.order?.selectedColor && (
                        <p className="text-muted-foreground">{o.order?.selectedColor}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                    <p>
                      Order ID: <span className="font-mono font-bold">{o.order?.orderId}</span>
                    </p>
                    <p>
                      Status: <span className="text-green-600 font-medium">Confirmed</span>
                    </p>
                    {o.order?.metadata?.usedPoints && (
                      <p>Used points: <span>{o.order.metadata.usedPoints}</span></p>
                    )}
                    {o.order?.metadata?.copayInr && (
                      <p>
                        Co-pay: <span className="font-bold">{o.order.metadata.copayInr} INR</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <Hero 
            backgroundImage={heroImg}
            companyName={companyName}
            employeeName={employee?.firstName || "User"}
          />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Categories Sidebar */}
              <CategorySidebar 
                selectedCategory={selectedCategory}
                onSelectCategory={handleCategoryChange}
                categories={categories}
              />
              
              {/* Products Grid */}
              <main className="flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-8">
                  {displayProducts.length > 0 ? (
                    displayProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onView={handleViewProduct}
                        onAddToCart={handleAddToCart}
                      />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                        No products found
                      </h3>
                      <p className="text-muted-foreground">
                        {selectedCategory === "all" 
                          ? "No products available at the moment." 
                          : "No products found in this category."}
                      </p>
                    </div>
                  )}
                </div>
                
                {displayProducts.length > 0 && (
                  <div className="flex justify-center">
                    <Button 
                      size="lg" 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl"
                      data-testid="button-view-more"
                    >
                      VIEW MORE
                    </Button>
                  </div>
                )}
              </main>
              
              
            </div>
          </div>

          {/* Brands Showcase Section */}
          <BrandsShowcase />
        </>
      )}
      
      <Footer />

      {showProductDetail && selectedProduct && (
        <ProductDetailModal
          isOpen
          onClose={() => setShowProductDetail(false)}
          product={selectedProduct}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
        />
      )}

      {showConfirmation && selectedProduct && (
        <ConfirmationModal
          isOpen
          onClose={handleDeclineSelection}
          product={selectedProduct}
          selectedColor={selectedColor}
          onConfirm={handleConfirmSelection}
        />
      )}

      {showOrderConfirmation && orderData && (
        <OrderConfirmationModal
          isOpen
          onClose={() => setShowOrderConfirmation(false)}
          orderData={orderData}
        />
      )}

      <SimplePrompt
        open={showPleaseSelectPrompt}
        onClose={() => setShowPleaseSelectPrompt(false)}
        primaryActionLabel="OK"
      >
        <span className="font-medium">Please select your preference!!</span>
      </SimplePrompt>

      <SimplePrompt
        open={showRecordedPrompt}
        onClose={() => setShowRecordedPrompt(false)}
        primaryActionLabel="Got it"
      >
        {orderData ? (
          <>
            Your gift selection of the <span className="font-semibold">{orderData?.product?.name}</span>{" "}
            has been recorded, <span className="font-semibold">{employee?.firstName ?? "User"}</span>.
            Your reference number is{" "}
            <span className="font-mono font-semibold">{orderData?.order?.orderId}</span>.{" "}
            {showLogoutInPrompt ? "Please proceed to logout. " : ""}Thank you!
          </>
        ) : (
          <>Your selection has been recorded. Thank you!</>
        )}
      </SimplePrompt>

      <SimplePrompt
        open={showCopayPrompt}
        onClose={() => setShowCopayPrompt(false)}
        primaryActionLabel="Pay Now"
        onPrimaryAction={() => {}}
      >
        <span className="font-medium">
          Pay using co-pay with {employee?.points ?? 0} points + {copayAmount} INR where 1 INR ={" "}
          {1 / inrPerPoint} Points in conversion.
        </span>
      </SimplePrompt>
    </div>
  );
}

