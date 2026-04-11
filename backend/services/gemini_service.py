from google import genai
from google.genai import types
from config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

# JSON-enforced output configs
json_config = types.GenerateContentConfig(
    response_mime_type="application/json",
    temperature=0.1,
)
narrative_config = types.GenerateContentConfig(
    response_mime_type="application/json",
    temperature=0.4,
)
