export const RISK_COLORS = {
  CRITICAL: {
    hex: "#ff1744",
    bg: "rgba(255, 23, 68, 0.12)",
    text: "#ff1744",
    border: "rgba(255, 23, 68, 0.3)",
    glow: "0 0 12px rgba(255, 23, 68, 0.4)",
    ring: "rgba(255, 23, 68, 0.5)",
    solid: "#ff1744",
  },
  HIGH: {
    hex: "#ff6d00",
    bg: "rgba(255, 109, 0, 0.12)",
    text: "#ff6d00",
    border: "rgba(255, 109, 0, 0.3)",
    glow: "0 0 12px rgba(255, 109, 0, 0.4)",
    ring: "rgba(255, 109, 0, 0.5)",
    solid: "#ff6d00",
  },
  MEDIUM: {
    hex: "#ffab00",
    bg: "rgba(255, 171, 0, 0.12)",
    text: "#ffab00",
    border: "rgba(255, 171, 0, 0.3)",
    glow: "0 0 12px rgba(255, 171, 0, 0.3)",
    ring: "rgba(255, 171, 0, 0.5)",
    solid: "#ffab00",
  },
  OK: {
    hex: "#00e676",
    bg: "rgba(0, 230, 118, 0.12)",
    text: "#00e676",
    border: "rgba(0, 230, 118, 0.3)",
    glow: "0 0 12px rgba(0, 230, 118, 0.3)",
    ring: "rgba(0, 230, 118, 0.5)",
    solid: "#00e676",
  },
};

export const RISK_MARKER_SIZE = {
  CRITICAL: 14,
  HIGH: 10,
  MEDIUM: 8,
  OK: 6,
};

export const DEFECT_COLORS = {
  cracking: "#EF4444",
  spalling: "#F97316",
  corrosion: "#92400E",
  surface_degradation: "#EAB308",
  drainage: "#3B82F6",
  structural_deformation: "#8B5CF6",
};

export const ROAD_COLORS = {
  motorway: { bg: "rgba(255, 23, 68, 0.12)", text: "#ff1744", border: "rgba(255, 23, 68, 0.2)" },
  motorway_link: { bg: "rgba(255, 23, 68, 0.12)", text: "#ff1744", border: "rgba(255, 23, 68, 0.2)" },
  trunk: { bg: "rgba(255, 109, 0, 0.12)", text: "#ff6d00", border: "rgba(255, 109, 0, 0.2)" },
  trunk_link: { bg: "rgba(255, 109, 0, 0.12)", text: "#ff6d00", border: "rgba(255, 109, 0, 0.2)" },
  primary: { bg: "rgba(255, 171, 0, 0.12)", text: "#ffab00", border: "rgba(255, 171, 0, 0.2)" },
  primary_link: { bg: "rgba(255, 171, 0, 0.12)", text: "#ffab00", border: "rgba(255, 171, 0, 0.2)" },
  secondary: { bg: "rgba(0, 230, 118, 0.12)", text: "#00e676", border: "rgba(0, 230, 118, 0.2)" },
  secondary_link: { bg: "rgba(0, 230, 118, 0.12)", text: "#00e676", border: "rgba(0, 230, 118, 0.2)" },
  tertiary: { bg: "rgba(0, 229, 255, 0.12)", text: "#00e5ff", border: "rgba(0, 229, 255, 0.2)" },
  tertiary_link: { bg: "rgba(0, 229, 255, 0.12)", text: "#00e5ff", border: "rgba(0, 229, 255, 0.2)" },
  unclassified: { bg: "rgba(255, 255, 255, 0.06)", text: "rgba(255,255,255,0.5)", border: "rgba(255, 255, 255, 0.1)" },
  residential: { bg: "rgba(255, 255, 255, 0.05)", text: "rgba(255,255,255,0.5)", border: "rgba(255, 255, 255, 0.08)" },
};
