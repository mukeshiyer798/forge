import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowRight, Zap, Wand2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { createLogger } from '@/lib/logger';

const log = createLogger('Dashboard');
import WeekTracker from '@/components/WeekTracker';
import NudgePanel from '@/components/NudgePanel';
import HeroBanner from '@/components/HeroBanner';
import GoalCard from '@/components/GoalCard';
import AddGoalModal from '@/components/AddGoalModal';
import PomodoroTimer from '@/components/PomodoroTimer';
import PomodoroSession from '@/components/PomodoroSession';
import SpacedRepetitionReminder from '@/components/SpacedRepetitionReminder';
import ProgressChart from '@/components/ProgressChart';

export default function DashboardPage() {
  const { user, goals, goalsLoaded, setActiveView } = useAppStore();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const now = new Date();
  const period = now.getHours() < 12 ? 'Morning' : now.getHours() < 17 ? 'Afternoon' : 'Evening';
  const displayName = user?.greetingPreference || user?.name?.split(' ')[0] || 'WARRIOR';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const behindCount = goals.filter(g => g.status === 'behind' || g.status === 'at-risk').length;
  const recentGoals = goals.slice(0, 2);
  const avgProgress = goals.length ? Math.round(goals.reduce((acc, g) => acc + (g.progress || 0), 0) / goals.length) : 0;

  return (
    <>
      {/* Header: solid background so scrolling content doesn’t layer underneath */}
      <div className="sticky top-0 z-20 bg-forge-surface/98 backdrop-blur-md border-b border-forge-border shadow-[0_1px_0_0_rgba(255,255,255,0.03)] px-4 lg:px-10 py-5 flex items-end justify-between">
        <div>
          <p className="font-mono text-[15px] uppercase tracking-[0.2em] text-forge-dim mb-1">// {dateStr}</p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">
            {period.toUpperCase()}, {displayName.toString().toUpperCase()}
          </h2>
          {user?.statusMessage && (
            <p className="font-mono text-[15px] uppercase tracking-wider text-forge-amber mt-1">
              {user.statusMessage}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {behindCount > 0 && (
            <motion.div animate={{ opacity: [1, 0.6, 1] }} transition={{ duration: 2, repeat: Infinity }}
              className="hidden sm:flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 dark:bg-red-950/40 dark:border-red-900/50 px-3 py-2">
              <Zap size={11} className="text-[#d9381e] dark:text-red-400" />
              <span className="font-mono text-[15px] uppercase tracking-wider text-[#d9381e] dark:text-red-400">{behindCount} At Risk</span>
            </motion.div>
          )}
          <div id="pomodoro-header"><PomodoroTimer goals={goals} headerMode /></div>
          <button id="btn-new-goal" onClick={() => { log.info('dashboard.new_goal.clicked'); setAddModalOpen(true); }} className="forge-btn-primary flex items-center gap-1.5">
            <Plus size={13} strokeWidth={2.5} />
            <span className="hidden sm:inline">New Goal</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <HeroBanner />

        <div className="px-4 lg:px-10 py-8 flex flex-col gap-8">
          <NudgePanel />
          <SpacedRepetitionReminder />
          <WeekTracker />

          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">Progress Snapshot</h3>
              <button
                onClick={() => { log.info('dashboard.executive_view.clicked'); setActiveView('executive'); }}
                className="flex items-center gap-1.5 font-mono text-[15px] uppercase tracking-wider text-forge-amber hover:text-forge-text transition-colors"
              >
                Summary view <ArrowRight size={11} />
              </button>
            </div>
            <ProgressChart
              title="Overall progress"
              points={[
                { label: 'Today', value: avgProgress },
              ]}
            />
          </section>

          {/* Goals preview */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">Recent Goals</h3>
              <button onClick={() => { log.info('dashboard.goals_view.clicked'); setActiveView('goals'); }}
                className="flex items-center gap-1.5 font-mono text-[15px] uppercase tracking-wider text-forge-amber hover:text-forge-text transition-colors">
                View All <ArrowRight size={11} />
              </button>
            </div>

            {goals.length === 0 ? (
              <div className="border border-dashed border-forge-border p-10 text-center">
                <div className="text-3xl mb-3">⚒️</div>
                <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-dim mb-1">No goals yet.</p>
                <p className="font-mono text-[15px] text-forge-muted mb-5">Add one manually or let AI build your roadmap.</p>
                <button onClick={() => setAddModalOpen(true)} className="forge-btn-primary">Create First Goal</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recentGoals.map((goal, i) => <GoalCard key={goal.id} goal={goal} index={i} />)}
                </div>
                {goals.length > 2 && (
                  <button onClick={() => setActiveView('goals')}
                    className="border border-dashed border-forge-border py-4 text-center hover:border-forge-amber transition-colors group">
                    <span className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-dim group-hover:text-forge-amber transition-colors">
                      +{goals.length - 2} more goal{goals.length - 2 !== 1 ? 's' : ''} →
                    </span>
                  </button>
                )}
              </div>
            )}
          </section>


          {/* Quick actions — just Reading now */}
          <section>
            <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text mb-4">Fuel Up</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => { log.info('dashboard.roadmap_gen.clicked'); setAddModalOpen(true); }}
                className="bg-amber-500/5 border border-amber-500/20 hover:border-forge-amber p-5 text-left transition-all duration-200 group">
                <div className="flex items-center gap-2 mb-2">
                  <Wand2 size={16} className="text-forge-amber" />
                  <span className="font-mono text-[13px] uppercase tracking-widest text-forge-amber bg-forge-amber/10 px-1.5 py-0.5">AI</span>
                </div>
                <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-text group-hover:text-forge-amber transition-colors">
                  Generate Roadmap
                </p>
                <p className="font-mono text-[15px] text-forge-dim mt-1">
                  Describe a topic → get a full structured learning plan
                </p>
              </button>

              <button onClick={() => { log.info('dashboard.reading_room.clicked'); setActiveView('reading'); }}
                className="bg-forge-surface border border-forge-border hover:border-forge-amber p-5 text-left transition-all duration-200 group">
                <div className="text-2xl mb-2">📚</div>
                <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-text group-hover:text-forge-amber transition-colors">
                  Reading Room
                </p>
                <p className="font-mono text-[15px] text-forge-dim mt-1">
                  Curated insights & stories to support your learning
                </p>
              </button>
            </div>
          </section>

          <div className="border-t border-forge-border pt-6 text-center">
            <p className="font-mono text-sm uppercase tracking-[0.3em] text-forge-muted">
              FORGE — BUILD THE PERSON YOU NEED TO BE
            </p>
          </div>
        </div>
      </div>

      <AddGoalModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </>
  );
}
