import { BarChart3, Clock, ShieldAlert, Target, Timer, CheckCircle, BookOpen } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import MetricsCard from '@/components/MetricsCard';
import ProgressChart from '@/components/ProgressChart';
import { useAppStore } from '@/store/useAppStore';
import { getDueSpacedRepetitionItems } from '@/lib/api';

export default function ExecutiveDashboard() {
  const { goals, weekData, pomodoroSessions, isAuthenticated } = useAppStore();
  const [reviewsDue, setReviewsDue] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    getDueSpacedRepetitionItems()
      .then((res) => setReviewsDue(res.count))
      .catch(() => setReviewsDue(0));
  }, [isAuthenticated]);

  const metrics = useMemo(() => {
    const activeGoals = goals.filter((g) => g.status !== 'paused');
    const total = activeGoals.length;
    const onTrack = activeGoals.filter((g) => g.status === 'on-track').length;
    const atRisk = activeGoals.filter((g) => g.status === 'at-risk').length;
    const behind = activeGoals.filter((g) => g.status === 'behind').length;

    const avgProgress = total
      ? Math.round(activeGoals.reduce((acc, g) => acc + (g.progress || 0), 0) / total)
      : 0;

    const dailyTarget = activeGoals.reduce((acc, g) => acc + (g.dailyTaskRequirement || 0), 0);
    const roiProxy = dailyTarget > 0 ? Math.round((avgProgress / dailyTarget) * 10) / 10 : null;

    // Task completions this week
    const weekCompletions = weekData.days.filter(Boolean).length;

    // Pomodoro stats — only completed sessions
    const sessions = pomodoroSessions ?? [];
    const completedSessions = sessions.filter((s) => s.completed);
    const totalPomodoros = completedSessions.length;
    const totalFocusMinutes = completedSessions.reduce((acc: number, s) => acc + (s.duration || 25), 0);
    const totalFocusHours = Math.round(totalFocusMinutes / 60 * 10) / 10;

    return { total, onTrack, atRisk, behind, avgProgress, dailyTarget, roiProxy, weekCompletions, totalPomodoros, totalFocusHours };
  }, [goals, weekData, pomodoroSessions]);

  const chartPoints = useMemo(() => {
    const STORAGE_KEY = 'forge-progress-history';
    const now = new Date();
    const todayLabel = now.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

    // Load existing history from localStorage
    let history: Array<{ label: string; value: number }> = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) history = JSON.parse(stored);
    } catch { /* ignore */ }

    // Update or append today's entry
    const existingIdx = history.findIndex((p) => p.label === todayLabel);
    if (existingIdx >= 0) {
      history[existingIdx].value = metrics.avgProgress;
    } else {
      history.push({ label: todayLabel, value: metrics.avgProgress });
    }

    // Keep only last 14 entries
    if (history.length > 14) history = history.slice(-14);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch { /* ignore */ }

    return history;
  }, [metrics.avgProgress]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-forge-surface border-b border-forge-border px-4 lg:px-10 py-5">
        <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-forge-dim mb-1">// Summary</p>
        <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">SUMMARY DASHBOARD</h2>
      </div>

      <div className="px-4 lg:px-10 py-8 flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricsCard
            label="Active goals"
            value={metrics.total}
            hint="Total goals currently tracked"
            icon={<Target size={18} />}
          />
          <MetricsCard
            label="Average progress"
            value={`${metrics.avgProgress}%`}
            hint="Across all active goals"
            icon={<BarChart3 size={18} />}
            tone={metrics.avgProgress >= 70 ? 'good' : metrics.avgProgress >= 40 ? 'warn' : 'risk'}
          />
          <MetricsCard
            label="At risk"
            value={metrics.atRisk + metrics.behind}
            hint={`${metrics.onTrack} on track`}
            icon={<ShieldAlert size={18} />}
            tone={metrics.atRisk + metrics.behind > 0 ? 'warn' : 'good'}
          />
        </div>

        {/* Focus & Completion metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricsCard
            label="Week completions"
            value={`${metrics.weekCompletions}/7`}
            hint="Days with all tasks done"
            icon={<CheckCircle size={18} />}
            tone={metrics.weekCompletions >= 5 ? 'good' : metrics.weekCompletions >= 3 ? 'warn' : 'risk'}
          />
          <MetricsCard
            label="Focus sessions"
            value={metrics.totalPomodoros}
            hint="Completed pomodoro sessions"
            icon={<Timer size={18} />}
          />
          <MetricsCard
            label="Focus time"
            value={`${metrics.totalFocusHours}h`}
            hint="Total deep work hours logged"
            icon={<Clock size={18} />}
            tone={metrics.totalFocusHours >= 10 ? 'good' : metrics.totalFocusHours >= 5 ? 'warn' : 'risk'}
          />
          <MetricsCard
            label="Reviews due"
            value={reviewsDue}
            hint="Spaced repetition items to review"
            icon={<BookOpen size={18} />}
            tone={reviewsDue === 0 ? 'good' : reviewsDue <= 3 ? 'warn' : 'risk'}
          />
        </div>

        <ProgressChart title="Overall progress trend" points={chartPoints} />

        <div className="border-t border-forge-border pt-6 text-center">
          <p className="font-mono text-[13px] uppercase tracking-[0.3em] text-forge-muted">
            FORGE — BUILD THE PERSON YOU NEED TO BE
          </p>
        </div>
      </div>
    </div>
  );
}
