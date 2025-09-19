import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";

export function useSession() {
  const { isAuthenticated, sessionExpiry } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !sessionExpiry) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(sessionExpiry).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, sessionExpiry]);

  return {
    timeRemaining,
    isExpired: timeRemaining <= 0,
  };
}
