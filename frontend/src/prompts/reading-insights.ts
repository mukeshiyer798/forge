/**
 * FORGE Reading Insights — AI Prompt for generating fresh, relevant reading suggestions.
 *
 * Dynamically adapts to the user's industry/domain:
 * - Tech → Stripe, Amazon, Netflix, Grab, Uber engineering blogs
 * - Finance → think tanks, research reports, investment letters
 * - Health → research journals, sports science, nutrition studies
 * - Design → case studies, design system updates
 */

export interface ReadingInsightPromptVars {
    goalNames: string[];
    goalTypes: string[];
    industries: string[];
}

// Map industries to specific blog/source suggestions
const INDUSTRY_SOURCES: Record<string, string[]> = {
    tech: [
        'Stripe Engineering Blog', 'Netflix Tech Blog', 'Uber Engineering',
        'Grab Tech Blog', 'Amazon Science', 'Meta Engineering',
        'Google AI Blog', 'Cloudflare Blog', 'Vercel Blog',
        'The Pragmatic Engineer', 'Hacker News', 'ByteByteGo',
        'Martin Fowler', 'InfoQ', 'ThoughtWorks Radar',
    ],
    ai: [
        'OpenAI Blog', 'Anthropic Research', 'Google DeepMind',
        'Hugging Face Blog', 'LangChain Blog', 'AI Snake Oil (Princeton)',
        'The Batch (Andrew Ng)', 'Latent Space Podcast',
    ],
    finance: [
        'Bridgewater Daily Observations', 'Howard Marks Memos',
        'Matt Levine (Bloomberg)', 'The Economist', 'FT Alphaville',
        'Morgan Housel (Collab Fund)', 'Aswath Damodaran Blog',
        'Brookings Institution', 'NBER Working Papers',
        'Visual Capitalist', 'Stratechery',
    ],
    health: [
        'Examine.com', 'Stronger By Science', 'Barbell Medicine',
        'Peter Attia (The Drive)', 'Huberman Lab', 'MASS Research Review',
        'British Journal of Sports Medicine', 'Precision Nutrition',
    ],
    design: [
        'Figma Blog', 'Airbnb Design', 'Spotify Design',
        'Nielsen Norman Group', 'UX Collective', 'Smashing Magazine',
        'Design Systems Repo', 'Refactoring UI',
    ],
    productivity: [
        'Cal Newport Blog', 'James Clear Newsletter', 'Farnam Street',
        'Sahil Bloom Newsletter', 'Tim Ferriss', 'Ali Abdaal',
    ],
};

export function buildReadingInsightsPrompt(vars: ReadingInsightPromptVars): string {
    const goalList = vars.goalNames.length
        ? vars.goalNames.map((g, i) => `${i + 1}. ${g}`).join('\n')
        : '(No active goals — generate general tech + productivity insights)';

    const industriesList = vars.industries.length
        ? vars.industries.join(', ')
        : 'tech, productivity';

    // Build source suggestions based on detected industries
    const sourceSuggestions: string[] = [];
    for (const ind of vars.industries) {
        const sources = INDUSTRY_SOURCES[ind.toLowerCase()];
        if (sources) sourceSuggestions.push(...sources);
    }
    if (sourceSuggestions.length === 0) {
        sourceSuggestions.push(...INDUSTRY_SOURCES.tech, ...INDUSTRY_SOURCES.productivity);
    }
    const uniqueSources = [...new Set(sourceSuggestions)].slice(0, 15);
    const sourcesList = uniqueSources.map(s => `  - ${s}`).join('\n');

    return `You are a knowledge curator for FORGE — a personal learning platform. Your job is to surface the most interesting, practical, and technically deep things happening RIGHT NOW in the fields this learner cares about.

## THE LEARNER'S ACTIVE GOALS
${goalList}

## THEIR FIELDS
${industriesList}

## PREFERRED SOURCES (You MUST prioritize articles/insights from these)
${sourcesList}

---

## YOUR TASK

Generate 6-8 reading insights. These should be:

1. **CURRENT & SPECIFIC** — Things from the last 6 months. Reference REAL, specific blog posts or events. (e.g., "Stripe's new Minions agents", "Vercel's AI SDK 3.0", "Netflix's move to GraphQL for their mobile homepage").

2. **PRACTICAL & TECHNICAL** — Don't be generic. Explain the HOW. If a blog post discusses a migration, mention the tools used. If a research note discusses interest rates, mention the specific metrics cited.

3. **FROM REAL SOURCES ONLY** — If you reference a source from the list above, it MUST be a real article that exists. Research the current state of these blogs in your knowledge.

4. **GOAL-ALIGNED** — If the learner is learning Java, focus on the Java/Spring/JVM ecosystem moves. If they are in AI, focus on LLM engineering and infrastructure.

---

## OUTPUT FORMAT

Return ONLY a valid JSON array.

[
  {
    "id": "string — unique",
    "title": "string — Specific & punchy (e.g., 'How Uber Eng Handles 2 Million Requests per Second with Go')",
    "source": "string — Actual blog/source name",
    "category": "tech | finance | health | productivity | career | design",
    "type": "industry_move | skill_insight | career_intel | tool_discovery | learning_resource | blog_deep_dive",
    "summary": "string — 3-4 sentences. Detailed explanation of the insight, its technical relevance, and why it's a 'must-read' for someone with this learner's goals.",
    "keyTakeaway": "string — one sentence: the core technical or practical lesson",
    "actionItem": "string — 'Read the full article at [url]. Pay close attention to [specific technical detail].'",
    "relevantGoal": "string — which goal matches this best",
    "url": "string or null — Direct link to the source post",
    "freshness": "string — 'this week' | 'this month' | 'last 3 months' | 'recent'"
  }
]

CRITICAL RULES:
- NO GENERIC ADVICE (e.g., 'Read more books').
- NO PLACEHOLDERS.
- Ensure the 'summary' is meaty and informative.
- If you don't know a real URL, provide a search query string for the URL and I will label it appropriately.
- At least 50% of insights must be 'blog_deep_dive' from the preferred sources.`;
}

/**
 * Infer industries from goal types and names.
 */
export function inferIndustries(goalNames: string[], goalTypes: string[]): string[] {
    const industries = new Set<string>();

    for (const type of goalTypes) {
        switch (type) {
            case 'learn':
            case 'build':
                industries.add('tech');
                break;
            case 'fitness':
                industries.add('health');
                break;
            case 'habit':
                industries.add('productivity');
                break;
        }
    }

    const lower = goalNames.map(n => n.toLowerCase()).join(' ');

    if (/java|python|react|node|spring|django|rust|go|typescript|javascript|api|backend|frontend|web|mobile|ios|android|devops|cloud|aws|docker|kubernetes|system design|microservice/i.test(lower)) {
        industries.add('tech');
    }
    if (/financ|invest|trading|stock|portfolio|accounting|economics|quant|banking|hedge fund|private equity/i.test(lower)) {
        industries.add('finance');
    }
    if (/fitness|gym|workout|run|diet|nutrition|health|muscle|cardio|yoga|strength|bodyweight|marathon/i.test(lower)) {
        industries.add('health');
    }
    if (/design|ux|ui|figma|sketch|graphic|css|animation|branding/i.test(lower)) {
        industries.add('tech');
        industries.add('design');
    }
    if (/data|ml|machine learning|ai|deep learning|nlp|analytics|llm|gpt|transformer|neural/i.test(lower)) {
        industries.add('tech');
        industries.add('ai');
    }
    if (/product management|pm|strategy|leadership|management|mba|consulting/i.test(lower)) {
        industries.add('productivity');
    }

    if (industries.size === 0) industries.add('productivity');

    return [...industries];
}
