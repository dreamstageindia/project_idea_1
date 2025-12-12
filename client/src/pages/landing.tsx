import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import giftBoxImg from '@assets/bg_1.png';

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

export default function Landing() {
  const [, setLocation] = useLocation();

  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  const logoUrl = branding?.logoUrl || null;
  const companyName = branding?.companyName || "";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient layer */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100"
      />
      
      {/* Gradient pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 40% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`,
        }}
      />
      
      {/* Full screen background image */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${giftBoxImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      {/* Logo */}
      <div className="absolute top-8 left-8 z-20">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={`${companyName} Logo`}
            className="h-12"
            data-testid="img-sun-logo"
          />
        ) : (
          <Building 
            className="h-12 w-12 text-gray-900" 
            data-testid="img-sun-logo"
          />
        )}
      </div>
      
      {/* Content */}
      <div className="relative min-h-screen flex items-center z-10">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold mb-4" data-testid="text-landing-title">
                Celebrate
              </h1>
              <h2 className="text-5xl lg:text-6xl font-bold text-primary mb-6" data-testid="text-landing-subtitle">
                Thoughtful Gifting
              </h2>
              <p className="text-xl text-foreground mb-12" data-testid="text-landing-tagline">
                Gifting that articulates joy every time.
              </p>
              
              <div className="grid grid-cols-2 gap-8 mb-12">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">For All</p>
                  <p className="text-2xl font-semibold text-green-400">Seasons</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">For All</p>
                  <p className="text-2xl font-semibold text-green-400">Reasons</p>
                </div>
              </div>
              
              <Button 
                size="lg"
                className="w-full max-w-md h-14 text-lg rounded-full"
                onClick={() => setLocation('/login')}
                data-testid="button-login-landing"
              >
                Login
              </Button>
            </div>
            
            {/* Empty column to maintain grid layout */}
            <div className="hidden md:block"></div>
          </div>
        </div>
      </div>
    </div>
  );
}