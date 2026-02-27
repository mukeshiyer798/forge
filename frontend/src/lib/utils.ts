import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Goal } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getDaysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

/** "Due Mar 30" for goal cards */
export function formatDueDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/**
 * Progress % for full-structure goals:
 * total = all subtopics + one per topic build + capstone (1)
 * completed = completed subtopics + completed builds + capstone.completed
 */
export function calcGoalProgress(goal: Goal): number {
  const topics = goal.topics;
  const capstone = goal.capstone;
  if (topics?.length) {
    let total = 0;
    let completed = 0;
    for (const t of topics) {
      if (t.completed) {
        // If topic is marked complete, count all its constituents as done
        const subCount = t.subtopics?.length || 0;
        const buildCount = t.build ? 1 : 0;
        total += subCount + buildCount;
        completed += subCount + buildCount;

        // Ensure even empty topics count for something
        if (subCount === 0 && buildCount === 0) {
          total += 1;
          completed += 1;
        }
      } else {
        total += t.subtopics.length;
        completed += t.subtopics.filter((s) => s.completed).length;
        if (t.build) {
          total += 1;
          if (t.build.completed) completed += 1;
        }
        // Ensure even uncompleted empty topics count in the total
        if (t.subtopics.length === 0 && !t.build) {
          total += 1;
        }
      }
    }
    if (capstone) {
      total += 1;
      if (capstone.completed) completed += 1;
    }
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  }
  // Legacy: flat subtopics only
  const st = goal.subtopics;
  if (!st.length) return 0;
  const done = st.filter((s) => s.completed).length;
  return Math.round((done / st.length) * 100);
}

export function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1; // Mon=0 ... Sun=6
}

export function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}
