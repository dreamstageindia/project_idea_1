// src/pages/my-orders.tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { useQuery } from "@tanstack/react-query";

export default function MyOrders() {
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/orders/my-orders"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Orders</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map((o: any, idx: number) => (
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
                  <p className="text-muted-foreground">Quantity: {o.order?.quantity}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                <p>
                  Order ID: <span className="font-mono font-bold">{o.order?.orderId}</span>
                </p>
                <p>
                  Status: <span className="text-green-600 font-medium">Confirmed</span>
                </p>
                <p>Date: {new Date(o.order.orderDate).toLocaleDateString()}</p>
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
        {orders.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">No orders yet.</p>
        )}
      </main>
      <Footer />
    </div>
  );
}