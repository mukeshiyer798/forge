"""
FORGE Reading Insights — AI Prompt for generating fresh, relevant reading suggestions.
Ported from frontend/src/prompts/reading-insights.ts
"""

INDUSTRY_SOURCES = {
    "tech": [
        "Stripe Engineering Blog", "Netflix Tech Blog", "Uber Engineering",
        "Grab Tech Blog", "Amazon Science", "Meta Engineering",
        "Google AI Blog", "Cloudflare Blog", "Vercel Blog",
        "The Pragmatic Engineer", "Hacker News", "ByteByteGo",
        "Martin Fowler", "InfoQ", "ThoughtWorks Radar",
    ],
    "ai": [
        "OpenAI Blog", "Anthropic Research", "Google DeepMind",
        "Hugging Face Blog", "LangChain Blog", "AI Snake Oil (Princeton)",
        "The Batch (Andrew Ng)", "Latent Space Podcast",
    ],
    "finance": [
        "Bridgewater Daily Observations", "Howard Marks Memos",
        "Matt Levine (Bloomberg)", "The Economist", "FT Alphaville",
        "Morgan Housel (Collab Fund)", "Aswath Damodaran Blog",
        "Brookings Institution", "NBER Working Papers",
        "Visual Capitalist", "Stratechery",
    ],
    "health": [
        "Examine.com", "Stronger By Science", "Barbell Medicine",
        "Peter Attia (The Drive)", "Huberman Lab", "MASS Research Review",
        "British Journal of Sports Medicine", "Precision Nutrition",
    ],
    "design": [
        "Figma Blog", "Airbnb Design", "Spotify Design",
        "Nielsen Norman Group", "UX Collective", "Smashing Magazine",
        "Design Systems Repo", "Refactoring UI",
    ],
    "marketing": [
        "Think with Google", "HubSpot Blog", "Marketing Brew",
        "AdAge", "Contently", "Neil Patel Blog", "Seth Godin's Blog",
        "HBR Marketing", "Ahrefs Blog",
    ],
    "academic": [
        "Nature", "Science Daily", "MIT Technology Review",
        "Harvard Business Review", "Journal of Financial Economics",
        "arXiv.org", "PLOS ONE", "JSTOR",
    ],
    "policy_think_tanks": [
        "Council on Foreign Relations", "Brookings Institution",
        "Chatham House", "RAND Corporation", "Center for Strategic and International Studies",
    ],
    "productivity": [
        "Cal Newport Blog", "James Clear Newsletter", "Farnam Street",
        "Sahil Bloom Newsletter", "Tim Ferriss", "Ali Abdaal",
    ],
}

def build_reading_insights_prompt(goals: list[dict], industries: list[str]) -> str:
    if goals:
        goal_context = "\n".join([
            f"- {g.get('name')}: {g.get('description', 'No description provided.')}"
            for g in goals
        ])
    else:
        goal_context = "(No active goals — generate general tech + productivity insights)"

    industries_list = ", ".join(industries) if industries else "tech, productivity"

    # Build source suggestions based on detected industries
    industry_specific_sources = []
    deep_sources = []

    for ind in industries:
        sources = INDUSTRY_SOURCES.get(ind.lower())
        if sources:
            industry_specific_sources.extend(sources)
    
    # Prioritize high-authority deep sources for the top of the list
    if any(i in industries for i in ["tech", "marketing", "design", "ai"]):
        deep_sources.extend(INDUSTRY_SOURCES["academic"])
    if "finance" in industries:
        deep_sources.extend(INDUSTRY_SOURCES["policy_think_tanks"])
    
    # Combine (Deep sources first)
    source_suggestions = deep_sources + industry_specific_sources
    
    if not source_suggestions:
        source_suggestions.extend(INDUSTRY_SOURCES["academic"][:4])
        source_suggestions.extend(INDUSTRY_SOURCES["tech"])
        source_suggestions.extend(INDUSTRY_SOURCES["productivity"])

    # Unique and limited to 25
    unique_sources = list(dict.fromkeys(source_suggestions))[:25]
    sources_list = "\n".join([f"  - {s}" for s in unique_sources])

    return f"""You are a specialized Research Librarian and Knowledge Curator for FORGE. Your job is to surface the most relevant, high-authority, and practical insights happening RIGHT NOW in the specific subject areas this learner cares about.

## THE LEARNER'S SPECIFIC GOALS (Context for each)
{goal_context}

## ACTIVE FIELDS
{industries_list}

## PREFERRED HIGH-AUTHORITY SOURCES
{sources_list}

---

## YOUR TASK

Generate 6-8 reading insights. You must provide a BALANCED MIX that covers all the different goals provided above.

For each insight, follow these rules:

1. **GRANULAR MAPPING** — Map the insight directly to the SPECIFIC content of a goal. (e.g., if a goal is 'Marketing Strategy', find insights from top marketing firms or HBR. If it's 'Knitting', find craft-specific expert journals or community deep-dives).
2. **HIGH-AUTHORITY & DEPTH** — Prioritize academic papers, industry reports (e.g., Gartner, McKinsey, Stripe, Uber Eng), and think tank analysis over generic blog posts.
3. **CURRENT & SPECIFIC** — Reference REAL, specific posts, papers, or industry shifts from the last 6 months.
4. **NO PLACEHOLDERS** — If referencing a source, it must be a specific real article or study.
5. **DIVERSE SUBJECTS** — If the learner has 3 goals (e.g., Tech, Marketing, Habit-building), generate 2 insights for each. DO NOT ignore any goal.

---

## OUTPUT FORMAT

Return ONLY a valid JSON object:

{{
  "insights": [
    {{
      "id": "string — unique",
      "title": "string — Punchy & Specific (e.g., 'Gartner 2024: The Rise of Agentic AI in Fintech')",
      "source": "string — Actual entity/source name",
      "category": "tech | finance | health | productivity | career | design | marketing | art | research",
      "type": "industry_move | skill_insight | career_intel | research_paper | industry_report | blog_deep_dive",
      "summary": "string — 3-4 sentences. Detailed explanation of the technical/strategic finding and WHY it directly impacts the specific goal it's mapped to.",
      "keyTakeaway": "string — one sentence: the core lesson or discovery",
      "actionItem": "string — concrete advice on what to read or apply from this source",
      "relevantGoal": "string — the goal name this maps to",
      "url": "string (a concise Google search query to find this article, NOT a direct URL)",
      "freshness": "string — 'this week' | 'this month' | 'recent'"
    }}
  ]
}}

CRITICAL RULES:
- BE EXTREMELY SPECIFIC.
- ACT AS A DEEP SUBJECT MATTER EXPERT FOR EACH GOAL.
- DO NOT provide generic self-help unless explicitly goal-related.
- For the 'url' field, ALWAYS provide a concise Google search query (e.g., 'Stripe engineering blog API design 2025'). NEVER provide a direct URL.
- DO NOT wrap the JSON in markdown code blocks. Just output the raw JSON object.
"""

def build_mindset_prompt() -> str:
    return """You are a reading curator. Generate 6-8 powerful lessons from the best self-help and mindset books.

Draw from books like:
- Can't Hurt Me (David Goggins)
- Atomic Habits (James Clear)
- Mindset (Carol Dweck)
- The 5 AM Club (Robin Sharma)
- Deep Work (Cal Newport)
- Grit (Angela Duckworth)
- Man's Search for Meaning (Viktor Frankl)
- The War of Art (Steven Pressfield)
- 12 Rules for Life (Jordan Peterson)
- Think Again (Adam Grant)

For each, give:
- A punchy lesson title
- The book and author
- A 2-sentence summary of the concept
- The single key lesson (one sentence)
- How to apply it TODAY (concrete action)

Return ONLY valid JSON object:

{
  "mindset": [
    {
      "id": "m1",
      "title": "The 40% Rule",
      "book": "Can't Hurt Me",
      "author": "David Goggins",
      "category": "resilience | habits | mindset | discipline | motivation | leadership",
      "summary": "When your mind tells you you're done, you're only at 40% of your capacity. Goggins discovered this through Navy SEAL training.",
      "keyLesson": "You are capable of far more than your mind tells you. Push past the mental barrier.",
      "howToApply": "Next time you want to quit a workout, study session, or hard task — do 10 more minutes. Train your brain that 'done' is negotiable."
    }
  ]
}

RULES:
- Mix different books. Don't use the same book twice.
- Each lesson should be a specific, named concept from the book (not generic advice).
- "howToApply" must be actionable TODAY.
- KEEP it varied: mix resilience, habits, mindset, discipline.
- DO NOT wrap the JSON in markdown code blocks. Just output the raw JSON object."""
