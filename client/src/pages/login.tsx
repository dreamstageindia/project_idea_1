import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { OTPVerificationModal } from "@/components/auth/otp-verification-modal";
import { Mail, ArrowRight, CheckCircle, XCircle, Loader2, Shield, Building } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface DomainCheckResult {
  isWhitelisted: boolean;
  domain: {
    domain: string;
    autoCreateUser: boolean;
    defaultPoints: number;
    canLoginWithoutEmployeeId: boolean;
  } | null;
}

interface LookupResponse {
  firstName: string | null;
  lastName: string | null;
  exists: boolean;
  domainWhitelisted?: boolean;
  autoCreate?: boolean;
  defaultPoints?: number;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [fetchedName, setFetchedName] = useState<LookupResponse | null>(null);
  const [isFetchingName, setIsFetchingName] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [prefill, setPrefill] = useState<{ firstName: string; lastName: string } | null>(null);
  const [domainStatus, setDomainStatus] = useState<{
    isWhitelisted: boolean;
    domain: any;
    isLoading: boolean;
    checked: boolean;
  }>({ 
    isWhitelisted: false, 
    domain: null, 
    isLoading: false,
    checked: false 
  });

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

  // Check domain when email changes
  useEffect(() => {
    const checkDomain = async () => {
      const emailDomain = email.split('@')[1];
      if (!emailDomain) {
        setDomainStatus({ 
          isWhitelisted: false, 
          domain: null, 
          isLoading: false,
          checked: false 
        });
        return;
      }

      setDomainStatus(prev => ({ ...prev, isLoading: true }));
      
      try {
        const response = await fetch(`/api/auth/check-domain/${emailDomain}`);
        if (response.ok) {
          const data: DomainCheckResult = await response.json();
          setDomainStatus({ 
            isWhitelisted: data.isWhitelisted, 
            domain: data.domain,
            isLoading: false,
            checked: true 
          });
        }
      } catch (error) {
        setDomainStatus({ 
          isWhitelisted: false, 
          domain: null, 
          isLoading: false,
          checked: true 
        });
      }
    };

    const debounce = setTimeout(checkDomain, 500);
    return () => clearTimeout(debounce);
  }, [email]);

  const sendOtpMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const res = await apiRequest("POST", "/api/auth/send-otp", data);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setPrefill(fetchedName ? {
        firstName: fetchedName.firstName || "",
        lastName: fetchedName.lastName || ""
      } : { firstName: "", lastName: "" });
      setShowConfirmModal(false);
      setShowVerificationModal(true);
      toast({ 
        title: "OTP sent", 
        description: data.message || "Please check your email",
        variant: data.isNewUser ? "default" : "default"
      });
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
      toast({ 
        title: "Login Successful", 
        description: `Welcome, ${data.employee.firstName}!` 
      });
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
      toast({ 
        title: "Error", 
        description: "Please enter a valid email address", 
        variant: "destructive" 
      });
      return;
    }

    // Check domain authorization first
    if (domainStatus.checked && !domainStatus.isWhitelisted) {
      toast({ 
        title: "Domain Not Authorized", 
        description: "Your email domain is not authorized to access this platform.", 
        variant: "destructive" 
      });
      return;
    }

    // If domain allows auto-creation without checking user existence, go directly to OTP
    if (domainStatus.domain?.autoCreateUser && domainStatus.domain?.canLoginWithoutEmployeeId) {
      // Auto-create flow - send OTP directly
      setConfirmEmail(normalizedEmail);
      setFetchedName({
        firstName: "",
        lastName: "",
        exists: false,
        domainWhitelisted: true,
        autoCreate: true,
        defaultPoints: domainStatus.domain.defaultPoints || 0
      });
      setShowConfirmModal(true);
      return;
    }

    // For existing users or domains that require pre-registration
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
        const data: LookupResponse = await res.json();
        setFetchedName(data);
        
        if (!data.exists && !data.autoCreate && !data.domainWhitelisted) {
          toast({ 
            title: "Account Not Found", 
            description: "No account exists for this email. Please contact your administrator.", 
            variant: "destructive" 
          });
          setShowConfirmModal(false);
        }
      } else if (res.status === 404) {
        setFetchedName({
          firstName: "",
          lastName: "",
          exists: false,
          domainWhitelisted: false,
          autoCreate: false
        });
      } else {
        const msg = await res.text();
        toast({ 
          title: "Lookup failed", 
          description: msg || "Unable to fetch user information.", 
          variant: "destructive" 
        });
      }
    } catch (err: any) {
      toast({ 
        title: "Lookup error", 
        description: err?.message || "Unable to fetch user information.", 
        variant: "destructive" 
      });
    } finally {
      setIsFetchingName(false);
    }
  };

  function ConfirmUserModal() {
    const isAutoCreateUser = fetchedName?.autoCreate && !fetchedName?.exists;
    const isExistingUser = fetchedName?.exists;
    const isDomainWhitelisted = fetchedName?.domainWhitelisted || domainStatus.isWhitelisted;
    
    const canProceed = isFetchingName ? false : 
      isExistingUser ? true : // Existing users can always proceed
      isAutoCreateUser ? true : // Auto-create users can proceed
      false; // Others cannot

    const getStatusMessage = () => {
      if (isFetchingName) return "Checking account status...";
      if (isExistingUser) return "Existing account found";
      if (isAutoCreateUser) return "New user - Account will be created automatically";
      if (!isDomainWhitelisted) return "Domain not authorized";
      return "Account not found";
    };

    const getStatusColor = () => {
      if (isFetchingName) return "text-gray-600";
      if (isExistingUser) return "text-green-600";
      if (isAutoCreateUser) return "text-blue-600";
      if (!isDomainWhitelisted) return "text-red-600";
      return "text-amber-600";
    };

    const getStatusIcon = () => {
      if (isFetchingName) return <Loader2 className="h-4 w-4 animate-spin" />;
      if (isExistingUser) return <CheckCircle className="h-4 w-4" />;
      if (isAutoCreateUser) return <Shield className="h-4 w-4" />;
      return <XCircle className="h-4 w-4" />;
    };

    return (
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle>Confirm Login</DialogTitle>
            <DialogDescription>
              Verify your email and account details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Email Display */}
            <div>
              <Label htmlFor="confirm-email">Email Address</Label>
              <Input
                id="confirm-email"
                type="email"
                value={confirmEmail}
                readOnly
                className="bg-gray-50"
              />
            </div>

            

            {/* Name Fields (if existing user) */}
            {isExistingUser && fetchedName && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name</Label>
                  <Input 
                    value={fetchedName.firstName || ""} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input 
                    value={fetchedName.lastName || ""} 
                    readOnly 
                    className="bg-gray-50"
                  />
                </div>
              </div>
            )}

            

            {/* Domain Not Authorized Warning */}
            {!isDomainWhitelisted && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  <strong>Domain Not Authorized:</strong> Your email domain is not authorized 
                  to access this platform. Please contact your administrator.
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button 
              variant="secondary" 
              onClick={() => setShowConfirmModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const finalEmail = confirmEmail.trim().toLowerCase();
                if (!finalEmail || !isValidEmail(finalEmail)) {
                  toast({ 
                    title: "Invalid email", 
                    description: "Please check the email address.", 
                    variant: "destructive" 
                  });
                  return;
                }
                if (!canProceed) {
                  toast({ 
                    title: "Cannot Proceed", 
                    description: "Your account cannot be created or accessed.", 
                    variant: "destructive" 
                  });
                  return;
                }
                setEmail(finalEmail);
                sendOtpMutation.mutate({ email: finalEmail });
              }}
              disabled={!canProceed || sendOtpMutation.isPending}
              style={{ backgroundColor: primary, borderColor: primary }}
            >
              {sendOtpMutation.isPending
                ? "Sending OTP..."
                : isAutoCreateUser
                ? "Create Account & Send OTP"
                : "Send OTP"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isEmailValid = email.includes('@') && email.includes('.');
  const emailDomain = email.split('@')[1];
  const canLogin = isEmailValid && 
    (domainStatus.checked ? domainStatus.isWhitelisted : true) && 
    !domainStatus.isLoading;

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
            alt={`${company} Logo`}
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
      
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-5xl font-bold text-primary mb-4" data-testid="text-login-title">
            Welcome
          </h1>
          <p className="text-xl text-foreground mb-12" data-testid="text-login-subtitle">
            Login your account
          </p>
          
          {/* Domain Status Alert */}
          {emailDomain && domainStatus.checked && (
            <div className="mb-6 max-w-md mx-auto">
              <Alert variant={domainStatus.isWhitelisted ? "default" : "destructive"}>
                <div className="flex items-start gap-2">
                  {domainStatus.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mt-0.5" />
                  ) : domainStatus.isWhitelisted ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  )}
                  <AlertDescription className="text-sm">
                    {domainStatus.isLoading ? (
                      "Checking domain authorization..."
                    ) : domainStatus.isWhitelisted ? (
                      <div className="space-y-1">
                        <span className="font-medium">Domain authorized</span>
                        {domainStatus.domain?.autoCreateUser && (
                          <div className="text-xs text-muted-foreground">
                            New users from @{emailDomain} can auto-register
                            {domainStatus.domain.defaultPoints > 0 && (
                              <span> with {domainStatus.domain.defaultPoints} starting points</span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="font-medium">Domain not authorized</span>
                        <div className="text-xs">
                          @{emailDomain} is not authorized to access this platform.
                          Please contact your administrator.
                        </div>
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-left max-w-md mx-auto">
              <Label htmlFor="email" className="text-lg mb-3 block">
                Email Address*
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-white text-lg rounded-lg"
                data-testid="input-email"
              />
              {emailDomain && !domainStatus.checked && !domainStatus.isLoading && (
                <p className="text-xs text-gray-500 mt-2">
                  Enter a valid company email address
                </p>
              )}
            </div>
            
            <Button 
              type="submit" 
              size="lg"
              className="w-full max-w-md h-14 text-lg rounded-full mx-auto flex items-center justify-center gap-2"
              data-testid="button-login"
              style={{ backgroundColor: primary }}
              disabled={sendOtpMutation.isPending || domainStatus.isLoading || !canLogin}
            >
              {sendOtpMutation.isPending ? "Sending..." : 
               domainStatus.isLoading ? "Checking..." : 
               "Log in"}
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