"""
Gemini + ADK service layer.

Provides both:
1. ADK-native agent execution (Runner + InMemorySessionService)
2. Raw Gemini fallback if ADK is unavailable

The existing bridge scan flow uses raw Gemini (text_model, vision_model).
The new analysis pipeline uses ADK agents.
"""

import json
import uuid
from pathlib import Path
from config import settings

# ── Try ADK imports first, fall back to raw Gemini ──────────────────────────

_ADK_AVAILABLE = False

try:
    from google.adk.agents import Agent, ParallelAgent
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from google.adk.tools import google_search
    from google import genai
    from google.genai import types

    # Configure the genai client
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    _ADK_AVAILABLE = True
    print("[GeminiService] Google ADK loaded successfully")
except ImportError as e:
    print(f"[GeminiService] ADK not available ({e}), using raw Gemini fallback")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
    except ImportError:
        # Final fallback: old google-generativeai SDK
        import google.generativeai as genai_legacy
        genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
        client = None

# ── Raw Gemini models (for existing bridge scan flow) ───────────────────────

try:
    import google.generativeai as genai_legacy
    from google.generativeai import GenerationConfig

    genai_legacy.configure(api_key=settings.GEMINI_API_KEY)
    text_model = genai_legacy.GenerativeModel(settings.GEMINI_MODEL)
    vision_model = genai_legacy.GenerativeModel(settings.GEMINI_MODEL)

    json_config = GenerationConfig(
        response_mime_type="application/json",
        temperature=0.1,
    )
    narrative_config = GenerationConfig(
        response_mime_type="application/json",
        temperature=0.4,
    )
except Exception as e:
    print(f"[GeminiService] Legacy Gemini SDK not available: {e}")
    text_model = None
    vision_model = None
    json_config = None
    narrative_config = None

# ── ADK Session Management ──────────────────────────────────────────────────

APP_NAME = "deepinspect"

if _ADK_AVAILABLE:
    _session_service = InMemorySessionService()
else:
    _session_service = None


def is_adk_available() -> bool:
    return _ADK_AVAILABLE


def get_model_name() -> str:
    return settings.GEMINI_MODEL


# ── ADK Agent Execution Helpers ─────────────────────────────────────────────

async def run_adk_agent(
    agent: "Agent",
    user_message: str,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
    session_state: dict | None = None,
) -> dict:
    """
    Execute an ADK agent and return the parsed JSON response.

    Args:
        agent: An ADK Agent instance
        user_message: Text prompt to send
        image_bytes: Optional image data for multimodal input
        image_mime: MIME type of the image
        session_state: Optional pre-populated session state (for context passing)

    Returns:
        Parsed JSON dict from the agent's response
    """
    if not _ADK_AVAILABLE:
        return await _run_fallback(agent, user_message, image_bytes, image_mime)

    user_id = f"user_{uuid.uuid4().hex[:8]}"
    session = _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        state=session_state or {},
    )

    # Build multimodal content
    parts = [types.Part.from_text(text=user_message)]
    if image_bytes:
        parts.append(types.Part.from_bytes(
            data=image_bytes,
            mime_type=image_mime,
        ))

    message = types.Content(
        role="user",
        parts=parts,
    )

    # Run the agent
    final_text = ""
    runner = Runner(
        agent=agent,
        app_name=APP_NAME,
        session_service=_session_service,
    )

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=message,
    ):
        if event.is_final_response():
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        final_text += part.text

    # Parse JSON from response
    return _parse_json_response(final_text)


async def run_adk_parallel(
    parallel_agent: "ParallelAgent",
    user_message: str,
    session_state: dict | None = None,
) -> dict:
    """
    Execute an ADK ParallelAgent and return the session state with all sub-agent outputs.
    """
    if not _ADK_AVAILABLE:
        return {}

    user_id = f"user_{uuid.uuid4().hex[:8]}"
    session = _session_service.create_session(
        app_name=APP_NAME,
        user_id=user_id,
        state=session_state or {},
    )

    message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=user_message)],
    )

    runner = Runner(
        agent=parallel_agent,
        app_name=APP_NAME,
        session_service=_session_service,
    )

    async for event in runner.run_async(
        user_id=user_id,
        session_id=session.id,
        new_message=message,
    ):
        pass  # Consume all events

    # Retrieve final session state with all sub-agent outputs
    final_session = _session_service.get_session(
        app_name=APP_NAME,
        user_id=user_id,
        session_id=session.id,
    )
    return dict(final_session.state) if final_session else {}


def _parse_json_response(text: str) -> dict:
    """Extract JSON from agent response, handling markdown code fences."""
    text = text.strip()
    if text.startswith("```"):
        # Remove markdown code fences
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
        return {"error": "Failed to parse agent response", "raw_text": text[:500]}


async def _run_fallback(
    agent: object,
    user_message: str,
    image_bytes: bytes | None = None,
    image_mime: str = "image/jpeg",
) -> dict:
    """
    Fallback: use raw google-genai Client when ADK is not available.
    Extracts the instruction from the agent object if possible.
    Uses run_in_executor to avoid blocking the async event loop.
    """
    import asyncio

    instruction = getattr(agent, "instruction", "") or ""
    model_name = getattr(agent, "model", settings.GEMINI_MODEL) or settings.GEMINI_MODEL

    if client is None:
        return {"error": "No Gemini client available"}

    contents_parts = []
    if instruction:
        contents_parts.append(types.Part.from_text(text=instruction))
    contents_parts.append(types.Part.from_text(text=user_message))

    if image_bytes:
        contents_parts.append(types.Part.from_bytes(
            data=image_bytes,
            mime_type=image_mime,
        ))

    def _sync_call():
        return client.models.generate_content(
            model=model_name,
            contents=types.Content(role="user", parts=contents_parts),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(None, _sync_call)

    return _parse_json_response(response.text or "")
