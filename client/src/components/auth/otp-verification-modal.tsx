// src/components/auth/otp-verification-modal.tsx
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

export function OTPVerificationModal(props: {
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  initialFirstName?: string;
  initialLastName?: string;
  onVerify: (data: { firstName: string; lastName: string; code: string }) => void;
  onChangePhone: () => void;
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

  return (
    <Dialog open={props.isOpen} onOpenChange={(o) => { if (!o) props.onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Your Identity</DialogTitle>
          <DialogDescription>Enter the OTP you received and confirm your name.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block">First Name</Label>
              <Input value={firstName} disabled onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block">Last Name</Label>
              <Input value={lastName} disabled onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1 block">OTP Code</Label>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter the code"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={props.onChangePhone}>Change Phone</Button>
            <Button
              onClick={() => props.onVerify({ firstName: firstName.trim(), lastName: lastName.trim(), code: code.trim() })}
              disabled={props.isLoading || !firstName.trim() || !lastName.trim() || !code.trim()}
            >
              {props.isLoading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
