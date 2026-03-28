import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import useAppStore from "../store/useAppStore";
import { RISK_COLORS, RISK_MARKER_SIZE } from "../utils/riskColors";
import { useBridgeScan } from "../hooks/useBridgeScan";
import type { BridgeRiskReport, RiskTier } from "../types";

const DEFAULT_CENTER: [number, number] = [51.1079, 17.0385];
const DEFAULT_ZOOM   = 6;
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TIERS: RiskTier[] = ["CRITICAL", "HIGH", "MEDIUM", "OK"];

function makeIcon(tier: RiskTier) {
  const c    = RISK_COLORS[tier] || RISK_COLORS.OK;
  const dot  = RISK_MARKER_SIZE[tier] || 8;
  const pulse = tier === "CRITICAL" || tier === "HIGH";
  const dur   = tier === "CRITICAL" ? "1.1s" : "1.8s";
  const outer = pulse ? dot * 3 : dot * 2.2;

  const html = pulse
    ? `<div style="position:relative;width:${outer}px;height:${outer}px;display:flex;align-items:center;justify-content:center;">
         <div class="marker-pulse-ring" style="background:${c.hex};--pulse-duration:${dur};"></div>
         <div class="marker-pulse-ring marker-pulse-ring-2" style="background:${c.hex};--pulse-duration:${dur};"></div>
         <div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${c.hex};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);position:relative;z-index:2;"></div>
       </div>`
    : `<div style="width:${dot}px;height:${dot}px;border-radius:50%;background:${c.hex};border:2.5px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.3);"></div>`;

  return L.divIcon({
    className: "",
    html,
    iconSize:   [outer, outer],
    iconAnchor: [outer / 2, outer / 2],
  });
}

function MapController({ bridges }: { bridges: BridgeRiskReport[] }) {
  const map = useMap();
  useEffect(() => {
    if (!bridges.length) return;
    if (bridges.length === 1) {
      map.flyTo([bridges[0].lat, bridges[0].lon], 15, { duration: 1.2 });
    } else {
      const latlngs = bridges.map((b) => [b.lat, b.lon] as [number, number]);
      map.flyToBounds(latlngs, { padding: [50, 50], duration: 1.2, maxZoom: 15 });
    }
  }, [bridges.length]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function BoundsTracker({ allBridges, onUpdate }: { allBridges: BridgeRiskReport[]; onUpdate: (b: BridgeRiskReport[]) => void }) {
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

interface MarkerProps {
  bridges: BridgeRiskReport[];
  onHover: (b: BridgeRiskReport, pos: { x: number; y: number }) => void;
  onHoverClear: () => void;
  onSelect: (b: BridgeRiskReport) => void;
}

function BridgeMarkers({ bridges, onHover, onHoverClear, onSelect }: MarkerProps) {
  const map = useMap();
  return (
    <>
      {bridges.map((bridge) => (
        <Marker
          key={bridge.bridge_id}
          position={[bridge.lat, bridge.lon]}
          icon={makeIcon(bridge.risk_tier)}
          eventHandlers={{
            mouseover: () => {
              const pt = map.latLngToContainerPoint([bridge.lat, bridge.lon]);
              onHover(bridge, { x: pt.x, y: pt.y });
            },
            mouseout: onHoverClear,
            click: () => onSelect(bridge),
          }}
        />
      ))}
    </>
  );
}

function HoverCard({ bridge, pos, containerRef }: { bridge: BridgeRiskReport; pos: { x: number; y: number }; containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [imgError, setImgError] = useState(false);
  const c = RISK_COLORS[bridge.risk_tier] || RISK_COLORS.OK;

  const CARD_W = 210;
  const containerW = containerRef.current?.offsetWidth || 800;

  let left = pos.x - CARD_W / 2;
  if (left < 8) left = 8;
  if (left + CARD_W > containerW - 8) left = containerW - CARD_W - 8;

  const CARD_H = 180;
  const top = pos.y - CARD_H - 16 > 8 ? pos.y - CARD_H - 16 : pos.y + 24;

  return (
    <div
      className="absolute pointer-events-none z-[1500]"
      style={{ left, top, width: CARD_W }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
        {!imgError ? (
          <img
            src={`${API_BASE}/api/images/${bridge.bridge_id}/0`}
            alt=""
            className="w-full object-cover"
            style={{ height: 110 }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ height: 60, backgroundColor: c.bg }}
          >
            <span className="text-xs font-medium" style={{ color: c.text }}>
              No imagery cached
            </span>
          </div>
        )}

        <div className="px-3 py-2.5">
          <p className="text-xs font-semibold text-gray-900 leading-snug mb-1.5 line-clamp-2">
            {bridge.bridge_name || `Bridge ${bridge.bridge_id}`}
          </p>
          <div className="flex items-center justify-between mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: c.bg, color: c.text }}
            >
              {bridge.risk_tier}
            </span>
            <span className="text-xs text-gray-400 font-medium">{bridge.risk_score}/5.0</span>
          </div>
          {bridge.recommended_action && (
            <p className="text-xs text-gray-400 leading-snug line-clamp-2 mt-1">
              {bridge.recommended_action}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-center -mt-px">
        <div
          className="w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45"
          style={{ boxShadow: "2px 2px 3px rgba(0,0,0,.06)" }}
        />
      </div>
    </div>
  );
}

function ViewportSummary({ visible, total }: { visible: BridgeRiskReport[]; total: number }) {
  if (total === 0) return null;

  const counts = TIERS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = visible.filter((b) => b.risk_tier === t).length;
    return acc;
  }, {});

  const criticalInView = counts.CRITICAL;

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
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-xs text-gray-700">
                {counts[tier]} {tier}
              </span>
            </div>
          );
        })}
      </div>

      {criticalInView > 0 && (
        <div className="mt-2 pt-2 border-t border-red-100">
          <p className="text-xs font-bold text-red-600">
            {criticalInView} critical in view
          </p>
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
    scanViewport({
      sw_lat: b.getSouth(),
      sw_lon: b.getWest(),
      ne_lat: b.getNorth(),
      ne_lon: b.getEast(),
    });
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
            Scanning...
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

type FilterTier = RiskTier | "ALL";

function FilterBar({ allBridges, activeFilter, onFilter }: { allBridges: BridgeRiskReport[]; activeFilter: string; onFilter: (t: FilterTier) => void }) {
  if (!allBridges.length) return null;
  const filterOptions: FilterTier[] = ["ALL", ...TIERS];
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 flex-wrap justify-center px-3">
      {filterOptions.map((tier) => {
        const c     = tier === "ALL" ? null : RISK_COLORS[tier];
        const count = tier === "ALL"
          ? allBridges.length
          : allBridges.filter((b) => b.risk_tier === tier).length;
        if (count === 0 && tier !== "ALL") return null;
        const active = activeFilter === tier;
        return (
          <button
            key={tier}
            onClick={() => onFilter(tier)}
            className="px-3 py-1 text-xs font-bold rounded-full shadow-md border transition-all"
            style={
              c
                ? { backgroundColor: active ? c.hex : "#fff", color: active ? "#fff" : c.text, borderColor: c.hex }
                : { backgroundColor: active ? "#111827" : "#fff", color: active ? "#fff" : "#374151", borderColor: "#d1d5db" }
            }
          >
            {tier} ({count})
          </button>
        );
      })}
    </div>
  );
}

export default function MapView() {
  const allBridges      = useAppStore((s) => s.bridges);
  const filteredBridges = useAppStore((s) => s.filteredBridges());
  const activeFilter    = useAppStore((s) => s.activeFilter);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);
  const setSelectedBridge = useAppStore((s) => s.setSelectedBridge);

  const [hoveredBridge, setHoveredBridge] = useState<BridgeRiskReport | null>(null);
  const [hoverPos,      setHoverPos]      = useState({ x: 0, y: 0 });
  const [visibleBridges, setVisibleBridges] = useState<BridgeRiskReport[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleHover = useCallback((bridge: BridgeRiskReport, pos: { x: number; y: number }) => {
    setHoveredBridge(bridge);
    setHoverPos(pos);
  }, []);

  const handleHoverClear = useCallback(() => setHoveredBridge(null), []);

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 overflow-hidden">
      <FilterBar
        allBridges={allBridges}
        activeFilter={activeFilter}
        onFilter={setActiveFilter}
      />

      {hoveredBridge && (
        <HoverCard
          key={hoveredBridge.bridge_id}
          bridge={hoveredBridge}
          pos={hoverPos}
          containerRef={containerRef}
        />
      )}

      <ViewportSummary visible={visibleBridges} total={allBridges.length} />

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
          onHover={handleHover}
          onHoverClear={handleHoverClear}
          onSelect={setSelectedBridge}
        />
        <ScanViewportButton />
      </MapContainer>
    </div>
  );
}
