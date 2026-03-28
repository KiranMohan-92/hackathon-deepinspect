import useAppStore from "../store/useAppStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useBridgeAnalyze() {
  const {
    addAnalyzingBridgeId,
    removeAnalyzingBridgeId,
    setAnalyzedBridge,
    setError,
    clearCheckedBridges,
  } = useAppStore();

  const analyzeOneBridge = async (bridge) => {
    const { osm_id } = bridge;
    addAnalyzingBridgeId(osm_id);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/bridges/${osm_id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bridge),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Server error ${res.status}`);
      setAnalyzedBridge(osm_id, data);
      return data;
    } catch (err) {
      removeAnalyzingBridgeId(osm_id);
      setError(
        err.name === "TypeError"
          ? "Cannot reach backend — is it running on http://localhost:8000?"
          : err.message
      );
      return null;
    }
  };

  // Run analyses one at a time to avoid overloading the API
  const analyzeMultipleBridges = async (bridges) => {
    for (const bridge of bridges) {
      await analyzeOneBridge(bridge);
    }
    clearCheckedBridges();
  };

  return { analyzeOneBridge, analyzeMultipleBridges };
}
