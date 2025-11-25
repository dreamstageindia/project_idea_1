import { useState } from "react";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminLockScreen } from "@/components/admin/admin-lock-screen";
import { AdminDashboard } from "@/components/admin/sections/admin-dashboard";
import { EmployeesSection } from "@/components/admin/sections/employees-section";
import { ProductsSection } from "@/components/admin/sections/products-section";
import { OrdersSection } from "@/components/admin/sections/orders-section";
import { BrandingSection } from "@/components/admin/sections/branding-section";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PASSWORD = "12345678";

export default function Admin() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("admin_unlocked") === "1";
    } catch {
      return false;
    }
  });

  const handleUnlock = (password: string) => {
    const cleaned = password.trim();
    if (!/^\d{8}$/.test(cleaned)) {
      toast({ 
        title: "Invalid format", 
        description: "Password must be exactly 8 digits.", 
        variant: "destructive" 
      });
      return false;
    }
    if (cleaned !== ADMIN_PASSWORD) {
      toast({ 
        title: "Access denied", 
        description: "Incorrect admin password.", 
        variant: "destructive" 
      });
      return false;
    }
    try { sessionStorage.setItem("admin_unlocked", "1"); } catch {}
    setUnlocked(true);
    toast({ title: "Admin unlocked", description: "Access granted." });
    return true;
  };

  const handleLock = () => {
    try { sessionStorage.removeItem("admin_unlocked"); } catch {}
    setUnlocked(false);
    toast({ title: "Admin locked", description: "Access revoked." });
  };

  if (!unlocked) {
    return <AdminLockScreen onUnlock={handleUnlock} />;
  }

  const renderSection = () => {
    switch (activeSection) {
      case "dashboard":
        return <AdminDashboard onViewAllOrders={() => setActiveSection("orders")} />;
      case "employees":
        return <EmployeesSection />;
      case "products":
        return <ProductsSection />;
      case "orders":
        return <OrdersSection />;
      case "branding":
        return <BrandingSection />;
      default:
        return <AdminDashboard onViewAllOrders={() => setActiveSection("orders")} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLock}
      />
      <main className="flex-1 overflow-y-auto p-8">
        {renderSection()}
      </main>
    </div>
  );
}