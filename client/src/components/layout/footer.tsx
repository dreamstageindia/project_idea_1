// src/components/layout/footer.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building, Mail, Phone, MapPin } from "lucide-react";

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

export function Footer() {
  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const companyName = branding?.companyName || "";
  const primary = branding?.primaryColor || "#1e40af";
  const logoUrl = branding?.logoUrl || null;

  return (
    <footer className="bg-white border-t border-gray-200 mt-16 text-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={`${companyName} Logo`} 
                  className="w-32 h-32 object-contain rounded" 
                />
              ) : (
                <div className="flex items-center space-x-3">
                  <Building className="text-gray-700 h-8 w-8" />
                  <span className="text-xl font-bold text-gray-900">{companyName}</span>
                </div>
              )}
            </div>
            <p className="text-gray-600 mb-4 max-w-md">
              Your trusted partner for corporate gifting solutions. We provide premium 
              products and exceptional service to help you create memorable experiences.
            </p>
            
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-lg">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Brand Store
                </a>
              </li>
              <li>
                <a href="/special-occasions" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Special Occasions
                </a>
              </li>
              <li>
                <a href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  Blogs
                </a>
              </li>
              <li>
                <a href="/csr" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">
                  CSR
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-lg">Contact Us</h4>
            <div className="space-y-3">
              <div className="flex items-center text-gray-600">
                <Mail className="mr-3 h-4 w-4" />
                <a 
                  href="mailto:support@virtusa.com" 
                  className="text-sm hover:text-gray-900 transition-colors"
                >
                  support@virtusa.com
                </a>
              </div>
              
            </div>
            
            
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 mt-8 pt-8 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 text-sm">
              &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
            <div className="text-gray-600 text-sm">
              <span>Employee Product Selection Portal | Powered by </span>
              <span className="font-semibold text-gray-900">BRACKETS</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}