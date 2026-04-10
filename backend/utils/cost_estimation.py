"""
Repair cost estimation for bridge inspection reports.

Provides order-of-magnitude cost brackets based on risk tier,
primary defects, and span count. These are indicative ranges for
planning purposes — actual costs require detailed engineering assessment.
"""

from __future__ import annotations

COST_BRACKETS = {
    "minor": {
        "range": "€1K - €10K",
        "min_eur": 1_000,
        "max_eur": 10_000,
        "description": "Routine maintenance — crack sealing, surface patching, drainage clearing",
    },
    "moderate": {
        "range": "€10K - €100K",
        "min_eur": 10_000,
        "max_eur": 100_000,
        "description": "Targeted repair — joint replacement, bearing adjustment, railing repair",
    },
    "major": {
        "range": "€100K - €1M",
        "min_eur": 100_000,
        "max_eur": 1_000_000,
        "description": "Structural repair — deck overlay, pier repair, scour countermeasures",
    },
    "critical": {
        "range": "€1M+",
        "min_eur": 1_000_000,
        "max_eur": None,
        "description": "Major rehabilitation or replacement — full deck replacement, substructure reconstruction",
    },
}

# Defects that escalate cost bracket
_ESCALATING_DEFECTS = {
    "structural_deformation", "fracture_critical", "foundation_exposure",
    "pier_failure", "scour_undermining", "capacity_insufficient",
}


def estimate_repair_cost(
    risk_tier: str,
    primary_defects: list[str] | None = None,
    span_count: int | None = None,
) -> dict | None:
    """
    Estimate repair cost bracket from risk assessment.

    Args:
        risk_tier: OK | MEDIUM | HIGH | CRITICAL
        primary_defects: List of identified defect types
        span_count: Number of spans (multiplier for multi-span bridges)

    Returns dict with bracket, range, description, and optional notes, or None for OK tier.
    """
    defects = set(d.lower().replace(" ", "_") for d in (primary_defects or []))

    # Map tier to base bracket
    tier_bracket = {
        "OK": None,
        "MEDIUM": "minor",
        "HIGH": "moderate",
        "CRITICAL": "major",
    }

    bracket = tier_bracket.get(risk_tier)
    if bracket is None:
        return None

    # Escalate if severe defects present
    has_severe = bool(defects & _ESCALATING_DEFECTS)
    if has_severe and bracket == "minor":
        bracket = "moderate"
    elif has_severe and bracket == "moderate":
        bracket = "major"
    elif has_severe and bracket == "major":
        bracket = "critical"

    cost = COST_BRACKETS[bracket].copy()
    cost["bracket"] = bracket

    notes = []
    if span_count and span_count > 3:
        notes.append(f"Multi-span bridge ({span_count} spans) — costs may be {span_count // 2}x the single-span estimate")
    if has_severe:
        notes.append("Escalated due to severe structural defects")

    if notes:
        cost["notes"] = notes

    return cost
