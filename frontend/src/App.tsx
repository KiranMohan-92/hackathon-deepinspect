import React, { useState, useCallback, useEffect } from "react";
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
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const isLoading = useAppStore((s) => s.isLoading);
  const error = useAppStore((s) => s.error);
  const theme = useAppStore((s) => s.theme);
  const [showStats, setShowStats] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const toggleStats = useCallback(() => setShowStats((s) => !s), []);
  const toggleHelp = useCallback(() => setShowHelp((s) => !s), []);

  useKeyboardShortcuts({ onToggleStats: toggleStats, onToggleHelp: toggleHelp });
  useUrlState();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-void text-white transition-colors duration-200">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:p-4 focus:bg-void focus:text-white">
        Skip to main content
      </a>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgb(var(--color-glass) / 0.92)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgb(var(--color-white) / 0.08)",
            color: "rgb(var(--color-white))",
            fontFamily: '"Outfit", sans-serif',
            fontSize: "13px",
          },
        }}
        theme={theme}
      />

      <CommandHeader showStats={showStats} onToggleStats={toggleStats} />

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-[2px] flex-shrink-0 relative overflow-hidden"
            style={{ background: "rgb(var(--color-accent) / 0.1)" }}
            role="progressbar"
            aria-label="Loading"
          >
            <motion.div
              className="absolute inset-y-0 left-0"
              style={{
                background: "linear-gradient(90deg, transparent, rgb(var(--color-accent)), transparent)",
                width: "40%",
              }}
              animate={{ x: ["-40%", "250%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
            role="alert"
          >
            <span className="text-2xs font-mono font-bold text-severity-critical tracking-wider">
              ERROR:{" "}
            </span>
            <span className="text-xs text-severity-critical/80">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="main-content" className="flex flex-1 overflow-hidden min-h-0">
        <ErrorBoundary>
          <StatsPanel isOpen={showStats} />
        </ErrorBoundary>

        <ErrorBoundary>
          <MapView />
        </ErrorBoundary>

        <ErrorBoundary>
          <BridgePanel />
        </ErrorBoundary>
      </main>

      <ImageAnalysisModal />

      <KeyboardShortcutsModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
