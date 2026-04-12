import pytest
from unittest.mock import MagicMock

from agents import risk_agent
from models.bridge import BridgeTarget


@pytest.mark.asyncio
async def test_generate_report_skips_narrative_without_grounded_evidence(
    monkeypatch, sample_bridge_context
):
    mock_client = MagicMock()

    def fail_if_called(*args, **kwargs):
        raise AssertionError("Narrative model should not run without grounded evidence")

    mock_client.models.generate_content.side_effect = fail_if_called
    monkeypatch.setattr(risk_agent, "client", mock_client)

    bridge = BridgeTarget(
        osm_id="12345",
        name="Test Bridge",
        lat=51.1,
        lon=17.0,
        street_view_available=False,
    )

    report = await risk_agent.generate_report(
        bridge=bridge,
        visual=None,
        context=sample_bridge_context,
        per_heading_assessments=None,
        scour=None,
        structural=None,
        degradation=None,
    )

    assert report.certificate is not None
    assert report.condition_summary.startswith("Remote condition narrative withheld")
    assert report.key_risk_factors == ["Insufficient remote evidence for a condition narrative"]
    assert any(
        "No engineering criteria could be scored" in limitation
        for limitation in report.certificate.assessment_limitations
    )
