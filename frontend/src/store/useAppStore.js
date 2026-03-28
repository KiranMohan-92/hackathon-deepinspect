import { create } from "zustand";

const useAppStore = create((set, get) => ({
  // All discovered bridges (BridgeSummary[]) — populated by /api/scan
  bridges: [],
  // Per-bridge deep analysis results (osm_id → BridgeRiskReport)
  analyzedBridges: {},
  // The bridge the user clicked on (BridgeSummary)
  selectedBridgeId: null,
  // Bridges currently being deep-analysed { osm_id: true }
  analyzingBridgeIds: {},
  // Bridges checked in the list for batch analysis { osm_id: true }
  checkedBridgeIds: {},

  isLoading: false,
  error: null,
  activeFilter: "ALL",
  scanProgress: [],   // [{step, status, message}] live during scan

  // Image analysis state (uploaded photo modal)
  imageAnalysis: null,
  imageFileUrl: null,

  // ── Scan actions ──────────────────────────────────────────────────────────
  setBridges: (bridges) =>
    set({
      bridges,
      selectedBridgeId: null,
      analyzedBridges: {},
      checkedBridgeIds: {},
      analyzingBridgeIds: {},
      scanProgress: [],
    }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),
  addScanProgress: (item) =>
    set((state) => ({ scanProgress: [...state.scanProgress, item] })),
  clearScanProgress: () => set({ scanProgress: [] }),

  // ── Bridge selection ──────────────────────────────────────────────────────
  setSelectedBridgeId: (id) => set({ selectedBridgeId: id }),

  selectedBridge: () => {
    const { bridges, selectedBridgeId } = get();
    return bridges.find((b) => b.osm_id === selectedBridgeId) || null;
  },

  // ── Deep analysis actions ─────────────────────────────────────────────────
  addAnalyzingBridgeId: (id) =>
    set((state) => ({ analyzingBridgeIds: { ...state.analyzingBridgeIds, [id]: true } })),

  removeAnalyzingBridgeId: (id) =>
    set((state) => {
      const next = { ...state.analyzingBridgeIds };
      delete next[id];
      return { analyzingBridgeIds: next };
    }),

  setAnalyzedBridge: (osm_id, report) =>
    set((state) => {
      const next = { ...state.analyzingBridgeIds };
      delete next[osm_id];
      return {
        analyzedBridges: { ...state.analyzedBridges, [osm_id]: report },
        analyzingBridgeIds: next,
      };
    }),

  getAnalysis: (osm_id) => get().analyzedBridges[osm_id] || null,

  // ── Checkbox selection for batch analysis ────────────────────────────────
  toggleCheckedBridge: (id) =>
    set((state) => {
      const next = { ...state.checkedBridgeIds };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { checkedBridgeIds: next };
    }),

  setCheckedBridges: (ids) =>
    set({ checkedBridgeIds: Object.fromEntries(ids.map((id) => [id, true])) }),

  clearCheckedBridges: () => set({ checkedBridgeIds: {} }),

  // ── Image upload analysis ─────────────────────────────────────────────────
  setImageAnalysis: (analysis, fileUrl) => set({ imageAnalysis: analysis, imageFileUrl: fileUrl }),
  clearImageAnalysis: () => {
    const { imageFileUrl } = get();
    if (imageFileUrl) URL.revokeObjectURL(imageFileUrl);
    set({ imageAnalysis: null, imageFileUrl: null });
  },

  // ── Filtered bridges for the map ──────────────────────────────────────────
  filteredBridges: () => {
    const { bridges, activeFilter, analyzedBridges } = get();
    if (activeFilter === "ALL") return bridges;
    return bridges.filter((b) => {
      const report = analyzedBridges[b.osm_id];
      return report && report.risk_tier === activeFilter;
    });
  },
}));

export default useAppStore;
