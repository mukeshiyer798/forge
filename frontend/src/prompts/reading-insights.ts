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

    return `You are a knowledge curator for FORGE — a personal learning platform. Your job is to surface the most interesting, practical, and non-obvious things happening RIGHT NOW in the fields this learner cares about.

## THE LEARNER'S ACTIVE GOALS
${goalList}

## THEIR FIELDS
${industriesList}

## PREFERRED SOURCES (prioritize articles/insights from these)
${sourcesList}

---

## YOUR TASK

Generate 6-8 reading insights. These should be:

1. **CURRENT** — Things from the last 6 months. Not evergreen advice everyone knows. Think: "Stripe just launched Minions (AI agents that handle disputes)" or "Bridgewater's latest research note argues rate cuts won't happen until Q3" or "Grab's engineering team solved the distributed tracing problem at 10x scale."

2. **PRACTICAL** — Each insight should make the reader think "I should look into this" or "I can use this." Real things practitioners talk about on X, Hacker News, or in Slack channels.

3. **FROM REAL SOURCES** — Reference actual blog posts, articles, research papers, or newsletters from the sources listed above (or similar quality sources). Include the URL when possible. Don't invent articles that don't exist — reference real ones.

4. **DEPTH-ORIENTED** — Don't just say "AI is changing everything." Say "Vercel's v0 can now generate full Next.js apps from screenshots — here's what that means for frontend developers."

5. **VARIED** — Mix between:
   - **Industry moves** (company launches, open-source releases, research)
   - **Skill insights** (trends in what skills matter most right now)
   - **Career intel** (hiring trends, role changes, compensation data)
   - **Tool discoveries** (new tools, frameworks, or platforms worth trying)
   - **Learning resources** (new free courses, books, YouTube channels)
   - **Blog deep-dives** (specific engineering/research blog posts worth reading)

6. **GOAL-RELEVANT** — Match the learner's goals. If they're learning Java, prioritize JVM ecosystem. If they're in finance, prioritize market analysis and research.

---

## OUTPUT FORMAT

Return ONLY a valid JSON array. No markdown fences, no comments. Start with '[' and end with ']'.

[
  {
    "id": "string — unique e.g. 'insight-1'",
    "title": "string — attention-grabbing: 'Stripe's Engineering Blog Explains How They Built AI Dispute Agents'",
    "source": "string — the actual source: 'Stripe Engineering Blog', 'Howard Marks Memo', 'Netflix Tech Blog'",
    "category": "tech | finance | health | productivity | career | design",
    "type": "industry_move | skill_insight | career_intel | tool_discovery | learning_resource | blog_deep_dive",
    "summary": "string — 2-3 sentences. What happened, why it matters for THIS learner, and what they should do about it.",
    "keyTakeaway": "string — one sentence: the single most important thing to remember",
    "actionItem": "string — specific next step: 'Read the full post at [url] and notice how they used [pattern relevant to learner's goal]'",
    "relevantGoal": "string — which of the learner's goals this maps to, or 'general'",
    "url": "string or null — direct link to the source article/post when available",
    "freshness": "string — 'this week' | 'this month' | 'last 3 months' | 'recent'"
  }
]

RULES:
- Every insight must reference REAL sources. Prefer the sources listed above.
- If referencing a blog post, include the actual URL when you know it.
- If you're unsure about a specific date/detail, say "recently" instead of making up dates.
- Include at least 2 specific blog post deep-dives from the preferred sources.
- Each actionItem should be specific enough to act on today.
- Make it feel like a smart friend who reads everything sent you a curated briefing.`;
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
