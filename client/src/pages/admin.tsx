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
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ADMIN_PASSWORD = "12345678";

type Employee = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  yearOfBirth: number;
  loginAttempts: number;
  isLocked: boolean;
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
  updatedAt: string;
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
  const { data: orders = [] } = useQuery({ queryKey: ["/api/admin/orders"], enabled: unlocked });
  const { data: employees = [] } = useQuery<Employee[]>({ queryKey: ["/api/admin/employees"], enabled: unlocked });
  // NOTE: admin list (full, without backup substitution)
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
    mutationFn: async (rows: Array<{ employeeId: string; firstName: string; lastName: string; yearOfBirth: number }>) => {
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

  // CSV parsing
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const parseCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines[0].split(",").map((s) => s.trim());
    const idx = {
      employeeId: header.indexOf("employeeId"),
      firstName: header.indexOf("firstName"),
      lastName: header.indexOf("lastName"),
      yearOfBirth: header.indexOf("yearOfBirth"),
    };
    if (Object.values(idx).some((i) => i === -1)) throw new Error("CSV must have headers: employeeId,firstName,lastName,yearOfBirth");
    const rows = lines.slice(1).map((line) => {
      const cols = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
      return {
        employeeId: cols[idx.employeeId],
        firstName: cols[idx.firstName],
        lastName: cols[idx.lastName],
        yearOfBirth: Number(cols[idx.yearOfBirth]),
      };
    });
    return rows.filter((r) => r.employeeId && r.firstName && r.lastName && Number.isFinite(r.yearOfBirth));
  };

  // Employee inline edit state
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editEmpDraft, setEditEmpDraft] = useState<Partial<Employee>>({});
  const startEditEmp = (emp: Employee) => {
    setEditingEmployeeId(emp.id);
    setEditEmpDraft({
      employeeId: emp.employeeId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      yearOfBirth: emp.yearOfBirth,
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

  // Branding upload state
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);

  // Branding color picker local state
  const [primaryColor, setPrimaryColor] = useState("#1e40af");
  const [accentColor, setAccentColor] = useState("#f97316");

  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primaryColor || "#1e40af");
      setAccentColor(branding.accentColor || "#f97316");
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
                              <p className="text-sm text-muted-foreground">{order.employee?.employeeId}</p>
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
              <CardHeader>
                <CardTitle>Upload Employees (CSV)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  CSV headers required: employeeId,firstName,lastName,yearOfBirth
                </p>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!csvFile) {
                        toast({ title: "Select a CSV", variant: "destructive" });
                        return;
                      }
                      try {
                        const rows = await parseCsv(csvFile);
                        if (rows.length === 0) {
                          toast({ title: "No valid rows", variant: "destructive" });
                          return;
                        }
                        bulkEmployeesMutation.mutate(rows);
                      } catch (err: any) {
                        toast({ title: "Parse failed", description: err.message, variant: "destructive" });
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
                        <TableHead>Employee ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Year of Birth</TableHead>
                        <TableHead>Login Attempts</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[220px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => {
                        const isEditing = editingEmployeeId === emp.id;
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-mono">
                              {isEditing ? (
                                <Input
                                  value={editEmpDraft.employeeId || ""}
                                  onChange={(e) =>
                                    setEditEmpDraft((d) => ({ ...d, employeeId: e.target.value }))
                                  }
                                />
                              ) : (
                                emp.employeeId
                              )}
                            </TableCell>
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
                                  type="number"
                                  value={String(editEmpDraft.yearOfBirth ?? "")}
                                  onChange={(e) =>
                                    setEditEmpDraft((d) => ({
                                      ...d,
                                      yearOfBirth: Number(e.target.value),
                                    }))
                                  }
                                />
                              ) : (
                                emp.yearOfBirth
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
                        images: newProductImages, // save the reordered images
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
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
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
                      <TableHead>Price</TableHead>
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
                            <p className="text-sm text-muted-foreground">{order.employee?.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell>{order.product?.name}</TableCell>
                        <TableCell>{order.selectedColor}</TableCell>
                        <TableCell className="font-semibold">₹{order.product?.price}</TableCell>
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
              <CardTitle>Theme Customization</CardTitle>
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
                <div className="space-y-2 md:col-span-2">
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
    </div>
  );
}
