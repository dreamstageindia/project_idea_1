import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileDown, X } from "lucide-react";
import { csvEscape, downloadBlob } from "@/lib/csv-utils";
import type { Order } from "./types";

interface OrdersExportModalProps {
  open: boolean;
  onClose: () => void;
  orders: Order[];
}

const ORDER_EXPORT_COLUMNS = [
  { key: "orderId", label: "Order ID" },
  { key: "employeeName", label: "Employee Name" },
  { key: "employeePhone", label: "Employee Phone" },
  { key: "productName", label: "Product Name" },
  { key: "selectedColor", label: "Color" },
  { key: "quantity", label: "Quantity" },
  { key: "price", label: "Price" },
  { key: "pointsUsed", label: "Points Used" },
  { key: "copayAmount", label: "Copay Amount" },
  { key: "orderDate", label: "Order Date" },
  { key: "status", label: "Status" },
] as const;

type ExportKey = (typeof ORDER_EXPORT_COLUMNS)[number]["key"];

export function OrdersExportModal({ open, onClose, orders }: OrdersExportModalProps) {
  const { toast } = useToast();
  const [selectedExportCols, setSelectedExportCols] = useState<ExportKey[]>(
    ORDER_EXPORT_COLUMNS.map((c) => c.key)
  );

  const toggleExportCol = (key: ExportKey) => {
    setSelectedExportCols((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const exportOrdersCsv = () => {
    if (!orders.length || !selectedExportCols.length) {
      toast({ 
        title: "Nothing to export", 
        description: "Please select at least one column.", 
        variant: "destructive" 
      });
      return;
    }

    const header = selectedExportCols
      .map((key) => {
        const col = ORDER_EXPORT_COLUMNS.find((c) => c.key === key)!;
        return csvEscape(col.label);
      })
      .join(",");

    const rows = orders.map((order) => {
      const values = selectedExportCols.map((key) => {
        switch (key) {
          case "orderId":
            return csvEscape(order.orderId);
          case "employeeName":
            return csvEscape(`${order.employee?.firstName ?? ""} ${order.employee?.lastName ?? ""}`.trim());
          case "employeePhone":
            return csvEscape(order.employee?.phoneNumber ?? "");
          case "productName":
            return csvEscape(order.product?.name ?? "");
          case "selectedColor":
            return csvEscape(order.selectedColor ?? "");
          case "quantity":
            return csvEscape(order.quantity ?? 1);
          case "price":
            return csvEscape(order.product?.price ?? "");
          case "pointsUsed":
            return csvEscape(order.metadata?.usedPoints ?? 0);
          case "copayAmount":
            return csvEscape(order.metadata?.copayInr ?? 0);
          case "orderDate":
            try {
              const d = new Date(order.orderDate);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const da = String(d.getDate()).padStart(2, "0");
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              return csvEscape(`${y}-${m}-${da} ${hh}:${mm}`);
            } catch {
              return csvEscape(order.orderDate ?? "");
            }
          case "status":
            return csvEscape(order.status ?? "");
          default:
            return "";
        }
      });
      return values.join(",");
    });

    const csv = [header, ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadBlob(blob, `orders-export-${stamp}.csv`);
    
    onClose();
    toast({ title: "Export started", description: "Your CSV file has been downloaded." });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <div className="mb-2">
          <h3 className="text-lg font-semibold">Export Orders (Excel/CSV)</h3>
          <p className="text-sm text-muted-foreground">Choose the columns you want to export.</p>
        </div>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {ORDER_EXPORT_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={selectedExportCols.includes(c.key)}
                onChange={() => toggleExportCol(c.key)}
              />
              {c.label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button onClick={exportOrdersCsv}>
            <FileDown className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}