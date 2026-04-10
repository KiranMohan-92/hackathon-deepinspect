"""
European bridge rating system conversion.

Converts DeepInspect PhysicsHealthCertificate scores (1.0-5.0) to 9 national
rating systems using the mappings in reference/mappings/score_mappings.json.

Systems:
  - Germany (DIN 1076 Zustandsnote) — piecewise linear, overall score
  - France (IQOA) — threshold, max criterion score, S suffix for safety
  - UK (CS 450 BCI) — piecewise linear, overall score
  - Netherlands (NEN 2767) — threshold, max criterion score
  - Italy (Linee Guida CoA) — threshold, overall score
  - Poland (GDDKiA) — threshold, overall score
  - Norway (Brutus) — threshold, max criterion score
  - Sweden (BaTMan) — threshold, max criterion score
  - USA (NBI) — piecewise linear, overall score
"""

from __future__ import annotations


def _piecewise_linear(score: float, breakpoints: list[tuple[float, float]]) -> float:
    """Interpolate between breakpoints [(input, output), ...]."""
    if score <= breakpoints[0][0]:
        return breakpoints[0][1]
    if score >= breakpoints[-1][0]:
        return breakpoints[-1][1]
    for i in range(len(breakpoints) - 1):
        x0, y0 = breakpoints[i]
        x1, y1 = breakpoints[i + 1]
        if x0 <= score <= x1:
            t = (score - x0) / (x1 - x0) if x1 != x0 else 0
            return round(y0 + t * (y1 - y0), 2)
    return breakpoints[-1][1]


def _threshold(score: float, thresholds: list[tuple[float, object]]) -> object:
    """Return target value for first threshold where score <= max."""
    for max_val, target in thresholds:
        if score <= max_val:
            return target
    return thresholds[-1][1]


def convert_germany(overall_score: float) -> dict:
    """DIN 1076 Zustandsnote (1.0-4.0, ascending risk)."""
    breakpoints = [
        (1.0, 1.0), (1.9, 1.4), (2.0, 1.5), (2.4, 1.9),
        (2.5, 2.0), (2.9, 2.4), (3.0, 2.5), (3.4, 2.9),
        (3.5, 3.0), (3.9, 3.4), (4.0, 3.5), (5.0, 4.0),
    ]
    value = _piecewise_linear(overall_score, breakpoints)
    return {"system": "DIN 1076", "country": "Germany", "value": value, "scale": "1.0-4.0"}


def convert_france(max_criterion_score: float, has_safety_finding: bool = False) -> dict:
    """IQOA rating (1, 2, 2E, 3, 3U) with optional S suffix."""
    thresholds = [
        (1.99, "1"), (2.39, "2"), (2.99, "2E"), (3.99, "3"), (5.0, "3U"),
    ]
    rating = _threshold(max_criterion_score, thresholds)
    if has_safety_finding:
        rating += "S"
    return {"system": "IQOA", "country": "France", "value": rating, "scale": "1-3U"}


def convert_uk(overall_score: float, max_criterion_score: float | None = None) -> dict:
    """CS 450 BCI (0-100, descending risk)."""
    bci_ave = round(100 - (overall_score - 1.0) * 25.0, 1)
    bci_ave = max(0, min(100, bci_ave))
    result = {"system": "CS 450 BCI", "country": "United Kingdom", "bci_ave": bci_ave, "scale": "0-100"}
    if max_criterion_score is not None:
        bci_crit = round(100 - (max_criterion_score - 1.0) * 25.0, 1)
        result["bci_crit"] = max(0, min(100, bci_crit))
    return result


def convert_netherlands(max_criterion_score: float) -> dict:
    """NEN 2767 condition score (1-6, ascending deterioration)."""
    thresholds = [
        (1.4, 1), (2.0, 2), (2.7, 3), (3.5, 4), (4.3, 5), (5.0, 6),
    ]
    value = _threshold(max_criterion_score, thresholds)
    return {"system": "NEN 2767", "country": "Netherlands", "value": value, "scale": "1-6"}


def convert_italy(overall_score: float) -> dict:
    """Italian CoA risk class (LOW to HIGH)."""
    thresholds = [
        (1.99, "LOW"), (2.39, "MEDIUM_LOW"), (2.99, "MEDIUM"),
        (3.99, "MEDIUM_HIGH"), (5.0, "HIGH"),
    ]
    value = _threshold(overall_score, thresholds)
    return {"system": "Linee Guida 2020", "country": "Italy", "value": value, "scale": "LOW-HIGH"}


def convert_poland(overall_score: float) -> dict:
    """GDDKiA rating (0-5, ascending risk)."""
    thresholds = [
        (1.4, 0), (2.0, 1), (2.7, 2), (3.5, 3), (4.3, 4), (5.0, 5),
    ]
    value = _threshold(overall_score, thresholds)
    return {"system": "GDDKiA", "country": "Poland", "value": value, "scale": "0-5"}


def convert_norway(max_criterion_score: float) -> dict:
    """Brutus condition grade (0-4, ascending deterioration)."""
    thresholds = [
        (1.4, 0), (2.1, 1), (3.1, 2), (4.0, 3), (5.0, 4),
    ]
    value = _threshold(max_criterion_score, thresholds)
    return {"system": "Brutus/NVDB", "country": "Norway", "value": value, "scale": "0-4"}


def convert_sweden(max_criterion_score: float) -> dict:
    """BaTMan condition grade (0-4, ascending deterioration)."""
    thresholds = [
        (1.4, 0), (2.1, 1), (3.1, 2), (4.0, 3), (5.0, 4),
    ]
    value = _threshold(max_criterion_score, thresholds)
    return {"system": "BaTMan", "country": "Sweden", "value": value, "scale": "0-4"}


def convert_us(overall_score: float) -> dict:
    """NBI rating (0-9, descending risk)."""
    breakpoints = [
        (1.0, 9), (1.4, 8), (1.9, 7), (2.0, 6), (2.5, 5),
        (2.9, 4), (3.0, 3), (3.9, 2), (4.5, 1), (5.0, 0),
    ]
    value = _piecewise_linear(overall_score, breakpoints)
    sd = overall_score >= 2.9  # Structurally Deficient threshold
    return {"system": "NBI/FHWA", "country": "United States", "value": round(value), "scale": "0-9", "structurally_deficient": sd}


def convert_all(
    overall_score: float,
    max_criterion_score: float | None = None,
    has_safety_finding: bool = False,
) -> dict:
    """
    Convert a DeepInspect score to all 9 national rating systems.

    Args:
        overall_score: Confidence-weighted overall risk score (1.0-5.0)
        max_criterion_score: Maximum individual criterion score (for worst-element systems)
        has_safety_finding: Whether safety-critical criteria scored >= 4.0 (for IQOA S suffix)

    Returns dict with keys: germany, france, uk, netherlands, italy, poland, norway, sweden, us
    """
    max_score = max_criterion_score or overall_score

    return {
        "germany": convert_germany(overall_score),
        "france": convert_france(max_score, has_safety_finding),
        "uk": convert_uk(overall_score, max_score),
        "netherlands": convert_netherlands(max_score),
        "italy": convert_italy(overall_score),
        "poland": convert_poland(overall_score),
        "norway": convert_norway(max_score),
        "sweden": convert_sweden(max_score),
        "us": convert_us(overall_score),
    }
