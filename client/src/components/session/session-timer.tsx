// src/components/session/session-timer.tsx
import { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SessionTimer() {
  const { token, sessionExpiry } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [remaining, setRemaining] = useState<number>(() => {
    if (!sessionExpiry) return 0;
    const ms = Date.parse(sessionExpiry) - Date.now();
    return ms > 0 ? Math.floor(ms / 1000) : 0;
  });

  // tick every second; never logs out here
  useEffect(() => {
    if (!sessionExpiry) {
      setRemaining(0);
      return;
    }
    const update = () => {
      const ms = Date.parse(sessionExpiry) - Date.now();
      setRemaining(ms > 0 ? Math.floor(ms / 1000) : 0);
    };
    update(); // immediate sync
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [sessionExpiry]);

  // hide when not authenticated, no expiry, or user hid it
  if (!token || !sessionExpiry || !isVisible) return null;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isWarning = remaining <= 60;

  return (
    <div className={`fixed top-4 right-4 z-50 ${isWarning ? "animate-pulse" : ""}`} data-testid="session-timer">
      <div className="px-3 py-1 rounded-full bg-black/70 text-white text-sm font-mono shadow flex items-center space-x-2">
        <Clock className="h-4 w-4" />
        <span data-testid="timer-display">{timeDisplay}</span>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20 p-1 h-auto ml-2"
          onClick={() => setIsVisible(false)}
          data-testid="button-hide-timer"
          aria-label="Hide session timer"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
