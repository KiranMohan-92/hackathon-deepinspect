from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    GOOGLE_MAPS_API_KEY: str
    REDIS_URL: str = "redis://localhost:6379"
    DEMO_MODE: bool = True
    MAX_BRIDGES_PER_SCAN: int = 50
    STREETVIEW_CACHE_DIR: str = "./data/demo_cache/images"
    GEMINI_MODEL: str = "gemini-3.1-flash-lite-preview"

    class Config:
        env_file = ".env"


settings = Settings()
