from datetime import datetime
from models.vision import VisualAssessment
from models.context import BridgeContext


def compute_base_risk_score(
    visual: VisualAssessment | None,
    context: BridgeContext,
) -> float:
    """
    Weighted risk formula combining visual condition + age + incident history + inspection staleness.
    Returns score 1.0 (best) to 5.0 (worst).
    """
    current_year = datetime.now().year

    # Visual score — 40% weight
    if visual:
        visual_component = visual.overall_visual_score * 0.40
    else:
        visual_component = 3.0 * 0.40  # assume medium risk if no imagery

    # Age score — 25% weight
    age = context.age_years or 40
    if age >= 60:
        age_score = 5.0
    elif age >= 45:
        age_score = 4.0
    elif age >= 30:
        age_score = 3.0
    elif age >= 15:
        age_score = 2.0
    else:
        age_score = 1.0
    age_component = age_score * 0.25

    # Incident history — 20% weight
    incidents = len(context.past_incidents)
    incident_score = min(5.0, 1.0 + incidents * 1.2)
    incident_component = incident_score * 0.20

    # Inspection staleness — 15% weight
    if context.last_known_inspection:
        years_since = current_year - context.last_known_inspection
        stale_score = min(5.0, 1.0 + years_since * 0.3)
    else:
        stale_score = 4.5  # no record = treat as high risk
    stale_component = stale_score * 0.15

    return visual_component + age_component + incident_component + stale_component


def score_to_tier(score: float) -> str:
    if score >= 4.0:
        return "CRITICAL"
    elif score >= 3.0:
        return "HIGH"
    elif score >= 2.0:
        return "MEDIUM"
    else:
        return "OK"
