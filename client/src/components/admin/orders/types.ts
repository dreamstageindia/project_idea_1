import type { Employee } from "../employees/types";
import type { Product } from "../products/types";

export type Order = {
  id: string;
  orderId: string;
  employeeId: string;
  productId: string;
  selectedColor: string | null;
  quantity: number;
  status: string;
  orderDate: string;
  metadata: Record<string, any> | null;
  employee: Employee;
  product: Product;
};