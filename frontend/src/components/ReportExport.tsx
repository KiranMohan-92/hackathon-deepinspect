import { useState } from "react";
import { Download, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

// ─── Unicode font loader ───────────────────────────────────────────────────────
// jsPDF's built-in Helvetica only covers Latin-1 and garbles Polish/accented
// characters (ą ę ó ś ń ż ź ć ł etc.) as well as Unicode symbols like ▶.
// We embed Roboto (full Latin Extended-A/B) fetched from jsDelivr CDN and
// cached at module level so it is only downloaded once per browser session.

type FontCache = { normal: string; bold: string; italic: string } | false | null;
type OverlayImage = { dataUrl: string; aspectRatio: number };
type DefectRegion = { x1: number; y1: number; x2: number; y2: number };

let _fontCache: FontCache = null; // false = fetch failed, object = loaded

function bufToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
  }
  return btoa(binary);
}

async function fetchFont(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // 8 s timeout
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.arrayBuffer();
  } finally {
    clearTimeout(timer);
  }
}

const ROBOTO = "https://cdn.jsdelivr.net/gh/google/fonts@3a87e65bdd1be6a41a4e38eb1e08cfa46a4d98e2/apache/roboto/static";

async function ensureFonts(doc: any) {
  // Load fonts only once per session
  if (_fontCache === null) {
    try {
      const [normalBuf, boldBuf, italicBuf] = await Promise.all([
        fetchFont(`${ROBOTO}/Roboto-Regular.ttf`),
        fetchFont(`${ROBOTO}/Roboto-Bold.ttf`),
        fetchFont(`${ROBOTO}/Roboto-Italic.ttf`),
      ]);
      _fontCache = {
        normal: bufToBase64(normalBuf),
        bold:   bufToBase64(boldBuf),
        italic: bufToBase64(italicBuf),
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.warn("DeepInspect: could not load Unicode font, falling back to helvetica.", message);
      _fontCache = false;
    }
  }

  if (!_fontCache) return "helvetica"; // offline / timeout fallback

  // Embed fonts into this document instance (safe to call multiple times)
  try {
    doc.addFileToVFS("Roboto-Regular.ttf", _fontCache.normal);
    doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
    doc.addFileToVFS("Roboto-Bold.ttf", _fontCache.bold);
    doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
    doc.addFileToVFS("Roboto-Italic.ttf", _fontCache.italic);
    doc.addFont("Roboto-Italic.ttf", "Roboto", "italic");
    return "Roboto";
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.warn("DeepInspect: font embedding failed, falling back to helvetica.", message);
    return "helvetica";
  }
}

// ─── Image + defect-overlay fetcher ──────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const DEFECT_COLORS_HEX: Record<string, string> = {
  cracking:               "#EF4444",
  spalling:               "#F97316",
  corrosion:              "#92400E",
  surface_degradation:    "#EAB308",
  drainage:               "#3B82F6",
  structural_deformation: "#8B5CF6",
};
const DEFECT_KEYS = Object.keys(DEFECT_COLORS_HEX);

const HEADINGS = [
  { value: 0,   label: "North"      },
  { value: 60,  label: "North-East" },
  { value: 120, label: "South-East" },
  { value: 180, label: "South"      },
  { value: 240, label: "South-West" },
  { value: 300, label: "North-West" },
];

function hexToRgb(hex: string) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function tint(hex: string, opacity = 0.12) {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(r * opacity + 255 * (1 - opacity)),
    Math.round(g * opacity + 255 * (1 - opacity)),
    Math.round(b * opacity + 255 * (1 - opacity)),
  ];
}

async function fetchImageWithOverlay(url: string, va: any): Promise<OverlayImage | null> {
  return new Promise((resolve: (value: OverlayImage | null) => void) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth  || 640;
      const h = img.naturalHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);

      if (va) {
        DEFECT_KEYS.forEach((key) => {
          const defect = va[key];
          if (!defect || defect.score < 2 || !defect.regions?.length) return;
          const [r, g, b] = hexToRgb(DEFECT_COLORS_HEX[key]);

          defect.regions.forEach((region: DefectRegion) => {
            const x  = region.x1 * w;
            const y  = region.y1 * h;
            const bw = (region.x2 - region.x1) * w;
            const bh = (region.y2 - region.y1) * h;
            if (bw <= 0 || bh <= 0) return;

            ctx.fillStyle   = `rgba(${r},${g},${b},0.25)`;
            ctx.fillRect(x, y, bw, bh);
            ctx.strokeStyle = DEFECT_COLORS_HEX[key];
            ctx.lineWidth   = Math.max(2, w / 200);
            ctx.strokeRect(x, y, bw, bh);

            const label = key.replace(/_/g, " ");
            const fs    = Math.max(11, w / 55);
            ctx.font      = `bold ${fs}px sans-serif`;
            const tw      = ctx.measureText(label).width + 8;
            ctx.fillStyle = DEFECT_COLORS_HEX[key];
            ctx.fillRect(x, y, tw, fs + 6);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, x + 4, y + fs + 1);
          });
        });
      }

      resolve({ dataUrl: canvas.toDataURL("image/jpeg", 0.85), aspectRatio: w / h });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── PDF layout constants ─────────────────────────────────────────────────────

const PAGE_H    = 297;
const PAGE_W    = 210;
const MARGIN    = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Score / tier helpers ─────────────────────────────────────────────────────

function scoreHex(score: number | null | undefined) {
  if (score == null) return "#9CA3AF";
  if (score >= 4.0) return "#DC2626"; // CRITICAL
  if (score >= 3.0) return "#EA580C"; // HIGH
  if (score >= 2.0) return "#CA8A04"; // MEDIUM
  return "#16A34A";                   // OK
}

function tierHex(tier: string) {
  return ({ CRITICAL: "#DC2626", HIGH: "#EA580C", MEDIUM: "#CA8A04", OK: "#16A34A" } as Record<string, string>)[tier] || "#6B7280";
}

function confidenceHex(conf: string | null | undefined) {
  return ({ high: "#16A34A", medium: "#CA8A04", low: "#9CA3AF" } as Record<string, string>)[conf?.toLowerCase() || ""] || "#9CA3AF";
}

function tierLabel(score: number | null | undefined) {
  if (score == null) return "NOT ASSESSED";
  if (score >= 4.0) return "CRITICAL";
  if (score >= 3.0) return "HIGH";
  if (score >= 2.0) return "MEDIUM";
  return "OK";
}

function assessmentStatusLabel(status: string | null | undefined) {
  if (status === "not_assessed") return "NOT ASSESSED";
  if (status === "estimated") return "ESTIMATED";
  return "ASSESSED";
}

// ─── PDF layout helpers ───────────────────────────────────────────────────────

function ensureSpace(doc: any, y: number, needed: number) {
  if (y + needed > PAGE_H - 20) {
    doc.addPage();
    return 18;
  }
  return y;
}

function hRule(doc: any, y: number) {
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 5;
}

function sectionTitle(doc: any, text: string, y: number, F: string) {
  y = ensureSpace(doc, y, 12);
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y - 3, CONTENT_W, 8, "F");
  doc.setFont(F, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(107, 114, 128);
  doc.text(text.toUpperCase(), MARGIN + 2, y + 2);
  return y + 10;
}

// Draw a horizontal score bar (score 0–5 scale)
function drawScoreBar(doc: any, x: number, y: number, score: number | null | undefined, maxW: number) {
  const barH  = 3;
  const fillW = score == null ? 0 : Math.max(0, Math.min(score / 5, 1)) * maxW;
  const [r, g, b] = hexToRgb(scoreHex(score));
  doc.setFillColor(230, 230, 230);
  doc.rect(x, y, maxW, barH, "F");
  if (fillW > 0) {
    doc.setFillColor(r, g, b);
    doc.rect(x, y, fillW, barH, "F");
  }
}

// Small inline chip (text only, coloured background)
function drawChip(doc: any, text: string, x: number, y: number, hexColor: string, F: string) {
  const [r, g, b] = hexToRgb(hexColor);
  doc.setFont(F, "bold");
  doc.setFontSize(10.5);
  const tw = doc.getTextWidth(text);
  const pw = tw + 5;
  const ph = 5;
  doc.setFillColor(r, g, b);
  doc.roundedRect(x, y - 3.5, pw, ph, 0.8, 0.8, "F");
  doc.setTextColor(255, 255, 255);
  doc.text(text, x + 2.5, y + 0.2);
  return pw;
}

// Generate a short report ID from bridge_id + timestamp
function reportId(bridge: any) {
  const ts  = bridge.generated_at ? new Date(bridge.generated_at).getTime() : Date.now();
  const hash = (ts ^ (ts >>> 16)) & 0xFFFFFF;
  const id   = (bridge.bridge_id || "").replace(/\D/g, "").slice(0, 6);
  return `DI-${id || "XXXX"}-${hash.toString(16).toUpperCase().padStart(6, "0")}`;
}

// ─── Page footer ──────────────────────────────────────────────────────────────

function drawFooter(doc: any, F: string, pageNum: number, totalPages: number, rid: string) {
  doc.setPage(pageNum);
  doc.setFillColor(17, 24, 39);
  doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.3);
  doc.line(0, PAGE_H - 10, PAGE_W, PAGE_H - 10);

  doc.setFont(F, "normal");
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175);
  doc.text("DEEPINSPECT  \u00B7  Physics-First Infrastructure Intelligence", MARGIN, PAGE_H - 4);

  doc.setTextColor(107, 114, 128);
  doc.text("ASSESSMENT REPORT \u2014 FOR ENGINEERING REVIEW ONLY", PAGE_W / 2, PAGE_H - 4, { align: "center" });

  doc.setTextColor(156, 163, 175);
  doc.text(`${rid}  \u00B7  Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
}

// ─── PAGE 1: Cover + Executive Summary ───────────────────────────────────────

function buildCoverPage(doc: any, bridge: any, cert: any, F: string, rid: string) {
  const tier      = cert?.overall_risk_tier || bridge.risk_tier || "UNKNOWN";
  const score     = cert?.overall_risk_score ?? bridge.risk_score ?? 0;
  const conf      = cert?.overall_confidence || bridge.overall_confidence || "";
  const riskColor = tierHex(tier);
  const [rr, rg, rb] = hexToRgb(riskColor);

  // ── Dark header band ──────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, PAGE_W, 52, "F");

  // Left accent stripe
  doc.setFillColor(rr, rg, rb);
  doc.rect(0, 0, 3.5, 52, "F");

  // Logo + subtitle
  doc.setFont(F, "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("DEEPINSPECT", MARGIN + 4, 13);

  doc.setFont(F, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(156, 163, 175);
  doc.text("PHYSICS HEALTH CERTIFICATE", MARGIN + 4, 19);

  // Thin separator
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.3);
  doc.line(MARGIN + 4, 22, PAGE_W - MARGIN - 42, 22);

  // Bridge name
  const bridgeName = bridge.bridge_name || bridge.bridge_id || "Unknown Bridge";
  doc.setFont(F, "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  const nameLines = doc.splitTextToSize(bridgeName, 130);
  doc.text(nameLines, MARGIN + 4, 30);

  // Report ID metadata
  doc.setFont(F, "normal");
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text(`Report ID: ${rid}`, MARGIN + 4, 46);

  // ── Risk badge (right side of header) ────────────────────────────────────
  const badgeX = PAGE_W - MARGIN - 38;
  doc.setFillColor(rr, rg, rb);
  doc.roundedRect(badgeX, 6, 38, 40, 2, 2, "F");

  // Tier label
  doc.setFont(F, "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(tier, badgeX + 19, 18, { align: "center" });

  // Score
  doc.setFontSize(20);
  doc.text(`${typeof score === "number" ? score.toFixed(1) : "N/A"}`, badgeX + 19, 31, { align: "center" });

  // /5.0 subscript
  doc.setFont(F, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("/ 5.0 scale", badgeX + 19, 36, { align: "center" });

  // Confidence
  if (conf) {
    const [cr, cg, cb] = hexToRgb(confidenceHex(conf));
    doc.setFillColor(cr, cg, cb);
    doc.setFontSize(11);
    doc.setFont(F, "bold");
    const cw = doc.getTextWidth(conf.toUpperCase()) + 6;
    doc.roundedRect(badgeX + 19 - cw / 2, 39, cw, 5, 0.8, 0.8, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(conf.toUpperCase(), badgeX + 19, 43, { align: "center" });
  }

  let y = 60;

  // ── Bridge Identification ─────────────────────────────────────────────────
  y = sectionTitle(doc, "Bridge Identification", y, F);

  const idMeta = [];
  if (bridge.bridge_name)                               idMeta.push(["Structure Name", bridge.bridge_name]);
  if (bridge.bridge_id)                                 idMeta.push(["OSM / Bridge ID",  bridge.bridge_id]);
  if (bridge.lat != null && bridge.lon != null)         idMeta.push(["Coordinates",      `${bridge.lat.toFixed(6)}, ${bridge.lon.toFixed(6)}`]);
  if (bridge.context?.construction_year)                idMeta.push(["Year Built",       String(bridge.context.construction_year)]);
  if (bridge.context?.material && bridge.context.material !== "unknown")
                                                        idMeta.push(["Material",         bridge.context.material.replace(/_/g, " ")]);
  if (bridge.context?.age_years)                        idMeta.push(["Structure Age",    `${bridge.context.age_years} years`]);

  const cols  = 3;
  const colW  = CONTENT_W / cols;
  idMeta.forEach(([label, value], i) => {
    const cx = MARGIN + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 13;
    doc.setFont(F, "normal");
    doc.setFontSize(11);
    doc.setTextColor(156, 163, 175);
    doc.text(label.toUpperCase(), cx, cy);
    doc.setFont(F, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    const valStr = String(value).charAt(0).toUpperCase() + String(value).slice(1);
    doc.text(valStr, cx, cy + 5.5);
  });
  y += Math.ceil(idMeta.length / cols) * 13 + 2;
  y = hRule(doc, y);

  // ── Report Metadata row ───────────────────────────────────────────────────
  y = sectionTitle(doc, "Report Metadata", y, F);
  const metaItems = [];
  if (bridge.generated_at || cert?.generated_at)
    metaItems.push(["Generated", new Date(cert?.generated_at || bridge.generated_at).toLocaleString()]);
  if (cert?.model_version)
    metaItems.push(["Model Version", cert.model_version]);
  if (cert?.estimated_remaining_service_life_years != null)
    metaItems.push(["Est. Remaining Life", `${cert.estimated_remaining_service_life_years} years`]);
  metaItems.push(["Report ID", rid]);

  metaItems.forEach(([label, value], i) => {
    const cx = MARGIN + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 13;
    doc.setFont(F, "normal");
    doc.setFontSize(11);
    doc.setTextColor(156, 163, 175);
    doc.text(label.toUpperCase(), cx, cy);
    doc.setFont(F, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    doc.text(String(value), cx, cy + 5.5);
  });
  y += Math.ceil(metaItems.length / cols) * 13 + 2;
  y = hRule(doc, y);

  // ── Executive Summary box ─────────────────────────────────────────────────
  const summary = bridge.condition_summary || cert?.recommended_action || "";
  if (summary) {
    y = sectionTitle(doc, "Executive Summary", y, F);
    const sumLines = doc.splitTextToSize(summary, CONTENT_W - 14);
    const boxH     = sumLines.length * 5.2 + 12;
    y = ensureSpace(doc, y, boxH + 4);

    // Box background
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, boxH, 2, 2, "DF");

    // Left accent bar (score colour)
    doc.setFillColor(rr, rg, rb);
    doc.rect(MARGIN, y - 2, 3.5, boxH, "F");

    doc.setFont(F, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(31, 41, 55);
    doc.text(sumLines, MARGIN + 7, y + 5);
    y += boxH + 6;
  }

  // ── Key Risk Factors ──────────────────────────────────────────────────────
  if (bridge.key_risk_factors?.length) {
    y = hRule(doc, y);
    y = sectionTitle(doc, "Key Risk Factors", y, F);
    for (const f of bridge.key_risk_factors) {
      y = ensureSpace(doc, y, 8);
      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(220, 38, 38);
      doc.text("\u25B6", MARGIN, y);
      doc.setFont(F, "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(55, 65, 81);
      const flines = doc.splitTextToSize(f, CONTENT_W - 6);
      doc.text(flines, MARGIN + 5, y);
      y += flines.length * 5 + 1.5;
    }
  }

  return y;
}

// ─── PAGE 2: 11-Criterion Assessment Table ────────────────────────────────────

function buildCriteriaTablePage(doc: any, cert: any, F: string) {
  doc.addPage();
  let y = 18;

  // Page title
  doc.setFont(F, "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("Multi-Criteria Risk Assessment", MARGIN, y);
  y += 3;

  doc.setFont(F, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(107, 114, 128);
  const criteria = cert.criteria_results || [];
  const assessedCriteria = criteria.filter((cr: any) => cr.score != null && cr.included_in_overall_risk !== false);
  const excludedCount = criteria.length - assessedCriteria.length;
  const subtitle = excludedCount > 0
    ? `${assessedCriteria.length} assessed domain(s), ${excludedCount} not assessed remotely`
    : `Physics-based evaluation across ${criteria.length || 0} engineering risk domains`;
  doc.text(subtitle, MARGIN, y + 4);
  y += 8;
  y = hRule(doc, y);

  // ── Table header ──────────────────────────────────────────────────────────
  // Column definitions: x offset from MARGIN, width
  const COL = {
    rank:    { x: 0,    w: 8  },
    name:    { x: 8,    w: 72 },
    score:   { x: 80,   w: 18 },
    bar:     { x: 98,   w: 28 },
    conf:    { x: 126,  w: 20 },
    prob:    { x: 146,  w: 20 },
    status:  { x: 166,  w: 16 },
  };

  const ROW_H = 8.5;
  const HDR_H = 9;

  // Header background
  doc.setFillColor(17, 24, 39);
  doc.rect(MARGIN, y, CONTENT_W, HDR_H, "F");

  doc.setFont(F, "bold");
  doc.setFontSize(11);
  doc.setTextColor(156, 163, 175);

  const headers: Array<[string, { x: number; w: number }]> = [
    ["#",           COL.rank],
    ["CRITERION",   COL.name],
    ["SCORE",       COL.score],
    ["RISK BAR",    COL.bar],
    ["CONFIDENCE",  COL.conf],
    ["PROBABILITY", COL.prob],
    ["STATUS",      COL.status],
  ];

  for (const [label, col] of headers) {
    doc.text(label, MARGIN + col.x + 1, y + 6);
  }
  y += HDR_H;

  // ── Table rows ────────────────────────────────────────────────────────────
  for (let i = 0; i < criteria.length; i++) {
    const cr  = criteria[i];
    const hex = scoreHex(cr.score);
    const [rr, rg, rb] = hexToRgb(hex);

    y = ensureSpace(doc, y, ROW_H + 2);

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(249, 250, 251);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(MARGIN, y, CONTENT_W, ROW_H, "F");

    // Left colour stripe (score severity)
    doc.setFillColor(rr, rg, rb);
    doc.rect(MARGIN, y, 2, ROW_H, "F");

    const textY = y + 5.8;

    // Rank
    doc.setFont(F, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text(String(cr.criterion_rank ?? i + 1), MARGIN + COL.rank.x + 2, textY, { align: "center" });

    // Criterion name (truncated if needed)
    const nameStr   = cr.criterion_name || "";
    const maxNW     = COL.name.w - 3;
    doc.setFont(F, "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(31, 41, 55);
    const truncName = doc.getTextWidth(nameStr) > maxNW
      ? doc.splitTextToSize(nameStr, maxNW)[0] + "\u2026"
      : nameStr;
    doc.text(truncName, MARGIN + COL.name.x + 1, textY);

    // Score number
    doc.setFont(F, "bold");
    doc.setFontSize(11);
    doc.setTextColor(rr, rg, rb);
    doc.text(cr.score != null ? cr.score.toFixed(1) : "N/A", MARGIN + COL.score.x + 2, textY);

    // Score bar
    drawScoreBar(doc, MARGIN + COL.bar.x, y + (ROW_H - 3) / 2, cr.score, COL.bar.w - 4);

    // Confidence
    const confColor = confidenceHex(cr.confidence);
    const [cr2, cg2, cb2] = hexToRgb(confColor);
    doc.setFont(F, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(cr2, cg2, cb2);
    doc.text((cr.confidence || "?").toUpperCase(), MARGIN + COL.conf.x + 2, textY);

    // Failure probability
    doc.setFont(F, "normal");
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    const probStr = cr.failure_mode_probability
      ? cr.failure_mode_probability.charAt(0).toUpperCase() + cr.failure_mode_probability.slice(1)
      : "\u2014";
    doc.text(probStr, MARGIN + COL.prob.x + 1, textY);

    // Status: field inspection required?
    if (cr.assessment_status === "not_assessed") {
      doc.setFont(F, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(107, 114, 128);
      doc.text("N/A", MARGIN + COL.status.x + 1, textY);
    } else if (cr.requires_field_verification) {
      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(146, 64, 14);
      doc.text("\u26A0 VERIFY", MARGIN + COL.status.x + 1, textY);
    } else if (cr.assessment_status === "estimated") {
      doc.setFont(F, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(37, 99, 235);
      doc.text("EST", MARGIN + COL.status.x + 1, textY);
    } else {
      doc.setFont(F, "normal");
      doc.setFontSize(11);
      doc.setTextColor(22, 163, 74);
      doc.text("\u2714 OK", MARGIN + COL.status.x + 1, textY);
    }

    // Row bottom border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.15);
    doc.line(MARGIN, y + ROW_H, MARGIN + CONTENT_W, y + ROW_H);

    y += ROW_H;
  }

  y += 4;

  // ── Overall score summary ─────────────────────────────────────────────────
  y = ensureSpace(doc, y, 28);

  const ovScore = cert.overall_risk_score ?? 0;
  const ovTier  = cert.overall_risk_tier || tierLabel(ovScore);
  const ovHex   = tierHex(ovTier);
  const [or, og, ob] = hexToRgb(ovHex);

  doc.setFillColor(17, 24, 39);
  doc.roundedRect(MARGIN, y, CONTENT_W, 24, 2, 2, "F");

  doc.setFont(F, "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(156, 163, 175);
  doc.text("COMPOSITE RISK SCORE", MARGIN + 5, y + 7);

  doc.setFontSize(20);
  doc.setTextColor(or, og, ob);
  doc.text(ovScore.toFixed(2), MARGIN + 5, y + 18);

  doc.setFont(F, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(156, 163, 175);
  doc.text(`/ 5.0 \u00B7 ${ovTier} tier \u00B7 Confidence: ${cert.overall_confidence || "?"}`, MARGIN + 24, y + 18);

  doc.setFont(F, "italic");
  doc.setFontSize(11);
  doc.setTextColor(107, 114, 128);
  doc.text(
    "Weighted composite of assessed criteria only. Domains without enough evidence are excluded and listed as limitations.",
    PAGE_W - MARGIN - 5,
    y + 7,
    { align: "right", maxWidth: 90 }
  );

  y += 28;

  // ── Confidence distribution ───────────────────────────────────────────────
  y = ensureSpace(doc, y, 22);
  y += 4;
  y = sectionTitle(doc, "Confidence Distribution", y, F);

  const confGroups: Record<string, number> = { high: 0, medium: 0, low: 0 };
  for (const cr of assessedCriteria) {
    const key = (cr.confidence || "low").toLowerCase();
    if (key in confGroups) confGroups[key]++;
  }
  const total = assessedCriteria.length || 1;

  const barGroupW = CONTENT_W;
  const segColors: Record<string, string> = { high: "#16A34A", medium: "#CA8A04", low: "#9CA3AF" };
  let segX = MARGIN;

  doc.setFont(F, "bold");
  doc.setFontSize(9.5);

  for (const [key, count] of Object.entries(confGroups)) {
    const segW = (count / total) * barGroupW;
    if (segW <= 0) continue;
    const [r, g, b] = hexToRgb(segColors[key]);
    doc.setFillColor(r, g, b);
    doc.rect(segX, y, segW, 6, "F");
    if (segW > 10) {
      doc.setTextColor(255, 255, 255);
      doc.text(`${key.toUpperCase()} (${count})`, segX + segW / 2, y + 4.3, { align: "center" });
    }
    segX += segW;
  }
  y += 10;

  if (excludedCount > 0) {
    doc.setFont(F, "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `${excludedCount} criterion/criteria were not assessed remotely and are excluded from the confidence distribution.`,
      MARGIN,
      y + 2,
    );
    y += 6;
  }

  return y;
}

// ─── PAGE 3: Criterion Details ────────────────────────────────────────────────

function buildCriterionDetailsPage(doc: any, cert: any, F: string) {
  doc.addPage();
  let y = 18;

  doc.setFont(F, "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("Criterion Detail Analysis", MARGIN, y);
  y += 3;

  doc.setFont(F, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Elevated-risk criteria and remote assessment gaps requiring field follow-up", MARGIN, y + 4);
  y += 10;
  y = hRule(doc, y);

  const criteria = (cert.criteria_results || []).filter(
    (cr: any) => cr.assessment_status === "not_assessed" || (cr.score ?? 0) >= 2.5 || cr.requires_field_verification
  );

  if (criteria.length === 0) {
    doc.setFont(F, "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(22, 163, 74);
    doc.text("All criteria scored below threshold. No elevated-risk criteria to detail.", MARGIN, y + 6);
    return y;
  }

  for (const cr of criteria) {
    const hex = scoreHex(cr.score);
    const [rr, rg, rb] = hexToRgb(hex);

    // Estimate block height
    const findings    = cr.key_findings || [];
    const sources     = cr.data_sources_used || [];
    const scopeLines  = cr.requires_field_verification && cr.field_verification_scope
      ? doc.splitTextToSize(cr.field_verification_scope, CONTENT_W - 18)
      : [];

    const blockH = 10                               // header
      + 3                                            // bar row
      + 7                                            // status row
      + findings.length * 5                          // findings
      + (sources.length > 0 ? 10 : 0)               // sources row
      + (scopeLines.length > 0 ? scopeLines.length * 4.5 + 14 : 0) // scope box
      + 6;                                           // padding

    y = ensureSpace(doc, y, blockH);

    // Card background
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, blockH - 4, 2, 2, "DF");

    // Left coloured accent
    doc.setFillColor(rr, rg, rb);
    doc.rect(MARGIN, y, 3, blockH - 4, "F");

    const innerX = MARGIN + 6;
    const innerW = CONTENT_W - 9;

    // Rank badge + criterion name
    doc.setFont(F, "bold");
    doc.setFontSize(11);
    doc.setTextColor(rr, rg, rb);
    doc.text(`#${cr.criterion_rank ?? ""}`, innerX, y + 5.5);

    doc.setFont(F, "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(17, 24, 39);
    doc.text(cr.criterion_name || "", innerX + 8, y + 5.5);

    // Score + tier chip inline
    const scoreStr = cr.score != null ? cr.score.toFixed(1) : "N/A";
    const chipColor = cr.score != null ? hex : "#6B7280";
    const chipW = drawChip(doc, `${scoreStr}${cr.score != null ? " / 5.0" : ""}`, PAGE_W - MARGIN - 30, y + 5.5, chipColor, F);
    const tierStr = cr.score != null ? tierLabel(cr.score) : assessmentStatusLabel(cr.assessment_status);
    drawChip(doc, tierStr, PAGE_W - MARGIN - 30 + chipW + 2, y + 5.5, chipColor, F);

    let cy = y + 10;

    // Score bar
    doc.setFont(F, "normal");
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text("RISK LEVEL", innerX, cy);
    drawScoreBar(doc, innerX + 22, cy - 2.5, cr.score, 60);
    cy += 6;

    doc.setFont(F, "normal");
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text("STATUS", innerX, cy);
    drawChip(doc, assessmentStatusLabel(cr.assessment_status), innerX + 16, cy + 0.2, chipColor, F);
    cy += 7;

    // Key findings
    if (findings.length > 0) {
      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text("KEY FINDINGS", innerX, cy);
      cy += 4.5;

      for (const finding of findings) {
        y = ensureSpace(doc, cy, 6);
        if (y !== cy) {
          // Moved to new page, redraw card context at top
          cy = y;
        }
        doc.setFont(F, "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(55, 65, 81);
        doc.text("\u2022", innerX, cy);
        const flines = doc.splitTextToSize(finding, innerW - 6);
        doc.text(flines, innerX + 4, cy);
        cy += flines.length * 4.8;
      }
    }

    // Data sources
    if (sources.length > 0) {
      cy += 2;
      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text("DATA SOURCES", innerX, cy);
      cy += 4;

      let chipX = innerX;
      for (const src of sources) {
        const sw = doc.getTextWidth(src) + 8;
        if (chipX + sw > PAGE_W - MARGIN - 2) {
          chipX  = innerX;
          cy    += 6;
        }
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.roundedRect(chipX, cy - 3, sw, 5, 0.7, 0.7, "DF");
        doc.setFont(F, "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(71, 85, 105);
        doc.text(src, chipX + 4, cy + 0.8);
        chipX += sw + 2;
      }
      cy += 6;
    }

    // Field verification scope warning box
    if (scopeLines.length > 0) {
      cy = ensureSpace(doc, cy, scopeLines.length * 4.5 + 14);
      const warnH = scopeLines.length * 4.5 + 10;
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setDrawColor(146, 64, 14);   // amber-800
      doc.setLineWidth(0.4);
      doc.roundedRect(innerX, cy, innerW, warnH, 1.5, 1.5, "DF");

      doc.setFont(F, "bold");
      doc.setFontSize(11);
      doc.setTextColor(146, 64, 14);
      doc.text("\u26A0  FIELD INSPECTION REQUIRED", innerX + 4, cy + 5);

      doc.setFont(F, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(120, 53, 15);
      doc.text(scopeLines, innerX + 4, cy + 10);
      cy += warnH + 4;
    }

    y = cy + 4;
    y = hRule(doc, y);
  }

  return y;
}

// ─── PAGE 4: Field Inspection Priorities & Data Traceability ─────────────────

function buildFieldInspectionPage(doc: any, cert: any, bridge: any, F: string) {
  doc.addPage();
  let y = 18;

  doc.setFont(F, "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("Field Inspection Priorities & Data Traceability", MARGIN, y);
  y += 3;
  doc.setFont(F, "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(107, 114, 128);
  doc.text("Actionable field program and source traceability for this assessment", MARGIN, y + 4);
  y += 10;
  y = hRule(doc, y);

  // ── Recommended Action ────────────────────────────────────────────────────
  const recAction = cert?.recommended_action || bridge.recommended_action;
  if (recAction) {
    y = sectionTitle(doc, "Recommended Action", y, F);
    const tier     = cert?.overall_risk_tier || bridge.risk_tier || "UNKNOWN";
    const hex      = tierHex(tier);
    const [rr, rg, rb] = hexToRgb(hex);
    const aLines   = doc.splitTextToSize(recAction, CONTENT_W - 10);
    const boxH     = aLines.length * 5.2 + 10;
    y = ensureSpace(doc, y, boxH + 4);
    const [tr, tg, tb] = tint(hex, 0.12);
    doc.setFillColor(tr, tg, tb);
    doc.setDrawColor(rr, rg, rb);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, boxH, 2, 2, "DF");
    doc.setFillColor(rr, rg, rb);
    doc.rect(MARGIN, y - 2, 3.5, boxH, "F");
    doc.setFont(F, "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(rr, rg, rb);
    doc.text(aLines, MARGIN + 7, y + 4);
    y += boxH + 4;
    y = hRule(doc, y);
  }

  // ── Priority Field Inspections ordered list ───────────────────────────────
  const priorities = cert?.priority_field_inspections || [];
  if (priorities.length > 0) {
    y = sectionTitle(doc, "Priority Field Inspections", y, F);

    for (let i = 0; i < priorities.length; i++) {
      const item = priorities[i];
      y = ensureSpace(doc, y, 16);

      // Number badge
      doc.setFillColor(17, 24, 39);
      doc.circle(MARGIN + 3.5, y + 2, 3.5, "F");
      doc.setFont(F, "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), MARGIN + 3.5, y + 3.8, { align: "center" });

      // Item text
      doc.setFont(F, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(31, 41, 55);
      const ilines = doc.splitTextToSize(item, CONTENT_W - 12);
      doc.text(ilines, MARGIN + 10, y + 3.5);
      y += ilines.length * 5 + 4;
    }
    y = hRule(doc, y);
  }

  // ── Estimated Remaining Service Life ─────────────────────────────────────
  if (cert?.estimated_remaining_service_life_years != null) {
    y = sectionTitle(doc, "Structural Life Estimate", y, F);
    y = ensureSpace(doc, y, 20);

    const lifeYears = cert.estimated_remaining_service_life_years;
    const lifeHex   = lifeYears >= 30 ? "#16A34A" : lifeYears >= 15 ? "#CA8A04" : "#DC2626";
    const [lr, lg, lb] = hexToRgb(lifeHex);

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CONTENT_W, 16, 2, 2, "DF");

    doc.setFont(F, "bold");
    doc.setFontSize(24);
    doc.setTextColor(lr, lg, lb);
    doc.text(`${lifeYears}`, MARGIN + 6, y + 12);

    doc.setFont(F, "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(107, 114, 128);
    doc.text("years estimated remaining service life", MARGIN + 20, y + 12);

    doc.setFont(F, "italic");
    doc.setFontSize(9.5);
    doc.setTextColor(156, 163, 175);
    doc.text(
      "Based on structural assessment model. Subject to field verification and load rating.",
      PAGE_W - MARGIN - 2,
      y + 8,
      { align: "right", maxWidth: 90 }
    );

    y += 20;
    y = hRule(doc, y);
  }

  // ── Assessment Limitations ────────────────────────────────────────────────
  const limitations = cert?.assessment_limitations || [];
  if (limitations.length > 0) {
    y = sectionTitle(doc, "Assessment Limitations", y, F);

    for (const lim of limitations) {
      y = ensureSpace(doc, y, 8);
      doc.setFont(F, "italic");
      doc.setFontSize(10.5);
      doc.setTextColor(107, 114, 128);
      doc.text("\u2022", MARGIN, y);
      const llines = doc.splitTextToSize(lim, CONTENT_W - 6);
      doc.text(llines, MARGIN + 5, y);
      y += llines.length * 4.5 + 1.5;
    }
    y += 2;
    y = hRule(doc, y);
  }

  // ── Data Sources Traceability ─────────────────────────────────────────────
  const dataSources = cert?.data_sources_summary || [];
  if (dataSources.length > 0) {
    y = sectionTitle(doc, "Data Sources & Traceability", y, F);

    const srcCols = 2;
    const srcColW = CONTENT_W / srcCols;
    let rowStart = y;

    for (let i = 0; i < dataSources.length; i++) {
      const src = dataSources[i];
      const col = i % srcCols;
      const cx  = MARGIN + col * srcColW;

      // Start a new row
      if (col === 0 && i > 0) {
        rowStart += 8;
      }
      // Check page break at start of each row
      if (col === 0) {
        rowStart = ensureSpace(doc, rowStart, 8);
      }

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(cx, rowStart, srcColW - 4, 6.5, 1, 1, "F");

      doc.setFont(F, "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const srcLines = doc.splitTextToSize(src, srcColW - 10);
      doc.text(srcLines[0], cx + 4, rowStart + 4.5);
    }
    y = rowStart + 8 + 4;
  }

  // ── Maintenance Tasks ─────────────────────────────────────────────────────
  if (bridge.maintenance_notes?.length) {
    y = hRule(doc, y);
    y = sectionTitle(doc, "Maintenance Tasks", y, F);
    for (const n of bridge.maintenance_notes) {
      y = ensureSpace(doc, y, 8);
      doc.setFont(F, "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(107, 114, 128);
      doc.text("\u2022", MARGIN, y);
      doc.setTextColor(55, 65, 81);
      const nlines = doc.splitTextToSize(n, CONTENT_W - 6);
      doc.text(nlines, MARGIN + 5, y);
      y += nlines.length * 5 + 1.5;
    }
  }

  // ── Confidence Caveat ─────────────────────────────────────────────────────
  if (bridge.confidence_caveat) {
    y = ensureSpace(doc, y, 12);
    y += 4;
    doc.setFont(F, "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(156, 163, 175);
    const cLines = doc.splitTextToSize(`Note: ${bridge.confidence_caveat}`, CONTENT_W);
    doc.text(cLines, MARGIN, y);
    y += cLines.length * 4.5 + 4;
  }

  return y;
}

// ─── PAGE 5+: Street View Imagery & Defect Analysis (preserved) ───────────────

async function buildImageryPages(doc: any, bridge: any, F: string) {
  const perHeading = bridge.per_heading_assessments || {};

  const fetchResults = await Promise.all(
    HEADINGS.map(async (h) => {
      const va  = perHeading[String(h.value)] ?? bridge.visual_assessment ?? null;
      const url = `${API_BASE}/api/images/${bridge.bridge_id}/${h.value}`;
      const img = await fetchImageWithOverlay(url, va);
      return { heading: h, va, img };
    })
  );

  const validImages = fetchResults.filter(
    (r): r is { heading: any; va: any; img: OverlayImage } => r.img !== null
  );

  if (validImages.length === 0) return;

  doc.addPage();
  let y = 18;

  doc.setFont(F, "bold");
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39);
  doc.text("Street View Imagery & Defect Analysis", MARGIN, y);
  y += 3;
  y = hRule(doc, y);
  y += 2;

  for (const { heading, va, img } of validImages) {
    const imgW = CONTENT_W;
    const imgH = Math.min(imgW / img.aspectRatio, 88);

    y = ensureSpace(doc, y, imgH + 28);

    y = sectionTitle(doc, `${heading.label} View  (${heading.value}\u00B0)`, y, F);

    doc.addImage(img.dataUrl, "JPEG", MARGIN, y, imgW, imgH);

    // Visual score badge
    if (va?.overall_visual_score != null) {
      const scoreText = `Visual score: ${va.overall_visual_score.toFixed(1)}/5`;
      doc.setFont(F, "bold");
      doc.setFontSize(9.5);
      const sw = doc.getTextWidth(scoreText) + 7;
      doc.setFillColor(0, 0, 0);
      doc.roundedRect(MARGIN + 2, y + 2, sw, 6.5, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(scoreText, MARGIN + 5, y + 7);
    }

    y += imgH + 5;

    const activeDefects = DEFECT_KEYS
      .map((key) => ({ key, ...(va?.[key] || {}) }))
      .filter((d) => d.score >= 2)
      .sort((a, b) => b.score - a.score);

    if (activeDefects.length > 0) {
      // Defect chips row
      doc.setFont(F, "bold");
      doc.setFontSize(9.5);
      let chipX = MARGIN;
      for (const d of activeDefects) {
        const [cr, cg, cb] = hexToRgb(DEFECT_COLORS_HEX[d.key]);
        const chipText = `${d.key.replace(/_/g, " ")} \u00B7 ${d.score}/5`;
        const chipW    = doc.getTextWidth(chipText) + 6;
        if (chipX + chipW > PAGE_W - MARGIN + 2) {
          chipX  = MARGIN;
          y     += 7;
        }
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(chipX, y, chipW, 6, 1, 1, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(chipText, chipX + 3, y + 4.5);
        chipX += chipW + 2;
      }
      y += 10;

      // Per-defect analysis cards
      for (const d of activeDefects) {
        const [cr, cg, cb] = hexToRgb(DEFECT_COLORS_HEX[d.key]);
        const severity   = d.score >= 4 ? "CRITICAL" : d.score >= 3 ? "HIGH" : "MODERATE";
        const obsLines   = d.key_observations
          ? doc.splitTextToSize(d.key_observations, CONTENT_W - 8)
          : [];
        const causeLines = d.potential_cause
          ? doc.splitTextToSize(`Cause: ${d.potential_cause}`, CONTENT_W - 8)
          : [];
        const blockH = 8 + obsLines.length * 4.5 + causeLines.length * 4.5 + 4;
        y = ensureSpace(doc, y, blockH);

        // Coloured left accent line
        doc.setDrawColor(cr, cg, cb);
        doc.setLineWidth(1.5);
        doc.line(MARGIN, y - 1, MARGIN, y + blockH - 5);
        doc.setLineWidth(0.2);
        doc.setDrawColor(0, 0, 0);

        // Defect name
        doc.setFont(F, "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(31, 41, 55);
        const defectLabel = d.key.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
        doc.text(defectLabel, MARGIN + 4, y + 3.5);

        // Severity chip
        const nameW = doc.getTextWidth(defectLabel);
        doc.setFontSize(11);
        const sevW  = doc.getTextWidth(severity) + 5;
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(MARGIN + 4 + nameW + 3, y + 0.5, sevW, 5.5, 0.8, 0.8, "F");
        doc.setTextColor(255, 255, 255);
        doc.text(severity, MARGIN + 4 + nameW + 3 + sevW / 2, y + 4.5, { align: "center" });

        y += 7;

        if (obsLines.length > 0) {
          doc.setFont(F, "normal");
          doc.setFontSize(11);
          doc.setTextColor(55, 65, 81);
          doc.text(obsLines, MARGIN + 4, y);
          y += obsLines.length * 4.5;
        }

        if (causeLines.length > 0) {
          doc.setFont(F, "italic");
          doc.setFontSize(10.5);
          doc.setTextColor(107, 114, 128);
          doc.text(causeLines, MARGIN + 4, y);
          y += causeLines.length * 4.5;
        }

        y += 4;
      }
    } else if (va) {
      doc.setFont(F, "italic");
      doc.setFontSize(11);
      doc.setTextColor(22, 163, 74);
      doc.text("No significant defects detected in this view.", MARGIN, y);
      y += 7;
    }

    y += 2;
    y = hRule(doc, y);
    y += 2;
  }
}

// ─── Main PDF builder ─────────────────────────────────────────────────────────

async function buildPdf(bridge: any) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sectionErrors: string[] = [];

  // F = 'Roboto' (Unicode, supports Polish) or 'helvetica' if offline
  const F   = await ensureFonts(doc);
  const rid = reportId(bridge);
  const cert = bridge.certificate ?? null;

  // ── PAGE 1: Cover + Executive Summary ─────────────────────────────────────
  try {
    buildCoverPage(doc, bridge, cert, F, rid);
  } catch (e: unknown) {
    console.error("[PDF] Cover page error:", e);
    sectionErrors.push("Cover page");
  }

  // ── PAGE 2: 11-Criterion Assessment Table (only if certificate present) ───
  if (cert?.criteria_results?.length > 0) {
    try {
      buildCriteriaTablePage(doc, cert, F);
    } catch (e: unknown) {
      console.error("[PDF] Criteria table error:", e);
      sectionErrors.push("Criteria table");
    }
  }

  // ── PAGE 3: Criterion Details ─────────────────────────────────────────────
  if (cert?.criteria_results?.length > 0) {
    try {
      buildCriterionDetailsPage(doc, cert, F);
    } catch (e: unknown) {
      console.error("[PDF] Criterion details error:", e);
      sectionErrors.push("Criterion details");
    }
  }

  // ── PAGE 4: Field Inspection Priorities & Traceability ───────────────────
  try {
    if (cert) {
      buildFieldInspectionPage(doc, cert, bridge, F);
    } else {
      // Backward compat: no certificate — render original sections
      if (bridge.maintenance_notes?.length || bridge.confidence_caveat) {
        doc.addPage();
        let y = 18;
        if (bridge.maintenance_notes?.length) {
          y = sectionTitle(doc, "Maintenance Tasks", y, F);
          for (const n of bridge.maintenance_notes) {
            y = ensureSpace(doc, y, 8);
            doc.setFont(F, "normal");
            doc.setFontSize(10.5);
            doc.setTextColor(107, 114, 128);
            doc.text("\u2022", MARGIN, y);
            doc.setTextColor(55, 65, 81);
            const nlines = doc.splitTextToSize(n, CONTENT_W - 6);
            doc.text(nlines, MARGIN + 5, y);
            y += nlines.length * 5 + 1.5;
          }
        }
        if (bridge.confidence_caveat) {
          y = ensureSpace(doc, y, 12);
          doc.setFont(F, "italic");
          doc.setFontSize(10.5);
          doc.setTextColor(156, 163, 175);
          const cLines = doc.splitTextToSize(`Note: ${bridge.confidence_caveat}`, CONTENT_W);
          doc.text(cLines, MARGIN, y);
        }
      }
    }
  } catch (e: unknown) {
    console.error("[PDF] Field inspection page error:", e);
    sectionErrors.push("Field inspection");
  }

  // ── PAGE 5+: Street View Imagery & Defect Analysis ───────────────────────
  try {
    await buildImageryPages(doc, bridge, F);
  } catch (e: unknown) {
    console.error("[PDF] Imagery pages error:", e);
    sectionErrors.push("Imagery");
  }

  // ── Footer on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    drawFooter(doc, F, p, totalPages, rid);
  }

  doc.save(`deepinspect-${bridge.bridge_id}.pdf`);
  return { errors: sectionErrors };
}

// ─── Button component ─────────────────────────────────────────────────────────

export default function ReportExport({ bridge }: { bridge: any }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setDone(false);
    try {
      const result = await buildPdf(bridge);
      setDone(true);
      if (result?.errors?.length > 0) {
        toast.warning("PDF exported with issues", {
          description: `Missing sections: ${result.errors.join(", ")}`,
        });
      } else {
        toast.success("PDF report downloaded", {
          description: bridge.bridge_name || `Bridge ${bridge.bridge_id}`,
        });
      }
      setTimeout(() => setDone(false), 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("PDF generation error:", err);
      toast.error("PDF generation failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-2.5 text-xs font-mono font-bold tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${
        loading
          ? "bg-surface-2 text-dim cursor-not-allowed"
          : done
          ? "bg-severity-ok/10 text-severity-ok border border-severity-ok/20"
          : "glass-button-accent hover:shadow-glow-cyan"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          GENERATING PDF
        </>
      ) : done ? (
        <>
          <CheckCircle className="w-4 h-4" />
          DOWNLOADED
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          DOWNLOAD PDF REPORT
        </>
      )}
    </button>
  );
}
