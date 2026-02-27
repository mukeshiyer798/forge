import { BarChart3, Clock, ShieldAlert, Target, Timer, CheckCircle } from 'lucide-react';
import { useMemo } from 'react';
import MetricsCard from '@/components/MetricsCard';
import ProgressChart from '@/components/ProgressChart';
import { useAppStore } from '@/store/useAppStore';

export default function ExecutiveDashboard() {
  const { goals, weekData, pomodoroSessions } = useAppStore();

  const metrics = useMemo(() => {
    const total = goals.length;
    const onTrack = goals.filter((g) => g.status === 'on-track').length;
    const atRisk = goals.filter((g) => g.status === 'at-risk').length;
    const behind = goals.filter((g) => g.status === 'behind').length;

    const avgProgress = total
      ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / total)
      : 0;

    const dailyTarget = goals.reduce((acc, g) => acc + (g.dailyTaskRequirement || 0), 0);
    const roiProxy = dailyTarget > 0 ? Math.round((avgProgress / dailyTarget) * 10) / 10 : null;

    // Task completions this week
    const weekCompletions = weekData.days.filter(Boolean).length;

    // Pomodoro stats
    const sessions = pomodoroSessions ?? [];
    const totalPomodoros = sessions.length;
    const totalFocusMinutes = sessions.reduce((acc: number, s) => acc + (s.duration || 25), 0);
    const totalFocusHours = Math.round(totalFocusMinutes / 60 * 10) / 10;

    return { total, onTrack, atRisk, behind, avgProgress, dailyTarget, roiProxy, weekCompletions, totalPomodoros, totalFocusHours };
  }, [goals, weekData, pomodoroSessions]);

  const chartPoints = useMemo(() => {
    const now = new Date();
    const label = now.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
    return [{ label, value: metrics.avgProgress }];
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            hint="Total pomodoro sessions completed"
            icon={<Timer size={18} />}
          />
          <MetricsCard
            label="Focus time"
            value={`${metrics.totalFocusHours}h`}
            hint="Total deep work hours logged"
            icon={<Clock size={18} />}
            tone={metrics.totalFocusHours >= 10 ? 'good' : metrics.totalFocusHours >= 5 ? 'warn' : 'risk'}
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
