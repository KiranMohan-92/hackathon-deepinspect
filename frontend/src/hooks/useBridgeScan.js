import useAppStore from "../store/useAppStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/** Read a streaming /api/scan SSE response and dispatch events into the store. */
async function streamScan(body, { setLoading, setBridges, setError, addScanProgress, clearScanProgress }) {
  setLoading(true);
  clearScanProgress();
  setError(null);

  try {
    const res = await fetch(`${API_BASE}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Server error ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      // SSE lines end with \n\n — split on double newline
      const parts = buf.split("\n\n");
      buf = parts.pop(); // keep the incomplete tail

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data: ")) continue;
        let event;
        try { event = JSON.parse(line.slice(6)); } catch { continue; }

        if (event.type === "progress") {
          addScanProgress({ step: event.step, status: event.status, message: event.message });
        } else if (event.type === "complete") {
          if (!event.bridges?.length) {
            setError("No bridges found in this area. Try zooming out or scanning a different region.");
          } else {
            setBridges(event.bridges);
          }
        } else if (event.type === "error") {
          setError(event.message);
        }
      }
    }
  } catch (err) {
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
  const actions = { setLoading, setBridges, setError, addScanProgress, clearScanProgress };

  const scan = (query, queryType = "city_scan") =>
    streamScan({ query, query_type: queryType, max_bridges: 500 }, actions);

  const scanViewport = ({ sw_lat, sw_lon, ne_lat, ne_lon }) =>
    streamScan(
      { query: "viewport", query_type: "bbox", max_bridges: 200,
        bbox: { sw_lat, sw_lon, ne_lat, ne_lon } },
      actions
    );

  const loadDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/demo`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Demo cache not found — run precompute_demo.py first");
      setBridges(data);
    } catch (err) {
      setError(
        err.name === "TypeError"
          ? "Cannot reach backend — is it running on http://localhost:8000?"
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const analyzeImage = async (file) => {
    const fileUrl = URL.createObjectURL(file);
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_BASE}/api/analyze-image`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`);
      setImageAnalysis(data, fileUrl);
    } catch (err) {
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
