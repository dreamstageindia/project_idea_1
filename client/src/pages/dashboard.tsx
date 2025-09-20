// src/pages/dashboard.tsx
import { useState, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductCard } from "@/components/product/product-card";
import { ProductDetailModal } from "@/components/product/product-detail-modal";
import { ConfirmationModal } from "@/components/order/confirmation-modal";
import { OrderConfirmationModal } from "@/components/order/order-confirmation-modal";
import { useAuth } from "@/hooks/use-auth";
import { CheckCircle, X } from "lucide-react";

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
  // injected by API when a backup replaces an original
  isBackup?: boolean;
  originalProductId?: string | null;
};

// Portal-based lightweight modal for simple prompts
function SimplePrompt({
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
      style={{ zIndex: 10000 }} // higher than shadcn/radix defaults
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{ zIndex: 10000 }}
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border p-6"
        style={{ zIndex: 10001 }}
        role="dialog"
        aria-modal="true"
      >
        <button
          aria-label="Close"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
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
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
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
  const { employee } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [selectedColor, setSelectedColor] = useState("");
  const [orderData, setOrderData] = useState<any>(null);

  // prompts per your spec
  const [showPleaseSelectPrompt, setShowPleaseSelectPrompt] = useState(false);
  const [showRecordedPrompt, setShowRecordedPrompt] = useState(false);

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
    return {
      backgroundImage: `linear-gradient(90deg, ${primary}, ${accent})`,
    };
  }, [bannerUrl, primary, accent]);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: myOrder } = useQuery({
    queryKey: ["/api/orders/my-order"],
    retry: false,
  });

  // Build list to show: hide out-of-stock & hide originals if their backup is present
  const displayProducts = useMemo(() => {
    const list = products as Product[];
    const originalsToHide = new Set(
      list.filter((p) => p.isBackup && p.originalProductId).map((p) => p.originalProductId as string)
    );
    return list.filter((p) => {
      if (!p.stock || p.stock <= 0) return false;
      if (!p.isBackup && originalsToHide.has(p.id)) return false;
      return true;
    });
  }, [products]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor((prev) => (prev === color ? prev : color));
  }, []);

  const handleViewProduct = useCallback(
    (product: Product) => {
      setSelectedProduct(product);
      handleColorChange(product?.colors?.[0] || "");
      setShowProductDetail(true);
    },
    [handleColorChange]
  );

  const handleSelectProduct = useCallback(
    (product: Product, color?: string) => {
      setSelectedProduct(product);
      handleColorChange(color || product?.colors?.[0] || "");
      setShowConfirmation(true);
    },
    [handleColorChange]
  );

  // confirm: product selection recorded (API done inside ConfirmationModal)
  const handleConfirmSelection = useCallback((orderResult: any) => {
    setOrderData(orderResult);
    setShowConfirmation(false);
    setShowOrderConfirmation(true); // keep existing modal if desired
    setShowRecordedPrompt(true);    // final message as requested
  }, []);

  // when user closes/cancels the confirmation modal
  const handleDeclineSelection = useCallback(() => {
    setShowConfirmation(false);
    setShowPleaseSelectPrompt(true);
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
            <h2 className="text-2xl font-bold text-green-600 mb-2">Order Placed</h2>
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
        <div className="rounded-xl p-8 mb-8 text-white" style={heroStyle}>
          <div className="max-w-full bg-black/60 p-3 rounded">
            <h2 className="text-3xl font-bold mb-2">{companyName}</h2>
            {/* personalize greeting */}
            <h3 className="text-xl font-semibold mb-4">
              Dear {employee?.firstName ? employee.firstName : "User"}
            </h3>
            <p className="text-lg opacity-90 mb-6">
              This festive season, Quess is delighted to extend its warmest wishes to you and your loved ones. As a token of our appreciation, we invite you to select a special gift.
              Please browse the options below and choose the one that best suits your needs, whether for yourself or your family.
              <br />
              <strong>Note:</strong> You are eligible to make one selection only. Once your selection is submitted, it cannot be reversed or changed.
              <br />
              We hope you enjoy your gift!
            </p>
            {bannerUrl && bannerText ? <p className="text-sm opacity-90 mb-6">{bannerText}</p> : null}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onView={handleViewProduct}
              onSelect={handleSelectProduct}
            />
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
          // when user cancels/closes, show the prompt and go back
          onClose={handleDeclineSelection}
          product={selectedProduct}
          selectedColor={selectedColor}
          // when user confirms, we record and show final prompt
          onConfirm={handleConfirmSelection}
          // If your ConfirmationModal supports a custom message prop, you could pass:
          // message={`You've selected the ${selectedProduct.name}. Would you like to confirm your choice?`}
        />
      )}

      {/* Keep your existing success modal if desired */}
      {showOrderConfirmation && orderData && (
        <OrderConfirmationModal
          isOpen
          onClose={() => setShowOrderConfirmation(false)}
          orderData={orderData}
        />
      )}

      {/* Cancel flow: “Please select your preference!!” */}
      <SimplePrompt
        open={showPleaseSelectPrompt}
        onClose={() => setShowPleaseSelectPrompt(false)}
        primaryActionLabel="OK"
      >
        <span className="font-medium">Please select your preference!!</span>
      </SimplePrompt>

      {/* Confirmed flow: final message with product name, first name, and reference */}
      <SimplePrompt
        open={showRecordedPrompt}
        onClose={() => setShowRecordedPrompt(false)}
        primaryActionLabel="Got it"
      >
        {orderData ? (
          <>
            Your gift selection of the{" "}
            <span className="font-semibold">{orderData?.product?.name}</span> has been recorded,{" "}
            <span className="font-semibold">{employee?.firstName ?? "User"}</span>. Your reference
            number is{" "}
            <span className="font-mono font-semibold">
              {orderData?.order?.orderId}
            </span>
            . Please proceed to logout. Thank you!
          </>
        ) : (
          <>Your selection has been recorded. Please proceed to logout. Thank you!</>
        )}
      </SimplePrompt>
    </div>
  );
}
