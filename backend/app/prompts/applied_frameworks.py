"""
FORGE Applied Frameworks — Digestible self-help tied to the learner's specific goals.

Instead of recommending a book, we extract the 2-3 frameworks that directly apply
to THIS user's specific learning challenges and goals.
"""


FRAMEWORK_LIBRARY = {
    "consistency": [
        ("The 2-Minute Rule", "Atomic Habits", "James Clear"),
        ("Implementation Intentions", "Atomic Habits", "James Clear"),
        ("Habit Stacking", "Atomic Habits", "James Clear"),
        ("Don't Break the Chain", "Seinfeld Strategy", "Jerry Seinfeld"),
    ],
    "retention": [
        ("The Feynman Technique", "Surely You're Joking, Mr. Feynman!", "Richard Feynman"),
        ("Active Recall", "Make It Stick", "Peter C. Brown"),
        ("Interleaving Practice", "Make It Stick", "Peter C. Brown"),
        ("The Testing Effect", "Make It Stick", "Peter C. Brown"),
    ],
    "focus": [
        ("Deep Work Protocol", "Deep Work", "Cal Newport"),
        ("Time Blocking", "Deep Work", "Cal Newport"),
        ("The 40% Rule", "Can't Hurt Me", "David Goggins"),
        ("Eat That Frog", "Eat That Frog!", "Brian Tracy"),
    ],
    "motivation": [
        ("The Progress Principle", "The Progress Principle", "Teresa Amabile"),
        ("Growth Mindset Reframe", "Mindset", "Carol Dweck"),
        ("The Accountability Mirror", "Can't Hurt Me", "David Goggins"),
        ("Start With Why", "Start With Why", "Simon Sinek"),
    ],
    "learning_speed": [
        ("The Pareto Principle (80/20)", "The 4-Hour Workweek", "Tim Ferriss"),
        ("Chunking", "A Mind for Numbers", "Barbara Oakley"),
        ("Diffuse Mode Thinking", "A Mind for Numbers", "Barbara Oakley"),
        ("Spaced Repetition", "Make It Stick", "Peter C. Brown"),
    ],
}


def build_applied_framework_prompt(goals: list[dict]) -> str:
    """
    Build a prompt for generating applied mental frameworks.
    
    Each goal dict should have:
      - name: str
      - description: str
      - current_topics: list[str]
    """
    if not goals:
        goal_context = "(No active goals — generate universally applicable frameworks)"
    else:
        goal_parts = []
        for g in goals:
            topics = ", ".join(g.get("current_topics", [])) or "general"
            goal_parts.append(
                f"- **{g.get('name')}**: {g.get('description', 'No description')}. "
                f"Currently working on: {topics}"
            )
        goal_context = "\n".join(goal_parts)

    return f"""You are FORGE's Applied Framework Engine. Your job is to take proven mental models and self-help frameworks and show EXACTLY how they apply to THIS specific learner's goals.

## THE LEARNER'S GOALS
{goal_context}

---

## YOUR TASK

Generate 3-4 applied framework cards. For each:

1. **PICK A REAL FRAMEWORK** from a well-known book (Atomic Habits, Deep Work, Can't Hurt Me, Make It Stick, Mindset, etc.)
2. **APPLY IT SPECIFICALLY** to one of the learner's goals. Don't just explain the framework — show how it works for THEIR situation.
3. **MAKE IT ACTIONABLE TODAY** — give a concrete 5-minute action they can do right now.

## EXAMPLES OF GREAT APPLIED FRAMEWORKS

BAD (generic): "The 2-Minute Rule says to start small with habits."
GOOD (applied): "You're learning Java and struggling to sit down and code daily. Apply the 2-Minute Rule: Instead of 'study Java for 2 hours,' commit to 'open IntelliJ and write one method.' Once you start, momentum carries you."

BAD (generic): "The Feynman Technique helps you learn faster."
GOOD (applied): "You just completed the OOP topic. Apply the Feynman Technique to your SRS cards: Before your next spaced repetition review, try explaining polymorphism to an imaginary 12-year-old. If you get stuck, that's the gap in your understanding."

---

## OUTPUT FORMAT

Return ONLY a valid JSON object:

{{
  "frameworks": [
    {{
      "id": "string",
      "frameworkName": "string — e.g. 'The 2-Minute Rule'",
      "book": "string — source book",
      "author": "string",
      "goalName": "string — which goal this applies to",
      "category": "consistency | retention | focus | motivation | learning_speed",
      "coreIdea": "string — 1 sentence: what the framework says",
      "appliedTo": "string — 2-3 sentences: how it SPECIFICALLY applies to this learner's current situation and goal",
      "fiveMinuteAction": "string — concrete action they can do in the next 5 minutes"
    }}
  ]
}}

CRITICAL:
- Every framework MUST be applied to a SPECIFIC goal the learner has.
- Don't recommend books. EXTRACT the technique and APPLY it.
- Each card should feel like a personal coach giving tailored advice.
- Mix categories: don't give 3 consistency frameworks. Vary the types.
- DO NOT wrap the JSON in markdown code blocks. Just output the raw JSON object."""
