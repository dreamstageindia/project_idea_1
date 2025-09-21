import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
  selectedColor: string;
  onConfirm: (orderData: any) => void;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  product,
  selectedColor,
  onConfirm,
}: ConfirmationModalProps) {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: async (data: { productId: string; selectedColor: string }) => {
      const response = await apiRequest("POST", "/api/orders", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my-order"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      onConfirm(data);
      toast({
        title: "Order Confirmed!",
        description: "Your product selection has been recorded.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConfirm = () => {
    if (product && token) {
      createOrderMutation.mutate({
        productId: product.id,
        selectedColor,
      });
    }
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-confirmation">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <CheckCircle className="text-accent text-2xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Confirm Product Selection</h3>
          <p className="text-muted-foreground">Are you sure you want to choose this product?</p>
        </div>

        {/* Selected Product Summary */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg">
              <img
                src={product.images?.[0]}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg"
                data-testid="confirmation-product-image"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold" data-testid="confirmation-product-name">
                {product.name}
              </h4>
              
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            data-testid="button-cancel-selection"
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={createOrderMutation.isPending}
            data-testid="button-confirm-selection"
          >
            {createOrderMutation.isPending ? "Processing..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
