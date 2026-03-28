import { useState } from "react";
import { jsPDF } from "jspdf";

// ─── Unicode font loader ───────────────────────────────────────────────────────
// jsPDF's built-in Helvetica only covers Latin-1 and garbles Polish/accented
// characters (ą ę ó ś ń ż ź ć ł etc.) as well as Unicode symbols like ▶.
// We embed Roboto (full Latin Extended-A/B) fetched from jsDelivr CDN and
// cached at module level so it is only downloaded once per browser session.

let _fontCache = null; // false = fetch failed, object = loaded

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 8192, bytes.length)));
  }
  return btoa(binary);
}

async function fetchFont(url) {
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

const ROBOTO = "https://cdn.jsdelivr.net/gh/google/fonts@main/apache/roboto/static";

async function ensureFonts(doc) {
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
    } catch (e) {
      console.warn("DeepInspect: could not load Unicode font, falling back to helvetica.", e.message);
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
  } catch (e) {
    console.warn("DeepInspect: font embedding failed, falling back to helvetica.", e.message);
    return "helvetica";
  }
}

// ─── Image + defect-overlay fetcher ──────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const DEFECT_COLORS_HEX = {
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

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function tint(hex, opacity = 0.12) {
  const [r, g, b] = hexToRgb(hex);
  return [
    Math.round(r * opacity + 255 * (1 - opacity)),
    Math.round(g * opacity + 255 * (1 - opacity)),
    Math.round(b * opacity + 255 * (1 - opacity)),
  ];
}

async function fetchImageWithOverlay(url, va) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth  || 640;
      const h = img.naturalHeight || 480;
      const canvas = document.createElement("canvas");
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      if (va) {
        DEFECT_KEYS.forEach((key) => {
          const defect = va[key];
          if (!defect || defect.score < 2 || !defect.regions?.length) return;
          const [r, g, b] = hexToRgb(DEFECT_COLORS_HEX[key]);

          defect.regions.forEach((region) => {
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

// ─── PDF layout helpers ───────────────────────────────────────────────────────

function ensureSpace(doc, y, needed) {
  if (y + needed > PAGE_H - 20) {
    doc.addPage();
    return 18;
  }
  return y;
}

function hRule(doc, y) {
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 5;
}

function sectionTitle(doc, text, y, F) {
  y = ensureSpace(doc, y, 12);
  doc.setFillColor(243, 244, 246);
  doc.rect(MARGIN, y - 3, CONTENT_W, 8, "F");
  doc.setFont(F, "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(text.toUpperCase(), MARGIN + 2, y + 2);
  return y + 10;
}

// ─── Main PDF builder ─────────────────────────────────────────────────────────

async function buildPdf(bridge) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // F = 'Roboto' (Unicode, supports Polish) or 'helvetica' if offline
  const F = await ensureFonts(doc);

  const riskHex = (
    { CRITICAL: "#DC2626", HIGH: "#EA580C", MEDIUM: "#CA8A04", OK: "#16A34A" }[bridge.risk_tier]
    || "#6B7280"
  );
  const [rr, rg, rb] = hexToRgb(riskHex);

  // ── ① HEADER BAR ──────────────────────────────────────────────────────────
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, PAGE_W, 42, "F");

  doc.setFont(F, "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("DeepInspect", MARGIN, 11);

  doc.setFont(F, "normal");
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text("AI Bridge Risk Assessment", MARGIN, 16.5);

  const bridgeName = bridge.bridge_name || bridge.bridge_id;
  doc.setFont(F, "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  const nameLines = doc.splitTextToSize(bridgeName, 128);
  doc.text(nameLines, MARGIN, 27);

  // Risk badge (right side of header)
  const badgeX = PAGE_W - MARGIN - 36;
  doc.setFillColor(rr, rg, rb);
  doc.roundedRect(badgeX, 8, 36, 26, 2, 2, "F");
  doc.setFont(F, "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(bridge.risk_tier, badgeX + 18, 19, { align: "center" });
  doc.setFontSize(13);
  doc.text(`${bridge.risk_score.toFixed(1)}/5`, badgeX + 18, 28, { align: "center" });

  let y = 50;

  // ── ② META ROW ────────────────────────────────────────────────────────────
  doc.setFont(F, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(`${bridge.lat.toFixed(5)}, ${bridge.lon.toFixed(5)}`, MARGIN, y);
  doc.text(new Date(bridge.generated_at).toLocaleString(), PAGE_W - MARGIN, y, { align: "right" });
  y += 4;
  y = hRule(doc, y);

  // ── ③ BRIDGE CONTEXT ──────────────────────────────────────────────────────
  if (bridge.context) {
    y = sectionTitle(doc, "Bridge Context", y, F);
    const ctx = bridge.context;
    const meta = [];
    if (ctx.construction_year)                                      meta.push(["Built",        String(ctx.construction_year)]);
    if (ctx.material && ctx.material !== "unknown")                 meta.push(["Material",     ctx.material.replace(/_/g, " ")]);
    if (ctx.construction_era && ctx.construction_era !== "Unknown") meta.push(["Era",          ctx.construction_era]);
    if (ctx.age_years)                                              meta.push(["Age",          `${ctx.age_years} years`]);
    if (ctx.structural_significance)                                meta.push(["Significance", ctx.structural_significance]);

    const cols = 3;
    const colW = CONTENT_W / cols;
    meta.forEach(([label, value], i) => {
      const cx = MARGIN + (i % cols) * colW;
      const cy = y + Math.floor(i / cols) * 13;
      doc.setFont(F, "normal");
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(label, cx, cy);
      doc.setFont(F, "bold");
      doc.setFontSize(9);
      doc.setTextColor(31, 41, 55);
      doc.text(value.charAt(0).toUpperCase() + value.slice(1), cx, cy + 5.5);
    });
    y += Math.ceil(meta.length / cols) * 13 + 2;
    y = hRule(doc, y);
  }

  // ── ④ CONDITION SUMMARY ───────────────────────────────────────────────────
  if (bridge.condition_summary) {
    y = sectionTitle(doc, "Condition Summary", y, F);
    doc.setFont(F, "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 65, 81);
    const sumLines = doc.splitTextToSize(bridge.condition_summary, CONTENT_W);
    doc.text(sumLines, MARGIN, y);
    y += sumLines.length * 5 + 2;
    y = hRule(doc, y);
  }

  // ── ⑤ KEY RISK FACTORS ────────────────────────────────────────────────────
  if (bridge.key_risk_factors?.length) {
    y = sectionTitle(doc, "Key Risk Factors", y, F);
    for (const f of bridge.key_risk_factors) {
      y = ensureSpace(doc, y, 8);
      doc.setFont(F, "bold");
      doc.setFontSize(8);
      doc.setTextColor(220, 38, 38);
      doc.text("\u25B6", MARGIN, y);
      doc.setFont(F, "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 81);
      const flines = doc.splitTextToSize(f, CONTENT_W - 6);
      doc.text(flines, MARGIN + 5, y);
      y += flines.length * 5 + 1.5;
    }
    y += 1;
    y = hRule(doc, y);
  }

  // ── ⑥ RECOMMENDED ACTION ──────────────────────────────────────────────────
  if (bridge.recommended_action) {
    y = sectionTitle(doc, "Recommended Action", y, F);
    const aLines = doc.splitTextToSize(bridge.recommended_action, CONTENT_W - 8);
    const boxH   = aLines.length * 5 + 10;
    y = ensureSpace(doc, y, boxH + 4);
    const [tr, tg, tb] = tint(riskHex, 0.12);
    doc.setFillColor(tr, tg, tb);
    doc.setDrawColor(rr, rg, rb);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y - 2, CONTENT_W, boxH, 2, 2, "DF");
    doc.setLineWidth(0.2);
    doc.setFillColor(rr, rg, rb);
    doc.rect(MARGIN, y - 2, 3.5, boxH, "F");
    doc.setFont(F, "bold");
    doc.setFontSize(9);
    doc.setTextColor(rr, rg, rb);
    doc.text(aLines, MARGIN + 7, y + 4);
    y += boxH + 4;
    y = hRule(doc, y);
  }

  // ── ⑦ MAINTENANCE TASKS ───────────────────────────────────────────────────
  if (bridge.maintenance_notes?.length) {
    y = sectionTitle(doc, "Maintenance Tasks", y, F);
    for (const n of bridge.maintenance_notes) {
      y = ensureSpace(doc, y, 8);
      doc.setFont(F, "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text("\u2022", MARGIN, y);
      doc.setTextColor(55, 65, 81);
      const nlines = doc.splitTextToSize(n, CONTENT_W - 6);
      doc.text(nlines, MARGIN + 5, y);
      y += nlines.length * 5 + 1.5;
    }
    y += 1;
    y = hRule(doc, y);
  }

  // ── ⑧ CONFIDENCE CAVEAT ───────────────────────────────────────────────────
  if (bridge.confidence_caveat) {
    y = ensureSpace(doc, y, 12);
    doc.setFont(F, "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    const cLines = doc.splitTextToSize(`Note: ${bridge.confidence_caveat}`, CONTENT_W);
    doc.text(cLines, MARGIN, y);
    y += cLines.length * 4.5 + 4;
  }

  // ── ⑨ STREET VIEW IMAGERY & DEFECT ANALYSIS ──────────────────────────────
  const perHeading = bridge.per_heading_assessments || {};

  const fetchResults = await Promise.all(
    HEADINGS.map(async (h) => {
      const va  = perHeading[String(h.value)] ?? bridge.visual_assessment ?? null;
      const url = `${API_BASE}/api/images/${bridge.bridge_id}/${h.value}`;
      const img = await fetchImageWithOverlay(url, va);
      return { heading: h, va, img };
    })
  );

  const validImages = fetchResults.filter((r) => r.img !== null);

  if (validImages.length > 0) {
    doc.addPage();
    y = 18;

    doc.setFont(F, "bold");
    doc.setFontSize(12);
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
        doc.setFontSize(7);
        const sw = doc.getTextWidth(scoreText) + 6;
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
        doc.setFontSize(7);
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
          const severity  = d.score >= 4 ? "CRITICAL" : d.score >= 3 ? "HIGH" : "MODERATE";
          const obsLines  = d.key_observations
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
          doc.setFontSize(8.5);
          doc.setTextColor(31, 41, 55);
          const defectLabel = d.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          doc.text(defectLabel, MARGIN + 4, y + 3.5);

          // Severity chip
          const nameW = doc.getTextWidth(defectLabel);
          doc.setFontSize(6.5);
          const sevW  = doc.getTextWidth(severity) + 5;
          doc.setFillColor(cr, cg, cb);
          doc.roundedRect(MARGIN + 4 + nameW + 3, y + 0.5, sevW, 5.5, 0.8, 0.8, "F");
          doc.setTextColor(255, 255, 255);
          doc.text(severity, MARGIN + 4 + nameW + 3 + sevW / 2, y + 4.5, { align: "center" });

          y += 7;

          if (obsLines.length > 0) {
            doc.setFont(F, "normal");
            doc.setFontSize(8);
            doc.setTextColor(55, 65, 81);
            doc.text(obsLines, MARGIN + 4, y);
            y += obsLines.length * 4.5;
          }

          if (causeLines.length > 0) {
            doc.setFont(F, "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(107, 114, 128);
            doc.text(causeLines, MARGIN + 4, y);
            y += causeLines.length * 4.5;
          }

          y += 4;
        }
      } else if (va) {
        doc.setFont(F, "italic");
        doc.setFontSize(8);
        doc.setTextColor(22, 163, 74);
        doc.text("No significant defects detected in this view.", MARGIN, y);
        y += 7;
      }

      y += 2;
      y = hRule(doc, y);
      y += 2;
    }
  }

  // ── ⑩ FOOTER on every page ────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(243, 244, 246);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(0, PAGE_H - 10, PAGE_W, PAGE_H - 10);
    doc.setFont(F, "normal");
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text("DeepInspect  \u00B7  AI-powered infrastructure risk assessment", MARGIN, PAGE_H - 4);
    doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }

  doc.save(`deepinspect-${bridge.bridge_id}.pdf`);
}

// ─── Button component ─────────────────────────────────────────────────────────

export default function ReportExport({ bridge }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await buildPdf(bridge);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert(`Could not generate PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`w-full py-2 text-sm font-medium border border-gray-200 rounded-lg transition-colors ${
        loading
          ? "bg-gray-50 text-gray-400 cursor-not-allowed"
          : "hover:bg-gray-50"
      }`}
    >
      {loading ? "Generating PDF\u2026" : "Download PDF Report"}
    </button>
  );
}
