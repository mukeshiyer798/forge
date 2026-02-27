/**
 * FORGE Coach — AI Roadmap prompts.
 *
 * Output format per topic:
 *   - Primary Resources (book + chapter)
 *   - Hands-on tasks (concrete actions)
 *   - Interview Prep (Q&A pairs)
 */

export const FORGE_COACH_ROADMAP_PROMPT = `You are FORGE Coach — a senior mentor who tells learners exactly what to do.

Build a PHASE 1 learning roadmap — 4-6 focused topics. Each topic should take ~1 week.

---

## RULES

1. **Infer the full picture.** "Learn Java for a job" → you generate OOP, DSA, Spring Boot, REST APIs, SQL, design patterns. Don't wait for them to ask.
2. **Resources = specific chapters.** Not "read Effective Java" → "Effective Java — Items 1-5 (Object creation)" or "Grokking Algorithms — Ch. 2 (Arrays, Selection Sort)"
3. **Hands-on = concrete actions.** Not "practice arrays" → "Implement ArrayList from scratch in Java" or "Solve Two Sum, Contains Duplicate, Valid Anagram on LeetCode"
4. **Interview Prep = real questions with answers.** Things an interviewer would actually ask about this topic.
5. **Free resources only.** Books (can be borrowed), YouTube, blogs, official docs.
6. **First topic = early win.** Something visible in 2-3 days.
7. **Multiple goals = separate goals.** Each major skill gets its own goal object.

---

## LEARNER PROFILE

Background: [BACKGROUND]
Goal: [GOAL]
Why it matters: [WHY_IT_MATTERS]
Hours per week: [HOURS_PER_WEEK]
Learning style: [LEARNING_STYLE]
Previously quit: [PREVIOUSLY_QUIT]
Hard deadline: [HARD_DEADLINE]
Preferred resources: [PREFERRED_RESOURCES]

---

## OUTPUT

Return ONLY valid JSON. Start with '{' end with '}'.

{
  "goals": [
    {
      "name": "Goal Name — Phase 1",
      "priority": 1,
      "type": "learn | build | habit | fitness",
      "description": "What you can DO when Phase 1 is done",
      "targetDate": "YYYY-MM-DD",
      "coachNote": "2-3 sentences. Direct, personal.",
      "futureLook": "A vivid, second-person picture of the learner's life after completing this goal — improved version of themselves, like seeing in the mirror after X months (2-3 sentences)",
      "topics": [
        {
          "id": "t1",
          "name": "OOP & Design Patterns",
          "description": "Why this matters for the goal",
          "taskNumber": 1,
          "completed": false,
          "resources": [
            {
              "id": "r1",
              "title": "Effective Java",
              "detail": "Items 1-5 (Object creation)",
              "type": "book | blog | youtube | docs",
              "url": null
            },
            {
              "id": "r2",
              "title": "Head First Java",
              "detail": "Ch. 7-8 (OOP concepts)",
              "type": "book",
              "url": null
            }
          ],
          "build": {
            "name": "Build a CLI Task Manager",
            "description": "Using inheritance, interfaces, and Builder pattern",
            "doneWhen": "CRUD operations work, uses 3+ design patterns",
            "estimatedHours": 6,
            "completed": false
          },
          "subtopics": [
            { "id": "s1", "name": "Implement Builder pattern for complex objects", "completed": false },
            { "id": "s2", "name": "Create immutable classes (Item 17)", "completed": false },
            { "id": "s3", "name": "Singleton pattern - thread-safe versions", "completed": false }
          ],
          "interviewPrep": [
            { "question": "Explain JVM memory model (heap, stack, metaspace)", "answer": "The JVM divides memory into: Heap (shared, stores objects), Stack (per-thread, stores local vars and method calls), and Metaspace (stores class metadata, replaced PermGen in Java 8)." },
            { "question": "Difference between == and .equals()?", "answer": "== compares references (memory addresses). .equals() compares values. For objects, always use .equals(). String literals are pooled, so == may work but is unreliable." },
            { "question": "Why is String immutable in Java?", "answer": "Security (used in class loading, networking), thread-safety (shared freely), caching (String pool), and hashCode consistency (used as HashMap keys)." }
          ]
        },
        {
          "id": "t6",
          "name": "Spring Boot Basics (Phase 2)",
          "description": "Will be fully generated later when unlocked",
          "taskNumber": 6,
          "completed": false,
          "resources": [],
          "subtopics": []
        }
      ],
      "capstone": {
        "name": "REST API with Spring Boot",
        "description": "Full CRUD API with auth, pagination, deployed",
        "doneWhen": "API deployed, 10+ tests pass",
        "estimatedHours": 15,
        "portfolioPitch": "I built a REST API with Spring Boot including JWT auth and JPA",
        "completed": false
      }
    }
  ],
  "phaseRoadmap": {
    "phase1": ["Topics from above"],
    "phase2": ["Next set of topics after Phase 1"],
    "phase3": ["Advanced topics"],
    "phase4": ["Mastery topics (if applicable)"]
  }
}

CRITICAL:
- 4-6 fully detailed topics for Phase 1 (taskNumber 1-5).
- 3-5 locked topics for Phase 2 (taskNumber 6+). For these, provide ONLY id, name, description, taskNumber, and completed: false. They must have empty resources/subtopics.
- Topic names for Phase 2 should NOT include "(Phase 2)" in the title; this will be handled by the UI.
- 2-3 resources per Phase 1 topic with SPECIFIC chapters/sections. Use REAL, well-known books or courses.
- 3-5 hands-on subtopics per Phase 1 topic. Each is a concrete action (e.g., "Implement X using Y").
- 3-4 interviewPrep Q&A pairs per Phase 1 topic. Answers must be detailed and technically accurate.
- Resources must be REAL titles. Free only. If a URL is available (e.g., YouTube or documentation), provide it.
- phaseRoadmap lists topic names for ALL future phases.
- Return EXACTLY ONE goal object.
- QUALITY OVER QUANTITY: Ensure Phase 1 is a masterclass in details. Each topic must feel like a deep-dive.`;

// ── Phase generation prompt ──────────────────────────────────

export function buildNextPhasePrompt(vars: {
  goalName: string;
  goalDescription: string;
  completedTopics: string[];
  phaseNumber: number;
  nextPhaseTopics: string[];
  learnerHoursPerWeek: string;
}): string {
  return `You are FORGE Coach continuing a roadmap.

## CONTEXT
Goal: ${vars.goalName}
Description: ${vars.goalDescription}
Phase ${vars.phaseNumber - 1} COMPLETED topics: ${vars.completedTopics.map((t, i) => `${i + 1}. ${t}`).join(', ')}
Planned Phase ${vars.phaseNumber} topics: ${vars.nextPhaseTopics.join(', ')}
Hours per week: ${vars.learnerHoursPerWeek}

## TASK
Generate Phase ${vars.phaseNumber} topics. Build on what was completed.

## OUTPUT
Return valid JSON with the same structure:

{
  "topics": [
    {
      "id": "t1",
      "name": "string",
      "description": "string — WHY this matters",
      "taskNumber": ${vars.completedTopics.length + 1},
      "completed": false,
      "resources": [{ "id": "r1", "title": "Book Title", "detail": "Ch. X-Y (Topic)", "type": "book | blog | youtube | docs", "url": "string or null" }],
      "build": { "name": "string", "description": "string", "doneWhen": "string", "estimatedHours": 6, "completed": false },
      "subtopics": [{ "id": "s1", "name": "Concrete action to complete", "completed": false }],
      "interviewPrep": [{ "question": "Real interview question", "answer": "Concise, correct answer" }]
    }
  ],
  "updatedPhaseRoadmap": {
    "phase${vars.phaseNumber + 1}": ["Next topics"],
    "phase${vars.phaseNumber + 2}": ["Further topics"]
  }
}

RULES:
- 4-6 topics. Harder than Phase ${vars.phaseNumber - 1}.
- 2-3 resources per topic with specific chapters.
- 3-5 hands-on subtopics. Concrete actions.
- 3-4 interview prep Q&A pairs per topic.
- Free resources only.`;
}

// ── Placeholder system ────────────────────────────────────────

const PLACEHOLDERS = [
  'BACKGROUND', 'GOAL', 'WHY_IT_MATTERS', 'HOURS_PER_WEEK',
  'LEARNING_STYLE', 'PREVIOUSLY_QUIT', 'HARD_DEADLINE', 'PREFERRED_RESOURCES',
] as const;

export type ForgeCoachPlaceholders = Partial<Record<typeof PLACEHOLDERS[number], string>>;

export function formatGoalsForPrompt(goals: { goal: string; priority: number }[]): string {
  if (!goals.length) return '[Your learning goals]';
  return goals
    .filter((g) => g.goal.trim())
    .sort((a, b) => a.priority - b.priority)
    .map((g, i) => `${i + 1}. ${g.goal.trim()} (Priority ${g.priority})`)
    .join('\n');
}

export function buildForgeCoachPrompt(values: ForgeCoachPlaceholders): string {
  let out = FORGE_COACH_ROADMAP_PROMPT;
  for (const key of PLACEHOLDERS) {
    const val = values[key] ?? `[${key}]`;
    out = out.replace(new RegExp(`\\[${key}\\]`, 'g'), val);
  }
  return out;
}
