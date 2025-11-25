import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/admin/stats-cards";
import { ShieldQuestion } from "lucide-react"; // Add this import

interface AdminDashboardProps {
  onViewAllOrders: () => void;
}

export function AdminDashboard({ onViewAllOrders }: AdminDashboardProps) {
  const { data: stats } = useQuery({ queryKey: ["/api/admin/stats"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/admin/orders"] });
  
  const recentOrders = orders.slice(0, 10);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your employee product selection portal</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="font-medium">Administrator</p>
          </div>
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <ShieldQuestion className="text-primary-foreground" />
          </div>
        </div>
      </div>

      <StatsCards stats={stats} />
      
      <Card className="shadow-sm border border-border overflow-hidden mt-8">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button
              variant="default"
              size="sm"
              onClick={onViewAllOrders}
              data-testid="button-view-all-orders"
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted">
                  <TableHead>Order ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order: any) => (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono text-sm">{order.orderId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.employee?.firstName} {order.employee?.lastName}</p>
                        {order.employee?.phoneNumber && (
                          <p className="text-sm text-muted-foreground">{order.employee?.phoneNumber}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.product?.name}</TableCell>
                    <TableCell className="font-semibold">₹{order.product?.price}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </TableCell>
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
    </>
  );
}