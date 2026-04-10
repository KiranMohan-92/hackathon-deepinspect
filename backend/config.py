from pydantic_settings import BaseSettings
from typing import List, Optional
from pydantic import field_validator


class Settings(BaseSettings):
    # Core API keys
    GEMINI_API_KEY: str
    GOOGLE_MAPS_API_KEY: str

    # Infrastructure
    REDIS_URL: str = "redis://localhost:6379"

    # Application settings
    DEMO_MODE: bool = True
    MAX_BRIDGES_PER_SCAN: int = 50
    STREETVIEW_CACHE_DIR: str = "./data/demo_cache/images"
    GEMINI_MODEL: str = "gemini-3.1-flash-lite-preview"
    APP_VERSION: str = "1.1.0"
    APP_NAME: str = "DeepInspect API"

    # Security settings
    API_KEYS: str = ""  # Comma-separated API keys, empty = auth disabled
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: str = "image/jpeg,image/png,image/webp"

    # Rate limiting (requests per minute)
    RATE_LIMIT_SCAN: int = 30
    RATE_LIMIT_ANALYZE: int = 10
    RATE_LIMIT_UPLOAD: int = 5
    RATE_LIMIT_DEFAULT: int = 60

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "console"  # "json" for production

    # Resilience
    AGENT_TIMEOUT_SECONDS: int = 120
    GEMINI_CIRCUIT_BREAKER_THRESHOLD: int = 5

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./deepinspect.db"
    DATABASE_AUTO_INIT: bool = True  # create_all on startup (dev/demo)

    # Observability
    METRICS_ENABLED: bool = True
    OTEL_ENABLED: bool = False
    OTEL_SERVICE_NAME: str = "deepinspect"

    # Environment
    ENVIRONMENT: str = "development"

    @field_validator("API_KEYS", mode="before")
    @classmethod
    def parse_api_keys(cls, v: Optional[str]) -> str:
        return v or ""

    def get_api_keys_list(self) -> List[str]:
        """Parse comma-separated API keys into a list."""
        if not self.API_KEYS:
            return []
        return [k.strip() for k in self.API_KEYS.split(",") if k.strip()]

    def get_allowed_image_types(self) -> List[str]:
        """Parse allowed image MIME types."""
        return [t.strip() for t in self.ALLOWED_IMAGE_TYPES.split(",")]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    def validate_required_keys(self) -> List[str]:
        """Validate required API keys are present. Returns list of missing keys."""
        missing = []
        if not self.GEMINI_API_KEY:
            missing.append("GEMINI_API_KEY")
        if not self.GOOGLE_MAPS_API_KEY:
            missing.append("GOOGLE_MAPS_API_KEY")
        return missing

    class Config:
        env_file = ".env"


settings = Settings()
