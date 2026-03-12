// Clerk Token Injection Logic
import { createLogger } from '@/lib/logger';
import { getSessionId } from '@/lib/monitoring';

const log = createLogger('API');

let clerkTokenProvider: (() => Promise<string | null>) | null = null;
let refreshPromise: Promise<string | null> | null = null;
let cachedToken: string | null = null;

export function setClerkTokenProvider(provider: () => Promise<string | null>) {
  clerkTokenProvider = provider;
}

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_V1 = `${API_BASE}/api/v1`;

export interface ApiError {
  detail: string | Record<string, unknown>;
  status: number;
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_V1}${endpoint}`;
  const method = options.method?.toUpperCase() || 'GET';

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Token Refresh Mutex: Prevents 401 cascades when multiple requests fire simultaneously
  // and the token has expired, forcing them to wait for the single refresh to resolve.
  if (clerkTokenProvider) {
    if (!refreshPromise) {
      refreshPromise = clerkTokenProvider()
        .then((t) => {
          cachedToken = t;
          return t;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    const token = await refreshPromise;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // 1. Idempotency Key Injection
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!headers['Idempotency-Key']) {
      headers['Idempotency-Key'] = crypto.randomUUID();
    }
  }

  // 1b. Session ID for cross-stack correlation
  headers['x-session-id'] = getSessionId();

  // 2. Exponential Backoff Retry Loop
  let attempt = 0;
  while (true) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        },
      });

      if (!res.ok) {
        // Retry on 5xx server errors, but throw immediately on 4xx client errors
        if (res.status >= 500 && res.status < 600 && attempt < MAX_RETRIES) {
          log.warn('api.retry', { url: endpoint, status: res.status, attempt });
          throw new Error(`Server error ${res.status}, forcing retry`);
        }

        let detail: string | Record<string, unknown> = res.statusText;
        try {
          const json = await res.json();
          if (json.detail) detail = json.detail;
        } catch {
          // ignore
        }
        const err: ApiError = { detail, status: res.status };
        throw err; // Genuine error, exit loop
      }

      const text = await res.text();
      if (!text) return {} as T;
      return JSON.parse(text) as T;

    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err;
      }

      attempt++;
      if (attempt > MAX_RETRIES) {
        log.error('api.max_retries_exceeded', { url: endpoint, method, attempt }, err);
        throw err;
      }

      const baseDelay = Math.pow(2, attempt) * BASE_DELAY_MS;
      const jitter = Math.random() * 200;
      const delay = baseDelay + jitter;

      console.warn(`[Network] Request to ${url} failed. Retrying (Attempt ${attempt}/${MAX_RETRIES}) in ${Math.round(delay)}ms. Error:`, err);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export interface UserPublic {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string | null;
  nudge_preference?: string;
  greeting_preference?: string | null;
  status_message?: string | null;
  has_openrouter_key?: boolean;
}

export async function getCurrentUser(): Promise<UserPublic> {
  return apiRequest<UserPublic>('/users/me');
}

// ── Goals API ──────────────────────────────────────────────
export interface GoalPublicBackend {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  description: string | null;
  target_date: string | null;
  status: string;
  priority: number | null;
  daily_task_requirement: number | null;
  progress: number;
  subtopics: string | null; // JSON string
  resources: string | null; // JSON string
  topics: string | null;    // JSON string
  capstone: string | null;  // JSON string
  future_look: string | null;
  created_at: string | null;
  last_logged_at: string | null;
}

export interface GoalsPublicResponse {
  data: GoalPublicBackend[];
  count: number;
}

export async function fetchGoals(skip = 0, limit = 100): Promise<GoalsPublicResponse> {
  return apiRequest<GoalsPublicResponse>(`/goals/?skip=${skip}&limit=${limit}`);
}

export async function createGoalApi(data: {
  name: string;
  type: string;
  description?: string;
  target_date?: string;
  status?: string;
  priority?: number;
  daily_task_requirement?: number;
  progress?: number;
  subtopics?: string;
  resources?: string;
  topics?: string;
  capstone?: string;
  future_look?: string;
}): Promise<GoalPublicBackend> {
  return apiRequest<GoalPublicBackend>('/goals/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateGoalApi(
  id: string,
  data: Record<string, unknown>
): Promise<GoalPublicBackend> {
  return apiRequest<GoalPublicBackend>(`/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteGoalApi(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/goals/${id}`, {
    method: 'DELETE',
  });
}

export async function togglePauseGoalApi(id: string): Promise<GoalPublicBackend> {
  return apiRequest<GoalPublicBackend>(`/goals/${id}/pause`, {
    method: 'PATCH',
  });
}


// ── Pomodoro API ───────────────────────────────────────────
export interface PomodoroSessionBackend {
  id: string;
  owner_id: string;
  goal_id: string | null;
  topic_id: string | null;
  duration: number;
  session_type: string;
  completed: boolean;
  start_time: string | null;
  end_time: string | null;
}

export interface PomodoroSessionsResponse {
  data: PomodoroSessionBackend[];
  count: number;
}

export async function createPomodoroSessionApi(data: {
  goal_id?: string | null;
  topic_id?: string | null;
  duration?: number;
  session_type?: string;
}): Promise<PomodoroSessionBackend> {
  return apiRequest<PomodoroSessionBackend>('/pomodoro/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchPomodoroSessions(
  skip = 0,
  limit = 200
): Promise<PomodoroSessionsResponse> {
  return apiRequest<PomodoroSessionsResponse>(
    `/pomodoro/sessions?skip=${skip}&limit=${limit}`
  );
}

export async function updatePomodoroSessionApi(
  id: string,
  data: { completed?: boolean; end_time?: string }
): Promise<PomodoroSessionBackend> {
  return apiRequest<PomodoroSessionBackend>(`/pomodoro/sessions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function fetchPomodoroStats(): Promise<{
  total_sessions: number;
  total_minutes: number;
  by_goal: Record<string, number>;
}> {
  return apiRequest('/pomodoro/stats');
}

export async function fetchActivePomodoroSessionApi(): Promise<PomodoroSessionBackend | null> {
  return apiRequest<PomodoroSessionBackend | null>('/pomodoro/active');
}

// ── Spaced Repetition API ──────────────────────────────────
export interface SpacedRepetitionItemPublic {
  id: string;
  owner_id: string;
  goal_id: string;
  topic_id: string;
  topic_name: string;
  active_recall_question: string | null;
  resources: string | null;
  next_review_at: string;
  last_reviewed_at: string | null;
}

export async function getDueSpacedRepetitionItems(): Promise<{
  data: SpacedRepetitionItemPublic[];
  count: number;
}> {
  return apiRequest<{ data: SpacedRepetitionItemPublic[]; count: number }>(
    '/spaced-repetition/due'
  );
}

export async function getSpacedRepetitionPrompt(
  id: string
): Promise<{ prompt: string; topic_name: string }> {
  return apiRequest<{ prompt: string; topic_name: string }>(
    `/spaced-repetition/prompt/${id}`
  );
}

export async function generateSpacedRepetitionExplanation(
  id: string
): Promise<{ explanation: string }> {
  return apiRequest<{ explanation: string }>(
    `/spaced-repetition/generate-explanation/${id}`,
    { method: 'POST' }
  );
}

export async function submitSpacedRepetitionReview(
  id: string,
  correct: boolean
): Promise<SpacedRepetitionItemPublic> {
  return apiRequest<SpacedRepetitionItemPublic>(
    `/spaced-repetition/review/${id}`,
    {
      method: 'POST',
      body: JSON.stringify({ correct }),
    }
  );
}

export async function createSpacedRepetitionItem(
  goalId: string,
  topicId: string,
  topicName: string,
  activeRecallQuestion?: string | null,
  resources?: string | null
): Promise<SpacedRepetitionItemPublic> {
  return apiRequest<SpacedRepetitionItemPublic>(
    '/spaced-repetition/items',
    {
      method: 'POST',
      body: JSON.stringify({
        goal_id: goalId,
        topic_id: topicId,
        topic_name: topicName,
        active_recall_question: activeRecallQuestion ?? null,
        resources: resources ?? null,
      }),
    }
  );
}

// ── Reading Insights API ──────────────────────────────────
export interface ReadingInsightBackend {
  id: string;
  owner_id: string;
  title: string;
  url: string;
  content_summary: string | null;
  key_takeaways: string | null;
  actionable_advice: string | null;
  read_time_minutes: number | null;
  hook?: string | null;
  before?: string | null;
  after?: string | null;
  why_it_matters?: string | null;
  created_at: string | null;
}

export interface ReadingInsightsResponse {
  data: ReadingInsightBackend[];
  count: number;
}

export async function fetchReadingInsights(
  skip = 0,
  limit = 50
): Promise<ReadingInsightsResponse> {
  return apiRequest<ReadingInsightsResponse>(
    `/readings/insights?skip=${skip}&limit=${limit}`
  );
}

export async function createReadingInsightApi(data: {
  title: string;
  url: string;
  content_summary?: string | null;
  key_takeaways?: string | null;
  actionable_advice?: string | null;
  read_time_minutes?: number | null;
  hook?: string | null;
  before?: string | null;
  after?: string | null;
  why_it_matters?: string | null;
}): Promise<ReadingInsightBackend> {
  return apiRequest<ReadingInsightBackend>('/readings/insights', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteReadingInsightApi(id: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/readings/insights/${id}`, {
    method: 'DELETE',
  });
}

// ── Wisdom API ─────────────────────────────────────────────
export interface WisdomBackend {
  id: string;
  title: string;
  book: string | null;
  author: string | null;
  category: string;
  summary: string;
  key_lesson: string;
  how_to_apply: string;
  created_at: string | null;
}

export interface WisdomsResponse {
  data: WisdomBackend[];
  count: number;
}

export async function fetchUniversalMindset(limit = 3): Promise<WisdomsResponse> {
  return apiRequest<WisdomsResponse>(`/wisdom/mindset?limit=${limit}`);
}
