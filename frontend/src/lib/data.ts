import type { Quote, EmailNudge, LearningTemplate, Goal } from '@/types';

export const QUOTES: Quote[] = [
  {
    text: "You are in danger of living a life so comfortable and soft, that you will die without ever realizing your true potential.",
    author: "David Goggins",
    source: "Can't Hurt Me"
  },
  {
    text: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    source: "Meditations"
  },
  {
    text: "Every action you take is a vote for the type of person you wish to become.",
    author: "James Clear",
    source: "Atomic Habits"
  },
  {
    text: "The first rule is to keep an untroubled spirit. The second is to look things in the face and know them for what they are.",
    author: "Marcus Aurelius",
    source: "Meditations"
  },
  {
    text: "Waste no more time arguing about what a good man should be. Be one.",
    author: "Marcus Aurelius",
    source: "Meditations"
  },
  {
    text: "Stop making excuses. Stop being a victim. Take personal responsibility. No one is coming to save you.",
    author: "David Goggins",
    source: "Never Finished"
  },
  {
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
    source: "Atomic Habits"
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
    source: "Meditations"
  },
  {
    text: "Small habits don't add up. They compound. The difference a tiny improvement can make over time is astounding.",
    author: "James Clear",
    source: "Atomic Habits"
  },
  {
    text: "Most people live life on the path we set for them. Too afraid to explore any other. Nobody ever changed their life looking at someone else's.",
    author: "David Goggins",
    source: "Can't Hurt Me"
  },
  {
    text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
    author: "Marcus Aurelius",
    source: "Meditations"
  },
  {
    text: "The most important conversation you'll ever have is the one you have with yourself.",
    author: "David Goggins",
    source: "Can't Hurt Me"
  },
  {
    text: "A person's success in life can usually be measured by the number of uncomfortable conversations he or she is willing to have.",
    author: "Tim Ferriss",
    source: "The 4-Hour Workweek"
  },
  {
    text: "Identity change is the North Star of habit change. The goal is not to read a book, the goal is to become a reader.",
    author: "James Clear",
    source: "Atomic Habits"
  },
];

export const EMAIL_NUDGES: EmailNudge[] = [
  {
    level: 1,
    label: "Day 1 — Gentle",
    severity: "info",
    subject: "Hey, haven't seen you today 👀",
    body: `Hey {name},

Just a heads up — you haven't logged progress for {goal} today.

No big deal. Life happens. But your {streak}-day streak is on the line tonight.

You set this goal because it matters. Five minutes of focused work is all it takes to keep the chain alive.

Consistency doesn't mean perfection. It means showing up even when it's 11pm and you're tired.

→ Log your progress now

You've got this.
— Your Forge Coach`
  },
  {
    level: 2,
    label: "Day 3 — Stern",
    severity: "warning",
    subject: "3 days. Nothing. Really?",
    body: `{name},

Three days. That's how long it's been since you touched {goal}.

I'm not angry. I'm disappointed.

You came here with ambition. You had a plan. You set a deadline. And now you're coasting — probably doom-scrolling while your goals collect dust.

Your streak? Dead.

But here's the thing — champions aren't people who never fall down. They're people who GET BACK UP.

Every single person you admire has had their version of this moment. The crossroads. The choice.

Are you coming back?

→ Restart your streak — right now

— Forge`
  },
  {
    level: 3,
    label: "Day 7 — Nuclear ☢️",
    severity: "critical",
    subject: "This is embarrassing. Let's talk.",
    body: `{NAME}.

Seven days of silence.

You know what winners call someone who quits after one week?

Average.

You set a goal. You paid nothing. You risked nothing. And you STILL couldn't show up.

Your future self is watching you right now. And it's shaking its head.

Every single day you don't work on {goal}, someone else is. Someone with the SAME dream. Same resources. Less excuses.

The gap between you and that person is growing. Every. Single. Day.

"Most people who are afraid of suffering are already suffering from their fear of it."

You don't have to be perfect. You don't have to do two hours. 

You have to be PRESENT for ten minutes.

That's all. Ten minutes. Tonight.

→ Come back. Log something. Anything. Restart.

We'll be here when you're ready to stop playing small.

— Forge 🔥`
  }
];

export const JSON_TEMPLATE: LearningTemplate = {
  "_instructions": "Paste this into ChatGPT, Claude, or Gemini with: 'Fill this learning plan for [TOPIC] replacing all placeholders with real, detailed content for a complete beginner to intermediate learner.'",
  "learning_plan": {
    "major_topic": "[e.g. Machine Learning, Web Development, Piano, Spanish]",
    "goal_statement": "[What will you be able to DO when done? Be specific.]",
    "target_completion": "YYYY-MM-DD",
    "commitment_hours_per_week": 10,
    "sub_topics": [
      {
        "name": "[Sub-topic 1 Name]",
        "description": "[What concepts this covers and why it matters]",
        "estimated_hours": 5,
        "order": 1,
        "chapters_or_sections": ["[Chapter/Section 1]", "[Chapter/Section 2]", "[Chapter/Section 3]"],
        "completed": false
      },
      {
        "name": "[Sub-topic 2 Name]",
        "description": "[What concepts this covers and why it matters]",
        "estimated_hours": 8,
        "order": 2,
        "chapters_or_sections": ["[Section A]", "[Section B]", "[Section C]", "[Section D]"],
        "completed": false
      },
      {
        "name": "[Sub-topic 3 — Advanced]",
        "description": "[What concepts this covers and why it matters]",
        "estimated_hours": 12,
        "order": 3,
        "chapters_or_sections": ["[Advanced 1]", "[Advanced 2]", "[Advanced 3]"],
        "completed": false
      }
    ],
    "resources": [
      {
        "type": "book",
        "title": "[Primary Book Title]",
        "author": "[Author Name]",
        "url": null,
        "priority": "primary"
      },
      {
        "type": "course",
        "title": "[Online Course Name]",
        "platform": "[Udemy / Coursera / YouTube / etc]",
        "url": "[URL or null]",
        "priority": "primary"
      },
      {
        "type": "docs",
        "title": "[Official Documentation / Reference]",
        "url": "[URL]",
        "priority": "reference"
      },
      {
        "type": "community",
        "title": "[Reddit / Discord / Forum for this topic]",
        "url": "[URL]",
        "priority": "support"
      }
    ],
    "projects": [
      {
        "name": "[Starter Project Name]",
        "description": "[What you'll build to apply early knowledge]",
        "topics_tested": ["[Sub-topic 1]"],
        "difficulty": "beginner",
        "estimated_hours": 8,
        "completed": false
      },
      {
        "name": "[Intermediate Project Name]",
        "description": "[What you'll build to bridge sub-topics]",
        "topics_tested": ["[Sub-topic 1]", "[Sub-topic 2]"],
        "difficulty": "intermediate",
        "estimated_hours": 15,
        "completed": false
      },
      {
        "name": "[Final Project — Showcase-worthy]",
        "description": "[Ambitious final project that tests ALL knowledge and is worth showing employers/community]",
        "topics_tested": ["all"],
        "difficulty": "advanced",
        "estimated_hours": 30,
        "completed": false
      }
    ],
    "knowledge_tests": [
      {
        "type": "quiz",
        "topic": "[Sub-topic 1]",
        "description": "10 questions that verify deep understanding, not surface memorization",
        "completed": false
      },
      {
        "type": "teach_back",
        "topic": "[Core Major Concept]",
        "description": "Feynman technique: explain it to a 12-year-old. Record yourself or write it out.",
        "completed": false
      },
      {
        "type": "code_challenge",
        "topic": "[Practical Applied Skill]",
        "description": "Solve 3 real-world problems using only your knowledge, no tutorials",
        "completed": false
      },
      {
        "type": "peer_review",
        "topic": "[Project Work]",
        "description": "Get feedback on your project from a community or mentor",
        "completed": false
      }
    ],
    "milestones": [
      { "week": 2, "checkpoint": "[What you'll be able to do / explain by week 2]", "completed": false },
      { "week": 4, "checkpoint": "[What you'll be able to build / demonstrate by week 4]", "completed": false },
      { "week": 8, "checkpoint": "[Final mastery checkpoint — what defines success]", "completed": false }
    ]
  }
};

export const DEMO_GOALS: Goal[] = [
  {
    id: '1',
    name: 'Python Deep Dive',
    type: 'learn',
    description: 'Master Python from fundamentals to advanced async patterns',
    subtopics: [
      { id: 's1', name: 'Variables & Types', completed: true },
      { id: 's2', name: 'Functions & OOP', completed: true },
      { id: 's3', name: 'Decorators', completed: true },
      { id: 's4', name: 'Async/Await', completed: false },
      { id: 's5', name: 'FastAPI', completed: false },
      { id: 's6', name: 'Testing', completed: false },
    ],
    resources: ['Fluent Python', 'Real Python', 'FastAPI Docs'],
    progress: 50,
    targetDate: '2026-03-30',
    status: 'at-risk',
    createdAt: '2026-01-10',
    lastLoggedAt: '2026-02-15',
  },
  {
    id: '2',
    name: 'System Design',
    type: 'learn',
    description: 'Learn distributed systems, architecture patterns, scalability',
    subtopics: [
      { id: 's1', name: 'CAP Theorem', completed: true },
      { id: 's2', name: 'Load Balancing', completed: true },
      { id: 's3', name: 'Caching', completed: false },
      { id: 's4', name: 'Databases', completed: false },
      { id: 's5', name: 'Message Queues', completed: false },
    ],
    resources: ['DDIA', 'System Design Primer', 'ByteByteGo'],
    progress: 40,
    targetDate: '2026-04-15',
    status: 'at-risk',
    createdAt: '2026-01-15',
    lastLoggedAt: '2026-02-14',
  },
  {
    id: '3',
    name: 'Build: REST API',
    type: 'build',
    description: 'Ship a production-grade FastAPI app with auth, tests, CI/CD',
    subtopics: [
      { id: 's1', name: 'Project Setup', completed: true },
      { id: 's2', name: 'JWT Auth', completed: true },
      { id: 's3', name: 'CRUD Endpoints', completed: true },
      { id: 's4', name: 'Unit Tests', completed: true },
      { id: 's5', name: 'Deploy', completed: false },
    ],
    resources: ['FastAPI Docs', 'TDD with Python'],
    progress: 80,
    targetDate: '2026-03-01',
    status: 'on-track',
    createdAt: '2026-01-20',
    lastLoggedAt: '2026-02-18',
  },
  {
    id: '4',
    name: 'Morning Run 5K',
    type: 'fitness',
    description: '5km every morning before 7am — no excuses, no days off',
    subtopics: [
      { id: 's1', name: 'Week 1: 2km', completed: true },
      { id: 's2', name: 'Week 2: 3km', completed: true },
      { id: 's3', name: 'Week 3: 4km', completed: true },
      { id: 's4', name: 'Week 4: 5km', completed: false },
    ],
    resources: ['Goggins Running Log', 'Nike Run Club'],
    progress: 75,
    targetDate: '2026-03-31',
    status: 'on-track',
    createdAt: '2026-02-01',
    lastLoggedAt: '2026-02-18',
  }
];
