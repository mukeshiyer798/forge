"""
FORGE Intelligence Feed — Phase-aware contextual insights.

Connects what the learner is studying RIGHT NOW to real-world events,
announcements, and case studies happening this week.
"""


def build_intelligence_feed_prompt(goals: list[dict]) -> str:
    """
    Build a prompt for generating contextual, phase-aware insights.
    
    Each goal dict should have:
      - name: str
      - description: str
      - current_phase: int (1-based)
      - current_topics: list[str] (names of active/in-progress topics)
    """
    if not goals:
        return _fallback_prompt()

    goal_sections = []
    for g in goals:
        phase = g.get("current_phase", 1)
        topics = g.get("current_topics", [])
        topics_str = ", ".join(topics) if topics else "general overview"
        goal_sections.append(
            f"- **{g.get('name')}** (Phase {phase}): Currently studying: {topics_str}.\n"
            f"  Description: {g.get('description', 'No description')}"
        )

    goals_context = "\n".join(goal_sections)

    return f"""You are FORGE's Intelligence Feed Engine — a hyper-contextual research analyst.

Your job is NOT generic news aggregation. Your job is CONTEXTUAL RELEVANCE: connect what the learner is studying RIGHT NOW to real-world events, industry moves, and case studies from the last 7 days.

## LEARNER'S ACTIVE LEARNING CONTEXT

{goals_context}

---

## YOUR TASK

Generate 4-6 intelligence items. Each must:

1. **CONNECT to a specific topic** the learner is actively studying. Reference the exact phase and topic name.
2. **BE CURRENT** — from the last 7 days. Reference a REAL event, announcement, report, or case study.
3. **EXPLAIN THE CONNECTION** — Don't just report news. Explain WHY this matters for what they're learning.
4. **BE SPECIFIC** — Name companies, people, numbers, dates. No vague "industry trends."

## EXAMPLES OF GREAT INTELLIGENCE ITEMS

- "You're on Phase 2 of your PM roadmap studying user research — Spotify just A/B tested a controversial Discover Weekly redesign. Here's the PM decision framework they used and why it's a live case study for your current module."
- "You're learning React state management — Vercel just released a new caching strategy in Next.js 15.2. This directly impacts how you think about server state vs client state."
- "You're studying fintech regulations — RBI released draft guidelines on digital lending this week. Here's how it changes the compliance landscape you're learning about."
- "You're learning knitting colorwork — Wool & The Gang just released a collaboration with a Japanese indigo dyer. Here's how traditional shibori techniques cross-pollinate with Nordic colorwork."

---

## OUTPUT FORMAT

Return ONLY a valid JSON array:

[
  {{
    "id": "string",
    "title": "string — punchy, specific headline",
    "source": "string — real source name",
    "phaseConnection": "string — e.g. 'Phase 2: User Research'",
    "goalName": "string — which goal this connects to",
    "whyItMatters": "string — 2-3 sentences explaining the direct connection to what they're learning",
    "actionItem": "string — what to read/do with this knowledge",
    "url": "string or null — direct link if known",
    "eventDate": "string — approximate date (e.g. 'Feb 2026', 'This week')"
  }}
]

CRITICAL:
- Every item MUST reference a SPECIFIC phase and topic the learner is on.
- Every item MUST reference a REAL, specific recent event (not hypothetical).
- If you can't find something real and recent for a goal, skip that goal rather than fabricating.
- Quality over quantity. 4 excellent items beats 8 mediocre ones."""


def _fallback_prompt() -> str:
    return """Generate 4 notable tech/business developments from the last 7 days.
Return ONLY valid JSON array:
[{{"id":"f1","title":"string","source":"string","phaseConnection":"General","goalName":"General","whyItMatters":"string","actionItem":"string","url":null,"eventDate":"This week"}}]"""
