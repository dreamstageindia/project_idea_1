// OTP Verification Modal Component - Updated to match new design
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";

export function OTPVerificationModal(props: {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  onVerify: (data: { firstName: string; lastName: string; code: string }) => void;
  onChangeEmail: () => void;
  primaryColor?: string;
  companyName?: string;
}) {
  const [firstName, setFirstName] = React.useState(props.initialFirstName || "");
  const [lastName, setLastName] = React.useState(props.initialLastName || "");
  const [code, setCode] = React.useState("");

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

  return (
    <Dialog open={props.isOpen} onOpenChange={(o) => { if (!o) props.onClose(); }}>
      <DialogContent className="max-w-md rounded-lg">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto"
              style={{ backgroundColor: props.primaryColor }}
            >
              {props.companyName?.charAt(0) || "C"}
            </div>
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {props.companyName || "Carelon"}
          </DialogTitle>
          <p className="text-gray-600 text-sm mt-2">
            Please enter OTP sent to your mail ID
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-left">
                <Label className="text-lg font-medium text-gray-700 mb-2 block">
                  First Name
                </Label>
                <Input 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter first name"
                  className="h-14 bg-white text-lg rounded-lg"
                  required
                />
              </div>
              <div className="text-left">
                <Label className="text-lg font-medium text-gray-700 mb-2 block">
                  Last Name
                </Label>
                <Input 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter last name"
                  className="h-14 bg-white text-lg rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="text-left">
              <Label className="text-lg font-medium text-gray-700 mb-2 block">
                Enter OTP*
              </Label>
              <Input
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="h-14 bg-white text-lg rounded-lg text-center font-semibold tracking-widest"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button 
              type="button"
              variant="outline" 
              onClick={props.onChangeEmail}
              className="border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full h-12 px-6"
            >
              Change Email
            </Button>
            <Button
              type="submit"
              disabled={props.isLoading || !firstName.trim() || !lastName.trim() || !code.trim() || code.length !== 6}
              className="h-12 px-6 rounded-full text-white font-medium hover:opacity-90 flex items-center gap-2"
              style={{ backgroundColor: props.primaryColor }}
            >
              {props.isLoading ? "Verifying..." : "Log in"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}