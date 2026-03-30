// Shared Framer Motion animation presets for DeepInspect Orbital Command Center

// ── Spring configs ──────────────────────────────────────────────────
export const springs = {
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  gentle: { type: "spring", stiffness: 200, damping: 25 },
  bouncy: { type: "spring", stiffness: 300, damping: 20 },
};

// ── Entrance variants ───────────────────────────────────────────────
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 },
};

export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
  transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const slideInRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 24 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const slideInLeft = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

// ── Stagger variants (for lists) ────────────────────────────────────
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.15 },
  },
};

// ── Glass panel entrance ────────────────────────────────────────────
export const glassPanel = {
  initial: { opacity: 0, backdropFilter: "blur(0px)", y: 8 },
  animate: {
    opacity: 1,
    backdropFilter: "blur(12px)",
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    backdropFilter: "blur(0px)",
    y: 4,
    transition: { duration: 0.2 },
  },
};

// ── Hover interactions ──────────────────────────────────────────────
export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98, transition: { duration: 0.1 } },
};

export const hoverGlow = {
  whileHover: {
    boxShadow: "0 0 20px rgba(0, 229, 255, 0.2)",
    borderColor: "rgba(0, 229, 255, 0.3)",
    transition: { duration: 0.2 },
  },
};
