import { useEffect, useRef } from "react";
import useAppStore from "../store/useAppStore";

/**
 * Syncs map state + selected bridge to URL search params.
 * Produces shareable links like: ?bridge=123456&filter=CRITICAL
 *
 * Note: The bridge param is a "deep link hint" — when bridges are loaded
 * (via scan), the matching bridge will be auto-selected. If bridges haven't
 * been loaded yet, the param is stored and applied once bridges arrive.
 */
export default function useUrlState() {
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const bridges = useAppStore((s) => s.bridges);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const initialized = useRef(false);
  const pendingBridgeId = useRef(null);

  // On mount: read URL params and apply to store
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const bridge = params.get("bridge");
    const filter = params.get("filter");

    if (bridge) {
      pendingBridgeId.current = bridge;
    }
    if (filter && ["ALL", "CRITICAL", "HIGH", "MEDIUM", "OK"].includes(filter)) {
      setActiveFilter(filter);
    }
  }, [setSelectedBridgeId, setActiveFilter]);

  // When bridges load, resolve the pending bridge ID
  useEffect(() => {
    if (!pendingBridgeId.current || bridges.length === 0) return;
    const match = bridges.find((b) => b.osm_id === pendingBridgeId.current);
    if (match) {
      setSelectedBridgeId(match.osm_id);
    }
    pendingBridgeId.current = null;
  }, [bridges, setSelectedBridgeId]);

  // On state change: update URL params (without page reload)
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBridgeId) params.set("bridge", selectedBridgeId);
    if (activeFilter && activeFilter !== "ALL") params.set("filter", activeFilter);

    const search = params.toString();
    const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [selectedBridgeId, activeFilter]);
}
