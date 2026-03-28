"""
Environment Agent — analyzes environmental stressors acting on infrastructure.

Uses Google Search grounding to find real, current environmental data
relevant to the structure type and location.
"""

import json
from pathlib import Path
from services.gemini_service import (
    is_adk_available,
    run_adk_agent,
    get_model_name,
)
from models.infrastructure import EnvironmentAnalysis

# Load prompt template
_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "environment_prompt.txt"
_PROMPT_TEMPLATE = _PROMPT_PATH.read_text()


def _build_agent():
    """Create the ADK Agent with Google Search grounding tool."""
    if not is_adk_available():
        return None

    from google.adk.agents import Agent
    from google.adk.tools import google_search

    return Agent(
        name="environment_agent",
        model=get_model_name(),
        instruction=_PROMPT_TEMPLATE,
        tools=[google_search],
        output_key="environment_output",
    )


# Lazy singleton
_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


async def analyze_environment(
    structure_type: str,
    environment_category: str,
    location: str | None = None,
) -> EnvironmentAnalysis:
    """
    Run the Environment Agent to analyze environmental stressors.

    Args:
        structure_type: Type of structure (bridge, satellite, etc.)
        environment_category: Environment category (terrestrial_civil, orbital, etc.)
        location: Optional location context string

    Returns:
        EnvironmentAnalysis with stressors, accelerating/mitigating factors
    """
    location_context = f"Location: {location}" if location else "Location: Not specified"

    prompt = (
        f"Analyze the environmental stressors for a {structure_type} "
        f"in a {environment_category} environment. {location_context}"
    )

    agent = _get_agent()

    try:
        data = await run_adk_agent(agent, prompt) if agent else await _fallback(
            structure_type, environment_category, location_context
        )
        return EnvironmentAnalysis(**data)
    except Exception as e:
        print(f"[EnvironmentAgent] Error: {e}")
        return EnvironmentAnalysis(
            environment_type=environment_category,
            location_context=location_context,
            stressors=[],
            accelerating_factors=["Analysis failed — manual environmental assessment required"],
            mitigating_factors=[],
        )


async def _fallback(
    structure_type: str,
    environment_category: str,
    location_context: str,
) -> dict:
    """Fallback using raw Gemini when ADK is unavailable."""
    from services.gemini_service import client, get_model_name
    from google.genai import types

    prompt_text = _PROMPT_TEMPLATE.format(
        structure_type=structure_type,
        environment_category=environment_category,
        location_context=location_context,
    )

    response = client.models.generate_content(
        model=get_model_name(),
        contents=types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt_text)],
        ),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    from services.gemini_service import _parse_json_response
    return _parse_json_response(response.text or "{}")
