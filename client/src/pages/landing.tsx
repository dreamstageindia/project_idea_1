import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import giftBoxImg from '@assets/element_5.png';

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
  const companyName = branding?.companyName || "Carelon";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-100 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 40% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)`,
        }}
      />
      
      <div className="absolute top-8 left-8">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt={`${companyName} Logo`}
            className="h-12"
            data-testid="img-carelon-logo"
          />
        ) : (
          <Building 
            className="h-12 w-12 text-gray-900" 
            data-testid="img-carelon-logo"
          />
        )}
      </div>
      
      <div className="relative min-h-screen flex items-center">
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
                  <p className="text-2xl font-semibold text-primary">Seasons</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">For All</p>
                  <p className="text-2xl font-semibold text-primary">Reasons</p>
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
            
            <div className="flex justify-center items-center relative">
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 30%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
                                   radial-gradient(circle at 30% 70%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
                                   radial-gradient(circle at 70% 70%, rgba(147, 51, 234, 0.3) 0%, transparent 40%),
                                   radial-gradient(circle at 50% 90%, rgba(147, 51, 234, 0.3) 0%, transparent 40%)`,
                }}
              />
              <div className="relative z-10">
                <img 
                  src={giftBoxImg} 
                  alt="Thoughtful Gifting" 
                  className="w-full max-w-md drop-shadow-2xl"
                  data-testid="img-gift-box"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}