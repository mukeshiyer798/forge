# 📚 FORGE Content Folder

This is where you add your own reading material, quotes, and insights.

## Files

### `quotes.ts` — Rotating Motivational Quotes
These appear in the hero banner on the dashboard, rotating every 30 seconds.

**To add a quote:**
```ts
{
  id: 'q-your-unique-id',
  text: 'The quote text here.',
  author: 'Author Name',
  source: 'Book Title or Context',   // optional
  category: 'mindset',               // mindset | habits | discipline | resilience | focus
}
```

---

### `readings.ts` — Book Insights & Stories
These appear in the **Reading** tab. Two formats supported:

**Book Insight:**
```ts
{
  id: 'unique-id',
  type: 'insight',
  book: 'Book Title',
  author: 'Author Name',
  category: 'mindset',    // mindset | habits | discipline | resilience | focus
  emoji: '📖',
  title: 'Insight Title',
  summary: 'One to two paragraph punchy summary of the insight.',
  keyPoints: [
    'Key takeaway 1',
    'Key takeaway 2',
    'Key takeaway 3',
  ],
  quote: 'A memorable direct quote from the book.',
  readTime: 3,   // estimated minutes to read
}
```

**Motivating Story:**
```ts
{
  id: 'unique-id',
  type: 'story',
  title: 'Story Title',
  subject: 'Person or Subject Name',
  category: 'resilience',
  emoji: '⚡',
  summary: `Full story text here. 
  
  You can use multiple paragraphs.
  
  Keep it punchy and motivating.`,
  lesson: 'The core lesson in one sentence.',
  readTime: 5,
}
```

---

## Categories

| Category | Use for |
|----------|---------|
| `mindset` | Mental frameworks, perspective shifts, philosophy |
| `habits` | Building systems, behavior design, routines |
| `discipline` | Doing hard things, consistency, commitment |
| `resilience` | Overcoming adversity, bouncing back, mental toughness |
| `focus` | Deep work, attention, eliminating distraction |

---

## Adding Content from Books

Great sources to pull from:
- **Can't Hurt Me** — David Goggins
- **Never Finished** — David Goggins  
- **Atomic Habits** — James Clear
- **Meditations** — Marcus Aurelius
- **Extreme Ownership** — Jocko Willink
- **The Obstacle Is The Way** — Ryan Holiday
- **Deep Work** — Cal Newport
- **Discipline Equals Freedom** — Jocko Willink
- **The Daily Stoic** — Ryan Holiday
- **Man's Search for Meaning** — Viktor Frankl

Just summarize the insight in your own words (don't copy full passages) and add a representative quote.
