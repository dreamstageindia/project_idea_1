import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Mail, Shield, UserPlus } from "lucide-react";

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  onVerify: (data: { firstName: string; lastName: string; code: string }) => void;
  onChangeEmail: () => void;
  primaryColor?: string;
  companyName?: string;
  isNewUser?: boolean;
}

export function OTPVerificationModal(props: OTPVerificationModalProps) {
  const [firstName, setFirstName] = React.useState(props.initialFirstName || "");
  const [lastName, setLastName] = React.useState(props.initialLastName || "");
  const [code, setCode] = React.useState("");
  const [isNewUser] = React.useState(props.isNewUser || false);

  React.useEffect(() => {
    setFirstName(props.initialFirstName || "");
  }, [props.initialFirstName]);
  
  React.useEffect(() => {
    setLastName(props.initialLastName || "");
  }, [props.initialLastName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (firstName.trim() && lastName.trim() && code.trim() && code.length === 6) {
      props.onVerify({ 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        code: code.trim() 
      });
    }
  };

  const isFirstNameEditable = !props.initialFirstName || isNewUser;
  const isLastNameEditable = !props.initialLastName || isNewUser;

  return (
    <Dialog open={props.isOpen} onOpenChange={(o) => { if (!o) props.onClose(); }}>
      <DialogContent className="max-w-md rounded-lg">
        <DialogHeader className="text-center space-y-2">
          <div className="mx-auto mb-2">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto"
              style={{ backgroundColor: props.primaryColor }}
            >
              {isNewUser ? (
                <UserPlus className="h-6 w-6" />
              ) : (
                <Mail className="h-6 w-6" />
              )}
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center">
            {isNewUser ? "Create Account" : "Verify OTP"}
          </DialogTitle>
          <DialogDescription>
            {isNewUser 
              ? "Complete your account setup with the OTP sent to your email"
              : "Please enter OTP sent to your mail ID"
            }
          </DialogDescription>

          {isNewUser && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2 text-blue-800 text-sm">
                <Shield className="h-4 w-4" />
                <span className="font-medium">New Account Creation</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Your account will be created automatically after OTP verification.
              </p>
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  First Name {!isFirstNameEditable && <span className="text-gray-500 text-xs">(pre-filled)</span>}
                </Label>
                <Input 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="h-12 bg-white rounded-lg"
                  required
                  readOnly={!isFirstNameEditable}
                  style={!isFirstNameEditable ? { backgroundColor: '#f9fafb', cursor: 'not-allowed' } : {}}
                />
              </div>
              <div className="text-left">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Last Name {!isLastNameEditable && <span className="text-gray-500 text-xs">(pre-filled)</span>}
                </Label>
                <Input 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="h-12 bg-white rounded-lg"
                  required
                  readOnly={!isLastNameEditable}
                  style={!isLastNameEditable ? { backgroundColor: '#f9fafb', cursor: 'not-allowed' } : {}}
                />
              </div>
            </div>

            <div className="text-left">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">
                Enter OTP*
              </Label>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  className="h-12 bg-white rounded-lg text-center font-semibold tracking-widest text-lg"
                  required
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                  {code.length}/6
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Check your email for the 6-digit code
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              disabled={props.isLoading || !firstName.trim() || !lastName.trim() || !code.trim() || code.length !== 6}
              className="w-full h-12 rounded-lg text-white font-medium hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: props.primaryColor }}
            >
              {props.isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isNewUser ? "Creating Account..." : "Verifying..."}
                </>
              ) : (
                <>
                  {isNewUser ? "Create Account" : "Verify & Login"}
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </Button>

            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-gray-500">
                {isNewUser ? "Setting up your account..." : "Verifying your identity..."}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={props.onChangeEmail}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              >
                Change Email
              </Button>
            </div>
          </div>
        </form>

        {/* OTP Help */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Need help?</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your email spam/junk folder</li>
              <li>Make sure you entered the correct email address</li>
              <li>OTP expires in 10 minutes</li>
              <li>Contact support if you don't receive the OTP</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}