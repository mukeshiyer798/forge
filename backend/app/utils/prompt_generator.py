"""
Generate copyable review prompts for spaced repetition.
"""

import json


def generate_review_prompt(
    *,
    topic_name: str,
    resources: str | None = None,
    active_recall_question: str | None = None,
) -> str:
    """
    Generate a copyable prompt for reviewing a topic.

    Format: "Brief me on [topic] covering [resources]. Focus on [question]"
    """
    resources_list: list[str] = []
    if resources:
        try:
            parsed = json.loads(resources)
            if isinstance(parsed, list):
                resources_list = [str(r) for r in parsed]
            elif isinstance(parsed, str):
                resources_list = [parsed]
        except json.JSONDecodeError:
            resources_list = [resources]

    resources_str = ", ".join(resources_list) if resources_list else "the materials"
    question_part = f" Focus on answering: {active_recall_question}" if active_recall_question else ""

    return f"Brief me on {topic_name} covering {resources_str}.{question_part}"
