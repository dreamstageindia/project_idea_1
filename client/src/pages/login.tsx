import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { OTPVerificationModal } from "@/components/auth/otp-verification-modal";
import { Mail, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import whiteGiftImg from '@assets/image_1764034739122.png';
import carelonLogoImg from '@assets/image_1764034739122.png';

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
  const [email, setEmail] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [fetchedName, setFetchedName] = useState<{ firstName: string; lastName: string } | null>(null);
  const [isFetchingName, setIsFetchingName] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [prefill, setPrefill] = useState<{ firstName: string; lastName: string } | null>(null);

  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const { data: branding } = useQuery<Branding>({ queryKey: ["/api/admin/branding"] });
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const company = branding?.companyName || "Carelon";
  const logoUrl = branding?.logoUrl || null;

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
  }, [primary, accent]);

  const sendOtpMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/send-otp", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setPrefill(fetchedName ?? { firstName: "", lastName: "" });
      setShowConfirmModal(false);
      setShowVerificationModal(true);
      toast({ title: "OTP sent", description: "Please check your email" });
    },
    onError: (err: any) => {
      let message = "Failed to send OTP";
      try {
        const json = JSON.parse(String(err.message).split(": ").slice(1).join(": "));
        message = json?.message || message;
      } catch {}
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { email: string; code: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.employee, data.expiresAt);
      toast({ title: "Login Successful", description: `Welcome, ${data.employee.firstName}!` });
      setShowVerificationModal(false);
      setLocation("/home");
    },
    onError: (err: any) => {
      let message = "Verification failed";
      let remaining: number | undefined;
      let isLocked: boolean | undefined;
      try {
        const json = JSON.parse(String(err.message).split(": ").slice(1).join(": "));
        message = json?.message || message;
        remaining = json?.remainingAttempts;
        isLocked = json?.isLocked;
      } catch {}
      if (isLocked) {
        toast({
          title: "Unsuccessful attempts .. Please contact HR Team !!",
          variant: "destructive",
        });
        setShowVerificationModal(false);
        return;
      }
      if (remaining === 1) {
        toast({
          title: "One attempt left .. Please enter the correct OTP !!",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Verification Failed", description: message, variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    
    setConfirmEmail(normalizedEmail);
    setFetchedName(null);
    setShowConfirmModal(true);

    setIsFetchingName(true);
    try {
      const res = await fetch(`/api/auth/lookup-by-email?email=${encodeURIComponent(normalizedEmail)}`, {
        method: "GET",
        headers: { "accept": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setFetchedName({
          firstName: data?.firstName || "",
          lastName: data?.lastName || "",
        });
      } else if (res.status === 404) {
        setFetchedName(null);
        toast({ title: "Not found", description: "No employee found for this email address.", variant: "destructive" });
      } else {
        const msg = await res.text();
        toast({ title: "Lookup failed", description: msg || "Unable to fetch user name.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Lookup error", description: err?.message || "Unable to fetch user name.", variant: "destructive" });
    } finally {
      setIsFetchingName(false);
    }
  };

  function ConfirmUserModal() {
    const disabled = isFetchingName || !fetchedName;

    return (
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-sm">
          <h3 className="text-lg font-semibold mb-2">Confirm your details</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We found the following details for your email. If they're correct, we'll send an OTP.
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="confirm-email">Email Address</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value.toLowerCase())}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name</Label>
                <Input value={fetchedName?.firstName ?? ""} readOnly />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input value={fetchedName?.lastName ?? ""} readOnly />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const finalEmail = confirmEmail.trim().toLowerCase();
                if (!finalEmail || !isValidEmail(finalEmail)) {
                  toast({ title: "Invalid email", description: "Please check the email address.", variant: "destructive" });
                  return;
                }
                setEmail(finalEmail);
                sendOtpMutation.mutate({ email: finalEmail });
              }}
              disabled={disabled || sendOtpMutation.isPending}
              style={{ backgroundColor: primary, borderColor: primary }}
            >
              {isFetchingName
                ? "Fetching…"
                : sendOtpMutation.isPending
                ? "Sending…"
                : "Send OTP"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
        <img 
          src={carelonLogoImg} 
          alt="Carelon Logo" 
          className="h-12"
          data-testid="img-carelon-logo"
        />
      </div>
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-5xl font-bold text-primary mb-4" data-testid="text-login-title">
            Welcome
          </h1>
          <p className="text-xl text-foreground mb-12" data-testid="text-login-subtitle">
            Login your account
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-left">
              <Label htmlFor="email" className="text-lg mb-3 block">
                email address*
              </Label>
              <Input
                id="email"
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-white text-lg rounded-lg"
                data-testid="input-email"
              />
            </div>
            
            <Button 
              type="submit" 
              size="lg"
              className="w-full max-w-md h-14 text-lg rounded-full mx-auto flex items-center justify-center gap-2"
              data-testid="button-login"
              style={{ backgroundColor: primary }}
              disabled={sendOtpMutation.isPending}
            >
              {sendOtpMutation.isPending ? "Sending..." : "Log in"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>

      <ConfirmUserModal />

      <OTPVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        initialFirstName={prefill?.firstName || ""}
        initialLastName={prefill?.lastName || ""}
        isLoading={verifyOtpMutation.isPending}
        onVerify={(payload) => {
          const finalEmail = email.trim().toLowerCase();
          verifyOtpMutation.mutate({
            email: finalEmail,
            code: payload.code,
            firstName: payload.firstName,
            lastName: payload.lastName,
          });
        }}
        onChangeEmail={() => {
          setShowVerificationModal(false);
          setEmail("");
        }}
        primaryColor={primary}
        companyName={company}
      />
    </div>
  );
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

