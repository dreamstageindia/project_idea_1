import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Lock, ShieldQuestion, Unlock } from "lucide-react";

interface AdminLockScreenProps {
  onUnlock: (password: string) => boolean;
}

export function AdminLockScreen({ onUnlock }: AdminLockScreenProps) {
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = onUnlock(password);
    if (success) {
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Access
            </CardTitle>
            <ShieldQuestion className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="adminPassword">8-digit Admin Password</Label>
              <Input
                id="adminPassword"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={8}
                data-testid="input-admin-password"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Frontend lock only. Add server auth for real protection.
              </p>
            </div>
            <Button type="submit" className="w-full" data-testid="button-admin-unlock">
              <Unlock className="h-4 w-4 mr-2" />
              Unlock
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}