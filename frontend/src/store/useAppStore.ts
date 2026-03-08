import { create } from 'zustand';
import { createLogger } from '@/lib/logger';

const log = createLogger('Store');
import { persist } from 'zustand/middleware';
import type { User, Goal, GoalStatus, GoalType, PomodoroSession, SubTopic, GoalTopic, GoalCapstone, AIInsight } from '@/types';
import { generateId, getTodayIndex, calcGoalProgress } from '@/lib/utils';
import { clearAccessToken } from '@/lib/auth';
import {
  fetchGoals,
  createGoalApi,
  updateGoalApi,
  deleteGoalApi,
  createPomodoroSessionApi,
  fetchPomodoroSessions,
  updatePomodoroSessionApi,
  fetchReadingInsights,
  createReadingInsightApi,
  deleteReadingInsightApi,
  togglePauseGoalApi,
  fetchActivePomodoroSessionApi,
  type GoalPublicBackend,
} from '@/lib/api';

export type ViewId = 'dashboard' | 'goals' | 'reading' | 'executive' | 'settings';

export function mapBackendUserToUser(backend: {
  id: string;
  email: string;
  full_name: string | null;
  nudge_preference?: string;
  greeting_preference?: string | null;
  status_message?: string | null;
  has_openrouter_key?: boolean;
  email_frequency?: 'daily' | 'every_3_days' | 'weekly' | null;
  email_morning_time?: string | null;
  timezone?: string | null;
  intelligence_keywords?: string | null;
}): User {
  const name = backend.full_name || backend.email.split('@')[0] || 'User';
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  const nudge = (backend.nudge_preference || 'daily') as User['nudgePreference'];
  return {
    id: String(backend.id),
    name: displayName,
    email: backend.email,
    nudgePreference: nudge === 'daily' || nudge === 'weekly' || nudge === 'off' ? nudge : 'daily',
    avatarInitial: displayName.charAt(0).toUpperCase(),
    greetingPreference: backend.greeting_preference ?? null,
    statusMessage: backend.status_message ?? null,
    hasOpenrouterKey: backend.has_openrouter_key ?? false,
    intelligenceKeywords: backend.intelligence_keywords ?? null,
    emailFrequency: backend.email_frequency || 'daily',
    emailMorningTime: backend.email_morning_time ?? null,
    timezone: backend.timezone ?? null,
  };
}

/** Convert a backend GoalPublicBackend to our frontend Goal type */
function mapBackendGoalToGoal(bg: GoalPublicBackend): Goal {
  let subtopics: SubTopic[] = [];
  let resources: string[] = [];
  let topics: GoalTopic[] | undefined;
  let capstone: GoalCapstone | undefined;

  try { subtopics = bg.subtopics ? JSON.parse(bg.subtopics) : []; } catch { subtopics = []; }
  try { resources = bg.resources ? JSON.parse(bg.resources) : []; } catch { resources = []; }
  try { topics = bg.topics ? JSON.parse(bg.topics) : undefined; } catch { topics = undefined; }
  try { capstone = bg.capstone ? JSON.parse(bg.capstone) : undefined; } catch { capstone = undefined; }

  return {
    id: bg.id,
    name: bg.name,
    type: (bg.type || 'learn') as GoalType,
    description: bg.description || '',
    subtopics: Array.isArray(subtopics) ? subtopics : [],
    resources: Array.isArray(resources) ? resources : [],
    progress: bg.progress || 0,
    targetDate: bg.target_date || '',
    status: (bg.status || 'on-track') as GoalStatus,
    createdAt: bg.created_at?.split('T')[0] || '',
    lastLoggedAt: bg.last_logged_at?.split('T')[0] || '',
    priority: bg.priority ?? undefined,
    topics: topics && Array.isArray(topics) && topics.length > 0 ? topics : undefined,
    capstone,
    dailyTaskRequirement: bg.daily_task_requirement ?? undefined,
    userId: bg.owner_id,
  };
}

/** Convert frontend Goal to backend create/update payload */
function goalToBackendPayload(goal: Omit<Goal, 'id' | 'createdAt' | 'lastLoggedAt' | 'progress'> & { progress?: number; futureLook?: string }) {
  return {
    name: goal.name,
    type: goal.type,
    description: goal.description || goal.name,
    target_date: goal.targetDate || undefined,
    status: goal.status || 'on-track',
    priority: goal.priority ?? undefined,
    daily_task_requirement: goal.dailyTaskRequirement ?? undefined,
    progress: goal.progress ?? 0,
    subtopics: goal.subtopics?.length ? JSON.stringify(goal.subtopics) : undefined,
    resources: goal.resources?.length ? JSON.stringify(goal.resources) : undefined,
    topics: goal.topics?.length ? JSON.stringify(goal.topics) : undefined,
    capstone: goal.capstone ? JSON.stringify(goal.capstone) : undefined,
    future_look: goal.futureLook ?? undefined,
  };
}

interface WeekData {
  days: boolean[]; // 7 days Mon-Sun
  weekStart: string; // ISO date of Monday
}

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;

  // Goals
  goals: Goal[];
  goalsLoaded: boolean;
  goalsPage: number;
  goalsTotalCount: number;

  // Streak
  streak: number;
  weekData: WeekData;

  // Pomodoro
  pomodoroSessions: PomodoroSession[];
  activePomodoro: PomodoroSession | null;

  // UI
  activeView: ViewId;
  mobileNavOpen: boolean;
  celebrateVisible: boolean;
  nudgeDismissed: boolean;
  showReflection: boolean;
  streakEvent: 'increase' | 'reset' | 'start' | null;
  setStreakEvent: (e: 'increase' | 'reset' | 'start' | null) => void;

  // Actions
  login: (user: User) => void;
  logout: () => void;
  signup: (name: string, email: string, nudge: User['nudgePreference']) => void;
  updateUser: (user: User) => void;

  // Goal actions (sync to backend)
  fetchGoalsFromBackend: (page?: number) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'lastLoggedAt' | 'progress'>) => void;
  addGoals: (goals: Omit<Goal, 'id' | 'createdAt' | 'lastLoggedAt' | 'progress'>[]) => void;
  updateGoalProgress: (goalId: string, progress: number) => void;
  toggleSubtopic: (goalId: string, subtopicId: string) => void;
  toggleTopicSubtopic: (goalId: string, topicId: string, subtopicId: string) => void;
  toggleTopicBuild: (goalId: string, topicId: string) => void;
  toggleCapstoneCompleted: (goalId: string) => void;
  toggleTopicCompleted: (goalId: string, topicId: string) => void;
  addTopicsToGoal: (goalId: string, topics: GoalTopic[]) => void;
  addSubtopicToTopic: (goalId: string, topicId: string, name: string) => void;
  updateSubtopicName: (goalId: string, topicId: string, subtopicId: string, name: string) => void;
  addResourceToTopic: (goalId: string, topicId: string, title: string, type: 'video' | 'docs' | 'blog' | 'youtube') => void;
  updateResourceTitle: (goalId: string, topicId: string, resourceId: string, title: string) => void;
  updateTopicName: (goalId: string, topicId: string, name: string) => void;
  updateTopicDescription: (goalId: string, topicId: string, description: string) => void;
  deleteTopic: (goalId: string, topicId: string) => void;
  deleteGoal: (goalId: string) => void;
  togglePauseGoal: (goalId: string) => void;

  // Reading
  readingInsights: AIInsight[];
  fetchReadingInsightsFromBackend: () => Promise<void>;
  addReadingInsight: (insight: Omit<AIInsight, 'id'>) => void;
  deleteReadingInsight: (id: string) => void;
  fetchActivePomodoroFromBackend: () => Promise<void>;

  toggleDay: (dayIndex: number) => void;
  resetStreak: () => void;
  checkDailyTaskCompletion: () => { met: boolean; completed: number; required: number };
  markDayCompleteFromTasks: () => void;

  setActiveView: (view: ViewId) => void;
  setMobileNavOpen: (val: boolean) => void;
  setCelebrate: (val: boolean) => void;
  setShowReflection: (val: boolean) => void;
  dismissNudge: () => void;
  logProgressNudge: () => void;
  validateStreak: () => void;

  startPomodoro: (opts?: { goalId?: string; topicId?: string; duration?: number }) => void;
  pausePomodoro: () => void;
  completePomodoro: () => void;
  cancelPomodoro: () => void;
}

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

const GOALS_PER_PAGE = 20;

const INITIAL_WEEK_DATA: WeekData = {
  days: [false, false, false, false, false, false, false],
  weekStart: getCurrentWeekStart(),
};

/** Sync a goal update to the backend (fire-and-forget, log errors) */
async function syncGoalToBackend(goal: Goal): Promise<void> {
  try {
    const payload: Record<string, unknown> = {
      name: goal.name,
      type: goal.type,
      description: goal.description,
      target_date: goal.targetDate,
      status: goal.status,
      priority: goal.priority ?? null,
      daily_task_requirement: goal.dailyTaskRequirement ?? null,
      progress: goal.progress,
      subtopics: goal.subtopics?.length ? JSON.stringify(goal.subtopics) : null,
      resources: goal.resources?.length ? JSON.stringify(goal.resources) : null,
      topics: goal.topics?.length ? JSON.stringify(goal.topics) : null,
      capstone: goal.capstone ? JSON.stringify(goal.capstone) : null,
      future_look: (goal as unknown as Record<string, unknown>).futureLook ?? null,
    };
    log.debug('goal.sync.started', { goalId: goal.id, fields: Object.keys(payload) });
    await updateGoalApi(goal.id, payload);
    log.info('goal.sync.success', { goalId: goal.id });
  } catch (err) {
    log.error('goal.sync.failed', { goalId: goal.id }, err);
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      // CRITICAL FIX: Start with empty goals, not DEMO_GOALS.
      // Goals are fetched from the backend after login.
      goals: [],
      goalsLoaded: false,
      goalsPage: 0,
      goalsTotalCount: 0,
      readingInsights: [],
      streak: 0,
      weekData: { ...INITIAL_WEEK_DATA },
      pomodoroSessions: [],
      activePomodoro: null,
      activeView: 'dashboard' as ViewId,
      mobileNavOpen: false,
      celebrateVisible: false,
      nudgeDismissed: false,
      showReflection: false,
      streakEvent: null,
      setStreakEvent: (e: 'increase' | 'reset' | 'start' | null) => set({ streakEvent: e }),

      // CRITICAL FIX: Login clears all previous user-specific state
      // before setting the new user. This prevents RBAC leaks where
      // a new user would see the old user's persisted goals.
      login: (user) => {
        // PRODUCTION-GRADE: Only wipe localStorage if a DIFFERENT user is logging in
        // This prevents the persist middleware from overwriting freshly-fetched goals
        const prevUserId = get().user?.id;
        if (prevUserId && prevUserId !== user.id) {
          try { localStorage.removeItem('forge-storage'); } catch { /* ignore */ }
          log.info('auth.user_switch_clear', { prevUserId, newUserId: user.id });
        }
        log.info('auth.login_success', { userId: user.id });
        set({
          user,
          isAuthenticated: true,
          // Clear user-specific data — will be fetched from backend
          goals: [],
          goalsLoaded: false,
          goalsPage: 0,
          goalsTotalCount: 0,
          readingInsights: [],
          streak: 0,
          weekData: { ...INITIAL_WEEK_DATA, weekStart: getCurrentWeekStart() },
          pomodoroSessions: [],
          nudgeDismissed: false,
          celebrateVisible: false,
        });
      },

      updateUser: (user) => set({ user }),

      // CRITICAL FIX: Logout clears ALL user-specific state
      logout: () => {
        clearAccessToken();
        // PRODUCTION-GRADE: Wipe localStorage to prevent data leaks
        try { localStorage.removeItem('forge-storage'); } catch { /* ignore */ }
        log.info('auth.logout');
        set({
          user: null,
          isAuthenticated: false,
          goals: [],
          goalsLoaded: false,
          goalsPage: 0,
          goalsTotalCount: 0,
          readingInsights: [],
          streak: 0,
          weekData: { ...INITIAL_WEEK_DATA, weekStart: getCurrentWeekStart() },
          pomodoroSessions: [],
          activePomodoro: null,
          nudgeDismissed: false,
          celebrateVisible: false,
          activeView: 'dashboard',
        });
      },

      signup: (name, email, nudge) => {
        const user: User = {
          id: generateId(),
          name,
          email,
          nudgePreference: nudge,
          avatarInitial: name.charAt(0).toUpperCase(),
        };
        set({
          user,
          isAuthenticated: true,
          goals: [],
          goalsLoaded: false,
          goalsPage: 0,
          goalsTotalCount: 0,
          readingInsights: [],
          streak: 0,
          weekData: { ...INITIAL_WEEK_DATA, weekStart: getCurrentWeekStart() },
          pomodoroSessions: [],
          activePomodoro: null,
        });
      },

      // Fetch goals from backend (RBAC scoped — API only returns current user's goals)
      fetchGoalsFromBackend: async (page = 0) => {
        try {
          const skip = page * GOALS_PER_PAGE;
          log.debug('goals.fetch.started', { page, skip });
          const res = await fetchGoals(skip, GOALS_PER_PAGE);
          const mapped = res.data.map(mapBackendGoalToGoal);
          log.info('goals.fetch.success', { count: mapped.length, total: res.count });
          if (page === 0) {
            set({ goals: mapped, goalsLoaded: true, goalsPage: 0, goalsTotalCount: res.count });
          } else {
            set((state) => ({
              goals: [...state.goals, ...mapped],
              goalsPage: page,
              goalsTotalCount: res.count,
            }));
          }
        } catch (err) {
          log.error('goals.fetch.failed', { page }, err);
          set({ goalsLoaded: true }); // Mark as loaded even on error
        }

        // Also fetch pomodoro sessions from backend
        try {
          const pomRes = await fetchPomodoroSessions(0, 500);
          const mapped: PomodoroSession[] = pomRes.data.map((s) => ({
            id: s.id,
            goalId: s.goal_id ?? undefined,
            topicId: s.topic_id ?? undefined,
            duration: s.duration,
            startTime: s.start_time ?? new Date().toISOString(),
            endTime: s.end_time ?? undefined,
            completed: s.completed,
            type: (s.session_type === 'focus' ? 'focus' : s.session_type === 'short-break' ? 'short-break' : 'long-break') as 'focus' | 'short-break' | 'long-break',
          }));
          set({ pomodoroSessions: mapped });
        } catch (err) {
          console.error('Failed to fetch pomodoro sessions:', err);
        }
      },

      // Reading Insights
      fetchReadingInsightsFromBackend: async () => {
        try {
          const res = await fetchReadingInsights(0, 50);
          const mapped: AIInsight[] = res.data.map(item => ({
            id: item.id,
            title: item.title,
            source: 'Unknown',
            category: 'tech',
            type: 'skill_insight',
            summary: item.content_summary ?? '',
            keyTakeaway: item.key_takeaways ? JSON.parse(item.key_takeaways)[0] ?? '' : '',
            actionItem: item.actionable_advice ? JSON.parse(item.actionable_advice)[0] ?? '' : '',
            relevantGoal: 'general',
            url: item.url,
            freshness: 'recent',
            hook: item.hook ?? undefined,
            before: item.before ?? undefined,
            after: item.after ?? undefined,
            whyItMatters: item.why_it_matters ?? undefined,
          }));
          console.debug('[FORGE] Fetched reading insights from backend:', mapped.length);
          set({ readingInsights: mapped });
        } catch (err) {
          console.error('Failed to fetch reading insights from backend:', err);
        }
      },

      addReadingInsight: (insightData) => {
        const tempId = generateId();
        const insight: AIInsight = { ...insightData, id: tempId };
        set((state) => ({ readingInsights: [insight, ...state.readingInsights] }));

        createReadingInsightApi({
          title: insight.title,
          url: insight.url || '',
          content_summary: insight.summary,
          key_takeaways: JSON.stringify([insight.keyTakeaway]),
          actionable_advice: JSON.stringify([insight.actionItem]),
          hook: insight.hook,
          before: insight.before,
          after: insight.after,
          why_it_matters: insight.whyItMatters,
        })
          .then((backendInsight) => {
            set((state) => ({
              readingInsights: state.readingInsights.map((i) =>
                i.id === tempId ? { ...i, id: backendInsight.id } : i
              ),
            }));
          })
          .catch((err) => {
            console.error('Failed to create reading insight on backend:', err);
          });
      },

      deleteReadingInsight: (id) => {
        // Optimistic delete
        set((state) => ({
          readingInsights: state.readingInsights.filter(i => i.id !== id),
        }));
        deleteReadingInsightApi(id).catch(err => {
          console.error('Failed to delete reading insight on backend:', err);
        });
      },

      addGoal: (goalData) => {
        const temp: Goal = {
          ...goalData,
          id: '',
          progress: 0,
          createdAt: '',
          lastLoggedAt: '',
        };
        const progress = calcGoalProgress(temp);
        const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
        const today = new Date().toISOString().split('T')[0];

        // Create locally with a temporary ID
        const tempId = generateId();
        const goal: Goal = {
          ...goalData,
          id: tempId,
          progress,
          status,
          createdAt: today,
          lastLoggedAt: today,
        };
        set((state) => ({ goals: [goal, ...state.goals] }));

        // Sync to backend
        const payload = goalToBackendPayload({ ...goalData, progress });
        createGoalApi(payload)
          .then((backendGoal) => {
            // Replace temp ID with real backend ID
            set((state) => ({
              goals: state.goals.map((g) =>
                g.id === tempId ? mapBackendGoalToGoal(backendGoal) : g
              ),
            }));
          })
          .catch((err: any) => {
            console.error('Failed to create goal on backend:', err);
            // Rollback optimistic update
            set((state) => ({
              goals: state.goals.filter((g) => g.id !== tempId),
            }));
            const detail = err?.detail || 'Failed to create goal';
            // Alert user so they aren't confused
            alert(typeof detail === 'string' ? detail : JSON.stringify(detail));
          });
      },

      addGoals: (goalsData) => {
        const today = new Date().toISOString().split('T')[0];
        const tempGoals: { goal: Goal; tempId: string; data: Omit<Goal, 'id' | 'createdAt' | 'lastLoggedAt' | 'progress'> }[] = [];

        for (const goalData of goalsData) {
          const temp: Goal = {
            ...goalData,
            id: '',
            progress: 0,
            createdAt: '',
            lastLoggedAt: '',
          };
          const progress = calcGoalProgress(temp);
          const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
          const tempId = generateId();
          tempGoals.push({
            goal: { ...goalData, id: tempId, progress, status, createdAt: today, lastLoggedAt: today },
            tempId,
            data: goalData,
          });
        }

        set((state) => ({
          goals: [...tempGoals.map((t) => t.goal), ...state.goals],
        }));

        // Sync each to backend
        for (const { tempId, goal } of tempGoals) {
          const payload = goalToBackendPayload({ ...goal, progress: goal.progress });
          createGoalApi(payload)
            .then((backendGoal) => {
              set((state) => ({
                goals: state.goals.map((g) =>
                  g.id === tempId ? mapBackendGoalToGoal(backendGoal) : g
                ),
              }));
            })
            .catch((err: any) => {
              console.error('Failed to sync goal:', err);
              // Rollback optimistic update for this goal
              set((state) => ({
                goals: state.goals.filter((g) => g.id !== tempId),
              }));
              const detail = err?.detail || 'Failed to sync goal';
              alert(typeof detail === 'string' ? detail : JSON.stringify(detail));
            });
        }
      },

      updateGoalProgress: (goalId, progress) => {
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? {
                ...g,
                progress,
                lastLoggedAt: new Date().toISOString().split('T')[0],
                status: (progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind') as GoalStatus,
              }
              : g
          ),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      toggleSubtopic: (goalId, subtopicId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            const subtopics = g.subtopics.map((s) =>
              s.id === subtopicId
                ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined }
                : s
            );
            const progress = Math.round((subtopics.filter((s) => s.completed).length / subtopics.length) * 100);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...g, subtopics, progress, status, lastLoggedAt: new Date().toISOString().split('T')[0] };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
        // Auto-update streak when daily target is met
        get().markDayCompleteFromTasks();
      },

      toggleTopicSubtopic: (goalId, topicId, subtopicId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) => {
              if (t.id !== topicId) return t;
              const subtopics = t.subtopics.map((s) =>
                s.id === subtopicId
                  ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined }
                  : s
              );
              return { ...t, subtopics };
            });
            const updated = { ...g, topics };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status, lastLoggedAt: new Date().toISOString().split('T')[0] };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
        // Auto-update streak when daily target is met
        get().markDayCompleteFromTasks();
      },

      toggleTopicBuild: (goalId, topicId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) =>
              t.id === topicId && t.build
                ? { ...t, build: { ...t.build, completed: !t.build.completed, completedAt: !t.build.completed ? new Date().toISOString() : undefined } }
                : t
            );
            const updated = { ...g, topics };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status, lastLoggedAt: new Date().toISOString().split('T')[0] };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
        get().markDayCompleteFromTasks();
      },

      toggleCapstoneCompleted: (goalId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.capstone) return g;
            const capstone = { ...g.capstone, completed: !g.capstone.completed };
            const updated = { ...g, capstone };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status, lastLoggedAt: new Date().toISOString().split('T')[0] };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      toggleTopicCompleted: (goalId, topicId) => {
        // Capture the topic state before toggling to determine if we're completing it
        const goalBefore = get().goals.find((g) => g.id === goalId);
        const topicBefore = goalBefore?.topics?.find((t) => t.id === topicId);
        const wasCompleted = topicBefore?.completed ?? false;

        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) =>
              t.id === topicId
                ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
                : t
            );
            const updated = { ...g, topics };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status, lastLoggedAt: new Date().toISOString().split('T')[0] };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
        get().markDayCompleteFromTasks();

        // Auto-create spaced repetition item when topic is NEWLY completed
        if (!wasCompleted && topicBefore) {
          import('@/lib/api').then(({ createSpacedRepetitionItem }) => {
            createSpacedRepetitionItem(
              goalId,
              topicId,
              topicBefore.name,
              topicBefore.activeRecallQuestion ?? null,
              topicBefore.resources?.map((r) => r.title).join(', ') ?? null
            ).catch((err) => console.warn('[FORGE] Failed to create spaced rep item:', err));
          });
        }
      },

      addTopicsToGoal: (goalId, newTopics) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            const existingTopics = g.topics || [];
            const topics = [...existingTopics, ...newTopics];
            const updated = { ...g, topics };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      addSubtopicToTopic: (goalId, topicId, name) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) => {
              if (t.id !== topicId) return t;
              const subtopics = [...(t.subtopics || []), { id: generateId(), name, completed: false }];
              return { ...t, subtopics };
            });
            const updated = { ...g, topics };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      addResourceToTopic: (goalId, topicId, title, type) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) => {
              if (t.id !== topicId) return t;
              const resources = [...(t.resources || []), { id: generateId(), title, type, url: 'https://' }];
              return { ...t, resources };
            });
            return { ...g, topics };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      updateSubtopicName: (goalId, topicId, subtopicId, name) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) => {
              if (t.id !== topicId) return t;
              const subtopics = t.subtopics.map((s) =>
                s.id === subtopicId ? { ...s, name } : s
              );
              return { ...t, subtopics };
            });
            return { ...g, topics };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      updateResourceTitle: (goalId, topicId, resourceId, title) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) => {
              if (t.id !== topicId) return t;
              const resources = t.resources?.map((r) =>
                r.id === resourceId ? { ...r, title } : r
              );
              return { ...t, resources };
            });
            return { ...g, topics };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      updateTopicName: (goalId, topicId, name) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) =>
              t.id === topicId ? { ...t, name } : t
            );
            return { ...g, topics };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      updateTopicDescription: (goalId, topicId, description) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.map((t) =>
              t.id === topicId ? { ...t, description } : t
            );
            return { ...g, topics };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      deleteTopic: (goalId, topicId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId || !g.topics) return g;
            const topics = g.topics.filter((t) => t.id !== topicId);
            const updated = { ...g, topics };
            const progress = calcGoalProgress(updated);
            const status: GoalStatus = progress >= 70 ? 'on-track' : progress >= 40 ? 'at-risk' : 'behind';
            return { ...updated, progress, status };
          }),
        }));
        const goal = get().goals.find((g) => g.id === goalId);
        if (goal) syncGoalToBackend(goal);
      },

      deleteGoal: (goalId) => {
        // Remove from local state immediately
        set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) }));
        // Sync deletion to backend
        deleteGoalApi(goalId).catch((err) => console.error('Failed to delete goal on backend:', err));
      },

      togglePauseGoal: (goalId) => {
        set((state) => ({
          goals: state.goals.map((g) => {
            if (g.id !== goalId) return g;
            return {
              ...g,
              status: g.status === 'paused' ? (g.progress >= 70 ? 'on-track' : g.progress >= 40 ? 'at-risk' : 'behind') : 'paused',
            };
          })
        }));
        togglePauseGoalApi(goalId).then((backendGoal) => {
          set((state) => ({
            goals: state.goals.map((g) => g.id === goalId ? mapBackendGoalToGoal(backendGoal) : g)
          }));
        }).catch(err => console.error('Failed to toggle pause:', err));
      },

      toggleDay: (dayIndex) => {
        const state = get();
        const newDays = [...state.weekData.days];
        newDays[dayIndex] = !newDays[dayIndex];
        const allDone = newDays.every(Boolean);
        const newStreak = newDays[dayIndex]
          ? state.streak + 1
          : Math.max(0, state.streak - 1);
        set({
          weekData: { ...state.weekData, days: newDays },
          streak: newStreak,
          celebrateVisible: allDone,
        });
      },

      resetStreak: () => {
        set({
          streak: 0,
          weekData: { days: [false, false, false, false, false, false, false], weekStart: getCurrentWeekStart() },
          streakEvent: 'reset'
        });
      },

      checkDailyTaskCompletion: () => {
        const state = get();
        let totalRequired = 0;
        let totalCompleted = 0;
        const todayStr = new Date().toISOString().split('T')[0];

        state.goals.forEach((goal) => {
          if (goal.dailyTaskRequirement) {
            totalRequired += goal.dailyTaskRequirement;
            let completedToday = 0;
            if (goal.topics) {
              goal.topics.forEach((topic) => {
                // Topic itself
                if (topic.completed && topic.completedAt?.startsWith(todayStr)) {
                  completedToday++;
                }
                // Subtopics
                (topic.subtopics || []).forEach((s) => {
                  if (s.completed && s.completedAt?.startsWith(todayStr)) {
                    completedToday++;
                  }
                });
                // Build
                if (topic.build?.completed && topic.build.completedAt?.startsWith(todayStr)) {
                  completedToday++;
                }
              });
            } else {
              // Legacy flat subtopics
              completedToday = goal.subtopics.filter(
                (s) => s.completed && s.completedAt?.startsWith(todayStr)
              ).length;
            }
            totalCompleted += Math.min(completedToday, goal.dailyTaskRequirement);
          }
        });

        return {
          met: totalRequired === 0 || totalCompleted >= totalRequired,
          completed: totalCompleted,
          required: totalRequired,
        };
      },

      markDayCompleteFromTasks: () => {
        const state = get();
        const completion = state.checkDailyTaskCompletion();
        if (completion.met) {
          const todayIdx = getTodayIndex();
          const newDays = [...state.weekData.days];
          if (!newDays[todayIdx]) {
            newDays[todayIdx] = true;
            const allDone = newDays.every(Boolean);
            const isStart = state.streak === 0;
            set({
              weekData: { ...state.weekData, days: newDays },
              streak: state.streak + 1,
              celebrateVisible: allDone,
              streakEvent: isStart ? 'start' : 'increase'
            });
          }
        }
      },

      setActiveView: (view) => set({ activeView: view, mobileNavOpen: false }),
      setMobileNavOpen: (val) => set({ mobileNavOpen: val }),
      setCelebrate: (val) => set({ celebrateVisible: val }),
      setShowReflection: (val) => set({ showReflection: val }),
      dismissNudge: () => set({ nudgeDismissed: true }),
      logProgressNudge: () => {
        const todayIdx = getTodayIndex();
        const state = get();
        const newDays = [...state.weekData.days];
        newDays[todayIdx] = true;
        set({
          nudgeDismissed: true,
          weekData: { ...state.weekData, days: newDays },
          streak: state.streak + 1,
          streakEvent: state.streak === 0 ? 'start' : 'increase'
        });
      },

      validateStreak: () => {
        const state = get();
        const todayIdx = getTodayIndex();
        const currentWeekStart = getCurrentWeekStart();

        set((s) => {
          const updates: Partial<AppState> = {};
          let currentDays = s.weekData.days;

          // 1. Weekly rollover
          if (s.weekData.weekStart !== currentWeekStart) {
            // If it's a new week, check if previous week was completed
            // If not, streak is lost.
            const lastWeekDone = s.weekData.days.every(Boolean);
            if (!lastWeekDone && s.streak > 0) {
              updates.streak = 0;
              updates.streakEvent = 'reset';
            }
            updates.weekData = {
              days: [false, false, false, false, false, false, false],
              weekStart: currentWeekStart
            };
            currentDays = updates.weekData.days;
          }

          // 2. Daily failure check WITHIN the current week
          // If any day before today in the current week is incomplete, streak is lost.
          let missedDay = false;
          for (let i = 0; i < todayIdx; i++) {
            if (!currentDays[i]) {
              missedDay = true;
              break;
            }
          }

          if (missedDay && s.streak > 0) {
            updates.streak = 0;
            updates.streakEvent = 'reset';
          }

          return updates;
        });
      },

      startPomodoro: (opts = {}) => {
        const state = get();
        if (state.activePomodoro) return;
        const duration = opts.duration ?? 25;
        const tempId = generateId();
        const session: PomodoroSession = {
          id: tempId,
          goalId: opts.goalId,
          topicId: opts.topicId,
          duration,
          startTime: new Date().toISOString(),
          completed: false,
          type: 'focus',
        };
        set({ activePomodoro: session });

        // Sync to backend (replace temp ID with backend ID)
        createPomodoroSessionApi({
          goal_id: opts.goalId || null,
          topic_id: opts.topicId || null,
          duration,
          session_type: 'focus',
        })
          .then((backendSession) => {
            const current = get().activePomodoro;
            if (current && current.id === tempId) {
              set({ activePomodoro: { ...current, id: backendSession.id } });
            }
          })
          .catch((err) => console.error('Failed to create pomodoro on backend:', err));
      },
      pausePomodoro: () => {
        const state = get();
        if (!state.activePomodoro) return;
        const endTime = new Date().toISOString();
        const completed: PomodoroSession = {
          ...state.activePomodoro,
          endTime,
          completed: true,
        };
        set({
          activePomodoro: null,
          pomodoroSessions: [completed, ...state.pomodoroSessions],
        });
        // Sync completion to backend
        updatePomodoroSessionApi(completed.id, { completed: true, end_time: endTime })
          .catch((err) => console.error('Failed to update pomodoro on backend:', err));
      },
      completePomodoro: () => {
        const state = get();
        if (!state.activePomodoro) return;
        const endTime = new Date().toISOString();
        const completed: PomodoroSession = {
          ...state.activePomodoro,
          endTime,
          completed: true,
        };
        set({
          activePomodoro: null,
          pomodoroSessions: [completed, ...state.pomodoroSessions],
          showReflection: false,
        });
        // Sync completion to backend
        updatePomodoroSessionApi(completed.id, { completed: true, end_time: endTime })
          .catch((err) => console.error('Failed to update pomodoro on backend:', err));
      },
      cancelPomodoro: () => set({ activePomodoro: null, showReflection: false }),

      fetchActivePomodoroFromBackend: async () => {
        try {
          const session = await fetchActivePomodoroSessionApi();
          if (session) {
            set({
              activePomodoro: {
                id: session.id,
                goalId: session.goal_id || undefined,
                topicId: session.topic_id || undefined,
                duration: session.duration,
                startTime: session.start_time || new Date().toISOString(),
                completed: session.completed,
                type: (session.session_type as 'focus' | 'short-break' | 'long-break') || 'focus',
              }
            });
          }
        } catch (err) {
          console.error('[FORGE] Failed to fetch active pomodoro:', err);
        }
      },
    }),
    {
      name: 'forge-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // SECURITY: goals and pomodoroSessions are NOT persisted to localStorage.
        // They are always fetched fresh from the backend after login.
        // This prevents cross-user data leaks on shared browsers.
        readingInsights: state.readingInsights,
        streak: state.streak,
        weekData: state.weekData,
        nudgeDismissed: state.nudgeDismissed,
        activeView: state.activeView,
      }),
    }
  )
);
