import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck } from "lucide-react";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (yearOfBirth: number) => void;
  employee: any;
  isLoading: boolean;
  onChangeEmployeeId: () => void;
}

export function VerificationModal({
  isOpen,
  onClose,
  onVerify,
  employee,
  isLoading,
  onChangeEmployeeId,
}: VerificationModalProps) {
  const [yearOfBirth, setYearOfBirth] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const year = parseInt(yearOfBirth);
    if (year >= 1950 && year <= 2010) {
      onVerify(year);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-verification">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-accent/10 rounded-full mx-auto mb-4 flex items-center justify-center">
            <UserCheck className="text-accent text-2xl" />
          </div>
          <h3 className="text-xl font-semibold">Verify Your Identity</h3>
        </div>

        {/* Employee Details Display */}
        {employee && (
          <div className="bg-muted rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">First Name</p>
                <p className="font-medium" data-testid="text-employee-first-name">
                  {employee.firstName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Name</p>
                <p className="font-medium" data-testid="text-employee-last-name">
                  {employee.lastName}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">Employee ID</p>
              <div className="flex items-center justify-between">
                <p className="font-medium" data-testid="text-employee-id-display">
                  {employee.employeeId}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={onChangeEmployeeId}
                  className="text-accent hover:underline p-0 h-auto"
                  data-testid="button-change-employee-id"
                >
                  Change ID
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Year of Birth Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="yearOfBirth" className="block text-sm font-medium mb-2">
              Year of Birth
            </Label>
            <Input
              id="yearOfBirth"
              type="number"
              value={yearOfBirth}
              onChange={(e) => setYearOfBirth(e.target.value)}
              placeholder="YYYY"
              min="1950"
              max="2010"
              className="form-input"
              data-testid="input-year-of-birth"
              required
            />
          </div>
          
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel-verification"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
              data-testid="button-verify"
            >
              {isLoading ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
