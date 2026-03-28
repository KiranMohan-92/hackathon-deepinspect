import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import useAppStore from "../store/useAppStore";
import { RISK_COLORS, RISK_MARKER_SIZE } from "../utils/riskColors";
import { useBridgeScan } from "../hooks/useBridgeScan";

const DEFAULT_CENTER = [51.1079, 17.0385]; // Wrocław
const DEFAULT_ZOOM   = 6;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TIERS = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

// Priority → dot colour for unanalysed bridges
function priorityColor(score) {
  if (score >= 4.5) return "#64748b";  // slate — motorway/trunk
  if (score >= 3.5) return "#94a3b8";  // secondary
  return "#cbd5e1";                     // tertiary / local
}

// ─── Custom marker icon factory ───────────────────────────────────────────────
function makeIcon(tier, priorityScore = 1, isChecked = false, isSelected = false) {
  // Gold ring for selected (clicked in list), blue ring for checked (checkbox)
  const extraShadow = isSelected
    ? ", 0 0 0 3px #FBBF24, 0 0 0 5px rgba(255,255,255,0.9)"
    : isChecked
    ? ", 0 0 0 3px #3b82f6, 0 0 0 5px rgba(255,255,255,0.85)"
    : "";
  // Alias used below
  const checkedShadow = extraShadow;

  if (!tier) {
    // Unanalysed: plain gray dot, size based on priority
    const dot = priorityScore >= 4 ? 9 : priorityScore >= 3 ? 7 : 6;
    const hex = priorityColor(priorityScore);
    const html = `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${hex};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)${checkedShadow};"></div>`;
    return L.divIcon({ className: "", html, iconSize: [dot, dot], iconAnchor: [dot / 2, dot / 2] });
  }

  const c    = RISK_COLORS[tier] || RISK_COLORS.OK;
  const dot  = RISK_MARKER_SIZE[tier] || 8;
  const pulse = tier === "CRITICAL" || tier === "HIGH";
  const dur   = tier === "CRITICAL" ? "1.1s" : "1.8s";
  const outer = pulse ? dot * 3 : dot * 2.2;

  const html = pulse
    ? `<div style="position:relative;width:${outer}px;height:${outer}px;display:flex;align-items:center;justify-content:center;">
         <div class="marker-pulse-ring" style="background:${c.hex};--pulse-duration:${dur};"></div>
         <div class="marker-pulse-ring marker-pulse-ring-2" style="background:${c.hex};--pulse-duration:${dur};"></div>
         <div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${c.hex};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)${checkedShadow};position:relative;z-index:2;"></div>
       </div>`
    : `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${c.hex};border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3)${checkedShadow};"></div>`;

  return L.divIcon({ className: "", html, iconSize: [outer, outer], iconAnchor: [outer / 2, outer / 2] });
}

// ─── Fly to fit all bridges when results arrive ───────────────────────────────
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

// ─── Track which bridges are inside the current viewport ──────────────────────
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

// ─── Render markers (gray for unanalysed, risk colour for analysed) ───────────
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

// ─── Floating hover preview card ──────────────────────────────────────────────
const ROAD_LABELS = {
  motorway: "Motorway", trunk: "Trunk", primary: "Primary",
  secondary: "Secondary", tertiary: "Tertiary",
  unclassified: "Local", residential: "Residential",
  motorway_link: "Motorway", trunk_link: "Trunk",
  primary_link: "Primary", secondary_link: "Secondary", tertiary_link: "Tertiary",
};

function HoverCard({ bridge, report, pos, containerRef }) {
  const [imgError, setImgError] = useState(false);
  const CARD_W = 210;
  const containerW = containerRef.current?.offsetWidth || 800;
  const CARD_H = 170;

  let left = pos.x - CARD_W / 2;
  if (left < 8) left = 8;
  if (left + CARD_W > containerW - 8) left = containerW - CARD_W - 8;
  const top = pos.y - CARD_H - 16 > 8 ? pos.y - CARD_H - 16 : pos.y + 24;

  const c = report ? (RISK_COLORS[report.risk_tier] || RISK_COLORS.OK) : null;

  return (
    <div className="absolute pointer-events-none z-[1500]" style={{ left, top, width: CARD_W }}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Street View thumbnail (only if analysed and cached) */}
        {report && !imgError ? (
          <img
            src={`${API_BASE}/api/images/${bridge.osm_id}/0`}
            alt=""
            className="w-full object-cover"
            style={{ height: 90 }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center" style={{ height: 40, backgroundColor: "#f9fafb" }}>
            <span className="text-xs text-gray-400">
              {report ? "No image cached" : "Not yet analysed"}
            </span>
          </div>
        )}
        <div className="px-3 py-2">
          <p className="text-xs font-semibold text-gray-900 mb-1 line-clamp-2">
            {bridge.name || `Bridge ${bridge.osm_id}`}
          </p>
          <div className="flex items-center justify-between">
            {report ? (
              <>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: c.bg, color: c.text }}>
                  {report.risk_tier}
                </span>
                <span className="text-xs text-gray-400">{report.risk_score}/5.0</span>
              </>
            ) : (
              <>
                <span className="text-xs text-gray-500">
                  {ROAD_LABELS[bridge.road_class] || bridge.road_class || "Road bridge"}
                </span>
                <span className="text-xs text-gray-400">P {bridge.priority_score}</span>
              </>
            )}
          </div>
          {report?.recommended_action && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{report.recommended_action}</p>
          )}
        </div>
      </div>
      <div className="flex justify-center -mt-px">
        <div className="w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45"
          style={{ boxShadow: "2px 2px 3px rgba(0,0,0,.06)" }} />
      </div>
    </div>
  );
}

// ─── Viewport summary overlay ─────────────────────────────────────────────────
function ViewportSummary({ visible, total, analyzedBridges }) {
  if (total === 0) return null;

  const analysedInView = visible.filter((b) => analyzedBridges[b.osm_id]);
  const counts = TIERS.reduce((acc, t) => {
    acc[t] = analysedInView.filter((b) => analyzedBridges[b.osm_id]?.risk_tier === t).length;
    return acc;
  }, {});
  const unanalysed = visible.length - analysedInView.length;

  return (
    <div className="absolute bottom-8 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3.5 py-3 min-w-[175px]">
      <p className="text-xs font-semibold text-gray-500 mb-2 leading-none">
        {visible.length} of {total} bridges in view
      </p>
      <div className="flex flex-col gap-1">
        {TIERS.filter((t) => counts[t] > 0).map((tier) => {
          const c = RISK_COLORS[tier];
          return (
            <div key={tier} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.hex }} />
              <span className="text-xs text-gray-700">{counts[tier]} {tier}</span>
            </div>
          );
        })}
        {unanalysed > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-slate-300" />
            <span className="text-xs text-gray-500">{unanalysed} not analysed</span>
          </div>
        )}
      </div>
      {counts.CRITICAL > 0 && (
        <div className="mt-2 pt-2 border-t border-red-100">
          <p className="text-xs font-bold text-red-600">⚠ {counts.CRITICAL} critical in view</p>
        </div>
      )}
    </div>
  );
}

// ─── Scan this area button ────────────────────────────────────────────────────
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
        className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-lg border border-gray-200
                   text-sm font-semibold text-gray-800 hover:bg-gray-50 active:scale-95
                   disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
            Scanning…
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="3" />
              <path strokeLinecap="round" d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
            Scan this area
          </>
        )}
      </button>
    </div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────
function FilterBar({ allBridges, analyzedBridges, activeFilter, onFilter }) {
  if (!allBridges.length) return null;
  const analysed = Object.values(analyzedBridges);

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 flex-wrap justify-center px-3">
      <button
        onClick={() => onFilter("ALL")}
        className="px-3 py-1 text-xs font-bold rounded-full shadow-md border transition-all"
        style={{ backgroundColor: activeFilter === "ALL" ? "#111827" : "#fff",
                 color: activeFilter === "ALL" ? "#fff" : "#374151", borderColor: "#d1d5db" }}
      >
        ALL ({allBridges.length})
      </button>
      {TIERS.map((tier) => {
        const count = analysed.filter((r) => r.risk_tier === tier).length;
        if (count === 0) return null;
        const c = RISK_COLORS[tier];
        const active = activeFilter === tier;
        return (
          <button key={tier} onClick={() => onFilter(tier)}
            className="px-3 py-1 text-xs font-bold rounded-full shadow-md border transition-all"
            style={{ backgroundColor: active ? c.hex : "#fff", color: active ? "#fff" : c.text, borderColor: c.hex }}
          >
            {tier} ({count})
          </button>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function MapView() {
  const allBridges       = useAppStore((s) => s.bridges);
  const analyzedBridges  = useAppStore((s) => s.analyzedBridges);
  const checkedBridgeIds = useAppStore((s) => s.checkedBridgeIds);
  const selectedBridgeId = useAppStore((s) => s.selectedBridgeId);
  const activeFilter     = useAppStore((s) => s.activeFilter);
  const setActiveFilter  = useAppStore((s) => s.setActiveFilter);
  const setSelectedBridgeId = useAppStore((s) => s.setSelectedBridgeId);

  const [hoveredBridge, setHoveredBridge] = useState(null);
  const [hoveredReport, setHoveredReport] = useState(null);
  const [hoverPos,      setHoverPos]      = useState({ x: 0, y: 0 });
  const [visibleBridges, setVisibleBridges] = useState([]);
  const containerRef = useRef(null);

  // Apply filter: ALL shows everything; tier filter shows only analysed bridges of that tier
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
