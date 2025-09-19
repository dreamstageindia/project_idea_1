import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { VerificationModal } from "@/components/auth/verification-modal";
import { Building, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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

export default function Login() {
  const [employeeId, setEmployeeId] = useState("");
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [remainingAttempts, setRemainingAttempts] = useState(2);
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  // Pull branding straight from DB
  const { data: branding } = useQuery<Branding>({
    queryKey: ["/api/admin/branding"],
  });

  // derive branding with sane defaults
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const company = branding?.companyName || "TechCorp";
  const logoUrl = branding?.logoUrl || null;
  const bannerUrl = branding?.bannerUrl || null;
  const bannerText = branding?.bannerText || "";

  // expose CSS vars
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
  }, [primary, accent]);

  // full-page background style
  const pageBgStyle = useMemo<React.CSSProperties>(() => {
    if (bannerUrl) {
      return {
        backgroundImage: `url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    // fallback gradient if no banner
    return {
      backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
    };
  }, [bannerUrl, primary, accent]);

  const loginMutation = useMutation({
    mutationFn: async (data: { employeeId: string }) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      setEmployeeData(data.employee);
      setShowVerificationModal(true);
    },
    onError: (error: any) => {
      // If backend returns 423 timed lock, it will be inside error.message JSON payload
      try {
        const errorParts = error.message?.split(": ");
        const jsonPart = errorParts?.slice(1).join(": ");
        const errorData = jsonPart ? JSON.parse(jsonPart) : null;

        if (errorData?.isLocked) {
          toast({
            title: "Unsuccessful attempts .. Please contact HR Team !!",
            description: errorData.minutesRemaining
              ? `Please try again after ~${errorData.minutesRemaining} minute(s).`
              : undefined,
            variant: "destructive",
          });
          return;
        }
      } catch {
        // ignore parse error and fall through
      }

      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async (data: { employeeId: string; yearOfBirth: number }) => {
      const response = await apiRequest("POST", "/api/auth/verify", data);
      return response.json();
    },
    onSuccess: (data) => {
      login(data.token, data.employee, data.expiresAt);
      toast({
        title: "Login Successful",
        description: `Welcome, ${data.employee.firstName}!`,
      });
      setShowVerificationModal(false);
      setRemainingAttempts(2);
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      // Show exact copy per requirements
      try {
        const errorParts = error.message.split(": ");
        const jsonPart = errorParts.slice(1).join(": ");
        const errorData = JSON.parse(jsonPart);

        // Timed lock or hard lock
        if (errorData.isLocked) {
          toast({
            title: "Unsuccessful attempts .. Please contact HR Team !!",
            description: errorData.minutesRemaining
              ? `Please try again after ~${errorData.minutesRemaining} minute(s).`
              : undefined,
            variant: "destructive",
          });
          setShowVerificationModal(false);
          return;
        }

        // First wrong attempt
        if (errorData.remainingAttempts === 1) {
          setRemainingAttempts(1);
          toast({
            title: "One attempt left .. Please enter the correct Year of Birth !!",
            variant: "destructive",
          });
          return;
        }

        // Fallback
        toast({
          title: "Verification Failed",
          description: errorData.message || error.message,
          variant: "destructive",
        });
      } catch {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim()) {
      toast({
        title: "Error",
        description: "Please enter your Employee ID",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ employeeId: employeeId.trim() });
  };

  const handleVerification = (yearOfBirth: number) => {
    verificationMutation.mutate({ employeeId, yearOfBirth });
  };

  return (
    <div
      className="min-h-screen relative"
      style={pageBgStyle}
    >
      {/* Dark overlay for readability when an image is present */}
      {bannerUrl && (
        <div className="absolute inset-0 bg-black/40" aria-hidden />
      )}

      {/* Optional banner text overlay (top center) */}
      {(bannerText && bannerUrl) && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* You can place bannerText here if you want it visible on the login page */}
          </div>
        </div>
      )}

      {/* Centered card + brand header */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo + company name */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex items-center justify-center">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Company Logo"
                  className="object-contain w-24 h-24 rounded-lg bg-white/90 p-2 shadow"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-xl mx-auto flex items-center justify-center"
                  style={{ backgroundColor: primary }}
                >
                  <Building className="text-white text-2xl" />
                </div>
              )}
            </div>

            <h1
              className="text-3xl font-bold drop-shadow-sm"
              style={{ color: bannerUrl ? "#ffffff" : primary }}
            >
              {company} Portal
            </h1>
            {!bannerUrl && (
              <p className="text-muted-foreground mt-2">Employee Product Selection System</p>
            )}
          </div>

          {/* Login Card */}
          <Card className="shadow-xl border border-border/50 backdrop-blur bg-white/95">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-semibold text-center mb-6">
                Employee Login
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label
                    htmlFor="employeeId"
                    className="block text-sm font-medium mb-2"
                  >
                    Employee ID
                  </Label>
                  <Input
                    id="employeeId"
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="Enter your Employee ID"
                    className="form-input"
                    data-testid="input-employee-id"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  style={{
                    backgroundColor: primary,
                    borderColor: primary,
                  }}
                  disabled={loginMutation.isPending}
                  data-testid="button-continue"
                >
                  {loginMutation.isPending ? "Please wait..." : "Continue"}
                </Button>
              </form>

              <div className="mt-4 text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center">
                  <ShieldCheck className="mr-1 h-4 w-4" />
                  Secure employee authentication
                </p>
              </div>
            </CardContent>
          </Card>

          {remainingAttempts < 2 && remainingAttempts > 0 && (
            <div
              className="mt-4 p-4 rounded-lg text-center border"
              style={{ borderColor: "#ef444433", background: "#ef444411" }}
            >
              <p className="text-destructive font-medium" data-testid="text-remaining-attempts">
                {remainingAttempts} login attempt{remainingAttempts === 1 ? "" : "s"} remaining
              </p>
            </div>
          )}

          <VerificationModal
            isOpen={showVerificationModal}
            onClose={() => setShowVerificationModal(false)}
            onVerify={handleVerification}
            employee={employeeData}
            isLoading={verificationMutation.isPending}
            onChangeEmployeeId={() => {
              setShowVerificationModal(false);
              setEmployeeId("");
            }}
          />
        </div>
      </div>
    </div>
  );
}
