import pytest

from models.criteria import CriterionResult
from models.degradation import DegradationAssessment
from models.structural_type import StructuralTypeAssessment
from utils.scoring import compute_criterion_scores, compute_weighted_risk_score


class TestCertificateScoring:
    def test_missing_scour_assessment_is_not_scored(
        self, sample_visual_assessment, sample_bridge_context
    ):
        criteria = compute_criterion_scores(
            sample_visual_assessment,
            sample_bridge_context,
            scour=None,
            structural=None,
            degradation=None,
        )

        c1 = criteria[0]

        assert c1.criterion_rank == 1
        assert c1.score is None
        assert c1.assessment_status == "not_assessed"
        assert c1.included_in_overall_risk is False
        assert c1.requires_field_verification is True
        assert "could not be completed" in c1.key_findings[0].lower()

    def test_unknown_structural_classification_does_not_invent_c2_or_c3_scores(
        self, sample_visual_assessment, sample_bridge_context
    ):
        structural = StructuralTypeAssessment(
            structure_type="unknown",
            structure_type_confidence="low",
            redundancy_class="unknown",
            estimated_capacity_class="unknown",
            capacity_vs_demand_flag="unknown",
            requires_load_rating=True,
            data_sources=[],
        )

        criteria = compute_criterion_scores(
            sample_visual_assessment,
            sample_bridge_context,
            structural=structural,
        )

        c2 = criteria[1]
        c3 = criteria[2]

        assert c2.score is None
        assert c2.assessment_status == "not_assessed"
        assert c2.included_in_overall_risk is False

        assert c3.score is None
        assert c3.assessment_status == "not_assessed"
        assert c3.included_in_overall_risk is False

    def test_criterion_10_requires_actual_deformation_signal(
        self, sample_visual_assessment, sample_bridge_context
    ):
        baseline = compute_criterion_scores(sample_visual_assessment, sample_bridge_context)
        c10 = baseline[9]

        assert c10.score is None
        assert c10.assessment_status == "not_assessed"
        assert c10.included_in_overall_risk is False

        deformed_visual = sample_visual_assessment.model_copy(deep=True)
        deformed_visual.structural_deformation.score = 4
        deformed_visual.structural_deformation.key_observations = "Visible sagging"

        deformed = compute_criterion_scores(deformed_visual, sample_bridge_context)
        c10_deformed = deformed[9]

        assert c10_deformed.score == 4.0
        assert c10_deformed.assessment_status == "estimated"
        assert c10_deformed.included_in_overall_risk is True

    def test_degradation_confidence_is_preserved_when_model_runs(
        self, sample_visual_assessment, sample_bridge_context
    ):
        degradation = DegradationAssessment(
            degradation_risk_score=2.8,
            confidence="medium",
            active_degradation_mechanisms=["chloride-induced corrosion"],
            estimated_remaining_service_life_years=22,
            data_sources=["physics model"],
        )

        criteria = compute_criterion_scores(
            sample_visual_assessment,
            sample_bridge_context,
            degradation=degradation,
        )

        c7 = criteria[6]

        assert c7.score == pytest.approx(2.8)
        assert c7.confidence == "medium"
        assert c7.assessment_status == "assessed"

    def test_weighted_score_skips_not_assessed_criteria(self):
        criteria = [
            CriterionResult(
                criterion_rank=1,
                criterion_name="Scour / Foundations / Channel Stability",
                score=None,
                assessment_status="not_assessed",
                included_in_overall_risk=False,
                confidence="low",
                key_findings=["No hydrological assessment performed"],
                requires_field_verification=True,
            ),
            CriterionResult(
                criterion_rank=2,
                criterion_name="Load-Path Continuity & Redundancy (NSTM)",
                score=4.0,
                assessment_status="estimated",
                included_in_overall_risk=True,
                confidence="high",
                key_findings=["Fracture critical nonredundant members identified"],
                requires_field_verification=True,
            ),
        ]

        score, confidence = compute_weighted_risk_score(criteria)

        assert score == pytest.approx(4.0)
        assert confidence == "high"
