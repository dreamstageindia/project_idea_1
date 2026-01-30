import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Building } from "lucide-react";
import virtusaBg1 from "@assets/virtusa_bg_1.png";

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

  // Virtusa-like defaults if branding not set
  const primary = branding?.primaryColor || "#053354"; // deep navy
  const accent = branding?.accentColor || "#02F576"; // neon green

  const logoUrl = branding?.logoUrl || null;
  const companyName = branding?.companyName || "Virtusa";

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${virtusaBg1})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Dark + navy wash for readability */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(5,51,84,0.92) 0%, rgba(5,51,84,0.72) 45%, rgba(5,51,84,0.35) 100%)",
        }}
      />

      {/* Subtle “tech glow” accents */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `
            radial-gradient(circle at 15% 35%, rgba(2,245,118,0.14) 0%, transparent 55%),
            radial-gradient(circle at 75% 70%, rgba(255,255,255,0.10) 0%, transparent 60%),
            radial-gradient(circle at 55% 25%, rgba(2,245,118,0.10) 0%, transparent 55%)
          `,
        }}
      />

      {/* Logo */}
      <div className="absolute top-8 left-8 z-20">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${companyName} Logo`}
            className="h-10 md:h-12"
            data-testid="img-sun-logo"
          />
        ) : (
          <Building
            className="h-10 w-10 md:h-12 md:w-12"
            style={{ color: "#FFFFFF" }}
            data-testid="img-sun-logo"
          />
        )}
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex items-center z-10">
        <div className="max-w-7xl mx-auto px-8 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="max-w-xl">
              <p
                className="text-sm tracking-widest uppercase mb-4"
                style={{ color: "rgba(255,255,255,0.75)" }}
              >
                Enterprise Gifting Platform
              </p>

              <h1
                className="text-5xl lg:text-6xl font-semibold mb-3 leading-tight"
                style={{ color: "#FFFFFF" }}
                data-testid="text-landing-title"
              >
                Celebrate
              </h1>

              <h2
                className="text-5xl lg:text-6xl font-semibold mb-6 leading-tight"
                style={{ color: accent }}
                data-testid="text-landing-subtitle"
              >
                Thoughtful Gifting
              </h2>

              <p
                className="text-lg md:text-xl mb-10"
                style={{ color: "rgba(255,255,255,0.80)" }}
                data-testid="text-landing-tagline"
              >
                Gifting that articulates joy every time.
              </p>

              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                    For All
                  </p>
                  <p className="text-2xl font-semibold" style={{ color: accent }}>
                    Seasons
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                  <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
                    For All
                  </p>
                  <p className="text-2xl font-semibold" style={{ color: accent }}>
                    Reasons
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full max-w-md h-14 text-lg rounded-full"
                onClick={() => setLocation("/login")}
                data-testid="button-login-landing"
                style={{
                  backgroundColor: accent,
                  color: primary,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                Login
              </Button>

              <p className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                Secure access • OTP verification • Domain controls
              </p>
            </div>

            {/* Keep right column empty for layout */}
            <div className="hidden md:block" />
          </div>
        </div>
      </div>
    </div>
  );
}
