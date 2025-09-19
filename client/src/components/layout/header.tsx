// src/components/layout/header.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Building, LogOut, Menu, X } from "lucide-react";
import { useLocation } from "wouter";

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

export function Header() {
  const { employee, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, setLocation] = useLocation();

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const companyName = branding?.companyName || "TechCorp";
  const primary = branding?.primaryColor || "#1e40af";
  const bannerUrl = branding?.bannerUrl || null;
  const logoUrl = branding?.logoUrl || null;

  const headerBg = useMemo<React.CSSProperties>(() => {
    if (bannerUrl) {
      return {
        backgroundImage: `linear-gradient( to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.25) ), url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {};
  }, [bannerUrl]);

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40" style={headerBg}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3" data-testid="logo">
              
                {logoUrl ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={logoUrl} alt="Company logo" className="w-40 h-40 object-contain" />
                ) : (
                  <Building className="text-white" />
                )}
            
            </div>

            
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block text-right">
              <p className="font-medium" data-testid="text-user-name">
                {employee?.firstName} {employee?.lastName}
              </p>
              <p className="text-sm text-muted-foreground" data-testid="text-employee-id">
                {employee?.employeeId}
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>

            
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card/90 backdrop-blur">
          <nav className="p-4 space-y-4">
            <a
              href="#"
              className="block px-4 py-3 text-primary font-medium bg-primary/10 rounded-lg"
              data-testid="mobile-nav-products"
            >
              Products
            </a>
            <a
              href="#"
              className="block px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
              data-testid="mobile-nav-profile"
            >
              Profile
            </a>
            <div className="sm:hidden px-4 py-3 border-t border-border">
              <p className="font-medium">
                {employee?.firstName} {employee?.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{employee?.employeeId}</p>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
