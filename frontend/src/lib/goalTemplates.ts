import type { GoalType } from '@/types';

export type GoalTemplate = {
  id: string;
  name: string;
  type: GoalType;
  description: string;
  suggestedTargetDays: number;
  dailyTarget?: number;
  tags: string[];
};

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'leadership-1on1',
    name: 'Run Better 1:1s',
    type: 'habit',
    description: 'Build a simple weekly 1:1 system: agenda, notes, and follow‑ups.',
    suggestedTargetDays: 30,
    dailyTarget: 1,
    tags: ['Leadership', 'Management', 'Communication'],
  },
  {
    id: 'public-speaking',
    name: 'Improve Public Speaking',
    type: 'learn',
    description: 'Get confident delivering clear, structured talks with practice and feedback.',
    suggestedTargetDays: 45,
    dailyTarget: 2,
    tags: ['Communication', 'Confidence'],
  },
  {
    id: 'learn-excel',
    name: 'Excel Mastery (Practical)',
    type: 'learn',
    description: 'Go from basics to dashboards: formulas, pivots, and clean reporting.',
    suggestedTargetDays: 60,
    dailyTarget: 2,
    tags: ['Business', 'Analytics'],
  },
  {
    id: 'fitness-walk',
    name: 'Daily Walk Habit',
    type: 'fitness',
    description: 'Build a consistent baseline: walk every day and track completion.',
    suggestedTargetDays: 30,
    dailyTarget: 1,
    tags: ['Health', 'Consistency'],
  },
  {
    id: 'learn-python',
    name: 'Learn Python (Beginner → Useful)',
    type: 'learn',
    description: 'Learn Python enough to automate small tasks and build simple tools.',
    suggestedTargetDays: 75,
    dailyTarget: 2,
    tags: ['Tech', 'Automation'],
  },
];

