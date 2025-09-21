import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: any;
}

export function OrderConfirmationModal({
  isOpen,
  onClose,
  orderData,
}: OrderConfirmationModalProps) {
  if (!orderData) return null;

  const { order, product, employee } = orderData;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="modal-order-confirmation">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="text-green-600 text-3xl" />
          </div>
          <h3 className="text-2xl font-bold text-green-600 mb-2">Order Confirmed!</h3>
          <p className="text-muted-foreground">Your product selection has been successfully recorded.</p>
        </div>

        {/* Order Details */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Order ID</span>
            <span className="font-mono font-bold" data-testid="text-final-order-id">
              {order.orderId}
            </span>
          </div>
          
          <div className="border-t border-border pt-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-100 rounded-lg">
                <img
                  src={product.images?.[0]}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                  data-testid="final-order-product-image"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold" data-testid="final-order-product-name">
                  {product.name}
                </h4>
                
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Employee</p>
              <p className="font-medium" data-testid="final-order-employee-name">
                {employee.firstName} {employee.lastName}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Employee ID</p>
              <p className="font-medium" data-testid="final-order-employee-id">
                {employee.employeeId}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Order Date</p>
              <p className="font-medium" data-testid="final-order-date">
                {new Date(order.orderDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium text-green-600">Confirmed</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full py-3 font-medium"
          onClick={onClose}
          data-testid="button-close-order-confirmation"
        >
          <Home className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
      </DialogContent>
    </Dialog>
  );
}
