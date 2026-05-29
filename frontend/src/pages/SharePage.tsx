import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Timer, CalendarDays, Target, Zap, ExternalLink } from 'lucide-react';
import { fetchPublicGoal, type GoalSharePublic } from '@/lib/api';
import { cn } from '@/lib/utils';

type GoalTopic = {
  id: string;
  name: string;
  taskNumber: number;
  completed: boolean;
  subtopics?: { id: string; name: string; completed: boolean }[];
  build?: { name: string; completed: boolean };
};

type GoalCapstone = {
  name: string;
  description?: string;
  completed: boolean;
};

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  learn:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   label: '📚 Learning' },
  build:   { bg: 'bg-green-500/10',  text: 'text-green-400',  label: '🔨 Build' },
  habit:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  label: '🌱 Habit' },
  fitness: { bg: 'bg-red-500/10',    text: 'text-red-400',    label: '💪 Fitness' },
};

const STATUS_STYLES: Record<string, string> = {
  'on-track': 'text-green-400',
  'at-risk':  'text-amber-400',
  'behind':   'text-red-400',
  'paused':   'text-gray-400',
  'completed':'text-forge-amber',
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [goal, setGoal] = useState<GoalSharePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchPublicGoal(token)
      .then(setGoal)
      .catch((err) => {
        setError(
          err?.status === 404
            ? 'This goal is no longer shared, or the link is invalid.'
            : 'Something went wrong. Please try again later.'
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <span className="font-mono text-forge-dim text-sm uppercase tracking-widest animate-pulse">
          Loading journey...
        </span>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="min-h-screen bg-forge-bg flex flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="font-mono text-3xl">🔒</span>
        <p className="font-condensed text-xl uppercase tracking-wide text-forge-text">
          {error ?? 'Goal not found'}
        </p>
        <Link to="/" className="font-mono text-xs uppercase tracking-wider text-forge-amber hover:underline">
          ← Back to FORGE
        </Link>
      </div>
    );
  }

  // Parse JSON fields
  let topics: GoalTopic[] = [];
  let capstone: GoalCapstone | null = null;

  try { topics = goal.topics ? JSON.parse(goal.topics) : []; } catch { topics = []; }
  try { capstone = goal.capstone ? JSON.parse(goal.capstone) : null; } catch { capstone = null; }

  const sortedTopics = [...topics].sort((a, b) => a.taskNumber - b.taskNumber);
  const completedTopics = sortedTopics.filter((t) => t.completed).length;
  const typeStyle = TYPE_STYLES[goal.type] ?? TYPE_STYLES.learn;
  const focusHours = Math.round((goal.total_focus_minutes / 60) * 10) / 10;

  return (
    <div className="min-h-screen bg-forge-bg text-forge-text">
      {/* Top bar */}
      <div className="border-b border-forge-border px-4 py-3 flex items-center justify-between">
        <span className="font-display text-lg tracking-widest text-forge-amber uppercase">FORGE</span>
        <a
          href="/"
          className="font-mono text-[11px] uppercase tracking-wider text-forge-dim hover:text-forge-text transition-colors flex items-center gap-1"
        >
          Build your own journey <ExternalLink size={10} />
        </a>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Owner attribution */}
        {goal.owner_name && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-sm text-forge-dim uppercase tracking-wider"
          >
            {goal.owner_name}'s learning journey
          </motion.p>
        )}

        {/* Goal header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-mono text-xs px-2 py-0.5 uppercase tracking-wider border', typeStyle.bg, typeStyle.text, 'border-current/20')}>
              {typeStyle.label}
            </span>
            <span className={cn('font-mono text-xs uppercase tracking-wider', STATUS_STYLES[goal.status] ?? 'text-forge-dim')}>
              {goal.status}
            </span>
          </div>
          <h1 className="font-condensed font-black text-4xl lg:text-5xl uppercase tracking-wide leading-tight text-forge-text">
            {goal.name}
          </h1>
          {goal.description && (
            <p className="font-mono text-sm text-forge-dim leading-relaxed">{goal.description}</p>
          )}
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          {[
            { icon: <Target size={14} />, label: 'Progress', value: `${goal.progress}%` },
            { icon: <CheckCircle2 size={14} />, label: 'Topics done', value: `${completedTopics} / ${sortedTopics.length}` },
            { icon: <Timer size={14} />, label: 'Focus time', value: focusHours > 0 ? `${focusHours}h` : '—' },
            { icon: <CalendarDays size={14} />, label: 'Target', value: goal.target_date ?? '—' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-forge-surface border border-forge-border px-3 py-3 space-y-1">
              <div className="flex items-center gap-1.5 text-forge-muted">{icon}<span className="font-mono text-[10px] uppercase tracking-wider">{label}</span></div>
              <p className="font-condensed font-bold text-xl text-forge-text">{value}</p>
            </div>
          ))}
        </motion.div>

        {/* Overall progress bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="space-y-1"
        >
          <div className="flex justify-between font-mono text-[11px] uppercase tracking-wider text-forge-dim">
            <span>Overall progress</span>
            <span>{goal.progress}%</span>
          </div>
          <div className="bg-forge-surface2 h-2 w-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${goal.progress}%` }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="h-full bg-forge-amber"
            />
          </div>
        </motion.div>

        {/* Topics checklist */}
        {sortedTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 mb-3">
              <Zap size={13} className="text-forge-amber" />
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-forge-amber">Learning roadmap</span>
            </div>
            {sortedTopics.map((topic, i) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.22 + i * 0.04 }}
                className={cn(
                  'flex items-start gap-3 px-4 py-3 border',
                  topic.completed
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-forge-surface border-forge-border'
                )}
              >
                {topic.completed
                  ? <CheckCircle2 size={16} className="text-forge-amber mt-0.5 shrink-0" />
                  : <Circle size={16} className="text-forge-muted mt-0.5 shrink-0" />
                }
                <div className="min-w-0">
                  <p className={cn(
                    'font-condensed font-bold uppercase tracking-wide text-base leading-tight',
                    topic.completed ? 'text-forge-amber/70 line-through' : 'text-forge-text'
                  )}>
                    {topic.name}
                  </p>
                  {/* Subtopic mini-bar */}
                  {topic.subtopics && topic.subtopics.length > 0 && !topic.completed && (
                    <p className="font-mono text-[11px] text-forge-dim mt-1">
                      {topic.subtopics.filter((s) => s.completed).length}/{topic.subtopics.length} subtasks
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Capstone */}
        {capstone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="border border-forge-border bg-forge-surface px-5 py-4 space-y-1"
          >
            <p className="font-mono text-[11px] uppercase tracking-wider text-forge-muted">Capstone project</p>
            <div className="flex items-center gap-2 mt-1">
              {capstone.completed
                ? <CheckCircle2 size={15} className="text-forge-amber shrink-0" />
                : <Circle size={15} className="text-forge-muted shrink-0" />
              }
              <p className={cn(
                'font-condensed font-bold text-lg uppercase tracking-wide',
                capstone.completed ? 'text-forge-amber/70 line-through' : 'text-forge-text'
              )}>
                {capstone.name}
              </p>
            </div>
            {capstone.description && (
              <p className="font-mono text-xs text-forge-dim leading-relaxed pl-6">{capstone.description}</p>
            )}
          </motion.div>
        )}

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="border-t border-forge-border pt-8 flex flex-col items-center gap-3 text-center"
        >
          <p className="font-mono text-xs text-forge-dim uppercase tracking-wider">Build your own learning journey</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-forge-amber text-forge-bg px-5 py-2.5 font-condensed font-black uppercase tracking-widest text-sm hover:bg-forge-amber/90 transition-colors"
          >
            Start on FORGE →
          </a>
        </motion.div>
      </div>
    </div>
  );
}
