import { Button } from "@/components/ui/button";
import {
  Settings,
  BarChart3,
  Users,
  Package,
  Receipt,
  Palette,
  LogOut,
  Lock,
  Megaphone,
  FileText,
} from "lucide-react";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout?: () => void; // lock-and-exit action
}

export function AdminSidebar({
  activeSection,
  onSectionChange,
  onLogout,
}: AdminSidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "employees", label: "Employees", icon: Users },
    { id: "products", label: "Products", icon: Package },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "orders", label: "Orders", icon: Receipt },
    { id: "blogs", label: "Blogs", icon: FileText }, // New item
    { id: "branding", label: "Branding", icon: Palette },
  ];

  return (
    <aside className="admin-sidebar w-64 text-black p-6">
      <div className="mb-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <Settings className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Admin Panel</h2>
            <p className="text-sm opacity-75">Management Portal</p>
          </div>
        </div>
      </div>

      <nav className="space-y-2 text-black">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start space-x-3   ${
                isActive ? "bg-black/20 text-black" : ""
              }`}
              onClick={() => onSectionChange(item.id)}
              data-testid={`nav-admin-${item.id}`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Button>
          );
        })}

        <Button
          variant="ghost"
          className="w-full justify-start space-x-3 text-white/80 hover:bg-white/10 mt-8"
          onClick={onLogout}
          data-testid="button-admin-logout"
        >
          <LogOut className="h-5 w-5" />
          <span>Lock Admin</span>
          <Lock className="h-4 w-4 ml-auto opacity-70" />
        </Button>
      </nav>
    </aside>
  );
}
