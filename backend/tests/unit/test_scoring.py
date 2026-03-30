import pytest
from datetime import datetime
from utils.scoring import compute_base_risk_score, score_to_tier


class TestComputeBaseRiskScore:
    def test_visual_score_weighted_correctly(
        self, sample_visual_assessment, sample_bridge_context
    ):
        score = compute_base_risk_score(sample_visual_assessment, sample_bridge_context)
        assert 1.0 <= score <= 5.0

    def test_no_visual_assumes_medium_risk(self, sample_bridge_context):
        score = compute_base_risk_score(None, sample_bridge_context)
        assert 1.0 <= score <= 5.0
        assert score >= 1.2

    def test_age_scoring_60_plus_years(self, sample_visual_assessment):
        from models.context import BridgeContext

        context = BridgeContext(
            construction_year=1960,
            age_years=64,
            past_incidents=[],
            last_known_inspection=2020,
        )
        score = compute_base_risk_score(sample_visual_assessment, context)
        assert 1.0 <= score <= 5.0

    def test_age_scoring_45_to_60_years(self, sample_visual_assessment):
        from models.context import BridgeContext

        context = BridgeContext(
            construction_year=1975,
            age_years=49,
            past_incidents=[],
            last_known_inspection=2020,
        )
        score = compute_base_risk_score(sample_visual_assessment, context)
        assert 1.0 <= score <= 5.0

    def test_age_scoring_30_to_45_years(self, sample_visual_assessment):
        from models.context import BridgeContext

        context = BridgeContext(
            construction_year=1990,
            age_years=34,
            past_incidents=[],
            last_known_inspection=2020,
        )
        score = compute_base_risk_score(sample_visual_assessment, context)
        assert 1.0 <= score <= 5.0

    def test_age_scoring_15_to_30_years(self, sample_visual_assessment):
        from models.context import BridgeContext

        context = BridgeContext(
            construction_year=2005,
            age_years=19,
            past_incidents=[],
            last_known_inspection=2020,
        )
        score = compute_base_risk_score(sample_visual_assessment, context)
        assert 1.0 <= score <= 5.0

    def test_age_scoring_under_15_years(self, sample_visual_assessment):
        from models.context import BridgeContext

        context = BridgeContext(
            construction_year=2015,
            age_years=9,
            past_incidents=[],
            last_known_inspection=2020,
        )
        score = compute_base_risk_score(sample_visual_assessment, context)
        assert 1.0 <= score <= 5.0

    def test_incident_history_increases_score(
        self, sample_visual_assessment, sample_bridge_context
    ):
        sample_bridge_context.past_incidents = ["incident1", "incident2"]
        score_with_incidents = compute_base_risk_score(
            sample_visual_assessment, sample_bridge_context
        )

        sample_bridge_context.past_incidents = []
        score_without_incidents = compute_base_risk_score(
            sample_visual_assessment, sample_bridge_context
        )

        assert score_with_incidents > score_without_incidents

    def test_no_inspection_record_high_risk(self, sample_visual_assessment):
        from models.context import BridgeContext

        context = BridgeContext(
            construction_year=1990,
            age_years=34,
            past_incidents=[],
            last_known_inspection=None,
        )
        score = compute_base_risk_score(sample_visual_assessment, context)
        assert 1.0 <= score <= 5.0


class TestScoreToTier:
    def test_critical_tier(self):
        assert score_to_tier(4.0) == "CRITICAL"
        assert score_to_tier(4.5) == "CRITICAL"
        assert score_to_tier(5.0) == "CRITICAL"

    def test_high_tier(self):
        assert score_to_tier(3.0) == "HIGH"
        assert score_to_tier(3.5) == "HIGH"
        assert score_to_tier(3.99) == "HIGH"

    def test_medium_tier(self):
        assert score_to_tier(2.0) == "MEDIUM"
        assert score_to_tier(2.5) == "MEDIUM"
        assert score_to_tier(2.99) == "MEDIUM"

    def test_ok_tier(self):
        assert score_to_tier(1.0) == "OK"
        assert score_to_tier(1.5) == "OK"
        assert score_to_tier(1.99) == "OK"

    def test_boundary_values(self):
        assert score_to_tier(3.99) == "HIGH"
        assert score_to_tier(4.0) == "CRITICAL"
        assert score_to_tier(2.99) == "MEDIUM"
        assert score_to_tier(3.0) == "HIGH"
        assert score_to_tier(1.99) == "OK"
        assert score_to_tier(2.0) == "MEDIUM"
