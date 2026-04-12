import { useEffect, useRef } from "react";
import useAppStore from "../store/useAppStore";
import { RiskTier } from "../types";

const FILTER_MAP: Record<string, RiskTier> = {
  ALL: "ALL",
  OK: "OK",
  LOW: "OK",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
};

export default function useUrlState() {
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const bridges = useAppStore((s) => s.bridges);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const initialized = useRef(false);
  const pendingBridgeId = useRef<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const bridge = params.get("bridge");
    const filter = params.get("filter");

    if (bridge) {
      pendingBridgeId.current = bridge;
    }
    if (filter) {
      const normalized = FILTER_MAP[filter.toUpperCase()];
      if (normalized) {
        setActiveFilter(normalized);
      }
    }
  }, [setSelectedBridgeId, setActiveFilter]);

  useEffect(() => {
    if (!pendingBridgeId.current || bridges.length === 0) return;
    const match = bridges.find((b) => b.osm_id === pendingBridgeId.current);
    if (match) {
      setSelectedBridgeId(match.osm_id);
    }
    pendingBridgeId.current = null;
  }, [bridges, setSelectedBridgeId]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBridgeId) params.set("bridge", selectedBridgeId);
    if (activeFilter && activeFilter !== "ALL") params.set("filter", activeFilter);

    const search = params.toString();
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [selectedBridgeId, activeFilter]);
}
