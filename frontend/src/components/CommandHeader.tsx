import React, { useState, useEffect } from "react";
import { Activity, Shield, BarChart3, Scan, Wifi, WifiOff, Clock } from "lucide-react";
import { motion } from "framer-motion";
import useAppStore from "../store/useAppStore";
import useHealthCheck from "../hooks/useHealthCheck";
import { RISK_COLORS } from "../utils/riskColors";
import SearchBar from "./SearchBar";

const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

interface CommandHeaderProps {
  showStats: boolean;
  onToggleStats: () => void;
}

export default function CommandHeader({ showStats, onToggleStats }: CommandHeaderProps) {
  const bridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const isLoading = useAppStore((s) => s.isLoading);
  const health = useHealthCheck();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const reports = Object.values(analyzedBridges);
  const counts = TIERS.reduce((acc, t) => {
    acc[t] = reports.filter((r) => r.risk_tier === t).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <header className="glass-panel relative flex items-center gap-4 px-5 py-2.5 rounded-none border-x-0 border-t-0 flex-shrink-0 z-20">
      {/* Accent line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 accent-line" />

      {/* Brand — distinctive two-tone treatment */}
      <div className="flex items-center gap-3 mr-3 flex-shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0, 229, 255, 0.12), rgba(212, 175, 55, 0.08))",
              border: "1px solid rgba(0, 229, 255, 0.15)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <Shield className="w-4 h-4 text-accent" />
          </div>
          {isLoading && (
            <motion.div
              className="absolute -inset-0.5 rounded-lg"
              style={{
                border: "1px solid rgba(0, 229, 255, 0.3)",
                boxShadow: "0 0 12px rgba(0, 229, 255, 0.25)",
              }}
              animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-0">
            <span className="font-sans font-700 text-sm tracking-wide text-white">
              Deep
            </span>
            <span className="font-sans font-700 text-sm tracking-wide" style={{ color: "#d4af37" }}>
              Inspect
            </span>
          </div>
          <span className="text-2xs font-mono text-dim/60 tracking-[0.18em] hidden md:block">
            INFRASTRUCTURE INTEL
          </span>
        </div>
      </div>

      {/* Health indicator */}
      <div className="flex items-center gap-1.5 flex-shrink-0" title={
        health.status === "ok" ? `Backend online · ${health.model}` :
        health.status === "offline" ? "Backend unreachable" : "Checking..."
      }>
        {health.status === "ok" ? (
          <Wifi className="w-3 h-3 text-severity-ok/70" />
        ) : health.status === "offline" ? (
          <WifiOff className="w-3 h-3 text-severity-critical/70" />
        ) : (
          <Wifi className="w-3 h-3 text-dim/50 animate-pulse" />
        )}
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: health.status === "ok" ? "#00e676" : health.status === "offline" ? "#ff1744" : "rgba(255,255,255,0.3)",
            boxShadow: health.status === "ok" ? "0 0 6px rgba(0,230,118,0.5)" : health.status === "offline" ? "0 0 6px rgba(255,23,68,0.5)" : "none",
          }}
        />
      </div>

      <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2 border border-glass-border flex-shrink-0">
        <Clock className="w-3 h-3 text-dim" />
        <span className="text-2xs font-mono text-dim tracking-wider">
          {time.toISOString().substring(11, 19)} UTC
        </span>
      </div>

      {/* System status — cyan for scanning, gold for intelligence */}
      {bridges.length > 0 && (
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Scan count — cyan */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md"
            style={{ background: "rgba(0, 229, 255, 0.05)", border: "1px solid rgba(0, 229, 255, 0.08)" }}
          >
            <Scan className="w-3 h-3 text-accent/70" />
            <span className="text-2xs font-mono text-accent/80 font-medium">
              {bridges.length}
            </span>
          </div>

          {/* Analyzed count — gold */}
          {reports.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md intel-accent-bg">
              <Activity className="w-3 h-3 intel-accent opacity-70" />
              <span className="text-2xs font-mono intel-accent font-medium opacity-80">
                {reports.length}
              </span>
            </div>
          )}

          {/* Risk chips — compact, no labels on smaller screens */}
          <div className="flex items-center gap-1 hidden lg:flex">
            {TIERS.filter((t) => counts[t] > 0).map((tier) => {
              const c = RISK_COLORS[tier];
              return (
                <motion.span
                  key={tier}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: c.bg,
                    color: c.text,
                    border: `1px solid ${c.border}`,
                    boxShadow: tier === "CRITICAL" ? c.glow : "none",
                  }}
                >
                  {counts[tier]} {tier}
                </motion.span>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {/* Intel toggle — gold accent when active */}
      <button
        onClick={onToggleStats}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs font-mono font-medium tracking-wider transition-all ${
          showStats
            ? "intel-accent-bg intel-accent"
            : "glass-button"
        }`}
        aria-expanded={showStats}
        aria-controls="stats-panel"
      >
        <BarChart3 className="w-3.5 h-3.5" />
        INTEL
      </button>

      {/* Search */}
      <SearchBar />
    </header>
  );
}
