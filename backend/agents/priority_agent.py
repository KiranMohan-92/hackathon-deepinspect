"""
Priority Agent — synthesizes all upstream findings into a risk report.

Performs consistency cross-validation between Vision, Environment,
and Failure Mode findings. Produces a risk matrix and recommended actions.
"""

import json
from pathlib import Path
from services.gemini_service import (
    is_adk_available,
    run_adk_agent,
    get_model_name,
)
from models.infrastructure import PriorityReport, ConsistencyCheck, RiskMatrix, RiskMatrixDimension

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "priority_prompt.txt"
_PROMPT_TEMPLATE = _PROMPT_PATH.read_text()


def _build_agent():
    """Create the ADK Agent for risk synthesis."""
    if not is_adk_available():
        return None

    from google.adk.agents import Agent

    return Agent(
        name="priority_agent",
        model=get_model_name(),
        instruction=_PROMPT_TEMPLATE,
        output_key="priority_output",
    )


_agent = None


def _get_agent():
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent


async def synthesize_priority(
    structure_type: str,
    environment_category: str,
    vision_output: str,
    environment_output: str,
    failure_mode_output: str,
) -> PriorityReport:
    """
    Run the Priority Agent to synthesize all upstream findings.

    Args:
        structure_type: Type of structure
        environment_category: Environment category
        vision_output: JSON string of vision findings
        environment_output: JSON string of environment findings
        failure_mode_output: JSON string of failure mode findings

    Returns:
        PriorityReport with risk matrix, consistency check, and actions
    """
    prompt = (
        f"Synthesize findings for a {structure_type} in {environment_category} environment.\n"
        f"Vision findings: {vision_output}\n"
        f"Environment findings: {environment_output}\n"
        f"Failure mode findings: {failure_mode_output}"
    )

    agent = _get_agent()

    try:
        data = await run_adk_agent(agent, prompt) if agent else await _fallback(
            structure_type, environment_category,
            vision_output, environment_output, failure_mode_output
        )
        return PriorityReport(**data)
    except Exception as e:
        print(f"[PriorityAgent] Error: {e}")
        return _default_report()


def _default_report() -> PriorityReport:
    """Fallback report when agent fails."""
    return PriorityReport(
        consistency_check=ConsistencyCheck(
            passed=False,
            anomalies=["Priority analysis failed — manual review required"],
            confidence_adjustment="Cannot assess. Agent error.",
        ),
        risk_matrix=RiskMatrix(
            severity=RiskMatrixDimension(score=3, reasoning="Default — manual assessment required"),
            probability=RiskMatrixDimension(score=3, reasoning="Default — manual assessment required"),
            consequence=RiskMatrixDimension(score=3, reasoning="Default — manual assessment required"),
            composite=27,
        ),
        risk_tier="MEDIUM",
        recommended_actions=[],
        worst_case_scenario="Unable to determine — manual inspection required.",
        summary="Automated assessment failed. Manual professional inspection is strongly recommended.",
    )


async def _fallback(
    structure_type: str,
    environment_category: str,
    vision_output: str,
    environment_output: str,
    failure_mode_output: str,
) -> dict:
    """Fallback using raw Gemini when ADK is unavailable."""
    from services.gemini_service import client, get_model_name
    from google.genai import types

    prompt_text = _PROMPT_TEMPLATE.format(
        structure_type=structure_type,
        environment_category=environment_category,
        vision_output=vision_output,
        environment_output=environment_output,
        failure_mode_output=failure_mode_output,
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
