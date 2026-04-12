import React, { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import L from "leaflet";
import { Crosshair, AlertTriangle } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { RISK_COLORS, RISK_MARKER_SIZE } from "../utils/riskColors";
import { useBridgeScan } from "../hooks/useBridgeScan";
import { BridgeSummary, BridgeRiskReport, RiskTier, ThemeMode } from "../types";

const DEFAULT_CENTER: [number, number] = [51.1079, 17.0385];
const DEFAULT_ZOOM = 6;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];
const TILE_THEMES: Record<ThemeMode, { url: string; attribution: string }> = {
  dark: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  },
  light: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
};

function priorityColor(score: number) {
  if (score >= 4.5) return "rgba(0, 229, 255, 0.6)";
  if (score >= 3.5) return "rgba(0, 229, 255, 0.4)";
  return "rgba(0, 229, 255, 0.25)";
}

function makeIcon(tier: string | null, priorityScore = 1, isChecked = false, isSelected = false) {
  const selectRing = isSelected
    ? ", 0 0 0 3px #00e5ff, 0 0 12px rgba(0,229,255,0.5)"
    : isChecked
    ? ", 0 0 0 2px #3b82f6, 0 0 8px rgba(59,130,246,0.4)"
    : "";

  if (!tier) {
    const dot = priorityScore >= 4 ? 9 : priorityScore >= 3 ? 7 : 6;
    const color = priorityColor(priorityScore);
    const html = `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${color};border:1.5px solid rgba(0,229,255,0.3);box-shadow:0 0 6px rgba(0,229,255,0.2)${selectRing};"></div>`;
    return L.divIcon({ className: "", html, iconSize: [dot, dot], iconAnchor: [dot / 2, dot / 2] });
  }

  const c = RISK_COLORS[tier] || RISK_COLORS.OK;
  const dot = RISK_MARKER_SIZE[tier] || 8;
  const pulse = tier === "CRITICAL" || tier === "HIGH";
  const dur = tier === "CRITICAL" ? "1.1s" : "1.8s";
  const outer = pulse ? dot * 3 : dot * 2.2;

  const html = pulse
    ? `<div style="position:relative;width:${outer}px;height:${outer}px;display:flex;align-items:center;justify-content:center;">
         <div class="marker-pulse-ring" style="background:${c.hex};--pulse-duration:${dur};"></div>
         <div class="marker-pulse-ring marker-pulse-ring-2" style="background:${c.hex};--pulse-duration:${dur};"></div>
         <div style="width:${dot}px;height:${dot}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, ${c.hex}, ${c.hex}dd);border:1.5px solid rgba(255,255,255,0.3);box-shadow:0 0 8px ${c.ring}${selectRing};position:relative;z-index:2;"></div>
       </div>`
    : `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:radial-gradient(circle at 35% 35%, ${c.hex}, ${c.hex}cc);border:1.5px solid rgba(255,255,255,0.2);box-shadow:0 0 6px ${c.ring}${selectRing};"></div>`;

  return L.divIcon({ className: "", html, iconSize: [outer, outer], iconAnchor: [outer / 2, outer / 2] });
}

function MapController({ bridges }: { bridges: BridgeSummary[] }) {
  const map = useMap();
  useEffect(() => {
    if (!bridges.length) return;
    if (bridges.length === 1) {
      map.flyTo([bridges[0].lat, bridges[0].lon], 15, { duration: 1.2 });
    } else {
      const latlngs = bridges.map((b) => [b.lat, b.lon] as [number, number]);
      map.flyToBounds(L.latLngBounds(latlngs), { padding: [50, 50], duration: 1.2, maxZoom: 15 });
    }
  }, [bridges.length, map]);
  return null;
}

function BoundsTracker({ allBridges, onUpdate }: { allBridges: BridgeSummary[]; onUpdate: (b: BridgeSummary[]) => void }) {
  const map = useMap();
  const bridgesRef = useRef(allBridges);
  bridgesRef.current = allBridges;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const update = useCallback(() => {
    const bounds = map.getBounds();
    onUpdateRef.current(
      bridgesRef.current.filter((b) => bounds.contains([b.lat, b.lon]))
    );
  }, [map]);

  useMapEvents({ moveend: update, zoomend: update });
  useEffect(() => { update(); }, [allBridges.length, update]);
  return null;
}

interface BridgeMarkersProps {
  bridges: BridgeSummary[];
  analyzedBridges: Record<string, BridgeRiskReport>;
  checkedBridgeIds: Record<string, boolean>;
  selectedBridgeId: string | null;
  onHover: (bridge: BridgeSummary, report: BridgeRiskReport | null, pos: { x: number; y: number }) => void;
  onHoverClear: () => void;
  onSelect: (id: string) => void;
}

function BridgeMarkers({ bridges, analyzedBridges, checkedBridgeIds, selectedBridgeId, onHover, onHoverClear, onSelect }: BridgeMarkersProps) {
  const map = useMap();
  return (
    <MarkerClusterGroup
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
    >
      {bridges.map((bridge) => {
        const report = analyzedBridges[bridge.osm_id];
        const tier = report?.risk_tier || null;
        const isChecked = !!checkedBridgeIds[bridge.osm_id];
        const isSelected = bridge.osm_id === selectedBridgeId;
        return (
          <Marker
            key={`${bridge.osm_id}-${isChecked}-${isSelected}`}
            position={[bridge.lat, bridge.lon]}
            icon={makeIcon(tier, (bridge as any).priority_score, isChecked, isSelected)}
            eventHandlers={{
              mouseover: () => {
                const pt = map.latLngToContainerPoint([bridge.lat, bridge.lon]);
                onHover(bridge, report, { x: pt.x, y: pt.y });
              },
              mouseout: onHoverClear,
              click: () => onSelect(bridge.osm_id),
            }}
          />
        );
      })}
    </MarkerClusterGroup>
  );
}

const ROAD_LABELS: Record<string, string> = {
  motorway: "Motorway", trunk: "Trunk", primary: "Primary",
  secondary: "Secondary", tertiary: "Tertiary",
  unclassified: "Local", residential: "Residential",
  motorway_link: "Motorway", trunk_link: "Trunk",
  primary_link: "Primary", secondary_link: "Secondary", tertiary_link: "Tertiary",
};

function HoverCard({ bridge, report, pos, containerRef }: { bridge: BridgeSummary; report: BridgeRiskReport | null; pos: { x: number; y: number }; containerRef: React.RefObject<HTMLDivElement> }) {
  const [imgError, setImgError] = useState(false);
  const CARD_W = 220;
  const containerW = containerRef.current?.offsetWidth || 800;
  const CARD_H = 170;

  let left = pos.x - CARD_W / 2;
  if (left < 8) left = 8;
  if (left + CARD_W > containerW - 8) left = containerW - CARD_W - 8;
  const top = pos.y - CARD_H - 16 > 8 ? pos.y - CARD_H - 16 : pos.y + 24;

  const c = report ? (RISK_COLORS[report.risk_tier] || RISK_COLORS.OK) : null;

  return (
    <div className="absolute pointer-events-none z-[1500]" style={{ left, top, width: CARD_W }} role="tooltip">
      <div className="glass-panel overflow-hidden shadow-glass">
        {report && !imgError ? (
          <img
            src={`${API_BASE}/api/v1/images/${bridge.osm_id}/0`}
            alt=""
            className="w-full object-cover opacity-80"
            style={{ height: 90 }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (target.src.includes('/api/v1/')) {
                target.src = target.src.replace('/api/v1/', '/api/');
              } else {
                setImgError(true);
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center bg-surface-2" style={{ height: 40 }}>
            <span className="text-2xs font-mono text-dim">
              {report ? "NO IMAGE CACHED" : "NOT ANALYZED"}
            </span>
          </div>
        )}
        <div className="px-3 py-2">
          <p className="text-xs font-medium text-white mb-1 line-clamp-2 leading-snug">
            {bridge.name || `Bridge ${bridge.osm_id}`}
          </p>
          <div className="flex items-center justify-between">
            {report ? (
              <>
                <span
                  className="text-2xs font-mono font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: c!.bg, color: c!.text, border: `1px solid ${c!.border}` }}
                >
                  {report.risk_tier}
                </span>
                <span className="text-2xs font-mono text-dim">{(report as any).risk_score}/5.0</span>
              </>
            ) : (
              <>
                <span className="text-2xs text-muted">
                  {ROAD_LABELS[(bridge as any).road_class] || (bridge as any).road_class || "Road bridge"}
                </span>
                <span className="text-2xs font-mono text-dim">P{(bridge as any).priority_score}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center -mt-px">
        <div
          className="w-2.5 h-2.5 rotate-45"
          style={{
            background: "rgb(var(--color-glass) / 0.85)",
            borderRight: "1px solid rgb(var(--color-white) / 0.06)",
            borderBottom: "1px solid rgb(var(--color-white) / 0.06)",
          }}
        />
      </div>
    </div>
  );
}

function ViewportSummary({ visible, total, analyzedBridges }: { visible: BridgeSummary[]; total: number; analyzedBridges: Record<string, BridgeRiskReport> }) {
  if (total === 0) return null;

  const analysedInView = visible.filter((b) => analyzedBridges[b.osm_id]);
  const counts = TIERS.reduce((acc, t) => {
    acc[t] = analysedInView.filter((b) => analyzedBridges[b.osm_id]?.risk_tier === t).length;
    return acc;
  }, {} as Record<string, number>);
  const unanalysed = visible.length - analysedInView.length;

  return (
    <div className="absolute bottom-8 left-3 z-[1000] glass-panel px-3.5 py-3 min-w-[175px] shadow-glass" aria-live="polite">
      <p className="text-2xs font-mono text-dim tracking-wider mb-2.5">
        {visible.length} OF {total} IN VIEW
      </p>
      <div className="flex flex-col gap-1.5">
        {TIERS.filter((t) => counts[t] > 0).map((tier) => {
          const c = RISK_COLORS[tier];
          return (
            <div key={tier} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.hex, boxShadow: `0 0 6px ${c.ring}` }}
                aria-hidden="true"
              />
              <span className="text-2xs font-mono text-muted">
                {counts[tier]} {tier}
              </span>
            </div>
          );
        })}
        {unanalysed > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-accent/20" aria-hidden="true" />
            <span className="text-2xs font-mono text-dim">{unanalysed} PENDING</span>
          </div>
        )}
      </div>
      {counts.CRITICAL > 0 && (
        <div className="mt-2.5 pt-2 border-t border-severity-critical/20">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-severity-critical" aria-hidden="true" />
            <span className="text-2xs font-mono font-bold text-severity-critical">
              {counts.CRITICAL} CRITICAL
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanViewportButton() {
  const map = useMap();
  const { scanViewport } = useBridgeScan();
  const isLoading = useAppStore((s) => s.isLoading);

  const handleClick = () => {
    const b = map.getBounds();
    scanViewport({ sw_lat: b.getSouth(), sw_lon: b.getWest(), ne_lat: b.getNorth(), ne_lon: b.getEast() });
  };

  return (
    <div className="absolute bottom-10 right-3 z-[1000]">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="glass-button-accent flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-bold tracking-wider
                   disabled:opacity-30 disabled:cursor-not-allowed shadow-glass"
        aria-label="Scan current map area"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" aria-hidden="true" />
            SCANNING
          </>
        ) : (
          <>
            <Crosshair className="w-4 h-4" aria-hidden="true" />
            SCAN AREA
          </>
        )}
      </button>
    </div>
  );
}

function FilterBar({ allBridges, analyzedBridges, activeFilter, onFilter }: { allBridges: BridgeSummary[]; analyzedBridges: Record<string, BridgeRiskReport>; activeFilter: string; onFilter: (f: RiskTier | 'ALL') => void }) {
  if (!allBridges.length) return null;
  const analysed = Object.values(analyzedBridges);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 flex-wrap justify-center px-3" role="group" aria-label="Filter bridges by risk">
      <button
        onClick={() => onFilter("ALL")}
        aria-pressed={activeFilter === "ALL"}
        className={`px-3 py-1 text-2xs font-mono font-bold rounded-full transition-all border ${
          activeFilter === "ALL"
            ? "bg-accent/15 text-accent border-accent/30 shadow-glow-cyan"
            : "glass-panel text-dim border-glass-border hover:text-muted"
        }`}
      >
        ALL ({allBridges.length})
      </button>
      {TIERS.map((tier) => {
        const count = analysed.filter((r) => r.risk_tier === tier).length;
        if (count === 0) return null;
        const c = RISK_COLORS[tier];
        const active = activeFilter === tier;
        return (
          <button
            key={tier}
            onClick={() => onFilter(tier as RiskTier)}
            aria-pressed={active}
            className="px-3 py-1 text-2xs font-mono font-bold rounded-full transition-all border"
            style={{
              backgroundColor: active ? c.bg : "rgb(var(--color-glass) / 0.85)",
              color: active ? c.text : "rgb(var(--color-dim))",
              borderColor: active ? c.border : "rgb(var(--color-white) / 0.06)",
              boxShadow: active ? c.glow : "none",
              backdropFilter: "blur(12px)",
            }}
          >
            {tier} ({count})
          </button>
        );
      })}
    </div>
  );
}

export default function MapView() {
  const allBridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const checkedBridgeIds = useAppStore((s) => s.checkedBridgeIds);
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const theme = useAppStore((s) => s.theme);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);

  const [hoveredBridge, setHoveredBridge] = useState<BridgeSummary | null>(null);
  const [hoveredReport, setHoveredReport] = useState<BridgeRiskReport | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [visibleBridges, setVisibleBridges] = useState<BridgeSummary[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredBridges = activeFilter === "ALL"
    ? allBridges
    : allBridges.filter((b) => analyzedBridges[b.osm_id]?.risk_tier === activeFilter);
  const mapTiles = TILE_THEMES[theme];

  const handleHover = useCallback((bridge: BridgeSummary, report: BridgeRiskReport | null, pos: { x: number; y: number }) => {
    setHoveredBridge(bridge);
    setHoveredReport(report || null);
    setHoverPos(pos);
  }, []);

  const handleHoverClear = useCallback(() => setHoveredBridge(null), []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 overflow-hidden bg-void">
      <div className="absolute inset-0 pointer-events-none z-0 opacity-20" 
           style={{ 
             backgroundImage: 'radial-gradient(rgb(var(--map-grid-color) / 0.15) 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
           }} 
      />
      
      <FilterBar
        allBridges={allBridges}
        analyzedBridges={analyzedBridges}
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
      />

      {hoveredBridge && containerRef.current && (
        <HoverCard
          key={hoveredBridge.osm_id}
          bridge={hoveredBridge}
          report={hoveredReport}
          pos={hoverPos}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
        />
      )}

      <ViewportSummary visible={visibleBridges} total={allBridges.length} analyzedBridges={analyzedBridges} />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%", zIndex: 10 }}
        zoomControl={true}
      >
        <TileLayer key={theme} attribution={mapTiles.attribution} url={mapTiles.url} />
        <MapController bridges={allBridges} />
        <BoundsTracker allBridges={allBridges} onUpdate={setVisibleBridges} />
        <BridgeMarkers
          bridges={filteredBridges}
          analyzedBridges={analyzedBridges}
          checkedBridgeIds={checkedBridgeIds}
          selectedBridgeId={selectedBridgeId}
          onHover={handleHover}
          onHoverClear={handleHoverClear}
          onSelect={setSelectedBridgeId}
        />
        <ScanViewportButton />
      </MapContainer>
    </div>
  );
}
