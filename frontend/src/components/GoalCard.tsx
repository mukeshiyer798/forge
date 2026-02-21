import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Check, Timer, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Goal, GoalTopic } from '@/types';
import { cn, formatDueDate } from '@/lib/utils';
import TaskPopup from './TaskPopup';
import NextPhasePrompt from './NextPhasePrompt';

const TYPE_STYLES: Record<Goal['type'], { bg: string; text: string; label: string }> = {
  learn: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: '📚 Learning' },
  build: { bg: 'bg-green-500/10', text: 'text-green-400', label: '🔨 Build' },
  habit: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: '🌱 Habit' },
  fitness: { bg: 'bg-red-500/10', text: 'text-red-400', label: '💪 Fitness' },
};

const STATUS_DOT: Record<Goal['status'], string> = {
  'on-track': 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
  'at-risk': 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
  behind: 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]',
};

const STATUS_LABEL: Record<Goal['status'], string> = {
  'on-track': '✓ On Track',
  'at-risk': '⚠ At Risk',
  behind: '✗ Behind',
};

const PHASE_SIZE = 5;

interface GoalCardProps {
  goal: Goal;
  index: number;
}

function TopicSection({ goalId, topic, isLocked }: { goalId: string; topic: GoalTopic; isLocked?: boolean }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const completedSubtasks = topic.subtopics?.filter(s => s.completed).length || 0;
  const totalSubtasks = topic.subtopics?.length || 0;
  const isCompleted = topic.completed || (totalSubtasks > 0 && completedSubtasks === totalSubtasks && topic.build?.completed);

  return (
    <>
      <button
        type="button"
        onClick={() => !isLocked && setPopupOpen(true)}
        disabled={isLocked}
        className={cn(
          'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors border rounded-sm',
          isCompleted
            ? 'bg-amber-500/5 border-amber-500/20'
            : isLocked
              ? 'bg-forge-surface/50 border-forge-border/50 cursor-not-allowed opacity-60'
              : 'bg-forge-surface2/50 hover:bg-forge-surface2 border-forge-border'
        )}
      >
        <span className={cn("font-mono text-xs uppercase tracking-wider", isLocked ? "text-forge-dim" : "text-forge-amber")}>TASK {topic.taskNumber}</span>
        <span className={cn(
          'font-condensed font-bold text-sm uppercase tracking-wide flex-1',
          isCompleted ? 'text-forge-amber line-through opacity-70' : isLocked ? 'text-forge-muted' : 'text-forge-text'
        )}>
          {topic.name}
        </span>
        {isLocked && <Lock size={12} className="text-forge-dim" />}
        {isCompleted && <Check size={14} className="text-green-400" />}
        {!isLocked && totalSubtasks > 0 && (
          <span className="font-mono text-[11px] text-forge-dim">
            {completedSubtasks}/{totalSubtasks}
          </span>
        )}
      </button>
      {!isLocked && <TaskPopup open={popupOpen} onClose={() => setPopupOpen(false)} goalId={goalId} topic={topic} />}
    </>
  );
}

export default function GoalCard({ goal, index }: GoalCardProps) {
  const { deleteGoal, toggleCapstoneCompleted, startPomodoro, activePomodoro } = useAppStore();
  const typeStyle = TYPE_STYLES[goal.type];
  const hasFullStructure = goal.topics && goal.topics.length > 0;
  const sortedTopics = hasFullStructure ? [...goal.topics!].sort((a, b) => a.taskNumber - b.taskNumber) : [];
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [nextPhaseOpen, setNextPhaseOpen] = useState(false);
  const [viewPhase, setViewPhase] = useState<number | null>(null); // null = auto (current active phase)

  const totalPhases = Math.ceil(sortedTopics.length / PHASE_SIZE) || 1;

  // Find the "active" phase (first phase with uncompleted topics)
  const activePhase = useMemo(() => {
    if (!sortedTopics.length) return 1;
    let phase = 1;
    let start = 0;
    while (start < sortedTopics.length) {
      const end = Math.min(start + PHASE_SIZE, sortedTopics.length);
      const batch = sortedTopics.slice(start, end);
      if (!batch.every(t => t.completed)) return phase;
      phase++;
      start = end;
    }
    return Math.ceil(sortedTopics.length / PHASE_SIZE);
  }, [sortedTopics]);

  // The phase we're actually showing
  const displayPhase = viewPhase ?? activePhase;

  // Get topics for the displayed phase
  const { phaseTopics, completedInPhase, totalInPhase, isPhaseComplete, isShellPhase } = useMemo(() => {
    const start = (displayPhase - 1) * PHASE_SIZE;
    const end = Math.min(start + PHASE_SIZE, sortedTopics.length);
    const batch = sortedTopics.slice(start, end);
    const completed = batch.filter(t => t.completed).length;
    const isShell = batch.length > 0 && batch.every(t => !t.completed && (!t.subtopics || t.subtopics.length === 0));
    return {
      phaseTopics: batch,
      completedInPhase: completed,
      totalInPhase: batch.length,
      isPhaseComplete: batch.length > 0 && completed === batch.length,
      isShellPhase: isShell,
    };
  }, [sortedTopics, displayPhase]);

  // Show unlock button on the last fully complete phase OR if we're on a shell phase waiting for generation
  const allDone = sortedTopics.length > 0 && sortedTopics.every(t => t.completed);
  const showUnlock = (allDone && displayPhase === totalPhases) || (displayPhase === activePhase && isShellPhase);

  const completedTopicNames = sortedTopics.filter(t => t.completed).map(t => t.name);
  const nextPhaseTopicNames: string[] = [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
      className="forge-card group cursor-default"
    >
      <div className="p-6">
        {/* HEADER: priority badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            {goal.priority != null && (
              <span className="font-mono text-[11px] uppercase tracking-wider bg-forge-amber/15 text-forge-amber border border-forge-amber/30 px-2 py-0.5">
                PRIORITY {goal.priority}
              </span>
            )}
            {!hasFullStructure && (
              <span className={cn('type-tag', typeStyle.bg, typeStyle.text)}>{typeStyle.label}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className={cn('w-2 h-2 rounded-full', STATUS_DOT[goal.status])} />
            {!activePomodoro && (
              <button
                onClick={() => startPomodoro({ goalId: goal.id })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-forge-muted hover:text-forge-amber"
                title="Start Pomodoro"
              >
                <Timer size={13} />
              </button>
            )}
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] text-red-400 uppercase tracking-wider">Delete?</span>
                <button
                  onClick={() => { deleteGoal(goal.id); setConfirmingDelete(false); }}
                  className="font-mono text-[11px] text-red-400 hover:text-red-300 border border-red-500/30 px-1.5 py-0.5 uppercase tracking-wider"
                >Yes</button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="font-mono text-[11px] text-forge-dim hover:text-forge-text border border-forge-border px-1.5 py-0.5 uppercase tracking-wider"
                >No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-forge-muted hover:text-red-400 ml-1"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        {/* HEADER: name */}
        <h3 className="font-condensed font-black text-2xl text-forge-text uppercase tracking-wide leading-tight mb-1">
          {goal.name}
        </h3>
        <p className="font-mono text-xs text-forge-dim mb-3 leading-relaxed">{goal.description}</p>

        {/* Progress bar */}
        <div className="bg-forge-surface2 h-[3px] mb-2 relative overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 0.8, delay: index * 0.06 + 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="h-full bg-forge-amber relative"
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-forge-amber rounded-full" />
          </motion.div>
        </div>

        {/* HEADER: target date + status */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-forge-dim">{formatDueDate(goal.targetDate)}</span>
          <span className={cn(
            'font-mono text-xs uppercase tracking-wider flex items-center gap-1.5',
            goal.status === 'on-track' ? 'text-green-400' : goal.status === 'at-risk' ? 'text-amber-400' : 'text-red-400'
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[goal.status])} />
            {STATUS_LABEL[goal.status]}
          </span>
        </div>

        {/* PHASE-BASED TOPICS */}
        {hasFullStructure && (
          <div className="border-t border-forge-border pt-4">
            {/* Phase header with navigation */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {totalPhases > 1 && (
                  <button
                    onClick={() => setViewPhase(Math.max(1, displayPhase - 1))}
                    disabled={displayPhase <= 1}
                    className="text-forge-dim hover:text-forge-text disabled:opacity-20 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                )}
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-forge-amber">
                  Phase {displayPhase}
                  {totalPhases > 1 && <span className="text-forge-dim"> / {totalPhases}</span>}
                </span>
                {totalPhases > 1 && (
                  <button
                    onClick={() => setViewPhase(Math.min(totalPhases, displayPhase + 1))}
                    disabled={displayPhase >= totalPhases}
                    className="text-forge-dim hover:text-forge-text disabled:opacity-20 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                )}
                {/* Back to active phase button */}
                {viewPhase !== null && viewPhase !== activePhase && (
                  <button
                    onClick={() => setViewPhase(null)}
                    className="font-mono text-[8px] uppercase tracking-wider text-forge-amber border border-forge-amber/30 px-1.5 py-0.5 hover:bg-amber-500/5 ml-1"
                  >
                    Active
                  </button>
                )}
              </div>
              <span className="font-mono text-[11px] text-forge-dim">
                {completedInPhase}/{totalInPhase} tasks
                {isPhaseComplete && <span className="text-green-400 ml-1">✓</span>}
              </span>
            </div>

            {/* Phase progress bar */}
            <div className="bg-forge-surface2 h-[2px] mb-3 relative overflow-hidden">
              <div
                className="h-full bg-forge-amber transition-all duration-500"
                style={{ width: `${totalInPhase > 0 ? (completedInPhase / totalInPhase) * 100 : 0}%` }}
              />
            </div>

            {/* Topics in displayed phase */}
            <div className="space-y-2">
              {phaseTopics.map((topic) => (
                <TopicSection key={topic.id} goalId={goal.id} topic={topic} isLocked={displayPhase > activePhase || (!topic.completed && (!topic.subtopics || topic.subtopics.length === 0))} />
              ))}
            </div>

            {/* Unlock Next Phase button (only when ALL topics complete and viewing last phase) */}
            {showUnlock && (
              <button
                type="button"
                onClick={() => setNextPhaseOpen(true)}
                className="w-full mt-3 py-3 flex items-center justify-center gap-2 font-condensed font-black text-sm uppercase tracking-wider bg-forge-amber/10 text-forge-amber border border-forge-amber/30 hover:bg-forge-amber/20 transition-colors"
              >
                <Lock size={14} />
                {displayPhase === activePhase && isShellPhase ? `Unlock Phase ${displayPhase}` : `Unlock Phase ${totalPhases + 1}`}
              </button>
            )}

            {/* Phase dots */}
            {totalPhases > 1 && (
              <div className="mt-2 flex items-center justify-center gap-1.5 py-1.5">
                {Array.from({ length: totalPhases }, (_, i) => {
                  const p = i + 1;
                  const phaseStart = i * PHASE_SIZE;
                  const phaseEnd = Math.min(phaseStart + PHASE_SIZE, sortedTopics.length);
                  const phaseDone = sortedTopics.slice(phaseStart, phaseEnd).every(t => t.completed);
                  return (
                    <button
                      key={i}
                      onClick={() => setViewPhase(p)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all cursor-pointer hover:scale-150',
                        p === displayPhase
                          ? 'bg-forge-amber scale-125'
                          : phaseDone
                            ? 'bg-forge-amber/40'
                            : 'bg-forge-border'
                      )}
                      title={`Phase ${p}${phaseDone ? ' (complete)' : ''}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* CAPSTONE */}
        {goal.capstone && (
          <div className="border-t border-forge-border mt-4 pt-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-forge-muted mb-2">Capstone</p>
            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={goal.capstone.completed}
                onChange={() => toggleCapstoneCompleted(goal.id)}
                className="mt-1 rounded border-forge-border bg-forge-surface2 text-forge-amber focus:ring-forge-amber"
              />
              <div>
                <span className="font-condensed font-bold text-sm uppercase tracking-wide text-forge-text group-hover:text-forge-amber">{goal.capstone.name}</span>
                {goal.capstone.estimatedHours != null && (
                  <span className="font-mono text-xs text-forge-dim ml-1.5">{goal.capstone.estimatedHours}h</span>
                )}
                {goal.capstone.description && <p className="font-mono text-xs text-forge-dim mt-0.5">{goal.capstone.description}</p>}
              </div>
            </label>
          </div>
        )}

        {/* Legacy: flat subtopics */}
        {!hasFullStructure && goal.subtopics.length > 0 && (
          <div className="border-t border-forge-border pt-3 flex flex-wrap gap-1.5">
            {goal.subtopics.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => useAppStore.getState().toggleSubtopic(goal.id, st.id)}
                className={cn(
                  'font-mono text-[11px] uppercase tracking-wider px-2 py-1 border transition-all duration-200',
                  st.completed
                    ? 'border-amber-600/40 text-forge-amber bg-amber-500/5 line-through decoration-amber-600/50'
                    : 'border-forge-border text-forge-muted hover:border-forge-dim hover:text-forge-dim'
                )}
              >
                {st.completed ? '✓ ' : ''}{st.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <NextPhasePrompt
        open={nextPhaseOpen}
        onClose={() => setNextPhaseOpen(false)}
        goal={goal}
        currentPhase={totalPhases}
        completedTopicNames={completedTopicNames}
        nextPhaseTopics={nextPhaseTopicNames}
      />
    </motion.div>
  );
}
