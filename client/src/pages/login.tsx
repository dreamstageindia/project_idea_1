// src/pages/login.tsx
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

  // derive colors with sane defaults if DB fields are missing
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const company = branding?.companyName || "TechCorp";
  const logoUrl = branding?.logoUrl || null;
  const bannerUrl = branding?.bannerUrl || null;
  const bannerText = branding?.bannerText || "";

  // Apply CSS variables for this page so components can inherit if needed
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
    return () => {
      // optional cleanup not strictly required
    };
  }, [primary, accent]);

  // computed gradient for page bg
  const bgStyle = useMemo(
    () => ({
      backgroundImage: `linear-gradient(135deg, ${primary}14, ${accent}14)`,
    }),
    [primary, accent]
  );

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
      // include expiresAt so session timer stays accurate
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
      try {
        const errorParts = error.message.split(": ");
        const jsonPart = errorParts.slice(1).join(": ");
        const errorData = JSON.parse(jsonPart);

        if (errorData.remainingAttempts !== undefined) {
          const attempts = errorData.remainingAttempts;
          setRemainingAttempts(attempts);

          if (attempts === 0 || errorData.isLocked) {
            toast({
              title: "Account Locked",
              description: "Your account has been locked due to too many failed attempts.",
              variant: "destructive",
            });
            setShowVerificationModal(false);
          } else {
            toast({
              title: "Invalid Year of Birth",
              description: `${attempts} attempt${attempts === 1 ? "" : "s"} remaining.`,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Verification Failed",
            description: errorData.message || error.message,
            variant: "destructive",
          });
        }
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
      className="min-h-screen flex items-center justify-center p-4"
      style={bgStyle}
    >
      <div className="w-full max-w-md">
        {/* Optional Banner */}
        

        {/* Header with Logo or Fallback Icon */}
        <div className="text-center mb-8">
          
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Company Logo"
                className="object-contain w-42 h-42"
              />
            ) : (
              <Building className="text-white text-2xl" />
            )}
         

          <h1
            className="text-3xl font-bold"
            style={{ color: primary }}
          >
            {company} Portal
          </h1>
          
        </div>

        <Card className="shadow-lg border border-border bg-white">
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
          <div className="mt-4 p-4 rounded-lg text-center border" style={{ borderColor: "#ef444433", background: "#ef444411" }}>
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
  );
}
