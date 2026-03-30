import { useEffect, useMemo } from "react";
import useAppStore from "../store/useAppStore";

interface UseKeyboardShortcutsProps {
  onToggleStats?: () => void;
  onToggleHelp?: () => void;
}

export default function useKeyboardShortcuts({ onToggleStats, onToggleHelp }: UseKeyboardShortcutsProps) {
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);

  const sortedBridges = useMemo(() => {
    return [...bridges].sort((a, b) => {
      const ra = analyzedBridges[a.osm_id];
      const rb = analyzedBridges[b.osm_id];
      const raScore = ra ? (ra as any).risk_score || 0 : 0;
      const rbScore = rb ? (rb as any).risk_score || 0 : 0;
      if (ra && rb) return rbScore - raScore;
      if (ra) return -1;
      if (rb) return 1;
      const aPriority = (a as any).priority_score || 0;
      const bPriority = (b as any).priority_score || 0;
      return bPriority - aPriority;
    });
  }, [bridges, analyzedBridges]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

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
            (document.querySelector("input[type='text']") as HTMLElement)?.focus();
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
