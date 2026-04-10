"""
Deterministic bridge decision policy service.

Maps risk tier + evidence completeness + trend direction to recommended
actions. This is NOT AI — it's a rule-based policy engine that ensures
consistent, auditable recommendations.
"""

from __future__ import annotations

# Actions ordered by urgency
BRIDGE_ACTIONS = {
    "continue_monitoring": {
        "urgency": "routine",
        "description": "Continue routine monitoring cycle",
        "typical_timeline": "Next scheduled inspection",
    },
    "schedule_routine": {
        "urgency": "routine",
        "description": "Schedule routine maintenance within normal cycle",
        "typical_timeline": "6-12 months",
    },
    "schedule_priority": {
        "urgency": "priority",
        "description": "Schedule priority inspection and repair",
        "typical_timeline": "1-3 months",
    },
    "field_inspection_required": {
        "urgency": "priority",
        "description": "Field inspection required — remote data insufficient for 2+ criteria",
        "typical_timeline": "Within 30 days",
    },
    "load_restriction_review": {
        "urgency": "urgent",
        "description": "Review load restrictions — capacity may be insufficient for current traffic",
        "typical_timeline": "Within 14 days",
    },
    "emergency_closure_review": {
        "urgency": "urgent",
        "description": "Emergency closure review — critical structural or safety concerns",
        "typical_timeline": "Immediate",
    },
}


def compute_decision(
    risk_tier: str,
    confidence: str,
    criteria_results: list | None = None,
    trend_direction: str | None = None,
    capacity_vs_demand: str | None = None,
    fracture_critical: bool = False,
) -> dict:
    """
    Compute recommended action from assessment results.

    Args:
        risk_tier: OK | MEDIUM | HIGH | CRITICAL
        confidence: low | medium | high
        criteria_results: List of CriterionResult dicts (for low-confidence counting)
        trend_direction: improving | stable | escalating | None
        capacity_vs_demand: adequate | marginal | insufficient | None
        fracture_critical: Whether fracture-critical members are present

    Returns:
        {action, urgency, reasoning, requires_human_review, typical_timeline}
    """
    criteria = criteria_results or []
    low_confidence_count = sum(
        1 for c in criteria
        if (c.get("confidence") if isinstance(c, dict) else getattr(c, "confidence", "medium")) == "low"
        and (c.get("requires_field_verification") if isinstance(c, dict) else getattr(c, "requires_field_verification", False))
    )

    reasoning_parts = []

    # Emergency: CRITICAL + fracture-critical or escalating
    if risk_tier == "CRITICAL":
        if fracture_critical:
            action = "emergency_closure_review"
            reasoning_parts.append("CRITICAL tier with fracture-critical members")
        elif trend_direction == "escalating":
            action = "emergency_closure_review"
            reasoning_parts.append("CRITICAL tier with escalating trend")
        else:
            action = "load_restriction_review"
            reasoning_parts.append("CRITICAL tier — load restriction review warranted")

    # Load restriction: capacity insufficient
    elif capacity_vs_demand == "insufficient":
        action = "load_restriction_review"
        reasoning_parts.append("Capacity vs demand flagged as insufficient")

    # HIGH tier
    elif risk_tier == "HIGH":
        if trend_direction == "escalating" or fracture_critical:
            action = "schedule_priority"
            reasoning_parts.append(f"HIGH tier with {'escalating trend' if trend_direction == 'escalating' else 'fracture-critical members'}")
        else:
            action = "schedule_priority"
            reasoning_parts.append("HIGH tier — priority inspection recommended")

    # Low confidence on multiple criteria
    elif low_confidence_count >= 2:
        action = "field_inspection_required"
        reasoning_parts.append(f"{low_confidence_count} criteria at low confidence requiring field verification")

    # MEDIUM tier
    elif risk_tier == "MEDIUM":
        if trend_direction == "escalating":
            action = "schedule_priority"
            reasoning_parts.append("MEDIUM tier but escalating trend")
        else:
            action = "schedule_routine"
            reasoning_parts.append("MEDIUM tier — routine maintenance cycle")

    # OK tier
    else:
        action = "continue_monitoring"
        reasoning_parts.append("OK tier — no immediate concerns")

    action_details = BRIDGE_ACTIONS[action]
    requires_human_review = action_details["urgency"] in ("urgent", "priority")

    return {
        "action": action,
        "urgency": action_details["urgency"],
        "description": action_details["description"],
        "typical_timeline": action_details["typical_timeline"],
        "reasoning": "; ".join(reasoning_parts),
        "requires_human_review": requires_human_review,
    }
