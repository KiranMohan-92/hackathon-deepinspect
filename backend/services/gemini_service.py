import google.generativeai as genai
from google.generativeai import GenerationConfig
from config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

# Single model for all tasks — plain Gemini, no search grounding
text_model = genai.GenerativeModel(settings.GEMINI_MODEL)
vision_model = genai.GenerativeModel(settings.GEMINI_MODEL)

# JSON-enforced output configs
json_config = GenerationConfig(
    response_mime_type="application/json",
    temperature=0.1,
)
narrative_config = GenerationConfig(
    response_mime_type="application/json",
    temperature=0.4,
)
