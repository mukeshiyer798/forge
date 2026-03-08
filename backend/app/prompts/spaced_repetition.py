from app.entities.spaced_repetition import SpacedRepetitionItem
import orjson

def build_explanation_prompt(item: SpacedRepetitionItem) -> str:
    resources_list: list[str] = []
    if item.resources:
        try:
            parsed = orjson.loads(item.resources)
            if isinstance(parsed, list):
                resources_list = [str(r) for r in parsed]
            elif isinstance(parsed, str):
                resources_list = [parsed]
        except orjson.JSONDecodeError:
            resources_list = [item.resources]

    resources_str = "\n".join([f"- {r}" for r in resources_list]) if resources_list else "General knowledge"
    
    question_context = f"\nFocus your explanation specifically on answering this: {item.active_recall_question}" if item.active_recall_question else ""

    return f"""You are an expert technical tutor helping a student deeply understand a specific topic they are reviewing.

## TOPIC TO REVIEW
{item.topic_name}

## SOURCE MATERIAL CONTEXT
{resources_str}{question_context}

## YOUR TASK
Explain this topic clearly, concisely, and practically.
Do NOT just give a high-level summary. Go deep enough to actually refresh their memory on the technical concepts.

Follow this exact structure:
1. **The Core Concept**: What is this, in simple terms? (2-3 sentences max)
2. **How It Works**: Break down the mechanics or chapters involved.
3. **Concrete Example**: Provide a real-world example, code snippet, or analogy that makes it immediately click.

Return ONLY a valid JSON object matching this exact format:
{{
  "explanation": "string (A strictly formatted Markdown string containing the headers, lists, code blocks, and bold text for the explanation)"
}}

DO NOT wrap the JSON in markdown code blocks. Just output the raw JSON object.
"""
