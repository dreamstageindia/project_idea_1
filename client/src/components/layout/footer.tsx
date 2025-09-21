// src/components/layout/footer.tsx
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building, Mail } from "lucide-react";

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

  const companyName = branding?.companyName || "TechCorp";
  const primary = branding?.primaryColor || "#1e40af";
  const bannerUrl = branding?.bannerUrl || null;
  const logoUrl = branding?.logoUrl || null;

  const footerBg = useMemo<React.CSSProperties>(() => {
    if (bannerUrl) {
      return {
        backgroundImage: `linear-gradient( to top, rgba(0,0,0,0.35), rgba(0,0,0,0.15) ), url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {};
  }, [bannerUrl]);

  return (
    <footer className="bg-card border-t border-border mt-16 text-white" style={footerBg}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-black/60">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              {logoUrl ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={logoUrl} alt="Company logo" className="w-40 h-40 object-contain bg-white/40 rounded" />
              ) : (
                <Building className="text-white" />
              )}
            </div>
            
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="mr-2 h-4 w-4" />
              <a href="mailto:support@aceprintpack.com" className="hover:text-foreground">
                support@aceprintpack.com
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved. | Employee Product Selection Portal</p>
          <p className="mt-2">Powered by BRACKETS</p>
        </div>
      </div>
    </footer>
  );
}
