import { create } from "zustand";
import { AppState, BridgeSummary, BridgeRiskReport, ScanProgressItem, ImageAnalysisResult, RiskTier } from "../types";

const useAppStore = create<AppState>((set, get) => ({
  bridges: [],
  analyzedBridges: {},
  selectedBridgeId: null,
  analyzingBridgeIds: {},
  analysisThinking: {},
  checkedBridgeIds: {},

  isLoading: false,
  error: null,
  activeFilter: "ALL",
  scanProgress: [],

  imageAnalysis: null,
  imageFileUrl: null,

  setBridges: (bridges: BridgeSummary[]) =>
    set({
      bridges,
      selectedBridgeId: null,
      analyzedBridges: {},
      checkedBridgeIds: {},
      analyzingBridgeIds: {},
      analysisThinking: {},
      scanProgress: [],
    }),
  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  setActiveFilter: (activeFilter: RiskTier) => set({ activeFilter }),
  addScanProgress: (item: ScanProgressItem) =>
    set((state) => ({ scanProgress: [...state.scanProgress, item] })),
  clearScanProgress: () => set({ scanProgress: [] }),

  setSelectedBridgeId: (id: string | null) => set({ selectedBridgeId: id }),

  selectedBridge: () => {
    const { bridges, selectedBridgeId } = get();
    return bridges.find((b) => b.osm_id === selectedBridgeId) || null;
  },

  addAnalyzingBridgeId: (id: string) =>
    set((state) => ({ analyzingBridgeIds: { ...state.analyzingBridgeIds, [id]: true } })),

  removeAnalyzingBridgeId: (id: string) =>
    set((state) => {
      const next = { ...state.analyzingBridgeIds };
      delete next[id];
      return { analyzingBridgeIds: next };
    }),

  setAnalyzedBridge: (osm_id: string, report: BridgeRiskReport) =>
    set((state) => {
      const nextAnalyzing = { ...state.analyzingBridgeIds };
      delete nextAnalyzing[osm_id];
      const nextThinking = { ...state.analysisThinking };
      delete nextThinking[osm_id];
      return {
        analyzedBridges: { ...state.analyzedBridges, [osm_id]: report },
        analyzingBridgeIds: nextAnalyzing,
        analysisThinking: nextThinking,
      };
    }),

  appendAnalysisThinkingStep: (osm_id: string, { stage, heading, step }: { stage: string; heading?: string; step: string }) =>
    set((state) => {
      const blocks = state.analysisThinking[osm_id] || [];
      const last = blocks[blocks.length - 1];
      const sameBlock =
        last && last.stage === stage && last.heading === (heading ?? null);
      const newBlocks = sameBlock
        ? [...blocks.slice(0, -1), { ...last, steps: [...last.steps, step] }]
        : [...blocks, { stage, heading: heading ?? null, steps: [step] }];
      return {
        analysisThinking: { ...state.analysisThinking, [osm_id]: newBlocks },
      };
    }),

  getAnalysis: (osm_id: string) => get().analyzedBridges[osm_id] || null,

  toggleCheckedBridge: (id: string) =>
    set((state) => {
      const next = { ...state.checkedBridgeIds };
      if (next[id]) delete next[id];
      else next[id] = true;
      return { checkedBridgeIds: next };
    }),

  setCheckedBridges: (ids: string[]) =>
    set({ checkedBridgeIds: Object.fromEntries(ids.map((id) => [id, true])) }),

  clearCheckedBridges: () => set({ checkedBridgeIds: {} }),

  setImageAnalysis: (analysis: ImageAnalysisResult | null, fileUrl: string | null) => set({ imageAnalysis: analysis, imageFileUrl: fileUrl }),
  clearImageAnalysis: () => {
    const { imageFileUrl } = get();
    if (imageFileUrl) URL.revokeObjectURL(imageFileUrl);
    set({ imageAnalysis: null, imageFileUrl: null });
  },

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
