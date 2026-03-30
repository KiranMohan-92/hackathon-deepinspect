import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Polls backend /health endpoint every 30s.
 * Returns { status, model, lastChecked }
 */
export default function useHealthCheck() {
  const [health, setHealth] = useState({ status: "checking", model: null, lastChecked: null });

  const check = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setHealth({ status: "ok", model: data.model, lastChecked: Date.now() });
      } else {
        setHealth((h) => ({ ...h, status: "error", lastChecked: Date.now() }));
      }
    } catch {
      setHealth((h) => ({ ...h, status: "offline", lastChecked: Date.now() }));
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return health;
}
