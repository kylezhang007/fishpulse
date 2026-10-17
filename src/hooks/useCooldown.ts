import { useCallback, useEffect, useState } from "react";
import { useLocalStorage } from "./useLocalStorage";

/**
 * Client-side submission cooldown (UX + light abuse friction only).
 * Real protection lives server-side — see the rate-limit trigger in the migration.
 */
export function useCooldown(seconds: number) {
  const [lastAt, setLastAt] = useLocalStorage<number>("fishpulse.lastReportAt", 0);
  const [now, setNow] = useState(Date.now());
  const remaining = Math.max(0, Math.ceil((lastAt + seconds * 1000 - now) / 1000));

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [remaining]);

  const start = useCallback(() => {
    const t = Date.now();
    setLastAt(t);
    setNow(t);
  }, [setLastAt]);

  return { remaining, start };
}
