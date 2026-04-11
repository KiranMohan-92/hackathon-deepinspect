"""Gemini AI client — gracefully degrades when API key is missing."""

from config import settings

client = None

try:
    from google import genai
    from google.genai import types

    if settings.GEMINI_API_KEY:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

    json_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.1,
    )
    narrative_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.4,
    )
except ImportError:
    # google-genai not installed — app runs in degraded mode
    json_config = None  # type: ignore[assignment]
    narrative_config = None  # type: ignore[assignment]
