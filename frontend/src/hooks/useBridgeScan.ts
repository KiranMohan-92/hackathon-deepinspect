import useAppStore from "../store/useAppStore";
import type { BboxRequest, BridgeRiskReport, VisualAssessment } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface ScanActions {
  setLoading: (v: boolean) => void;
  setBridges: (b: BridgeRiskReport[]) => void;
  setError: (e: string | null) => void;
}

async function postScan(body: Record<string, unknown>, { setLoading, setBridges, setError }: ScanActions) {
  setLoading(true);
  setError(null);
  try {
    const res = await fetch(`${API_BASE}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`);
    if (!Array.isArray(data) || data.length === 0) {
      setError("No bridges found in this area. Try zooming out or scanning a different region.");
      return;
    }
    setBridges(data as BridgeRiskReport[]);
  } catch (err) {
    if (err instanceof TypeError) {
      setError("Cannot reach backend — is it running on http://localhost:8000?");
    } else {
      setError(err instanceof Error ? err.message : String(err));
    }
  } finally {
    setLoading(false);
  }
}

export function useBridgeScan() {
  const { setLoading, setBridges, setError, setImageAnalysis } = useAppStore();
  const actions: ScanActions = { setLoading, setBridges, setError };

  /** Scan by city name, bridge name, or coordinates */
  const scan = (query: string, queryType = "city_scan") =>
    postScan({ query, query_type: queryType, max_bridges: 30 }, actions);

  /** Scan exactly what is visible in the current map viewport */
  const scanViewport = (bbox: BboxRequest) =>
    postScan(
      { query: "viewport", query_type: "bbox", max_bridges: 50, bbox },
      actions
    );

  /** Load pre-computed Wroclaw demo results */
  const loadDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/demo`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Demo cache not found — run precompute_demo.py first");
      setBridges(data as BridgeRiskReport[]);
    } catch (err) {
      setError(err instanceof TypeError
        ? "Cannot reach backend — is it running on http://localhost:8000?"
        : err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  /** Analyse an uploaded image — opens the analysis modal */
  const analyzeImage = async (file: File) => {
    const fileUrl = URL.createObjectURL(file);
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/analyze-image`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`);
      setImageAnalysis(data as VisualAssessment, fileUrl);
    } catch (err) {
      URL.revokeObjectURL(fileUrl);
      setError(err instanceof TypeError
        ? "Cannot reach backend — is it running on http://localhost:8000?"
        : err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return { scan, scanViewport, loadDemo, analyzeImage };
}
