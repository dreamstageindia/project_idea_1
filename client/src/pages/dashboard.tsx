// src/pages/dashboard.tsx
import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailModal } from "@/components/product/product-detail-modal";
import { ConfirmationModal } from "@/components/order/confirmation-modal";
import { OrderConfirmationModal } from "@/components/order/order-confirmation-modal";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, X, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
};

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

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const companyName = branding?.companyName || "TechCorp";
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const bannerUrl = branding?.bannerUrl || null;
  const bannerText = branding?.bannerText || "";
  const inrPerPoint = parseFloat(branding?.inrPerPoint || "1");
  const maxSelections = branding?.maxSelectionsPerUser ?? 1;

  const heroStyle = useMemo<React.CSSProperties>(() => {
    if (bannerUrl) {
      return {
        backgroundImage: `linear-gradient( to right, rgba(0,0,0,0.45), rgba(0,0,0,0.25) ), url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {
      backgroundImage: `linear-gradient(90deg, ${primary}, ${accent})`,
    };
  }, [bannerUrl, primary, accent]);

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
    return list
      .filter((p) => {
        if (!p.stock || p.stock <= 0) return false;
        if (!p.isBackup && originalsToHide.has(p.id)) return false;
        return true;
      })
      .map((p) => ({
        ...p,
        pointsRequired: Math.ceil(parseFloat(p.price) / inrPerPoint),
      }));
  }, [products, inrPerPoint]);

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

  const maxDisplay = maxSelections === -1 ? "∞" : maxSelections;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {reachedLimit ? (
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
        ) : (
          <>
            <div className="rounded-xl p-8 mb-8 text-white" style={heroStyle}>
              <div className="max-w-full bg-black/60 p-3 rounded">
                <h2 className="text-3xl font-bold mb-2">{companyName}</h2>
                <h3 className="text-xl font-semibold mb-4">
                  Dear {employee?.firstName ? employee.firstName : "User"}
                </h3>
                <p className="text-lg opacity-90 mb-6">
                  Your Text Goes Here
                </p>
                {bannerUrl && bannerText ? <p className="text-sm opacity-90 mb-6">{bannerText}</p> : null}
              </div>
            </div>

            

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {displayProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={handleViewProduct}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          </>
        )}
      </main>
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