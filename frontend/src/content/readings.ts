// ============================================================
// FORGE READING CONTENT
// ============================================================
// Format for adding new content:
//
// BOOK INSIGHT:
// {
//   id: 'unique-id',
//   type: 'insight',
//   book: 'Book Title',
//   author: 'Author Name',
//   category: 'mindset' | 'habits' | 'discipline' | 'resilience' | 'focus',
//   emoji: '📖',
//   title: 'Insight Title',
//   summary: 'One paragraph punchy summary',
//   keyPoints: ['point 1', 'point 2', 'point 3'],
//   quote: 'A direct quote from the book',
//   readTime: 3, // minutes
// }
//
// STORY:
// {
//   id: 'unique-id',
//   type: 'story',
//   title: 'Story Title',
//   subject: 'Person/Subject Name',
//   category: 'mindset' | 'habits' | 'discipline' | 'resilience' | 'focus',
//   emoji: '⚡',
//   summary: 'Full story summary, can be multiple paragraphs separated by \n\n',
//   lesson: 'The core lesson in one sentence',
//   readTime: 5,
// }
//
// ============================================================

export type ReadingCategory = 'mindset' | 'habits' | 'discipline' | 'resilience' | 'focus';

export interface BookInsight {
  id: string;
  type: 'insight';
  book: string;
  author: string;
  category: ReadingCategory;
  emoji: string;
  title: string;
  summary: string;
  keyPoints: string[];
  quote: string;
  readTime: number;
}

export interface Story {
  id: string;
  type: 'story';
  title: string;
  subject: string;
  category: ReadingCategory;
  emoji: string;
  summary: string;
  lesson: string;
  readTime: number;
}

export type ReadingItem = BookInsight | Story;

// ============================================================
// CONTENT — Add your own below following the format above
// ============================================================

export const READINGS: ReadingItem[] = [
  // ── CAN'T HURT ME ──────────────────────────────────────────
  {
    id: 'chm-40pct',
    type: 'insight',
    book: "Can't Hurt Me",
    author: 'David Goggins',
    category: 'discipline',
    emoji: '💪',
    title: 'The 40% Rule',
    summary: "When your mind says you're done, you're only 40% spent. Goggins discovered this truth through Navy SEAL Hell Week, where he ran on broken feet and cracked kneecaps. The governor in your mind activates long before your body actually fails — it's a survival mechanism that was useful on the savanna but cripples you in the modern pursuit of greatness.",
    keyPoints: [
      'Your mind quits at 40% of your actual capacity',
      'The "governor" is a protective mechanism, not reality',
      'Callusing your mind through voluntary suffering expands your true ceiling',
      'Pain + suffering = growth, if you choose to learn from it',
    ],
    quote: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.",
    readTime: 4,
  },
  {
    id: 'chm-accountability-mirror',
    type: 'insight',
    book: "Can't Hurt Me",
    author: 'David Goggins',
    category: 'mindset',
    emoji: '🪞',
    title: 'The Accountability Mirror',
    summary: "Goggins was 300 pounds, working as an exterminator, and going nowhere. He stood in front of his bathroom mirror and faced every lie, every excuse, every dream he'd abandoned. No filter. No mercy. He wrote his failures on sticky notes and plastered them on the mirror. This brutal self-confrontation became his launchpad. You cannot change what you refuse to acknowledge.",
    keyPoints: [
      'Write your insecurities, failures, and excuses on sticky notes',
      'Put them where you cannot avoid them daily',
      'Don\'t move a note until you\'ve addressed that issue',
      'Radical honesty with yourself is the first act of self-respect',
    ],
    quote: "We live in a world where everything is catered to our weaknesses, and it's making us mentally fragile.",
    readTime: 3,
  },
  {
    id: 'chm-cookie-jar',
    type: 'insight',
    book: "Can't Hurt Me",
    author: 'David Goggins',
    category: 'resilience',
    emoji: '🍪',
    title: 'The Cookie Jar Method',
    summary: "Every hard thing you've survived, every test you've passed, every time you did something you thought you couldn't — those go in the Cookie Jar. When you're at your limit and your mind is screaming to stop, you reach into the jar and pull out proof that you've been here before and won. You aren't starting from zero. You have a history of doing hard things.",
    keyPoints: [
      'Document every hard thing you\'ve overcome — they are your proof',
      'When doubt hits, mentally revisit past victories',
      'Your history of hard things is your most reliable fuel',
      'The jar grows every time you choose hard over easy',
    ],
    quote: "The most important conversations you'll ever have are the ones you'll have with yourself.",
    readTime: 3,
  },

  // ── ATOMIC HABITS ──────────────────────────────────────────
  {
    id: 'ah-identity',
    type: 'insight',
    book: 'Atomic Habits',
    author: 'James Clear',
    category: 'habits',
    emoji: '🎯',
    title: 'Identity-Based Habits',
    summary: "Most people set outcome-based goals (lose 20 pounds, read 12 books). Clear argues this is backwards. The most effective way to change is to focus on who you want to become, not what you want to achieve. Every action you take is a vote for the type of person you want to be. Two votes, ten votes, a thousand votes — eventually the evidence is overwhelming. You become the person you've been proving you are.",
    keyPoints: [
      'Outcome-based: "I want to run a marathon"',
      'Identity-based: "I am a runner" — then act accordingly',
      'Each habit is a vote cast for your desired identity',
      'Small behaviors compound into unshakeable self-belief',
    ],
    quote: "Every action you take is a vote for the type of person you wish to become.",
    readTime: 4,
  },
  {
    id: 'ah-systems',
    type: 'insight',
    book: 'Atomic Habits',
    author: 'James Clear',
    category: 'habits',
    emoji: '⚙️',
    title: 'Goals vs Systems',
    summary: "Winners and losers often share the same goals. The difference is their systems. A goal is a desired outcome. A system is the process that leads to it. If you fix your systems, the results take care of themselves. Goals are good for setting direction, but systems are what actually move you forward. Fall in love with the process and the outcomes follow.",
    keyPoints: [
      'Goals are destinations; systems are vehicles',
      'You don\'t rise to your goals — you fall to your systems',
      'Build systems for your most important habits first',
      '1% better every day = 37x better in a year (compound growth)',
    ],
    quote: "You do not rise to the level of your goals. You fall to the level of your systems.",
    readTime: 3,
  },
  {
    id: 'ah-environment',
    type: 'insight',
    book: 'Atomic Habits',
    author: 'James Clear',
    category: 'habits',
    emoji: '🏗️',
    title: 'Environment is Everything',
    summary: "Discipline is overrated. Environment design is underrated. The most disciplined people aren't those who exercise willpower constantly — they're those who structure their environment so good choices require no willpower at all. Want to read more? Put the book on your pillow. Want to eat less junk? Don't keep it in the house. Your behaviors are shaped by the context that surrounds them.",
    keyPoints: [
      'Make good habits obvious and easy',
      'Make bad habits invisible and hard',
      'Design your environment for your future self, not your present self',
      'You don\'t need more willpower — you need better architecture',
    ],
    quote: "Environment is the invisible hand that shapes human behavior.",
    readTime: 3,
  },
  {
    id: 'ah-two-minutes',
    type: 'insight',
    book: 'Atomic Habits',
    author: 'James Clear',
    category: 'focus',
    emoji: '⏱️',
    title: 'The 2-Minute Rule',
    summary: "When you start a new habit, it should take less than two minutes to do. 'Read before bed' becomes 'Read one page.' 'Study for class' becomes 'Open my notes.' 'Run 5km' becomes 'Put on my running shoes.' The point isn't to do the tiny habit forever — it's to master the art of showing up. Once you're consistently showing up, you scale. But you cannot scale what you haven't started.",
    keyPoints: [
      'Shrink any new habit to under 2 minutes',
      'Showing up consistently beats doing a lot occasionally',
      'The habit must be established before it can be optimized',
      'Ritualize the beginning — the rest often follows naturally',
    ],
    quote: "Standardize before you optimize.",
    readTime: 2,
  },

  // ── MEDITATIONS ──────────────────────────────────────────
  {
    id: 'med-control',
    type: 'insight',
    book: 'Meditations',
    author: 'Marcus Aurelius',
    category: 'mindset',
    emoji: '⚖️',
    title: 'The Dichotomy of Control',
    summary: "Marcus Aurelius ruled the most powerful empire on earth, yet his private journal — Meditations — returns obsessively to one question: what is actually in my control? His answer, borrowed from Epictetus: almost nothing external. Your opinions, impulses, desires, aversions — these are yours. Everything else (reputation, body, wealth, outcomes) is not. The Stoics called this the fundamental distinction. When you waste energy on what you can't control, you are voluntarily enslaving yourself.",
    keyPoints: [
      'You control: thoughts, reactions, effort, values',
      'You don\'t control: outcomes, opinions of others, events',
      'Focus entirely on what\'s yours — release the rest without resentment',
      'This isn\'t resignation — it\'s radical concentration of energy',
    ],
    quote: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    readTime: 4,
  },
  {
    id: 'med-present',
    type: 'insight',
    book: 'Meditations',
    author: 'Marcus Aurelius',
    category: 'focus',
    emoji: '🎯',
    title: 'The Present Moment Always Will Have Been',
    summary: "Aurelius faced plagues, wars, betrayal, and the deaths of children — yet he trained himself to return, always, to this moment. Not the regretted past or the feared future, but what is actually in front of him. The past is locked — it cannot be changed, only learned from. The future is not yet real — it cannot be lived, only prepared for. Only this moment can be acted upon. This insight, practiced daily, is one of the most powerful antidotes to anxiety ever written.",
    keyPoints: [
      'The present is the only moment you can act in',
      'Ruminating on the past is borrowing suffering you already paid',
      'Anxiety about the future is paying interest on a debt you might never owe',
      'One action, now, is worth a thousand plans for later',
    ],
    quote: "Waste no more time arguing about what a good man should be. Be one.",
    readTime: 3,
  },

  // ── STORIES ──────────────────────────────────────────────
  {
    id: 'story-goggins-ultramarathon',
    type: 'story',
    title: 'The Man Who Ran 100 Miles on a Broken Leg',
    subject: 'David Goggins',
    category: 'resilience',
    emoji: '🏃',
    summary: `In 2005, David Goggins had never run more than a mile in his life. He signed up for the Badwater 135 — a 135-mile ultramarathon through Death Valley, considered one of the most brutal endurance races on earth — with zero preparation and three weeks' notice.

He didn't finish. His feet blistered so badly that shoes wouldn't fit — he ran in socks. His kidneys began to fail. He developed stress fractures in both legs. At mile 70, a doctor pulled him from the race.

He came back the next year and finished. Then he ran it again. And again.

But the story isn't about the race. It's about what he discovered: that suffering, when you choose it voluntarily, becomes a teacher. That the person you become in the process of attempting something enormous is worth more than the medal at the end.

Goggins went on to break the world record for pull-ups (4,030 in 17 hours), complete Navy SEAL training three times, and run dozens of ultras — all while working full-time. He did it not because he was talented, but because he refused to let his mind's excuses be the final word.`,
    lesson: "You are capable of 10x more than your mind claims. The ceiling is a lie.",
    readTime: 5,
  },
  {
    id: 'story-aurelius-emperor',
    type: 'story',
    title: 'The Emperor Who Journaled Instead of Celebrating',
    subject: 'Marcus Aurelius',
    category: 'mindset',
    emoji: '👑',
    summary: `Marcus Aurelius was the most powerful man on earth — Emperor of Rome at the height of its power. He had absolute authority over millions of people, endless wealth, and an army of hundreds of thousands.

He spent his evenings writing a private journal that he never intended for anyone to read. It was a record of his failures, his anxieties, his self-corrections. He wrote to himself: "You could leave life right now. Let that determine what you do, say and think."

He dealt with plagues that killed millions, near-constant warfare on the borders, a co-emperor who betrayed him, and the deaths of several of his children. By every measure, his life was hard — despite his privilege.

What's remarkable isn't that he survived it. It's that he grew through it without bitterness or grandiosity. His Meditations, written as private self-reminders, became one of the most widely read philosophy texts in history — 2,000 years later.

He had everything the world offers and still spent his nights reminding himself to be humble, present, and useful. Power didn't corrupt him because he had built a mind that power couldn't reach.`,
    lesson: "Character is built in private. Who you are when no one is watching is who you actually are.",
    readTime: 5,
  },
  {
    id: 'story-clear-habits',
    type: 'story',
    title: 'The British Cycling Team That Changed Everything',
    subject: 'Dave Brailsford & British Cycling',
    category: 'habits',
    emoji: '🚴',
    summary: `In 2003, British Cycling hired a new performance director named Dave Brailsford. The team had won exactly one Olympic gold medal in 76 years of competition.

Brailsford introduced a concept he called "the aggregation of marginal gains." The idea: search for a 1% improvement in everything you do. Everything.

They redesigned the bike seats for comfort. They tested which massage gel led to fastest muscle recovery. They figured out the most effective type of pillow for sleep. They taught riders to wash their hands properly to avoid illness. They painted the inside of the team truck white so they could spot dust particles that might interfere with the bikes.

Each improvement was tiny. Combined, they were transformative.

Within five years, British Cycling dominated the Olympics, winning 60% of all cycling gold medals. They went on to win the Tour de France — a race they had never previously come close to winning — five times in six years.

No single change caused this. Every change contributed. The math of marginal gains: 1.01^365 = 37.78. A 1% daily improvement compounds to 37x better in a year.`,
    lesson: "Don't seek a breakthrough. Seek 1% better, every day, in every area. The math will astonish you.",
    readTime: 4,
  },
  {
    id: 'story-jocko-extreme-ownership',
    type: 'story',
    title: 'The Night Jocko\'s Team Shot Each Other',
    subject: 'Jocko Willink',
    category: 'discipline',
    emoji: '🎖️',
    summary: `Jocko Willink commanded SEAL Team Three's Task Unit Bruiser in Ramadi, Iraq — some of the most intense urban combat of the war. One night, his units became confused in the dark and opened fire on each other. Miraculously, only one man was seriously wounded.

At the debrief, everyone had explanations. The other unit moved without communicating. The map had errors. The radio channels were wrong. Every explanation was true. And Jocko, the commanding officer, accepted none of them as sufficient.

He stood up and said: "This is my fault. I am responsible for everything this task unit does or fails to do. I failed to ensure the communication plan was clear. I failed to confirm each unit understood the plan. This is on me."

The room went silent. Then the other officers, one by one, began doing the same — owning their piece of the failure.

The concept became the core of Jocko's leadership philosophy and later his bestselling book: Extreme Ownership. There are no bad teams. There are only bad leaders. Everything — everything — is the leader's responsibility.

Applied to your own life: you are the leader of yourself. There are no excuses. There is only ownership.`,
    lesson: "Stop explaining why things went wrong. Own it fully. Ownership is the only path to change.",
    readTime: 5,
  },
];

// ── CATEGORY METADATA ──────────────────────────────────────
export const CATEGORY_META: Record<ReadingCategory, { label: string; color: string; bg: string; emoji: string }> = {
  mindset:    { label: 'Mindset',    color: 'text-purple-400',  bg: 'bg-purple-500/10',  emoji: '🧠' },
  habits:     { label: 'Habits',     color: 'text-green-400',   bg: 'bg-green-500/10',   emoji: '⚙️' },
  discipline: { label: 'Discipline', color: 'text-amber-400',   bg: 'bg-amber-500/10',   emoji: '🔥' },
  resilience: { label: 'Resilience', color: 'text-red-400',     bg: 'bg-red-500/10',     emoji: '⚡' },
  focus:      { label: 'Focus',      color: 'text-blue-400',    bg: 'bg-blue-500/10',    emoji: '🎯' },
};
