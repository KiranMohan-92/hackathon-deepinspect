"""
Failure Mode Agent — classifies failure modes and finds historical precedents.

Uses Google Search grounding to find real historical incidents
of similar structural failures.
"""

import json
from pathlib import Path
from services.gemini_service import (
    is_adk_available,
    run_adk_agent,
    get_model_name,
)
from models.infrastructure import FailureModeAnalysis

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "failure_mode_prompt.txt"
_PROMPT_TEMPLATE = _PROMPT_PATH.read_text()


def _build_agent():
    """Create the ADK Agent with Google Search grounding tool."""
    if not is_adk_available():
        return None

    from google.adk.agents import Agent
    from google.adk.tools import google_search

    return Agent(
        name="failure_mode_agent",
        model=get_model_name(),
        instruction=_PROMPT_TEMPLATE,
        tools=[google_search],
        output_key="failure_mode_output",
    )


_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


async def analyze_failure_mode(
    structure_type: str,
    environment_category: str,
    vision_summary: str,
    environment_summary: str,
) -> FailureModeAnalysis:
    """
    Run the Failure Mode Agent to classify failure modes and find precedents.

    Args:
        structure_type: Type of structure
        environment_category: Environment category
        vision_summary: JSON string of vision agent findings
        environment_summary: JSON string of environment agent findings

    Returns:
        FailureModeAnalysis with failure mode, precedents, and timeline
    """
    prompt = (
        f"Analyze failure modes for a {structure_type} in {environment_category} environment.\n"
        f"Vision findings: {vision_summary}\n"
        f"Environmental stressors: {environment_summary}"
    )

    agent = _get_agent()

    try:
        data = await run_adk_agent(agent, prompt) if agent else await _fallback(
            structure_type, environment_category, vision_summary, environment_summary
        )
        return FailureModeAnalysis(**data)
    except Exception as e:
        print(f"[FailureModeAgent] Error: {e}")
        return FailureModeAnalysis(
            failure_mode="Analysis unavailable",
            mechanism="Manual assessment required",
            root_cause_chain=["Analysis failed"],
            progression_rate="MODERATE",
        )


async def _fallback(
    structure_type: str,
    environment_category: str,
    vision_summary: str,
    environment_summary: str,
) -> dict:
    """Fallback using raw Gemini when ADK is unavailable."""
    from services.gemini_service import client, get_model_name
    from google.genai import types

    prompt_text = _PROMPT_TEMPLATE.format(
        structure_type=structure_type,
        environment_category=environment_category,
        vision_summary=vision_summary,
        environment_summary=environment_summary,
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
