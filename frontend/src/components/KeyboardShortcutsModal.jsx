import { AnimatePresence, motion } from "framer-motion";
import { X, Keyboard } from "lucide-react";
import { scaleIn } from "../utils/motionVariants";

const SHORTCUTS = [
  { keys: ["?"], desc: "Show this help" },
  { keys: ["Esc"], desc: "Close panel / modal" },
  { keys: ["↑", "↓"], desc: "Navigate bridge list" },
  { keys: ["I"], desc: "Toggle intel panel" },
  { keys: ["Ctrl", "K"], desc: "Focus search" },
];

function Key({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-surface-2 border border-glass-border-hover text-2xs font-mono font-bold text-muted">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[3000] flex items-center justify-center p-4"
          style={{ background: "rgba(6, 6, 10, 0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            {...scaleIn}
            className="glass-panel w-full max-w-sm shadow-glass overflow-hidden"
            style={{ border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-accent" />
                <span className="text-sm font-mono font-bold text-white tracking-wider">
                  SHORTCUTS
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-dim hover:text-white hover:bg-surface-2 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="px-5 py-4 space-y-3">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs text-muted">{s.desc}</span>
                  <div className="flex items-center gap-1">
                    {s.keys.map((k, j) => (
                      <span key={j} className="flex items-center gap-1">
                        {j > 0 && <span className="text-2xs text-dim">+</span>}
                        <Key>{k}</Key>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-glass-border">
              <p className="text-2xs font-mono text-dim text-center tracking-wider">
                PRESS ? TO TOGGLE
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
