/**
 * Encouraging messages shown on page reload.
 * Condition: "always" | "morning" | "afternoon" | "evening" | "streak-high"
 */

export interface ReloadMessage {
  text: string;
  condition: 'always' | 'morning' | 'afternoon' | 'evening' | 'streak-high';
}

export const RELOAD_MESSAGES: ReloadMessage[] = [
  { text: 'Looking good! Keep going.', condition: 'always' },
  { text: 'Hydrate yourself!', condition: 'afternoon' },
  { text: "You're on fire!", condition: 'streak-high' },
  { text: 'Every session counts.', condition: 'always' },
  { text: 'Consistency over ambition.', condition: 'always' },
  { text: 'One step at a time.', condition: 'always' },
  { text: 'Good morning! Time to build.', condition: 'morning' },
  { text: 'Afternoon focus mode.', condition: 'afternoon' },
  { text: 'Evening grind — you got this.', condition: 'evening' },
  { text: 'Streak alive. Keep it going.', condition: 'streak-high' },
];

const DISMISS_KEY = 'forge-reload-message-dismissed';
const DISMISS_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

export function getReloadMessage(streak: number): string | null {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (dismissed) {
    const ts = parseInt(dismissed, 10);
    if (Date.now() - ts < DISMISS_COOLDOWN_MS) return null;
  }

  const hour = new Date().getHours();
  let period: 'morning' | 'afternoon' | 'evening' = 'morning';
  if (hour >= 12 && hour < 17) period = 'afternoon';
  else if (hour >= 17) period = 'evening';

  const streakHigh = streak >= 3;
  const eligible = RELOAD_MESSAGES.filter((m) => {
    if (m.condition === 'always') return true;
    if (m.condition === 'streak-high' && streakHigh) return true;
    if (m.condition === period) return true;
    return false;
  });

  if (eligible.length === 0) return null;
  const msg = eligible[Math.floor(Math.random() * eligible.length)];
  return msg.text;
}

export function dismissReloadMessage(): void {
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}
