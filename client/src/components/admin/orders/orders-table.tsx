import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { OrdersExportModal } from "./orders-export-modal";
import type { Order } from "./types";

export function OrdersTable() {
  const { data: orders = [] } = useQuery<Order[]>({ 
    queryKey: ["/api/admin/orders"] 
  });
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>All Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            Export (Excel/CSV)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Points Used</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono">{order.orderId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.employee?.firstName} {order.employee?.lastName}</p>
                        <p className="text-sm text-muted-foreground">{order.employee?.phoneNumber}</p>
                      </div>
                    </TableCell>
                    <TableCell>{order.product?.name}</TableCell>
                    <TableCell>{order.selectedColor}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell className="font-semibold">₹{order.product?.price}</TableCell>
                    <TableCell>{order.metadata?.usedPoints ?? 0}</TableCell>
                    <TableCell>
                      {order.metadata?.copayInr ? (
                        <Button
                          variant="link"
                          className="p-0"
                          // onClick={() => openPaymentModal(order.metadata)} // You can implement this later
                        >
                          ₹{order.metadata.copayInr}
                        </Button>
                      ) : (
                        "₹0"
                      )}
                    </TableCell>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">{order.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <OrdersExportModal 
        open={exportOpen} 
        onClose={() => setExportOpen(false)} 
        orders={orders} 
      />
    </>
  );
}