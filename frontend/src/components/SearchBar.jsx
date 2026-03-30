import { useState } from "react";
import { Search, MapPin, Navigation, Upload, Zap } from "lucide-react";
import { useBridgeScan } from "../hooks/useBridgeScan";
import useAppStore from "../store/useAppStore";

const MODES = [
  { value: "city_scan", label: "City", icon: MapPin, placeholder: "Enter city name…" },
  { value: "bridge_lookup", label: "Bridge", icon: Search, placeholder: "Bridge name…" },
  { value: "coordinate_query", label: "Coords", icon: Navigation, placeholder: "lat, lon" },
];

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("city_scan");
  const isLoading = useAppStore((s) => s.isLoading);
  const { scan, loadDemo, analyzeImage } = useBridgeScan();

  const currentMode = MODES.find((m) => m.value === mode);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      scan(query.trim(), mode);
      setQuery("");
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) analyzeImage(file);
    e.target.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      {/* Mode selector */}
      <div className="flex items-center rounded-lg overflow-hidden border border-glass-border">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-2xs font-mono font-bold tracking-wider transition-all ${
                active
                  ? "bg-accent/15 text-accent"
                  : "text-dim hover:text-muted hover:bg-surface-2"
              }`}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{m.label.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dim" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={currentMode?.placeholder}
          disabled={isLoading}
          className="glass-input text-xs pl-8 pr-3 py-1.5 w-44 sm:w-56 font-sans disabled:opacity-40"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="glass-button-accent px-3 py-1.5 text-2xs font-mono font-bold tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            SCANNING
          </span>
        ) : (
          "SCAN"
        )}
      </button>

      {/* Demo */}
      <button
        type="button"
        onClick={loadDemo}
        disabled={isLoading}
        className="glass-button px-2.5 py-1.5 text-2xs font-mono tracking-wider flex items-center gap-1 disabled:opacity-30"
      >
        <Zap className="w-3 h-3 text-accent" />
        <span className="hidden sm:inline">DEMO</span>
      </button>

      {/* Upload */}
      <label
        title="Analyse a bridge photo"
        className={`glass-button px-2.5 py-1.5 text-2xs font-mono tracking-wider flex items-center gap-1 ${
          isLoading ? "opacity-30 pointer-events-none" : "cursor-pointer"
        }`}
      >
        <Upload className="w-3 h-3 text-accent" />
        <span className="hidden sm:inline">UPLOAD</span>
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
    </form>
  );
}
