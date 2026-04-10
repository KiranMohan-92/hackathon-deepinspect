from utils.cost_estimation import COST_BRACKETS, estimate_repair_cost


def test_ok_tier_returns_none():
    assert estimate_repair_cost("OK") is None


def test_medium_tier_returns_minor_bracket():
    assert estimate_repair_cost("MEDIUM")["bracket"] == "minor"


def test_high_tier_returns_moderate_bracket():
    assert estimate_repair_cost("HIGH")["bracket"] == "moderate"


def test_critical_tier_returns_major_bracket():
    assert estimate_repair_cost("CRITICAL")["bracket"] == "major"


def test_severe_defect_escalates_minor_to_moderate():
    cost = estimate_repair_cost("MEDIUM", primary_defects=["fracture_critical"])

    assert cost["bracket"] == "moderate"


def test_severe_defect_escalates_major_to_critical():
    cost = estimate_repair_cost("CRITICAL", primary_defects=["pier_failure"])

    assert cost["bracket"] == "critical"


def test_multi_span_bridge_adds_notes():
    cost = estimate_repair_cost("HIGH", span_count=4)

    assert "notes" in cost
    assert any("Multi-span bridge (4 spans)" in note for note in cost["notes"])


def test_returns_range_string_in_result():
    cost = estimate_repair_cost("HIGH")

    assert isinstance(cost["range"], str)
    assert cost["range"] == COST_BRACKETS["moderate"]["range"]
