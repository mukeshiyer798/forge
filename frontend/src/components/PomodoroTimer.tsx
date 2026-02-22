import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Play, Square, Minus, Plus, Brain } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { Goal } from '@/types';

interface PomodoroTimerProps {
  onStartWithGoal?: (goalId: string, topicId?: string) => void;
  goals?: Goal[];
  compact?: boolean;
  headerMode?: boolean;
}

const DURATION_OPTIONS = [15, 20, 25, 30, 45, 60];

export default function PomodoroTimer({
  onStartWithGoal,
  goals = [],
  compact = false,
  headerMode = false,
}: PomodoroTimerProps) {
  const { activePomodoro, startPomodoro, completePomodoro, cancelPomodoro } = useAppStore();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [showReflection, setShowReflection] = useState(false);
  const [showGoalPicker, setShowGoalPicker] = useState(false);

  const duration = activePomodoro?.duration ?? selectedDuration;
  const totalSeconds = duration * 60;

  const handleComplete = useCallback(() => {
    setShowReflection(true);
  }, []);

  useEffect(() => {
    if (!activePomodoro) return;
    const start = new Date(activePomodoro.startTime).getTime();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const remaining = Math.max(0, totalSeconds - elapsed);
    setSecondsLeft(remaining);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activePomodoro?.id, activePomodoro?.startTime, totalSeconds, handleComplete]);

  const progress = activePomodoro ? 1 - secondsLeft / totalSeconds : 0;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const handleDismissReflection = () => {
    setShowReflection(false);
    completePomodoro();
  };

  // Reflection modal
  if (showReflection) {
    const goalName = activePomodoro?.goalId
      ? goals.find((g) => g.id === activePomodoro.goalId)?.name
      : null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 ${showReflection ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-forge-surface border border-forge-border max-w-md w-full p-8 relative"
          >
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-4xl mb-4"
              >🧠</motion.div>
              <h3 className="font-display text-2xl tracking-widest text-forge-text mb-2">
                TIME'S UP
              </h3>
              <p className="font-condensed font-bold text-lg uppercase tracking-wider text-forge-amber mb-4">
                {duration} minute{duration !== 1 ? 's' : ''} of deep work{goalName ? ` on ${goalName}` : ''} ✓
              </p>

              <div className="bg-forge-surface2 border border-forge-border p-5 mb-6 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Brain size={16} className="text-purple-400" />
                  <span className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-text">
                    Reflection Moment
                  </span>
                </div>
                <ul className="space-y-2 font-body text-sm text-forge-dim leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber mt-0.5">→</span>
                    <span>Put your phone away. Close distracting tabs.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber mt-0.5">→</span>
                    <span>Try to <strong className="text-forge-text">recollect</strong> what you just learned.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber mt-0.5">→</span>
                    <span><strong className="text-forge-text">Explain it to yourself</strong> in your own words — as if teaching someone.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-forge-amber mt-0.5">→</span>
                    <span>What's the <strong className="text-forge-text">one key thing</strong> you'd remember tomorrow?</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={handleDismissReflection}
                className="w-full py-3 bg-forge-amber text-forge-bg font-condensed font-black text-base uppercase tracking-wider hover:bg-amber-400 transition-colors"
              >
                Done — Log Session ✓
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Active timer (inline/header)
  if (activePomodoro) {
    const goalName = activePomodoro.goalId
      ? goals.find((g) => g.id === activePomodoro.goalId)?.name
      : null;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'bg-forge-surface border border-forge-border overflow-hidden',
          headerMode ? 'flex items-center gap-3 px-3 py-2' : 'rounded-lg'
        )}
      >
        <div className={cn("flex items-center justify-between", headerMode ? 'gap-3' : 'px-4 py-3')}>
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="2.5" className="text-forge-border"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeDasharray={`${progress * 100}, 100`}
                  className="text-forge-amber transition-all duration-1000"
                />
              </svg>
            </div>
            <div>
              <p className="font-mono text-lg font-bold text-forge-text tabular-nums">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-forge-dim">
                {goalName ? goalName : 'Focus'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleComplete()}
              className="p-2 border border-forge-amber/50 hover:bg-forge-amber/10 text-forge-amber transition-colors"
              title="Complete session"
            >
              <Square size={14} />
            </button>
            <button
              onClick={cancelPomodoro}
              className="p-2 border border-forge-border hover:bg-forge-surface2 text-forge-dim transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Start mode
  if (headerMode) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowGoalPicker(!showGoalPicker)}
          className="flex items-center gap-1.5 border border-forge-amber/30 text-forge-amber px-3 py-2 font-mono text-xs uppercase tracking-wider hover:bg-forge-amber/10 transition-colors"
        >
          <Timer size={13} />
          <span>{selectedDuration}m</span>
          <Play size={11} />
        </button>

        <AnimatePresence>
          {showGoalPicker && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 top-full mt-2 w-72 bg-forge-surface border border-forge-border shadow-xl z-50 p-4"
            >
              {/* Duration picker */}
              <p className="font-mono text-[11px] uppercase tracking-widest text-forge-dim mb-2">
                Duration
              </p>
              <div className="flex gap-1.5 mb-4">
                {DURATION_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={cn(
                      'flex-1 py-1.5 font-mono text-xs border transition-colors',
                      selectedDuration === d
                        ? 'border-forge-amber text-forge-amber bg-forge-amber/10'
                        : 'border-forge-border text-forge-dim hover:border-forge-dim'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Quick start */}
              <button
                onClick={() => { startPomodoro({ duration: selectedDuration }); setShowGoalPicker(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-forge-amber/10 border border-forge-amber/30 hover:border-forge-amber text-forge-amber font-mono text-sm uppercase tracking-wider transition-colors mb-3"
              >
                <Play size={13} />
                Start {selectedDuration}m Focus
              </button>

              {/* Goal-specific */}
              {goals.length > 0 && (
                <>
                  <p className="font-mono text-xs uppercase tracking-widest text-forge-dim mb-2">
                    Or focus on a goal
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {goals.slice(0, 5).map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => {
                          startPomodoro({ goalId: goal.id, duration: selectedDuration });
                          onStartWithGoal?.(goal.id);
                          setShowGoalPicker(false);
                        }}
                        className="w-full text-left px-3 py-2 border border-forge-border hover:border-forge-amber/50 text-sm text-forge-dim hover:text-forge-text transition-colors truncate"
                      >
                        {goal.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Full widget mode (non-header)
  return (
    <div className={cn('bg-forge-surface border border-forge-border', compact ? 'p-3' : 'p-4')}>
      <div className="flex items-center gap-2 mb-3">
        <Timer size={16} className="text-forge-amber" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-forge-amber">
          Pomodoro
        </span>
      </div>

      {/* Duration selector */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setSelectedDuration(d => Math.max(5, d - 5))}
          className="p-1 border border-forge-border text-forge-dim hover:text-forge-text transition-colors"
        >
          <Minus size={12} />
        </button>
        <span className="font-mono text-lg font-bold text-forge-text w-12 text-center tabular-nums">
          {selectedDuration}
        </span>
        <button
          onClick={() => setSelectedDuration(d => Math.min(90, d + 5))}
          className="p-1 border border-forge-border text-forge-dim hover:text-forge-text transition-colors"
        >
          <Plus size={12} />
        </button>
        <span className="font-mono text-[11px] text-forge-dim">min</span>
      </div>

      <button
        onClick={() => startPomodoro({ duration: selectedDuration })}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-forge-amber/10 border border-forge-amber/30 hover:border-forge-amber text-forge-amber font-mono text-sm uppercase tracking-wider transition-colors"
      >
        <Play size={14} />
        Start {selectedDuration} min
      </button>
      {goals.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-forge-dim mb-2">
            Or focus on a goal
          </p>
          {goals.slice(0, 3).map((goal) => (
            <button
              key={goal.id}
              onClick={() => {
                startPomodoro({ goalId: goal.id, duration: selectedDuration });
                onStartWithGoal?.(goal.id);
              }}
              className="w-full text-left px-3 py-2 border border-forge-border hover:border-forge-amber/50 text-sm text-forge-dim hover:text-forge-text transition-colors"
            >
              {goal.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
