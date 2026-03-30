import pytest
import io
from unittest.mock import patch, MagicMock


class TestAPIKeyAuthentication:
    def test_health_endpoint_no_auth_required(self, client):
        response = client.get("/health")
        assert response.status_code == 200

    def test_api_endpoint_no_auth_when_keys_empty(self, client):
        response = client.get("/api/v1/metrics")
        assert response.status_code == 200

    def test_config_parses_api_keys(self):
        import os

        original = os.environ.get("API_KEYS", "")
        os.environ["API_KEYS"] = "key1,key2,key3"

        from importlib import reload
        import config

        reload(config)

        keys = config.settings.get_api_keys_list()
        assert keys == ["key1", "key2", "key3"]

        os.environ["API_KEYS"] = original

    def test_config_empty_api_keys(self):
        import os

        original = os.environ.get("API_KEYS", "")
        os.environ["API_KEYS"] = ""

        from importlib import reload
        import config

        reload(config)

        keys = config.settings.get_api_keys_list()
        assert keys == []

        os.environ["API_KEYS"] = original


class TestFileUploadValidation:
    def test_valid_image_upload(self, client):
        image_data = b"fake_image_data"
        response = client.post(
            "/api/v1/analyze-image",
            files={"file": ("test.jpg", io.BytesIO(image_data), "image/jpeg")},
        )
        assert response.status_code in [200, 500]

    def test_invalid_content_type_rejected(self, client):
        response = client.post(
            "/api/v1/analyze-image",
            files={"file": ("test.txt", io.BytesIO(b"data"), "text/plain")},
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "INVALID_FILE_TYPE"

    def test_missing_content_type_rejected(self, client):
        response = client.post(
            "/api/v1/analyze-image",
            files={"file": ("test", io.BytesIO(b"data"), None)},
        )
        assert response.status_code == 400

    def test_validate_file_upload_missing_content_type(self):
        from utils.security import validate_file_upload
        from utils.errors import APIError, ErrorCode

        with pytest.raises(APIError) as exc_info:
            validate_file_upload(None, 100)

        assert exc_info.value.code == ErrorCode.INVALID_FILE_TYPE

    def test_validate_file_upload_invalid_type(self):
        from utils.security import validate_file_upload
        from utils.errors import APIError, ErrorCode

        with pytest.raises(APIError) as exc_info:
            validate_file_upload("text/plain", 100)

        assert exc_info.value.code == ErrorCode.INVALID_FILE_TYPE

    def test_validate_file_upload_too_large(self):
        from utils.errors import APIError, ErrorCode
        from config import Settings
        import os

        test_settings = Settings(
            GEMINI_API_KEY="test",
            GOOGLE_MAPS_API_KEY="test",
            MAX_UPLOAD_SIZE_MB=1,
        )

        assert test_settings.max_upload_size_bytes == 1 * 1024 * 1024

        with pytest.raises(APIError) as exc_info:
            from utils.security import validate_file_upload
            import utils.security

            original_settings = utils.security.settings
            utils.security.settings = test_settings
            try:
                validate_file_upload("image/jpeg", 5 * 1024 * 1024)
            finally:
                utils.security.settings = original_settings

        assert exc_info.value.code == ErrorCode.FILE_TOO_LARGE


class TestSecurityHeaders:
    def test_security_headers_present(self, client):
        response = client.get("/health")
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        assert response.headers["X-Frame-Options"] == "DENY"

    def test_strict_transport_security(self, client):
        response = client.get("/health")
        assert "Strict-Transport-Security" in response.headers


class TestErrorSanitization:
    def test_error_response_format(self, client):
        response = client.post(
            "/api/v1/bridges/mismatch/analyze",
            json={"osm_id": "different", "lat": 51.0, "lon": 17.0},
        )
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        error = data["error"]
        assert "code" in error
        assert "message" in error
        assert "details" in error
        assert isinstance(error["details"], list)

    def test_no_raw_exception_leaked(self, client):
        response = client.get("/api/v1/images/nonexistent/0")
        assert response.status_code == 404
        data = response.json()
        assert "Traceback" not in str(data)
        assert "Exception" not in str(data.get("error", {}).get("message", ""))
