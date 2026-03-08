import { BarChart3, Clock, ShieldAlert, Target, BookOpen, Flame } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger('Executive');
import MetricsCard from '@/components/MetricsCard';
import WeeklyGoalTracker from '@/components/WeeklyGoalTracker';
import DailyActivityChart from '@/components/DailyActivityChart';
import { useAppStore } from '@/store/useAppStore';
import { getDueSpacedRepetitionItems } from '@/lib/api';

export default function ExecutiveDashboard() {
  const { goals, weekData, pomodoroSessions, isAuthenticated } = useAppStore();
  const [reviewsDue, setReviewsDue] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    log.info('executive.dashboard.mounted');
    getDueSpacedRepetitionItems()
      .then((res) => {
        log.debug('executive.reviews_due.fetched', { count: res.count });
        setReviewsDue(res.count);
      })
      .catch((err) => {
        log.error('executive.reviews_due.failed', {}, err);
        setReviewsDue(0);
      });
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

    const weekCompletions = weekData.days.filter(Boolean).length;

    const sessions = pomodoroSessions ?? [];
    const completedSessions = sessions.filter((s) => s.completed);
    const totalPomodoros = completedSessions.length;
    const totalFocusMinutes = completedSessions.reduce((acc: number, s) => acc + (s.duration || 25), 0);
    const totalFocusHours = Math.round(totalFocusMinutes / 60 * 10) / 10;

    return { total, onTrack, atRisk, behind, avgProgress, weekCompletions, totalPomodoros, totalFocusHours };
  }, [goals, weekData, pomodoroSessions]);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 bg-forge-surface border-b border-forge-border px-4 lg:px-10 py-5">
        <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-forge-dim mb-1">// Summary</p>
        <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">SUMMARY DASHBOARD</h2>
      </div>

      <div className="px-4 lg:px-10 py-8 flex flex-col gap-6 w-full">
        {/* Key metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricsCard
            label="Active goals"
            value={metrics.total}
            hint="Currently tracked"
            icon={<Target size={18} />}
          />
          <MetricsCard
            label="Progress"
            value={`${metrics.avgProgress}%`}
            hint="Average across goals"
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
          <MetricsCard
            label="Activity"
            value={metrics.weekCompletions * 2 + metrics.totalPomodoros}
            hint={`${metrics.weekCompletions}/7 days + ${metrics.totalPomodoros} sessions`}
            icon={<Flame size={18} />}
            tone={metrics.weekCompletions >= 5 ? 'good' : metrics.weekCompletions >= 3 ? 'warn' : 'risk'}
          />
          <MetricsCard
            label="Deep work"
            value={`${metrics.totalFocusHours}h`}
            hint="Focus hours logged"
            icon={<Clock size={18} />}
            tone={metrics.totalFocusHours >= 10 ? 'good' : metrics.totalFocusHours >= 5 ? 'warn' : 'risk'}
          />
          <MetricsCard
            label="Reviews"
            value={reviewsDue}
            hint="Spaced repetition due"
            icon={<BookOpen size={18} />}
            tone={reviewsDue === 0 ? 'good' : reviewsDue <= 3 ? 'warn' : 'risk'}
          />
        </div>

        {/* Dual Visualizations — 25% Weekly Grid / 75% Bar Chart */}
        <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', width: '100%', height: '600px', marginTop: '16px' }}>
          <div style={{ width: '25%', flexShrink: 0, minWidth: 0, height: '100%' }}>
            <WeeklyGoalTracker />
          </div>
          <div style={{ width: '75%', minWidth: 0, height: '100%' }}>
            <DailyActivityChart />
          </div>
        </div>

        {/* Shared color legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Less</span>
          {['#1e1e1e', '#cb2006', '#fd5a00', '#ffa200', '#ffd100'].map((c, i) => (
            <div key={i} style={{ width: '14px', height: '14px', backgroundColor: c, borderRadius: '2px' }} />
          ))}
          <span style={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', color: '#333', textTransform: 'uppercase', letterSpacing: '0.1em' }}>More</span>
        </div>

        <div className="border-t border-forge-border mt-8 pt-6 text-center">
          <p className="font-mono text-[13px] uppercase tracking-[0.3em] text-forge-muted">
            FORGE — BUILD THE PERSON YOU NEED TO BE
          </p>
        </div>
      </div>
    </div>
  );
}