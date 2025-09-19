// src/pages/dashboard.tsx
import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailModal } from "@/components/product/product-detail-modal";
import { ConfirmationModal } from "@/components/order/confirmation-modal";
import { OrderConfirmationModal } from "@/components/order/order-confirmation-modal";
import { useAuth } from "@/hooks/use-auth";
import { Award, CheckCircle, Truck } from "lucide-react";

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

export default function Dashboard() {
  const { employee } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [orderData, setOrderData] = useState<any>(null);

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const companyName = branding?.companyName || "TechCorp";
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const bannerUrl = branding?.bannerUrl || null;
  const bannerText = branding?.bannerText || "";

  const heroStyle = useMemo<React.CSSProperties>(() => {
    if (bannerUrl) {
      return {
        backgroundImage: `linear-gradient( to right, rgba(0,0,0,0.45), rgba(0,0,0,0.25) ), url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    // fallback to gradient when no banner is set
    return {
      backgroundImage: `linear-gradient(90deg, ${primary}, ${accent})`,
    };
  }, [bannerUrl, primary, accent]);

  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  const { data: myOrder } = useQuery({
    queryKey: ["/api/orders/my-order"],
    retry: false,
  });

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor((prev) => (prev === color ? prev : color));
  }, []);

  const handleViewProduct = useCallback(
    (product: any) => {
      setSelectedProduct(product);
      handleColorChange(product?.colors?.[0] || "");
      setShowProductDetail(true);
    },
    [handleColorChange]
  );

  const handleSelectProduct = useCallback(
    (product: any, color?: string) => {
      setSelectedProduct(product);
      handleColorChange(color || product?.colors?.[0] || "");
      setShowConfirmation(true);
    },
    [handleColorChange]
  );

  const handleConfirmSelection = useCallback((orderResult: any) => {
    setOrderData(orderResult);
    setShowConfirmation(false);
    setShowOrderConfirmation(true);
  }, []);

  if (myOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="text-green-600 text-3xl" />
            </div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Product Already Selected</h2>
            <p className="text-muted-foreground mb-6">You have already selected your product for this session.</p>

            <div className="bg-card rounded-xl shadow-sm border p-6 max-w-lg mx-auto">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={myOrder.product?.images?.[0]}
                    alt={myOrder.product?.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold" data-testid="text-selected-product-name">
                    {myOrder.product?.name}
                  </h4>
                  <p className="text-muted-foreground">Color: {myOrder.order?.selectedColor}</p>
                  <p className="text-primary font-bold">${myOrder.product?.price}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                <p>
                  Order ID:{" "}
                  <span className="font-mono font-bold" data-testid="text-order-id">
                    {myOrder.order?.orderId}
                  </span>
                </p>
                <p>
                  Status: <span className="text-green-600 font-medium">Confirmed</span>
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero with banner background or gradient */}
        <div
          className="rounded-xl p-8 mb-8 text-white"
          style={heroStyle}
        >
          <div className="max-w-2xl bg-black/60 p-3 rounded">
            <h2 className="text-3xl font-bold mb-2">{companyName}</h2>
            <h3 className="text-xl font-semibold mb-4">Select Your Product</h3>
            <p className="text-lg opacity-90 mb-6">
              Choose from our premium collection of corporate products. Each employee can select one product per session.
            </p>
            {bannerUrl && bannerText ? (
              <p className="text-sm opacity-90 mb-6">{bannerText}</p>
            ) : null}
            
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} onView={handleViewProduct} onSelect={handleSelectProduct} />
          ))}
        </div>
      </main>

      <Footer />

      {/* Modals */}
      {showProductDetail && selectedProduct && (
        <ProductDetailModal
          isOpen
          onClose={() => setShowProductDetail(false)}
          product={selectedProduct}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          onSelect={handleSelectProduct}
        />
      )}

      {showConfirmation && selectedProduct && (
        <ConfirmationModal
          isOpen
          onClose={() => setShowConfirmation(false)}
          product={selectedProduct}
          selectedColor={selectedColor}
          onConfirm={handleConfirmSelection}
        />
      )}

      {showOrderConfirmation && orderData && (
        <OrderConfirmationModal isOpen onClose={() => setShowOrderConfirmation(false)} orderData={orderData} />
      )}
    </div>
  );
}
