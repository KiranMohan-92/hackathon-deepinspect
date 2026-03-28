import { create } from "zustand";
import type { BridgeRiskReport, RiskTier, VisualAssessment } from "../types";

type FilterTier = RiskTier | "ALL";

interface AppState {
  bridges: BridgeRiskReport[];
  selectedBridge: BridgeRiskReport | null;
  isLoading: boolean;
  error: string | null;
  activeFilter: FilterTier;

  // Image analysis state
  imageAnalysis: VisualAssessment | null;
  imageFileUrl: string | null;

  setBridges: (bridges: BridgeRiskReport[]) => void;
  setSelectedBridge: (bridge: BridgeRiskReport | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveFilter: (filter: FilterTier) => void;

  setImageAnalysis: (analysis: VisualAssessment, fileUrl: string) => void;
  clearImageAnalysis: () => void;

  filteredBridges: () => BridgeRiskReport[];
}

const useAppStore = create<AppState>((set, get) => ({
  bridges: [],
  selectedBridge: null,
  isLoading: false,
  error: null,
  activeFilter: "ALL",

  // Image analysis state
  imageAnalysis: null,
  imageFileUrl: null,

  setBridges: (bridges) => set({ bridges, selectedBridge: null }),
  setSelectedBridge: (bridge) => set({ selectedBridge: bridge }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setActiveFilter: (activeFilter) => set({ activeFilter }),

  setImageAnalysis: (analysis, fileUrl) => set({ imageAnalysis: analysis, imageFileUrl: fileUrl }),
  clearImageAnalysis: () => {
    const { imageFileUrl } = get();
    if (imageFileUrl) URL.revokeObjectURL(imageFileUrl);
    set({ imageAnalysis: null, imageFileUrl: null });
  },

  filteredBridges: () => {
    const { bridges, activeFilter } = get();
    if (activeFilter === "ALL") return bridges;
    return bridges.filter((b) => b.risk_tier === activeFilter);
  },
}));

export default useAppStore;
