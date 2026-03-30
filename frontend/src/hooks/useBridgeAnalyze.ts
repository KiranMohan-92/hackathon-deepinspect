import useAppStore from "../store/useAppStore";
import { BridgeSummary, BridgeRiskReport } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function fetchWithFallback(endpoint: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${API_BASE}/api/v1${endpoint}`, options);
    if (res.ok || res.status !== 404) return res;
  } catch (e) {
  }
  return fetch(`${API_BASE}/api${endpoint}`, options);
}

export function useBridgeAnalyze() {
  const {
    addAnalyzingBridgeId,
    removeAnalyzingBridgeId,
    setAnalyzedBridge,
    appendAnalysisThinkingStep,
    setError,
    clearCheckedBridges,
  } = useAppStore();

  const analyzeOneBridge = async (bridge: BridgeSummary): Promise<BridgeRiskReport | null> => {
    const { osm_id } = bridge;
    addAnalyzingBridgeId(osm_id);
    setError(null);

    try {
      const res = await fetchWithFallback(`/bridges/${osm_id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bridge),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Server error ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          let event;
          try {
            event = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }

          if (event.type === "thinking_step") {
            appendAnalysisThinkingStep(osm_id, {
              stage: event.stage,
              heading: event.heading ?? null,
              step: event.step,
            });
          } else if (event.type === "complete") {
            setAnalyzedBridge(osm_id, event.report);
            return event.report;
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (err: any) {
      removeAnalyzingBridgeId(osm_id);
      setError(
        err.name === "TypeError"
          ? "Cannot reach backend — is it running on http://localhost:8000?"
          : err.message
      );
      return null;
    }
    return null;
  };

  const analyzeMultipleBridges = async (bridges: BridgeSummary[]) => {
    for (const bridge of bridges) {
      await analyzeOneBridge(bridge);
    }
    clearCheckedBridges();
  };

  return { analyzeOneBridge, analyzeMultipleBridges };
}
