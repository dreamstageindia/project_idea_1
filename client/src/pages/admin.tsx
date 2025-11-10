// src/pages/admin.tsx
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { StatsCards } from "@/components/admin/stats-cards";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ShieldQuestion,
  Lock,
  Unlock,
  Plus,
  Save,
  X,
  Trash,
  Image as ImageIcon,
  Upload as UploadIcon,
  ArrowLeft,
  ArrowRight,
  FileDown,
  Download as DownloadIcon,
  CreditCard,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ADMIN_PASSWORD = "12345678";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  points: number;
  loginAttempts: number;
  isLocked: boolean;

  employeeId?: string | null; // legacy
};

type Product = {
  id: string;
  name: string;
  price: string;
  images: string[];
  colors: string[];
  stock: number;
  packagesInclude: string[];
  specifications: Record<string, string>;
  sku: string;
  isActive: boolean;
  backupProductId: string | null;
  createdAt: string;
};

type Branding = {
  id: string;
  logoUrl: string | null;
  companyName: string;
  primaryColor: string;
  accentColor: string;
  bannerUrl: string | null;
  bannerText: string | null;
  inrPerPoint: string; // <-- matches DB (decimal returned as string)
  maxSelectionsPerUser: number;
  updatedAt: string;
};

type Order = {
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

// helper: upload files to server
async function uploadFiles(files: File[]): Promise<string[]> {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.urls as string[];
}

// ----- small array helpers for reordering/removing -----
function move<T>(arr: T[], from: number, to: number): T[] {
  const copy = arr.slice();
  const item = copy.splice(from, 1)[0];
  copy.splice(to, 0, item);
  return copy;
}
function removeAt<T>(arr: T[], index: number): T[] {
  const copy = arr.slice();
  copy.splice(index, 1);
  return copy;
}

// CSV helpers
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  const needsWrap = /[",\n\r]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsWrap ? `"${escaped}"` : escaped;
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Admin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState("dashboard");

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("admin_unlocked") === "1";
    } catch {
      return false;
    }
  });
  const [password, setPassword] = useState("");

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = password.trim();
    if (!/^\d{8}$/.test(cleaned)) {
      toast({ title: "Invalid format", description: "Password must be exactly 8 digits.", variant: "destructive" });
      return;
    }
    if (cleaned !== ADMIN_PASSWORD) {
      toast({ title: "Access denied", description: "Incorrect admin password.", variant: "destructive" });
      return;
    }
    try { sessionStorage.setItem("admin_unlocked", "1"); } catch {}
    setUnlocked(true);
    setPassword("");
    toast({ title: "Admin unlocked", description: "Access granted." });
  };

  const handleLock = () => {
    try { sessionStorage.removeItem("admin_unlocked"); } catch {}
    setUnlocked(false);
    setPassword("");
    toast({ title: "Admin locked", description: "Access revoked." });
  };

  // queries
  const { data: stats } = useQuery({ queryKey: ["/api/admin/stats"], enabled: unlocked });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/admin/orders"], enabled: unlocked });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ["/api/admin/employees"], enabled: unlocked });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products-admin"], enabled: unlocked });
  const { data: branding } = useQuery<Branding>({ queryKey: ["/api/admin/branding"], enabled: unlocked });

  const recentOrders = useMemo(() => orders.slice(0, 10), [orders]);

  // mutations
  const unlockEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/employees/${id}/unlock`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({ title: "Employee unlocked" });
    },
    onError: (e: any) => toast({ title: "Failed to unlock", description: e.message, variant: "destructive" }),
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async (payload: Partial<Employee> & { id: string }) => {
      const { id, ...body } = payload;
      const res = await apiRequest("PUT", `/api/admin/employees/${id}`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({ title: "Employee updated" });
    },
    onError: (e: any) => toast({ title: "Failed to update employee", description: e.message, variant: "destructive" }),
  });

  const bulkEmployeesMutation = useMutation({
    mutationFn: async (rows: Array<{ firstName: string; lastName: string; phoneNumber: string; points: number }>) => {
      const res = await apiRequest("POST", `/api/admin/employees/bulk`, rows);
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/employees"] });
      toast({ title: "Upload complete", description: `Inserted: ${data.inserted}, Skipped: ${data.skipped}` });
    },
    onError: (e: any) => toast({ title: "Bulk upload failed", description: e.message, variant: "destructive" }),
  });

  const createProductMutation = useMutation({
    mutationFn: async (body: Partial<Product>) => {
      const res = await apiRequest("POST", `/api/admin/products`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product created" });
      setNewProduct(defaultNewProduct);
      setNewProductImages([]);
    },
    onError: (e: any) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const updateProductMutation = useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<Product> }) => {
      const res = await apiRequest("PUT", `/api/admin/products/${payload.id}`, payload.updates);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product updated" });
      closeEditModal();
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/products/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products-admin"] });
      toast({ title: "Product deleted" });
    },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const updateBrandingMutation = useMutation({
    mutationFn: async (body: Partial<Branding>) => {
      const res = await apiRequest("PUT", `/api/admin/branding`, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/branding"] });
      toast({ title: "Branding updated" });
    },
    onError: (e: any) => toast({ title: "Branding update failed", description: e.message, variant: "destructive" }),
  });

  // CSV/XLSX parsing (NEW)
  const [csvFile, setCsvFile] = useState<File | null>(null);

  async function parseAnySpreadsheet(file: File) {
    const name = (file.name || "").toLowerCase();
    if (name.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
      const XLSX = await import(/* webpackChunkName: "xlsx" */ "xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
      return rows.map((r) => ({
        firstName: String(r.firstName || r["first name"] || r["First Name"] || "").trim(),
        lastName: String(r.lastName || r["last name"] || r["Last Name"] || "").trim(),
        phoneNumber: String(r.phoneNumber || r["phone number"] || r["Phone Number"] || "").trim(),
        points: Number(r.points ?? r["Points"] ?? 0),
      }));
    }
    // fallback CSV
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const header = lines[0].split(",").map((s) => s.trim());
    const idx = {
      firstName: header.indexOf("firstName"),
      lastName: header.indexOf("lastName"),
      phoneNumber: header.indexOf("phoneNumber"),
      points: header.indexOf("points"),
    };
    if (Object.values(idx).some((i) => i === -1)) {
      throw new Error("File must have headers: firstName,lastName,phoneNumber,points");
    }
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      return {
        firstName: cols[idx.firstName],
        lastName: cols[idx.lastName],
        phoneNumber: cols[idx.phoneNumber],
        points: Number(cols[idx.points]),
      };
    });
    return rows;
  }

  // Download sample (CSV and XLSX)
  const downloadSample = async () => {
    const rows = [
      { firstName: "bharath", lastName: "c", phoneNumber: "6361679383", points: 2000 },
      { firstName: "sita", lastName: "r", phoneNumber: "+91 9876543210", points: 1500 },
    ];

    // CSV
    const header = "firstName,lastName,phoneNumber,points";
    const csvRows = rows.map((r) =>
      [r.firstName, r.lastName, r.phoneNumber, String(r.points)].map(csvEscape).join(",")
    );
    const csv = [header, ...csvRows].join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "employees-sample.csv");

    // XLSX
    try {
      const XLSX = await import(/* webpackChunkName: "xlsx" */ "xlsx");
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "employees-sample.xlsx");
    } catch {
      // If xlsx not available at runtime, we still delivered CSV
    }
  };

  // Employee inline edit state
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmpDraft, setEditEmpDraft] = useState<Partial<Employee>>({});
  const startEditEmp = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditEmpDraft({
      firstName: emp.firstName,
      lastName: emp.lastName,
      phoneNumber: emp.phoneNumber || "",
      points: emp.points,
    });
  };
  const saveEditEmp = () => {
    if (!editingEmployeeId) return;
    updateEmployeeMutation.mutate({ id: editingEmployeeId, ...editEmpDraft });
    setEditingEmployeeId(null);
  };

  // Product create state
  const defaultNewProduct: Partial<Product> = {
    name: "",
    price: "0.00",
    images: [],
    colors: [],
    stock: 0,
    packagesInclude: [],
    specifications: {},
    sku: "",
    isActive: true,
    backupProductId: null,
  };
  const [newProduct, setNewProduct] = useState<Partial<Product>>(defaultNewProduct);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);

  // Branding local state
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [accentColor, setAccentColor] = useState("#f97316");
  const [inrPerPoint, setInrPerPoint] = useState("1.00");
  const [maxSelections, setMaxSelections] = useState("1");
  const [customMax, setCustomMax] = useState("");

  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primaryColor || "#1e40af");
      setAccentColor(branding.accentColor || "#f97316");
      setInrPerPoint(branding.inrPerPoint || "1.00");
      const val = branding.maxSelectionsPerUser;
      if (val === -1) {
        setMaxSelections("infinite");
      } else if ([1, 2, 5, 10].includes(val)) {
        setMaxSelections(String(val));
      } else {
        setMaxSelections("custom");
        setCustomMax(String(val));
      }
    }
  }, [branding]);

  // ---------- Product Edit Modal ----------
  const [editOpen, setEditOpen] = useState(false);
  const [productEditing, setProductEditing] = useState<Product | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Product>>({});
  const [editImages, setEditImages] = useState<string[]>([]);

  function openEditModal(p: Product) {
    setProductEditing(p);
    setEditDraft({
      name: p.name,
      price: p.price,
      colors: p.colors ?? [],
      stock: p.stock ?? 0,
      packagesInclude: p.packagesInclude ?? [],
      specifications: p.specifications ?? {},
      sku: p.sku,
      isActive: p.isActive,
      backupProductId: p.backupProductId ?? null,
    });
    setEditImages(p.images ? p.images.slice() : []);
    setEditOpen(true);
  }
  function closeEditModal() {
    setEditOpen(false);
    setProductEditing(null);
    setEditDraft({});
    setEditImages([]);
  }

  // ---------- Orders Export (Excel/CSV) ----------
  const [exportOpen, setExportOpen] = useState(false);
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
      toast({ title: "Nothing to export", description: "Please select at least one column.", variant: "destructive" });
      return;
    }

    const header = selectedExportCols
      .map((key) => {
        const col = ORDER_EXPORT_COLUMNS.find((c) => c.key === key)!;
        return csvEscape(col.label);
      })
      .join(",");

    const rows = orders.map((o: any) => {
      const values = selectedExportCols.map((key) => {
        switch (key) {
          case "orderId":
            return csvEscape(o.orderId);
          case "employeeName":
            return csvEscape(`${o.employee?.firstName ?? ""} ${o.employee?.lastName ?? ""}`.trim());
          case "employeePhone":
            return csvEscape(o.employee?.phoneNumber ?? "");
          case "productName":
            return csvEscape(o.product?.name ?? "");
          case "selectedColor":
            return csvEscape(o.selectedColor ?? "");
          case "quantity":
            return csvEscape(o.quantity ?? 1);
          case "price":
            return csvEscape(o.product?.price ?? "");
          case "pointsUsed":
            return csvEscape(o.metadata?.usedPoints ?? 0);
          case "copayAmount":
            return csvEscape(o.metadata?.copayInr ?? 0);
          case "orderDate":
            try {
              const d = new Date(o.orderDate);
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const da = String(d.getDate()).padStart(2, "0");
              const hh = String(d.getHours()).padStart(2, "0");
              const mm = String(d.getMinutes()).padStart(2, "0");
              return csvEscape(`${y}-${m}-${da} ${hh}:${mm}`);
            } catch {
              return csvEscape(o.orderDate ?? "");
            }
          case "status":
            return csvEscape(o.status ?? "");
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
    setExportOpen(false);
    toast({ title: "Export started", description: "Your CSV file has been downloaded." });
  };

  // Helper: label for backup product
  function labelForProduct(prodId: string | null | undefined) {
    if (!prodId) return "—";
    const p = products.find((pp) => pp.id === prodId);
    return p ? `${p.name} (${p.sku})` : "—";
  }

  // Locked view
  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Admin Access
              </CardTitle>
              <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <Label htmlFor="adminPassword">8-digit Admin Password</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={8}
                  data-testid="input-admin-password"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Frontend lock only. Add server auth for real protection.
                </p>
              </div>
              <Button type="submit" className="w-full" data-testid="button-admin-unlock">
                <Unlock className="h-4 w-4 mr-2" />
                Unlock
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLock}
      />

      <main className="flex-1 overflow-y-auto p-8">
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

        {activeSection === "dashboard" && (
          <>
            <StatsCards stats={stats} />

            <Card className="shadow-sm border border-border overflow-hidden mt-8">
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setActiveSection("orders")}
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
        )}

        {activeSection === "employees" && (
          <div className="space-y-8">
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Upload Employees (CSV / Excel)</CardTitle>
                <Button variant="outline" size="sm" onClick={downloadSample}>
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download sample
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  File must include headers: <code>firstName,lastName,phoneNumber,points</code>
                </p>
                <Input
                  type="file"
                  accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
                  onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!csvFile) {
                        toast({ title: "Select a file", variant: "destructive" });
                        return;
                      }
                      try {
                        const parsed = await parseAnySpreadsheet(csvFile);
                        const rows = parsed.filter(
                          (r) => r.firstName && r.lastName && r.phoneNumber && Number.isFinite(r.points)
                        );
                        if (!rows.length) {
                          toast({ title: "No valid rows", variant: "destructive" });
                          return;
                        }
                        bulkEmployeesMutation.mutate(rows);
                      } catch (err: any) {
                        toast({ title: "Parse failed", description: String(err?.message || err), variant: "destructive" });
                      }
                    }}
                    disabled={bulkEmployeesMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employee Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Login Attempts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[260px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => {
                        const isEditing = editingEmployeeId === emp.id;
                        return (
                          <TableRow key={emp.id}>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Input
                                    value={editEmpDraft.firstName || ""}
                                    onChange={(e) =>
                                      setEditEmpDraft((d) => ({ ...d, firstName: e.target.value }))
                                    }
                                    placeholder="First name"
                                  />
                                  <Input
                                    value={editEmpDraft.lastName || ""}
                                    onChange={(e) =>
                                      setEditEmpDraft((d) => ({ ...d, lastName: e.target.value }))
                                    }
                                    placeholder="Last name"
                                  />
                                </div>
                              ) : (
                                `${emp.firstName} ${emp.lastName}`
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editEmpDraft.phoneNumber || ""}
                                  onChange={(e) =>
                                    setEditEmpDraft((d) => ({ ...d, phoneNumber: e.target.value }))
                                  }
                                  placeholder="+91XXXXXXXXXX"
                                />
                              ) : (
                                emp.phoneNumber || "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  type="number"
                                  value={String(editEmpDraft.points ?? 0)}
                                  onChange={(e) =>
                                    setEditEmpDraft((d) => ({
                                      ...d,
                                      points: Number(e.target.value) || 0,
                                    }))
                                  }
                                />
                              ) : (
                                emp.points
                              )}
                            </TableCell>
                            <TableCell>{emp.loginAttempts}</TableCell>
                            <TableCell>
                              <Badge variant={emp.isLocked ? "destructive" : "default"}>
                                {emp.isLocked ? "Locked" : "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveEditEmp}>
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setEditingEmployeeId(null)}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => startEditEmp(emp)}>
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => unlockEmployeeMutation.mutate(emp.id)}
                                    disabled={!emp.isLocked}
                                  >
                                    <Unlock className="h-4 w-4 mr-1" />
                                    Unblock
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "products" && (
          <div className="space-y-8">
            {/* Create product */}
            <Card>
              <CardHeader>
                <CardTitle>Create Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={newProduct.name || ""}
                      onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newProduct.price || ""}
                      onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))}
                    />
                  </div>

                  {/* File picker for product images */}
                  <div className="md:col-span-2">
                    <Label>Images</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          try {
                            const urls = await uploadFiles(files);
                            setNewProductImages((prev) => [...prev, ...urls]);
                            toast({ title: "Images uploaded", description: `${urls.length} file(s) ready.` });
                          } catch (err: any) {
                            toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                          }
                        }}
                      />
                      <UploadIcon className="h-5 w-5 opacity-60" />
                    </div>

                    {/* Reorderable thumbnails for create */}
                    {!!newProductImages.length && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        {newProductImages.map((u, idx) => (
                          <div key={u} className="relative">
                            <div className="w-20 h-20 rounded border overflow-hidden bg-muted flex items-center justify-center">
                              <img src={u} alt="preview" className="object-cover w-full h-full" />
                            </div>
                            <div className="flex justify-center gap-1 mt-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={idx === 0}
                                onClick={() =>
                                  setNewProductImages((prev) => move(prev, idx, idx - 1))
                                }
                                title="Move left"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={idx === newProductImages.length - 1}
                                onClick={() =>
                                  setNewProductImages((prev) => move(prev, idx, idx + 1))
                                }
                                title="Move right"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                onClick={() =>
                                  setNewProductImages((prev) => removeAt(prev, idx))
                                }
                                title="Remove"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="text-center text-[10px] text-muted-foreground mt-1">#{idx}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label>Colors (comma-separated)</Label>
                    <Input
                      value={(newProduct.colors || []).join(",")}
                      onChange={(e) =>
                        setNewProduct((p) => ({ ...p, colors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={String(newProduct.stock ?? 0)}
                      onChange={(e) =>
                        setNewProduct((p) => ({ ...p, stock: Number(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div>
                    <Label>SKU</Label>
                    <Input
                      value={newProduct.sku || ""}
                      onChange={(e) => setNewProduct((p) => ({ ...p, sku: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Packages Include</Label>
                    <Textarea
                      value={(newProduct.packagesInclude || []).join("\n")}
                      onChange={(e) =>
                        setNewProduct((p) => ({
                          ...p,
                          packagesInclude: e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Specifications</Label>
                    <Textarea
                      value={Object.entries(newProduct.specifications || {})
                        .map(([k, v]) => `${k}:${v}`)
                        .join("\n")}
                      onChange={(e) => {
                        const obj: Record<string, string> = {};
                        e.target.value.split("\n").forEach((line) => {
                          const idx = line.indexOf(":");
                          if (idx > 0) {
                            const k = line.slice(0, idx).trim();
                            const v = line.slice(idx + 1).trim();
                            if (k) obj[k] = v;
                          }
                        });
                        setNewProduct((p) => ({ ...p, specifications: obj }));
                      }}
                    />
                  </div>

                  {/* Backup product dropdown (create) */}
                  <div>
                    <Label>Backup Product (optional)</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={newProduct.backupProductId ?? ""}
                      onChange={(e) =>
                        setNewProduct((p) => ({
                          ...p,
                          backupProductId: e.target.value ? e.target.value : null,
                        }))
                      }
                    >
                      <option value="">— None —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      createProductMutation.mutate({
                        ...newProduct,
                        images: newProductImages,
                      })
                    }
                    disabled={createProductMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* List + edit products */}
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Backup</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-[260px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.name}</TableCell>
                          <TableCell className="font-mono">{p.sku}</TableCell>
                          <TableCell>₹{p.price}</TableCell>
                          <TableCell>{p.stock}</TableCell>
                          <TableCell>{labelForProduct(p.backupProductId)}</TableCell>
                          <TableCell>
                            <Badge variant={p.isActive ? "default" : "destructive"}>
                              {p.isActive ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(p)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteProductMutation.mutate(p.id)}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === "orders" && (
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
                    {orders.map((order: any) => (
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
                              onClick={() => openPaymentModal(order.metadata)}
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
        )}

        {activeSection === "branding" && (
          <Card>
            <CardHeader>
              <CardTitle>Theme & Redemption Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    defaultValue={branding?.companyName || ""}
                    onBlur={(e) => updateBrandingMutation.mutate({ companyName: e.target.value })}
                  />
                </div>

                {/* Primary color picker + hex */}
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => {
                        setPrimaryColor(e.target.value);
                        updateBrandingMutation.mutate({ primaryColor: e.target.value });
                      }}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      onBlur={(e) => updateBrandingMutation.mutate({ primaryColor: e.target.value })}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                    <div
                      aria-label="Primary preview"
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: primaryColor }}
                    />
                  </div>
                </div>

                {/* Accent color picker + hex */}
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      value={accentColor}
                      onChange={(e) => {
                        setAccentColor(e.target.value);
                        updateBrandingMutation.mutate({ accentColor: e.target.value });
                      }}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      onBlur={(e) => updateBrandingMutation.mutate({ accentColor: e.target.value })}
                      placeholder="#f97316"
                      className="flex-1"
                    />
                    <div
                      aria-label="Accent preview"
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: accentColor }}
                    />
                  </div>
                </div>

                {/* INR per point (schema field name) */}
                <div className="space-y-2">
                  <Label>₹ per 1 point</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={inrPerPoint}
                    onChange={(e) => setInrPerPoint(e.target.value)}
                    onBlur={(e) => updateBrandingMutation.mutate({ inrPerPoint: e.target.value })}
                    placeholder="1.00"
                  />
                  <p className="text-xs text-muted-foreground">
                    How many rupees is one point worth? (Used for redemptions)
                  </p>
                </div>

                {/* Product selection per user */}
                <div className="space-y-2">
                  <Label>Product selections per user</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={maxSelections}
                    onChange={(e) => {
                      setMaxSelections(e.target.value);
                      let val: number;
                      if (e.target.value === "infinite") val = -1;
                      else if (e.target.value === "custom") return; // wait for input
                      else val = Number(e.target.value);
                      updateBrandingMutation.mutate({ maxSelectionsPerUser: val });
                    }}
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="infinite">Infinite</option>
                    <option value="custom">Custom</option>
                  </select>
                  {maxSelections === "custom" && (
                    <Input
                      type="number"
                      min="1"
                      value={customMax}
                      onChange={(e) => setCustomMax(e.target.value)}
                      onBlur={(e) => {
                        const val = Number(e.target.value) || 1;
                        updateBrandingMutation.mutate({ maxSelectionsPerUser: val });
                      }}
                      placeholder="Enter number"
                    />
                  )}
                </div>
              </div>

              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      try {
                        setLogoUploading(true);
                        const [url] = await uploadFiles(files.slice(0, 1));
                        await updateBrandingMutation.mutateAsync({ logoUrl: url });
                        toast({ title: "Logo updated" });
                      } catch (err: any) {
                        toast({ title: "Logo upload failed", description: err.message, variant: "destructive" });
                      } finally {
                        setLogoUploading(false);
                      }
                    }}
                  />
                  <UploadIcon className="h-5 w-5 opacity-60" />
                  {logoUploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
                </div>
                {branding?.logoUrl && (
                  <div className="mt-2 w-28 h-28 rounded border overflow-hidden bg-muted">
                    <img src={branding.logoUrl} alt="logo" className="object-contain w-full h-full" />
                  </div>
                )}
              </div>

              {/* Banner upload */}
              <div className="space-y-2">
                <Label>Banner</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      try {
                        setBannerUploading(true);
                        const [url] = await uploadFiles(files.slice(0, 1));
                        await updateBrandingMutation.mutateAsync({ bannerUrl: url });
                        toast({ title: "Banner updated" });
                      } catch (err: any) {
                        toast({ title: "Banner upload failed", description: err.message, variant: "destructive" });
                      } finally {
                        setBannerUploading(false);
                      }
                    }}
                  />
                  <UploadIcon className="h-5 w-5 opacity-60" />
                  {bannerUploading && <span className="text-sm text-muted-foreground">Uploading…</span>}
                </div>
                {branding?.bannerUrl && (
                  <div className="mt-2 w-full max-w-xl h-40 rounded border overflow-hidden bg-muted">
                    <img src={branding.bannerUrl} alt="banner" className="object-cover w-full h-full" />
                  </div>
                )}
              </div>

              <div>
                <Label>Banner Text</Label>
                <Textarea
                  defaultValue={branding?.bannerText || ""}
                  onBlur={(e) => updateBrandingMutation.mutate({ bannerText: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Product Edit Modal */}
      <Dialog open={editOpen} onOpenChange={(o) => (o ? setEditOpen(true) : closeEditModal())}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <div className="mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold">Edit Product</h3>
            {productEditing ? (
              <p className="text-sm text-muted-foreground">SKU: <span className="font-mono">{productEditing.sku}</span></p>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editDraft.name ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>

              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={String(editDraft.price ?? "")}
                  onChange={(e) => setEditDraft((d) => ({ ...d, price: e.target.value }))}
                />
              </div>

              <div>
                <Label>Colors (comma-separated)</Label>
                <Input
                  value={(editDraft.colors ?? []).join(",")}
                  onChange={(e) =>
                    setEditDraft((d) => ({
                      ...d,
                      colors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    }))
                  }
                />
              </div>

              <div>
                <Label>Stock</Label>
                <Input
                  type="number"
                  value={String(editDraft.stock ?? 0)}
                  onChange={(e) => setEditDraft((d) => ({ ...d, stock: Number(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <Label>SKU</Label>
                <Input
                  value={editDraft.sku ?? ""}
                  onChange={(e) => setEditDraft((d) => ({ ...d, sku: e.target.value }))}
                />
              </div>

              <div>
                <Label>Active</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="isActive"
                    type="checkbox"
                    className="h-4 w-4"
                    checked={Boolean(editDraft.isActive)}
                    onChange={(e) => setEditDraft((d) => ({ ...d, isActive: e.target.checked }))}
                  />
                  <Label htmlFor="isActive" className="text-sm">Is Active</Label>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Backup Product (optional)</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editDraft.backupProductId ?? ""}
                  onChange={(e) =>
                    setEditDraft((d) => ({
                      ...d,
                      backupProductId: e.target.value ? e.target.value : null,
                    }))
                  }
                >
                  <option value="">— None —</option>
                  {products
                    .filter((pp) => pp.id !== productEditing?.id)
                    .map((bp) => (
                      <option key={bp.id} value={bp.id}>
                        {bp.name} ({bp.sku})
                      </option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <Label>Packages Include</Label>
                <Textarea
                  value={(editDraft.packagesInclude ?? []).join("\n")}
                  onChange={(e) =>
                    setEditDraft((d) => ({
                      ...d,
                      packagesInclude: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Label>Specifications</Label>
                <Textarea
                  value={Object.entries(editDraft.specifications ?? {})
                    .map(([k, v]) => `${k}:${v}`)
                    .join("\n")}
                  onChange={(e) => {
                    const obj: Record<string, string> = {};
                    e.target.value.split("\n").forEach((line) => {
                      const idx = line.indexOf(":");
                      if (idx > 0) {
                        const k = line.slice(0, idx).trim();
                        const v = line.slice(idx + 1).trim();
                        if (k) obj[k] = v;
                      }
                    });
                    setEditDraft((d) => ({ ...d, specifications: obj }));
                  }}
                />
              </div>

              {/* Images editor */}
              <div className="md:col-span-2">
                <Label>Images</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (!files.length) return;
                      try {
                        const urls = await uploadFiles(files);
                        setEditImages((prev) => [...prev, ...urls]);
                        toast({ title: "Images uploaded", description: `${urls.length} new file(s).` });
                      } catch (err: any) {
                        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                      }
                    }}
                  />
                  <ImageIcon className="h-4 w-4 opacity-60" />
                </div>
                {!!editImages.length && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {editImages.map((u, idx) => (
                      <div key={`${u}-${idx}`} className="relative">
                        <div className="w-20 h-20 rounded border overflow-hidden bg-muted">
                          <img src={u} alt="img" className="object-cover w-full h-full" />
                        </div>
                        <div className="flex justify-center gap-1 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={idx === 0}
                            onClick={() => setEditImages((prev) => move(prev, idx, idx - 1))}
                            title="Move left"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            disabled={idx === editImages.length - 1}
                            onClick={() => setEditImages((prev) => move(prev, idx, idx + 1))}
                            title="Move right"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => setEditImages((prev) => removeAt(prev, idx))}
                            title="Remove"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-center text-[10px] text-muted-foreground mt-1">#{idx}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal actions */}
          <div className="mt-6 flex justify-end gap-2 flex-shrink-0">
            <Button
              variant="secondary"
              onClick={closeEditModal}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!productEditing) return;
                const updates: Partial<Product> = {
                  ...editDraft,
                  images: editImages,
                };
                updateProductMutation.mutate({ id: productEditing.id, updates });
              }}
            >
              <Save className="h-4 w-4 mr-1" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Orders Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={(o) => setExportOpen(o)}>
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
            <Button variant="secondary" onClick={() => setExportOpen(false)}>
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
    </div>
  );
}
