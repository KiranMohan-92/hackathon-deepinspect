import { useEffect, useMemo } from "react";
import useAppStore from "../store/useAppStore";

export default function useKeyboardShortcuts({ onToggleStats, onToggleHelp }) {
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);

  // Match the sort order used by BridgeList so arrow keys navigate the visible list
  const sortedBridges = useMemo(() => {
    return [...bridges].sort((a, b) => {
      const ra = analyzedBridges[a.osm_id];
      const rb = analyzedBridges[b.osm_id];
      if (ra && rb) return rb.risk_score - ra.risk_score;
      if (ra) return -1;
      if (rb) return 1;
      return b.priority_score - a.priority_score;
    });
  }, [bridges, analyzedBridges]);

  useEffect(() => {
    function handler(e) {
      // Ignore when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

      switch (e.key) {
        case "Escape":
          if (selectedBridgeId) {
            e.preventDefault();
            setSelectedBridgeId(null);
          }
          break;

        case "?":
          e.preventDefault();
          onToggleHelp?.();
          break;

        case "i":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onToggleStats?.();
          }
          break;

        case "k":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            document.querySelector("input[type='text']")?.focus();
          }
          break;

        case "ArrowDown":
          if (sortedBridges.length > 0) {
            e.preventDefault();
            const idx = sortedBridges.findIndex((b) => b.osm_id === selectedBridgeId);
            const next = idx < sortedBridges.length - 1 ? idx + 1 : 0;
            setSelectedBridgeId(sortedBridges[next].osm_id);
          }
          break;

        case "ArrowUp":
          if (sortedBridges.length > 0) {
            e.preventDefault();
            const idx = sortedBridges.findIndex((b) => b.osm_id === selectedBridgeId);
            const prev = idx > 0 ? idx - 1 : sortedBridges.length - 1;
            setSelectedBridgeId(sortedBridges[prev].osm_id);
          }
          break;
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedBridgeId, sortedBridges, setSelectedBridgeId, onToggleStats, onToggleHelp]);
}
