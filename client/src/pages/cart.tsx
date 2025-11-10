// src/pages/cart.tsx
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { SimplePrompt } from "./dashboard";
import { useLocation } from "wouter";

function getQueryParam(name: string): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

export default function Cart() {
  const { employee, token, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCopayPrompt, setShowCopayPrompt] = useState(false);
  const [, setLocation] = useLocation();

  const { data: cartItems = [] } = useQuery({
    queryKey: ["/api/cart"],
  });

  const { data: branding } = useQuery({
    queryKey: ["/api/admin/branding"],
  });

  const inrPerPoint = parseFloat(branding?.inrPerPoint || "1");
  const maxSelections = branding?.maxSelectionsPerUser ?? 1;

  const { data: myOrders = [] } = useQuery({
    queryKey: ["/api/orders/my-orders"],
    retry: false,
    enabled: !!token, // avoid anonymous fetch
  });

  const totalPointsRequired = useMemo(() => {
    return cartItems.reduce((sum: number, item: any) => {
      const itemPoints = Math.ceil(parseFloat(item.product.price) / inrPerPoint);
      return sum + itemPoints * item.quantity;
    }, 0);
  }, [cartItems, inrPerPoint]);

  const userPoints = employee?.points ?? 0;
  const needsCopay = totalPointsRequired > userPoints;
  const copayInr = needsCopay ? Math.ceil((totalPointsRequired - userPoints) * inrPerPoint) : 0;

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const response = await fetch(`/api/cart/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error("Failed to update quantity");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cart/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to remove item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error((await response.json()).message || "Checkout failed");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Checkout successful" });
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my-orders"] });
      setLocation("/my-orders");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // PhonePe: create payment session and redirect to hosted PayPage
  const handleCopayPayment = async () => {
    try {
      const response = await fetch("/api/orders/create-copay-order", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast({ title: "Error", description: err.message || "Failed to start payment", variant: "destructive" });
        return;
      }
      const data = await response.json();

      // Expect shape: { provider: "phonepe", merchantOrderId, amount, phonepe: { ... } }
      const merchantOrderId = data?.merchantOrderId;
      const redirectUrlFromPhonePe =
        data?.phonepe?.redirectInfo?.url ||
        data?.phonepe?.instrumentResponse?.redirectInfo?.url ||
        data?.phonepe?.redirectUrl;

      if (!redirectUrlFromPhonePe) {
        toast({
          title: "Error",
          description: "Payment page URL not received from PhonePe",
          variant: "destructive",
        });
        return;
      }

      // Keep a note in sessionStorage so our return handler knows what to verify (belt & suspenders).
      if (merchantOrderId) {
        sessionStorage.setItem("PP_MERCHANT_ORDER_ID", merchantOrderId);
      }

      // Redirect to PhonePe PayPage
      window.location.href = redirectUrlFromPhonePe;
    } catch (e) {
      toast({ title: "Error", description: "Failed to initiate payment", variant: "destructive" });
    }
  };

  // When PhonePe returns user to the redirect URL (we recommend setting it to this Cart page),
  // it will include ?merchantOrderId=... . We auto-verify and send the user to /my-orders.
  useEffect(() => {
    const incoming = getQueryParam("merchantOrderId");
    const stored = sessionStorage.getItem("PP_MERCHANT_ORDER_ID");
    const merchantOrderId = incoming || stored;

    async function verifyAndFinish(id: string) {
      try {
        const verifyResponse = await fetch("/api/orders/verify-copay", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ merchantOrderId: id }),
        });
        if (!verifyResponse.ok) {
          const err = await verifyResponse.json().catch(() => ({}));
          toast({
            title: "Payment not completed",
            description: err.message || "Please try again if amount was not deducted.",
            variant: "destructive",
          });
          return;
        }

        // Clean up query param so refreshes don't repeat verify
        if (typeof window !== "undefined" && incoming) {
          const url = new URL(window.location.href);
          url.searchParams.delete("merchantOrderId");
          window.history.replaceState({}, "", url.toString());
        }
        sessionStorage.removeItem("PP_MERCHANT_ORDER_ID");

        // Refresh state and go to orders
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/cart"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/orders/my-orders"] }),
        ]);

        setShowCopayPrompt(false);
        setLocation("/my-orders");
      } catch {
        toast({
          title: "Verification failed",
          description: "We couldn’t verify the payment. If amount was deducted, contact support.",
          variant: "destructive",
        });
      }
    }

    if (isAuthenticated && merchantOrderId) {
      verifyAndFinish(merchantOrderId);
    }
  }, [isAuthenticated, queryClient, token, setLocation, toast]);

  const handleCheckout = () => {
    if (needsCopay) {
      setShowCopayPrompt(true);
    } else {
      checkoutMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground">Add some products to get started</p>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              {cartItems.map((item: any) => (
                <div key={item.id} className="flex items-center space-x-4 bg-card p-4 rounded-lg shadow-sm">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {item.selectedColor && `Color: ${item.selectedColor}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {Math.ceil(parseFloat(item.product.price) / inrPerPoint)} points each
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })
                      }
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      className="w-16 text-center"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantityMutation.mutate({
                          id: item.id,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      min={1}
                      max={item.product.stock}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })
                      }
                      disabled={item.quantity >= item.product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemMutation.mutate(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <div className="flex justify-between mb-4">
                <span className="font-semibold">Total Points Required:</span>
                <span>{totalPointsRequired}</span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="font-semibold">Your Points:</span>
                <span>{userPoints}</span>
              </div>
              {needsCopay && (
                <div className="flex justify-between mb-4 text-primary">
                  <span className="font-semibold">Co-pay Needed:</span>
                  <span>{copayInr} INR</span>
                </div>
              )}
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={
                  cartItems.length === 0 ||
                  (maxSelections !== -1 && myOrders.length + cartItems.length > maxSelections)
                }
              >
                Checkout
              </Button>
            </div>
          </>
        )}
      </main>
      <Footer />

      <SimplePrompt
        open={showCopayPrompt}
        onClose={() => setShowCopayPrompt(false)}
        primaryActionLabel="Confirm and Pay Now"
        onPrimaryAction={handleCopayPayment}
      >
        <span className="font-medium">
          Confirm and Pay using co-pay with {userPoints} points + {copayInr} INR.
        </span>
      </SimplePrompt>
    </div>
  );
}
