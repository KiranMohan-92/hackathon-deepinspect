import { jsPDF } from "jspdf";

export default function ReportExport({ bridge }) {
  const download = () => {
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("DeepInspect — Bridge Risk Report", 20, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Bridge: ${bridge.bridge_name || bridge.bridge_id}`, 20, 35);
    doc.text(`Coordinates: ${bridge.lat.toFixed(5)}, ${bridge.lon.toFixed(5)}`, 20, 42);
    doc.text(`Risk tier: ${bridge.risk_tier}  |  Score: ${bridge.risk_score}/5.0`, 20, 49);
    doc.text(`Generated: ${new Date(bridge.generated_at).toLocaleString()}`, 20, 56);

    doc.setFont("helvetica", "bold");
    doc.text("Condition Summary", 20, 68);
    doc.setFont("helvetica", "normal");
    const summaryLines = doc.splitTextToSize(bridge.condition_summary || "", 170);
    doc.text(summaryLines, 20, 75);

    let y = 75 + summaryLines.length * 6 + 6;

    if (bridge.key_risk_factors?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Key Risk Factors", 20, y); y += 7;
      doc.setFont("helvetica", "normal");
      bridge.key_risk_factors.forEach((f) => {
        const lines = doc.splitTextToSize(`- ${f}`, 166);
        doc.text(lines, 24, y); y += lines.length * 6;
      });
      y += 4;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Recommended Action", 20, y); y += 7;
    doc.setFont("helvetica", "normal");
    doc.text(bridge.recommended_action || "", 20, y); y += 10;

    if (bridge.maintenance_notes?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Maintenance Notes", 20, y); y += 7;
      doc.setFont("helvetica", "normal");
      bridge.maintenance_notes.forEach((n) => {
        const lines = doc.splitTextToSize(`- ${n}`, 166);
        doc.text(lines, 24, y); y += lines.length * 6;
      });
    }

    if (bridge.confidence_caveat) {
      y += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      const caveatLines = doc.splitTextToSize(`Note: ${bridge.confidence_caveat}`, 170);
      doc.text(caveatLines, 20, y);
    }

    doc.save(`deepinspect-${bridge.bridge_id}.pdf`);
  };

  return (
    <button
      onClick={download}
      className="w-full py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Download PDF Report
    </button>
  );
}
