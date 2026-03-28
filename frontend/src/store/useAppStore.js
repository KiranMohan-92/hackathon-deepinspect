import { create } from "zustand";

const useAppStore = create((set, get) => ({
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
