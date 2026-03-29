import useAppStore from "../store/useAppStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useBridgeAnalyze() {
  const {
    addAnalyzingBridgeId,
    removeAnalyzingBridgeId,
    setAnalyzedBridge,
    appendAnalysisThinkingStep,
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: `Server error ${res.status}` }));
        throw new Error(err.detail || `Server error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n\n; each is "data: {...}\n\n"
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // keep incomplete tail

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
