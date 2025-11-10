// src/pages/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { OTPVerificationModal } from "@/components/auth/otp-verification-modal";
import { Building, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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

function toE164With91Default(raw: string): string {
  const digits = raw.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return `+91${digits}`;
}

function enforcePlus91PrefixLive(value: string): string {
  const digits = value.replace(/\D+/g, "");
  if (!digits) return "+91 ";
  if (digits.startsWith("91")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return `+91${digits}`;
}

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPhone, setConfirmPhone] = useState("");
  const [fetchedName, setFetchedName] = useState<{ firstName: string; lastName: string } | null>(null);
  const [isFetchingName, setIsFetchingName] = useState(false);

  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [prefill, setPrefill] = useState<{ firstName: string; lastName: string } | null>(null);

  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  // Branding
  const { data: branding } = useQuery<Branding>({ queryKey: ["/api/admin/branding"] });
  const primary = branding?.primaryColor || "#1e40af";
  const accent = branding?.accentColor || "#f97316";
  const company = branding?.companyName || "TechCorp";
  const logoUrl = branding?.logoUrl || null;
  const bannerUrl = branding?.bannerUrl || null;
  const bannerText = branding?.bannerText || "";

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", primary);
    root.style.setProperty("--brand-accent", accent);
  }, [primary, accent]);

  const pageBgStyle = useMemo<React.CSSProperties>(() => {
    if (bannerUrl) {
      return {
        backgroundImage: `url(${bannerUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return { backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` };
  }, [bannerUrl, primary, accent]);

  // Send OTP (after confirm)
  const sendOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string }) => {
      const res = await apiRequest("POST", "/api/auth/send-otp", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setPrefill(fetchedName ?? { firstName: "", lastName: "" });
      setShowConfirmModal(false);
      setShowVerificationModal(true);
      toast({ title: "OTP sent", description: "Please check your phone" });
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

  // Verify OTP
  const verifyOtpMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; code: string; firstName: string; lastName: string }) => {
      const res = await apiRequest("POST", "/api/auth/verify-otp", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      login(data.token, data.employee, data.expiresAt);
      toast({ title: "Login Successful", description: `Welcome, ${data.employee.firstName}!` });
      setShowVerificationModal(false);
      setLocation("/dashboard");
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

  // Main submit → open confirm modal & fetch name from DB
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = toE164With91Default(phoneNumber);
    if (!e164) {
      toast({ title: "Error", description: "Please enter your Phone Number", variant: "destructive" });
      return;
    }
    setConfirmPhone(e164);
    setFetchedName(null);
    setShowConfirmModal(true);

    // fetch name from DB (requires /api/auth/lookup-by-phone)
    setIsFetchingName(true);
    try {
      const res = await fetch(`/api/auth/lookup-by-phone?phoneNumber=${encodeURIComponent(e164)}`, {
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
        toast({ title: "Not found", description: "No employee found for this phone number.", variant: "destructive" });
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
            We found the following details for your number. If they’re correct, we’ll send an OTP.
          </p>

          <div className="space-y-3">
            <div>
              <Label htmlFor="confirm-phone">Phone Number</Label>
              <Input
                id="confirm-phone"
                type="tel"
                value={confirmPhone}
                onChange={(e) => {
                  const v = enforcePlus91PrefixLive(e.target.value);
                  setConfirmPhone(v);
                }}
                readOnly
              />
              <p className="text-xs text-muted-foreground mt-1">“+91” is applied automatically if missing.</p>
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
                const finalPhone = toE164With91Default(confirmPhone);
                if (!finalPhone) {
                  toast({ title: "Invalid phone", description: "Please check the number.", variant: "destructive" });
                  return;
                }
                // keep main input in sync
                setPhoneNumber(finalPhone);

                // proceed to send OTP
                sendOtpMutation.mutate({ phoneNumber: finalPhone });
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
    <div className="min-h-screen relative" style={pageBgStyle}>
      {bannerUrl && <div className="absolute inset-0 bg-black/40" aria-hidden />}

      {(bannerText && bannerUrl) && (
        <div className="absolute top-0 left-0 right-0 z-10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4" />
        </div>
      )}

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex items-center justify-center">
              {logoUrl ? (
                <img src={logoUrl} alt="Company Logo" className="object-contain w-24 h-24 rounded-lg bg-white/90 p-2 shadow" />
              ) : (
                <div className="w-20 h-20 rounded-xl mx-auto flex items-center justify-center" style={{ backgroundColor: primary }}>
                  <Building className="text-white text-2xl" />
                </div>
              )}
            </div>

            <h1 className="text-3xl font-bold drop-shadow-sm" style={{ color: bannerUrl ? "#ffffff" : primary }}>
              {company} Portal
            </h1>
            {!bannerUrl && <p className="text-muted-foreground mt-2">Employee Product Selection System</p>}
          </div>

          <Card className="shadow-xl border border-border/50 backdrop-blur bg-white/95">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-semibold text-center mb-6">Employee Login</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="phone" className="block text-sm font-medium mb-2">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="form-input"
                    data-testid="input-phone"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: primary, borderColor: primary }}
                  disabled={sendOtpMutation.isPending}
                  data-testid="button-continue"
                >
                  Continue
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

          {/* 1) Confirm (shows fetched name) */}
          <ConfirmUserModal />

          {/* 2) Enter OTP */}
          <OTPVerificationModal
            isOpen={showVerificationModal}
            onClose={() => setShowVerificationModal(false)}
            initialFirstName={prefill?.firstName || ""}
            initialLastName={prefill?.lastName || ""}
            isLoading={verifyOtpMutation.isPending}
            onVerify={(payload) => {
              const finalPhone = toE164With91Default(phoneNumber);
              // pass the fetched names; payload.first/last may be ignored by your backend now
              verifyOtpMutation.mutate({
                phoneNumber: finalPhone,
                code: payload.code,
                firstName: prefill?.firstName || "",
                lastName: prefill?.lastName || "",
              });
            }}
            onChangePhone={() => {
              setShowVerificationModal(false);
              setPhoneNumber("");
            }}
          />
        </div>
      </div>
    </div>
  );
}
