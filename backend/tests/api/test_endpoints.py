import pytest
import json
from fastapi.testclient import TestClient


class TestHealthEndpoint:
    def test_health_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data

    def test_v1_health_returns_ok(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "dependencies" in data


class TestScanEndpoint:
    def test_scan_returns_sse_stream(self, client):
        response = client.post(
            "/api/v1/scan",
            json={"query": "Wroclaw", "query_type": "city_scan"},
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

    def test_scan_with_bbox(self, client):
        response = client.post(
            "/api/v1/scan",
            json={
                "query_type": "bbox",
                "bbox": {
                    "sw_lat": 51.0,
                    "sw_lon": 16.9,
                    "ne_lat": 51.2,
                    "ne_lon": 17.1,
                },
            },
        )
        assert response.status_code == 200

    def test_legacy_scan_endpoint_works(self, client):
        response = client.post(
            "/api/scan",
            json={"query": "Wroclaw", "query_type": "city_scan"},
        )
        assert response.status_code == 200


class TestAnalyzeEndpoint:
    def test_analyze_osm_id_mismatch(self, client):
        response = client.post(
            "/api/v1/bridges/12345/analyze",
            json={
                "osm_id": "99999",
                "lat": 51.1,
                "lon": 17.0,
            },
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data

    def test_analyze_returns_sse_stream(self, client, sample_bridge_summary):
        response = client.post(
            f"/api/v1/bridges/{sample_bridge_summary.osm_id}/analyze",
            json=sample_bridge_summary.model_dump(),
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]


class TestDemoEndpoint:
    def test_demo_not_found_without_cache(self, client):
        response = client.get("/api/v1/demo")
        assert response.status_code == 404
        data = response.json()
        assert "error" in data


class TestMetricsEndpoint:
    def test_metrics_returns_data(self, client):
        response = client.get("/api/v1/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data


class TestRootEndpoint:
    def test_root_redirects(self, client):
        response = client.get("/", follow_redirects=False)
        assert response.status_code in [200, 307]


class TestImagesEndpoint:
    def test_list_bridge_images(self, client):
        response = client.get("/api/v1/bridges/12345/images")
        assert response.status_code == 200
        data = response.json()
        assert "osm_id" in data
        assert "images" in data

    def test_get_image_not_found(self, client):
        response = client.get("/api/v1/images/nonexistent/0")
        assert response.status_code == 404
