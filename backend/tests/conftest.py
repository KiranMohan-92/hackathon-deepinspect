import os
import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient, ASGITransport
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("GEMINI_API_KEY", "test_gemini_key")
os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test_maps_key")
os.environ.setdefault("API_KEYS", "")
os.environ.setdefault("ENVIRONMENT", "test")


@pytest.fixture
def mock_gemini():
    with patch("services.gemini_service.client") as mock:
        mock_response = MagicMock()
        mock_response.text = '{"cracking": {"score": 2, "confidence": "medium", "key_observations": "none", "regions": [], "potential_cause": ""}, "spalling": {"score": 1, "confidence": "high", "key_observations": "none", "regions": [], "potential_cause": ""}, "corrosion": {"score": 1, "confidence": "high", "key_observations": "none", "regions": [], "potential_cause": ""}, "surface_degradation": {"score": 1, "confidence": "high", "key_observations": "none", "regions": [], "potential_cause": ""}, "drainage": {"score": 2, "confidence": "medium", "key_observations": "none", "regions": [], "potential_cause": ""}, "structural_deformation": {"score": 1, "confidence": "high", "key_observations": "none", "regions": [], "potential_cause": ""}, "overall_visual_score": 1.5, "requires_immediate_attention": false, "visible_defects_summary": "Minor issues", "images_analyzed": 1, "street_view_coverage": "full"}'
        mock.models.generate_content.return_value = mock_response
        yield mock


@pytest.fixture
def mock_overpass():
    with patch("services.overpass_service.get_bridges_in_bbox") as mock:
        mock.return_value = [
            {
                "osm_id": "12345",
                "name": "Test Bridge",
                "lat": 51.1,
                "lon": 17.0,
                "road_class": "primary",
                "start_date": "1980",
                "material": "concrete",
                "maxweight": "20t",
            }
        ]
        yield mock


@pytest.fixture
def mock_maps_service():
    with patch("services.maps_service.bbox_from_city") as mock:
        mock.return_value = {
            "southwest": {"lat": 51.0, "lng": 16.9},
            "northeast": {"lat": 51.2, "lng": 17.1},
        }
        yield mock


@pytest.fixture
def client(mock_gemini, mock_overpass, mock_maps_service):
    from main import app

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture
async def async_client(mock_gemini, mock_overpass, mock_maps_service):
    from main import app

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
def sample_bridge_summary():
    from models.bridge import BridgeSummary

    return BridgeSummary(
        osm_id="12345",
        name="Test Bridge",
        lat=51.1,
        lon=17.0,
        road_class="primary",
        construction_year=1980,
        material="concrete",
        max_weight_tons=20.0,
        priority_score=4.5,
    )


@pytest.fixture
def sample_visual_assessment():
    from models.vision import VisualAssessment, DefectScore

    return VisualAssessment(
        cracking=DefectScore(
            score=2, confidence="medium", key_observations="Minor cracks", regions=[]
        ),
        spalling=DefectScore(
            score=1, confidence="high", key_observations="None", regions=[]
        ),
        corrosion=DefectScore(
            score=1, confidence="high", key_observations="None", regions=[]
        ),
        surface_degradation=DefectScore(
            score=1, confidence="high", key_observations="None", regions=[]
        ),
        drainage=DefectScore(
            score=2, confidence="medium", key_observations="Minor issues", regions=[]
        ),
        structural_deformation=DefectScore(
            score=1, confidence="high", key_observations="None", regions=[]
        ),
        overall_visual_score=1.5,
        requires_immediate_attention=False,
        visible_defects_summary="Minor issues",
        images_analyzed=1,
        street_view_coverage="full",
    )


@pytest.fixture
def sample_bridge_context():
    from models.context import BridgeContext

    return BridgeContext(
        construction_year=1980,
        construction_era="Post-war modern",
        material="concrete",
        past_incidents=[],
        last_known_inspection=2020,
        age_years=44,
    )
