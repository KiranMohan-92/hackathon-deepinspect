import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";
import useAppStore from "./store/useAppStore";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";
import useUrlState from "./hooks/useUrlState";
import CommandHeader from "./components/CommandHeader";
import MapView from "./components/MapView";
import BridgePanel from "./components/BridgePanel";
import StatsPanel from "./components/StatsPanel";
import ImageAnalysisModal from "./components/ImageAnalysisModal";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";

export default function App() {
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const toggleStats = useCallback(() => setShowStats((s) => !s), []);
  const toggleHelp = useCallback(() => setShowHelp((s) => !s), []);

  useKeyboardShortcuts({ onToggleStats: toggleStats, onToggleHelp: toggleHelp });
  useUrlState();

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void">
      {/* Toast provider */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(12, 14, 22, 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            fontFamily: '"Outfit", sans-serif',
            fontSize: "13px",
          },
        }}
        theme="dark"
      />

      {/* ── Command Header ─────────────────────────────────────────────── */}
      <CommandHeader showStats={showStats} onToggleStats={toggleStats} />

      {/* Scanning indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-[2px] flex-shrink-0 relative overflow-hidden"
            style={{ background: "rgba(0, 229, 255, 0.1)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{
                background: "linear-gradient(90deg, transparent, #00e5ff, transparent)",
                width: "40%",
              }}
              animate={{ x: ["-40%", "250%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error banner */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-5 py-2 flex-shrink-0 overflow-hidden"
            style={{
              background: "rgba(255, 23, 68, 0.08)",
              borderBottom: "1px solid rgba(255, 23, 68, 0.15)",
            }}
          >
            <span className="text-2xs font-mono font-bold text-severity-critical tracking-wider">
              ERROR:{" "}
            </span>
            <span className="text-xs text-severity-critical/80">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Stats panel (collapsible) */}
        <StatsPanel isOpen={showStats} />

        {/* Map fills remaining width */}
        <MapView />

        {/* Side panel */}
        <BridgePanel />
      </div>

      {/* Image analysis modal */}
      <ImageAnalysisModal />

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
