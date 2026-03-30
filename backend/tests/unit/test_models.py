import pytest
from pydantic import ValidationError
from models.bridge import (
    BridgeTarget,
    BridgeSummary,
    BridgeRiskReport,
    BboxRequest,
    ScanRequest,
)
from models.vision import DefectRegion, DefectScore, VisualAssessment
from models.context import BridgeContext


class TestBridgeTarget:
    def test_valid_bridge_target(self):
        target = BridgeTarget(
            osm_id="12345",
            name="Test Bridge",
            lat=51.1,
            lon=17.0,
            construction_year=1980,
            material="concrete",
            road_class="primary",
            max_weight_tons=20.0,
        )
        assert target.osm_id == "12345"
        assert target.street_view_available is True

    def test_minimal_bridge_target(self):
        target = BridgeTarget(osm_id="123", lat=51.0, lon=17.0)
        assert target.name is None
        assert target.construction_year is None

    def test_missing_required_fields(self):
        with pytest.raises(ValidationError):
            BridgeTarget(osm_id="123")


class TestBridgeSummary:
    def test_valid_bridge_summary(self):
        summary = BridgeSummary(
            osm_id="12345",
            name="Test Bridge",
            lat=51.1,
            lon=17.0,
            road_class="primary",
            construction_year=1980,
            priority_score=4.5,
        )
        assert summary.osm_id == "12345"
        assert summary.priority_score == 4.5

    def test_default_priority_score(self):
        summary = BridgeSummary(osm_id="123", lat=51.0, lon=17.0)
        assert summary.priority_score == 1.0


class TestBridgeRiskReport:
    def test_valid_risk_report(self, sample_visual_assessment, sample_bridge_context):
        from datetime import datetime

        report = BridgeRiskReport(
            bridge_id="12345",
            bridge_name="Test Bridge",
            lat=51.1,
            lon=17.0,
            risk_tier="HIGH",
            risk_score=3.5,
            condition_summary="Moderate deterioration",
            key_risk_factors=["Age", "Cracking"],
            recommended_action="Schedule inspection",
            maintenance_notes=["Check drainage"],
            confidence_caveat="Visual only",
            visual_assessment=sample_visual_assessment,
            context=sample_bridge_context,
            generated_at=datetime.now(),
        )
        assert report.risk_tier == "HIGH"
        assert report.thinking_steps == []

    def test_optional_fields(self):
        from datetime import datetime

        report = BridgeRiskReport(
            bridge_id="123",
            lat=51.0,
            lon=17.0,
            risk_tier="OK",
            risk_score=1.5,
            condition_summary="Good",
            key_risk_factors=[],
            recommended_action="None",
            maintenance_notes=[],
            confidence_caveat="N/A",
            generated_at=datetime.now(),
        )
        assert report.bridge_name is None
        assert report.visual_assessment is None


class TestBboxRequest:
    def test_valid_bbox(self):
        bbox = BboxRequest(
            sw_lat=51.0,
            sw_lon=16.9,
            ne_lat=51.2,
            ne_lon=17.1,
        )
        assert bbox.sw_lat == 51.0

    def test_missing_field(self):
        with pytest.raises(ValidationError):
            BboxRequest(sw_lat=51.0, sw_lon=16.9, ne_lat=51.2)


class TestScanRequest:
    def test_default_values(self):
        request = ScanRequest()
        assert request.query == ""
        assert request.query_type == "city_scan"
        assert request.max_bridges == 30
        assert request.bbox is None

    def test_with_bbox(self):
        bbox = BboxRequest(sw_lat=51.0, sw_lon=16.9, ne_lat=51.2, ne_lon=17.1)
        request = ScanRequest(query_type="bbox", bbox=bbox)
        assert request.bbox is not None


class TestDefectRegion:
    def test_valid_region(self):
        region = DefectRegion(x1=0.1, y1=0.2, x2=0.5, y2=0.6)
        assert region.x1 == 0.1
        assert region.x2 == 0.5


class TestDefectScore:
    def test_valid_score(self):
        score = DefectScore(
            score=3,
            confidence="medium",
            key_observations="Visible cracks",
        )
        assert score.score == 3
        assert score.regions == []

    def test_with_regions(self):
        region = DefectRegion(x1=0.1, y1=0.2, x2=0.5, y2=0.6)
        score = DefectScore(
            score=4,
            confidence="high",
            key_observations="Severe spalling",
            regions=[region],
        )
        assert len(score.regions) == 1


class TestVisualAssessment:
    def test_valid_assessment(self):
        defect = DefectScore(score=2, confidence="medium", key_observations="Minor")
        assessment = VisualAssessment(
            cracking=defect,
            spalling=defect,
            corrosion=defect,
            surface_degradation=defect,
            drainage=defect,
            structural_deformation=defect,
            overall_visual_score=2.0,
            requires_immediate_attention=False,
            visible_defects_summary="Minor issues",
            images_analyzed=4,
            street_view_coverage="full",
        )
        assert assessment.overall_visual_score == 2.0
        assert assessment.images_analyzed == 4


class TestBridgeContext:
    def test_valid_context(self):
        context = BridgeContext(
            construction_year=1980,
            construction_era="Post-war modern",
            material="concrete",
            past_incidents=["2015 crack"],
            last_known_inspection=2020,
            daily_traffic_volume=5000,
            structural_significance="major",
            age_years=44,
            sources=["OSM"],
        )
        assert context.age_years == 44
        assert len(context.past_incidents) == 1

    def test_defaults(self):
        context = BridgeContext()
        assert context.construction_era == "Unknown"
        assert context.material == "unknown"
        assert context.structural_significance == "minor"
        assert context.past_incidents == []
