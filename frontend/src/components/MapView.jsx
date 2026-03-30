import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Crosshair, AlertTriangle } from "lucide-react";
import useAppStore from "../store/useAppStore";
import { RISK_COLORS, RISK_MARKER_SIZE } from "../utils/riskColors";
import { useBridgeScan } from "../hooks/useBridgeScan";

const DEFAULT_CENTER = [51.1079, 17.0385];
const DEFAULT_ZOOM = 6;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

// ─── Marker icon factory (dark theme) ────────────────────────────────────────
function priorityColor(score) {
  if (score >= 4.5) return "rgba(0, 229, 255, 0.6)";
  if (score >= 3.5) return "rgba(0, 229, 255, 0.4)";
  return "rgba(0, 229, 255, 0.25)";
}

function makeIcon(tier, priorityScore = 1, isChecked = false, isSelected = false) {
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

// ─── Map controller ──────────────────────────────────────────────────────────
function MapController({ bridges }) {
  const map = useMap();
  useEffect(() => {
    if (!bridges.length) return;
    if (bridges.length === 1) {
      map.flyTo([bridges[0].lat, bridges[0].lon], 15, { duration: 1.2 });
    } else {
      const latlngs = bridges.map((b) => [b.lat, b.lon]);
      map.flyToBounds(latlngs, { padding: [50, 50], duration: 1.2, maxZoom: 15 });
    }
  }, [bridges.length]); // eslint-disable-line
  return null;
}

// ─── Bounds tracker ──────────────────────────────────────────────────────────
function BoundsTracker({ allBridges, onUpdate }) {
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

// ─── Bridge markers ──────────────────────────────────────────────────────────
function BridgeMarkers({ bridges, analyzedBridges, checkedBridgeIds, selectedBridgeId, onHover, onHoverClear, onSelect }) {
  const map = useMap();
  return bridges.map((bridge) => {
    const report = analyzedBridges[bridge.osm_id];
    const tier = report?.risk_tier || null;
    const isChecked = !!checkedBridgeIds[bridge.osm_id];
    const isSelected = bridge.osm_id === selectedBridgeId;
    return (
      <Marker
        key={`${bridge.osm_id}-${isChecked}-${isSelected}`}
        position={[bridge.lat, bridge.lon]}
        icon={makeIcon(tier, bridge.priority_score, isChecked, isSelected)}
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
  });
}

// ─── Hover card (glass) ──────────────────────────────────────────────────────
const ROAD_LABELS = {
  motorway: "Motorway", trunk: "Trunk", primary: "Primary",
  secondary: "Secondary", tertiary: "Tertiary",
  unclassified: "Local", residential: "Residential",
  motorway_link: "Motorway", trunk_link: "Trunk",
  primary_link: "Primary", secondary_link: "Secondary", tertiary_link: "Tertiary",
};

function HoverCard({ bridge, report, pos, containerRef }) {
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
    <div className="absolute pointer-events-none z-[1500]" style={{ left, top, width: CARD_W }}>
      <div className="glass-panel overflow-hidden shadow-glass">
        {report && !imgError ? (
          <img
            src={`${API_BASE}/api/images/${bridge.osm_id}/0`}
            alt=""
            className="w-full object-cover opacity-80"
            style={{ height: 90 }}
            onError={() => setImgError(true)}
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
                  style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {report.risk_tier}
                </span>
                <span className="text-2xs font-mono text-dim">{report.risk_score}/5.0</span>
              </>
            ) : (
              <>
                <span className="text-2xs text-muted">
                  {ROAD_LABELS[bridge.road_class] || bridge.road_class || "Road bridge"}
                </span>
                <span className="text-2xs font-mono text-dim">P{bridge.priority_score}</span>
              </>
            )}
          </div>
        </div>
      </div>
      {/* Arrow */}
      <div className="flex justify-center -mt-px">
        <div
          className="w-2.5 h-2.5 rotate-45"
          style={{ background: "rgba(12, 14, 22, 0.85)", borderRight: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        />
      </div>
    </div>
  );
}

// ─── Viewport summary (glass) ────────────────────────────────────────────────
function ViewportSummary({ visible, total, analyzedBridges }) {
  if (total === 0) return null;

  const analysedInView = visible.filter((b) => analyzedBridges[b.osm_id]);
  const counts = TIERS.reduce((acc, t) => {
    acc[t] = analysedInView.filter((b) => analyzedBridges[b.osm_id]?.risk_tier === t).length;
    return acc;
  }, {});
  const unanalysed = visible.length - analysedInView.length;

  return (
    <div className="absolute bottom-8 left-3 z-[1000] glass-panel px-3.5 py-3 min-w-[175px] shadow-glass">
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
              />
              <span className="text-2xs font-mono text-muted">
                {counts[tier]} {tier}
              </span>
            </div>
          );
        })}
        {unanalysed > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-accent/20" />
            <span className="text-2xs font-mono text-dim">{unanalysed} PENDING</span>
          </div>
        )}
      </div>
      {counts.CRITICAL > 0 && (
        <div className="mt-2.5 pt-2 border-t border-severity-critical/20">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-severity-critical" />
            <span className="text-2xs font-mono font-bold text-severity-critical">
              {counts.CRITICAL} CRITICAL
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Scan viewport button (glass) ────────────────────────────────────────────
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
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            SCANNING
          </>
        ) : (
          <>
            <Crosshair className="w-4 h-4" />
            SCAN AREA
          </>
        )}
      </button>
    </div>
  );
}

// ─── Filter chips (glass) ────────────────────────────────────────────────────
function FilterBar({ allBridges, analyzedBridges, activeFilter, onFilter }) {
  if (!allBridges.length) return null;
  const analysed = Object.values(analyzedBridges);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 flex-wrap justify-center px-3">
      <button
        onClick={() => onFilter("ALL")}
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
            onClick={() => onFilter(tier)}
            className="px-3 py-1 text-2xs font-mono font-bold rounded-full transition-all border"
            style={{
              backgroundColor: active ? c.bg : "rgba(12, 14, 22, 0.85)",
              color: active ? c.text : "rgba(255,255,255,0.4)",
              borderColor: active ? c.border : "rgba(255,255,255,0.06)",
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

// ─── Main export ─────────────────────────────────────────────────────────────
export default function MapView() {
  const allBridges = useAppStore((s) => s.bridges);
  const analyzedBridges = useAppStore((s) => s.analyzedBridges);
  const checkedBridgeIds = useAppStore((s) => s.checkedBridgeIds);
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);

  const [hoveredBridge, setHoveredBridge] = useState(null);
  const [hoveredReport, setHoveredReport] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [visibleBridges, setVisibleBridges] = useState([]);
  const containerRef = useRef(null);

  const filteredBridges = activeFilter === "ALL"
    ? allBridges
    : allBridges.filter((b) => analyzedBridges[b.osm_id]?.risk_tier === activeFilter);

  const handleHover = useCallback((bridge, report, pos) => {
    setHoveredBridge(bridge);
    setHoveredReport(report || null);
    setHoverPos(pos);
  }, []);

  const handleHoverClear = useCallback(() => setHoveredBridge(null), []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 overflow-hidden">
      <FilterBar
        allBridges={allBridges}
        analyzedBridges={analyzedBridges}
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
      />

      {hoveredBridge && (
        <HoverCard
          key={hoveredBridge.osm_id}
          bridge={hoveredBridge}
          report={hoveredReport}
          pos={hoverPos}
          containerRef={containerRef}
        />
      )}

      <ViewportSummary visible={visibleBridges} total={allBridges.length} analyzedBridges={analyzedBridges} />

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
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
