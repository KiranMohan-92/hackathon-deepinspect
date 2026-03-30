import useAppStore from "../store/useAppStore";
import { BridgeSummary, ScanProgressItem } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface StreamActions {
  setLoading: (isLoading: boolean) => void;
  setBridges: (bridges: BridgeSummary[]) => void;
  setError: (error: string | null) => void;
  addScanProgress: (item: ScanProgressItem) => void;
  clearScanProgress: () => void;
}

async function fetchWithFallback(endpoint: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE}/api/v1${endpoint}`, options);
    if (res.ok || res.status !== 404) return res;
  } catch (e) {
  }
  return fetch(`${API_BASE}/api${endpoint}`, options);
}

/** Read a streaming /api/scan SSE response and dispatch events into the store. */
async function streamScan(body: any, { setLoading, setBridges, setError, addScanProgress, clearScanProgress }: StreamActions) {
  setLoading(true);
  clearScanProgress();
  setError(null);

  try {
    const res = await fetchWithFallback(`/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Server error ${res.status}`);
    }

    if (!res.body) throw new Error("No response body");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      // SSE lines end with \n\n — split on double newline
      const parts = buf.split("\n\n");
      buf = parts.pop() || ""; // keep the incomplete tail

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        let event;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }

        if (event.type === "progress") {
          addScanProgress({ step: event.step, status: event.status, message: event.message });
        } else if (event.type === "complete") {
          const bridges = event.data || event.bridges;
          if (!bridges?.length) {
            setError("No bridges found in this area. Try zooming out or scanning a different region.");
          } else {
            setBridges(bridges);
          }
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    }
  } catch (err: any) {
    setError(
      err.name === "TypeError"
        ? "Cannot reach backend — is it running on http://localhost:8000?"
        : err.message
    );
  } finally {
    setLoading(false);
  }
}

export function useBridgeScan() {
  const { setLoading, setBridges, setError, setImageAnalysis, addScanProgress, clearScanProgress } =
    useAppStore();
  const actions: StreamActions = { setLoading, setBridges, setError, addScanProgress, clearScanProgress };

  const scan = (query: string, queryType = "city_scan") =>
    streamScan({ query, query_type: queryType, max_bridges: 500 }, actions);

  const scanViewport = ({ sw_lat, sw_lon, ne_lat, ne_lon }: { sw_lat: number; sw_lon: number; ne_lat: number; ne_lon: number }) =>
    streamScan(
      { query: "viewport", query_type: "bbox", max_bridges: 200,
        bbox: { sw_lat, sw_lon, ne_lat, ne_lon } },
      actions
    );

  const loadDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithFallback(`/demo`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Demo cache not found — run precompute_demo.py first");
      setBridges(data);
    } catch (err: any) {
      setError(
        err.name === "TypeError"
          ? "Cannot reach backend — is it running on http://localhost:8000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async (file: File) => {
    const fileUrl = URL.createObjectURL(file);
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetchWithFallback(`/analyze-image`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`);
      setImageAnalysis(data, fileUrl);
    } catch (err: any) {
      URL.revokeObjectURL(fileUrl);
      setError(
        err.name === "TypeError"
          ? "Cannot reach backend — is it running on http://localhost:8000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return { scan, scanViewport, loadDemo, analyzeImage };
}
