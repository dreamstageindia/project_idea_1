// src/components/layout/header.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Building, LogOut, Menu, X, ShoppingCart, History } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

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

type CartItem = {
  id: string;
  employeeId: string;
  productId: string;
  quantity: number;
};

export function Header() {
  const { employee, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const { data: cartItems = [] } = useQuery<CartItem[]>({
    queryKey: ["/api/cart"],
    enabled: !!employee,
  });

  const cartItemCount = useMemo(() => cartItems.length, [cartItems]);

  const companyName = branding?.companyName || "TechCorp";
  const primary = branding?.primaryColor || "#1e40af";
  const logoUrl = branding?.logoUrl || null;

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 text-gray-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3" data-testid="logo">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Company logo" 
                  className="w-40 h-auto object-contain rounded" 
                />
              ) : (
                <Building className="text-gray-900 h-8 w-8" />
              )}
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/cart")}
                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartItemCount > 0 && (
                  <Badge
                    className="absolute -top-2 -right-2 bg-red-500 text-white"
                    style={{ 
                      minWidth: "1.5rem", 
                      height: "1.5rem", 
                      borderRadius: "50%", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      fontSize: "0.75rem"
                    }}
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => setLocation("/my-orders")}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              <History className="h-5 w-5" />
            </Button>
            
            <div className="hidden sm:block text-right">
              <p className="font-medium text-gray-900" data-testid="text-user-name">
                {employee?.firstName} {employee?.lastName}
              </p>
              <p className="text-sm text-gray-600" data-testid="text-employee-id">
                {employee?.employeeId}
              </p>
              <p className="text-sm text-gray-600">
                Points: {employee?.points ?? 0}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              data-testid="button-logout"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <nav className="p-4 space-y-4">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="font-medium text-gray-900">
                {employee?.firstName} {employee?.lastName}
              </p>
              <p className="text-sm text-gray-600">{employee?.employeeId}</p>
              <p className="text-sm text-gray-600">Points: {employee?.points ?? 0}</p>
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => {
                setLocation("/cart");
                setIsMobileMenuOpen(false);
              }}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart {cartItemCount > 0 && `(${cartItemCount})`}
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => {
                setLocation("/my-orders");
                setIsMobileMenuOpen(false);
              }}
            >
              <History className="mr-2 h-4 w-4" />
              My Orders
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start text-gray-700 border-gray-300 hover:bg-gray-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}