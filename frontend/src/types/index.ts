export type GoalType = 'learn' | 'build' | 'habit' | 'fitness';
export type GoalStatus = 'on-track' | 'at-risk' | 'behind';

export interface SubTopic {
  id: string;
  name: string;
  completed: boolean;
}

/** Resource inside a topic (book, docs, video, blog, youtube — all free) */
export interface GoalResource {
  id: string;
  title: string;
  detail?: string;
  type: 'book' | 'course' | 'docs' | 'video' | 'article' | 'blog' | 'youtube';
  url?: string | null;
}

/** Build project inside a topic */
export interface GoalBuild {
  name: string;
  description?: string;
  doneWhen?: string;
  estimatedHours?: number;
  completed: boolean;
}

/** Topic with resources, build, subtopics (full card structure) */
export interface GoalTopic {
  id: string;
  name: string;
  description?: string;
  taskNumber: number;
  completed: boolean;
  resources: GoalResource[];
  build: GoalBuild;
  subtopics: SubTopic[];
  activeRecallQuestion?: string;
  activeRecallAnswer?: string;
  /** Multiple interview prep questions with hidden answers */
  interviewPrep?: Array<{ question: string; answer: string }>;
}

/** Capstone at bottom of goal card */
export interface GoalCapstone {
  name: string;
  description?: string;
  portfolioPitch?: string;
  doneWhen?: string;
  estimatedHours?: number;
  completed: boolean;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  description: string;
  /** Legacy flat list; used when topics/capstone are absent */
  subtopics: SubTopic[];
  /** Legacy flat list of resource titles */
  resources: string[];
  progress: number;
  targetDate: string;
  status: GoalStatus;
  createdAt: string;
  lastLoggedAt: string;
  /** Priority badge e.g. "PRIORITY 1" (optional) */
  priority?: number;
  /** Full structure: one collapsible section per topic */
  topics?: GoalTopic[];
  /** Shown at bottom of card when present */
  capstone?: GoalCapstone;
  /** Daily task completion requirement */
  dailyTaskRequirement?: number;
  /** User ID who owns this goal */
  userId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  nudgePreference: 'daily' | 'weekly' | 'off';
  avatarInitial: string;
  greetingPreference?: string | null;
  statusMessage?: string | null;
}

export interface WeekDay {
  dayName: string;
  dayIndex: number;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface Quote {
  text: string;
  author: string;
  source: string;
}

export interface EmailNudge {
  level: 1 | 2 | 3;
  label: string;
  severity: 'info' | 'warning' | 'critical';
  subject: string;
  body: string;
}

/** Pomodoro session for focus/break tracking */
export interface PomodoroSession {
  id: string;
  goalId?: string;
  topicId?: string;
  duration: number; // in minutes (default 25)
  startTime: string;
  endTime?: string;
  completed: boolean;
  type: 'focus' | 'short-break' | 'long-break';
}
/** Spaced repetition item for review */
export interface SpacedRepetitionItem {
  id: string;
  goalId: string;
  topicId: string;
  topicName: string;
  activeRecallQuestion?: string;
  resources?: string;
  nextReviewAt: string;
  lastReviewedAt?: string;
}

export interface LearningTemplate {
  _instructions: string;
  learning_plan: {
    major_topic: string;
    goal_statement: string;
    target_completion: string;
    commitment_hours_per_week: number;
    sub_topics: Array<{
      name: string;
      description: string;
      estimated_hours: number;
      order: number;
      chapters_or_sections: string[];
      completed: boolean;
    }>;
    resources: Array<{
      type: string;
      title: string;
      author?: string;
      platform?: string;
      url: string | null;
      priority: string;
    }>;
    projects: Array<{
      name: string;
      description: string;
      topics_tested: string[];
      difficulty: string;
      estimated_hours: number;
      completed: boolean;
    }>;
    knowledge_tests: Array<{
      type: string;
      topic: string;
      description: string;
      completed: boolean;
    }>;
    milestones: Array<{
      week: number;
      checkpoint: string;
      completed: boolean;
    }>;
  };
}
