// ============================================================
// FORGE — CUSTOM QUOTES
// ============================================================
// Add your own quotes here following this format:
//
// {
//   id: 'unique-id',              // any unique string
//   text: 'The quote text.',      // the quote itself
//   author: 'Author Name',        // who said/wrote it
//   source: 'Book or context',    // optional: where it's from
//   category: 'mindset',         // mindset | habits | discipline | resilience | focus
// }
//
// These will automatically appear in the rotating hero quote
// and in the Reading section.
// ============================================================

export interface CustomQuote {
  id: string;
  text: string;
  author: string;
  source?: string;
  category: 'mindset' | 'habits' | 'discipline' | 'resilience' | 'focus';
}

export const CUSTOM_QUOTES: CustomQuote[] = [
  {
    id: 'q-goggins-1',
    text: "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.",
    author: 'David Goggins',
    source: "Can't Hurt Me",
    category: 'discipline',
  },
  {
    id: 'q-aurelius-1',
    text: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    author: 'Marcus Aurelius',
    source: 'Meditations',
    category: 'mindset',
  },
  {
    id: 'q-clear-1',
    text: "Every action you take is a vote for the type of person you wish to become.",
    author: 'James Clear',
    source: 'Atomic Habits',
    category: 'habits',
  },
  {
    id: 'q-aurelius-2',
    text: "The first rule is to keep an untroubled spirit. The second is to look things in the face and know them for what they are.",
    author: 'Marcus Aurelius',
    source: 'Meditations',
    category: 'mindset',
  },
  {
    id: 'q-aurelius-3',
    text: "Waste no more time arguing about what a good man should be. Be one.",
    author: 'Marcus Aurelius',
    source: 'Meditations',
    category: 'discipline',
  },
  {
    id: 'q-goggins-2',
    text: "Stop making excuses. Stop being a victim. Take personal responsibility. No one is coming to save you.",
    author: 'David Goggins',
    source: 'Never Finished',
    category: 'discipline',
  },
  {
    id: 'q-clear-2',
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: 'James Clear',
    source: 'Atomic Habits',
    category: 'habits',
  },
  {
    id: 'q-aurelius-4',
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: 'Marcus Aurelius',
    source: 'Meditations',
    category: 'resilience',
  },
  {
    id: 'q-clear-3',
    text: "Small habits don't add up. They compound. The difference a tiny improvement can make over time is astounding.",
    author: 'James Clear',
    source: 'Atomic Habits',
    category: 'habits',
  },
  {
    id: 'q-goggins-3',
    text: "The most important conversation you'll ever have is the one you have with yourself.",
    author: 'David Goggins',
    source: "Can't Hurt Me",
    category: 'mindset',
  },
  {
    id: 'q-aurelius-5',
    text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.",
    author: 'Marcus Aurelius',
    source: 'Meditations',
    category: 'mindset',
  },
  {
    id: 'q-jocko-1',
    text: "Discipline equals freedom.",
    author: 'Jocko Willink',
    source: 'Discipline Equals Freedom',
    category: 'discipline',
  },
  {
    id: 'q-seneca-1',
    text: "It is not that I am brave, it is just that I am busy.",
    author: 'Seneca',
    source: 'Letters from a Stoic',
    category: 'focus',
  },
  {
    id: 'q-ferriss-1',
    text: "A person's success in life can usually be measured by the number of uncomfortable conversations he or she is willing to have.",
    author: 'Tim Ferriss',
    source: 'The 4-Hour Workweek',
    category: 'resilience',
  },
];
