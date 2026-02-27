import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { getTodayIndex } from '@/lib/utils';
import { cn } from '@/lib/utils';
import RiskPopup from './RiskPopup';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeekTracker() {
  const { weekData, checkDailyTaskCompletion, markDayCompleteFromTasks, goals } = useAppStore();
  const todayIdx = getTodayIndex();
  const completedCount = weekData.days.filter(Boolean).length;
  const [riskPopupOpen, setRiskPopupOpen] = useState(false);
  const completion = checkDailyTaskCompletion();

  // Auto-check task completion and mark day complete if requirements met
  useEffect(() => {
    if (completion.met && completion.required > 0) {
      markDayCompleteFromTasks();
    } else if (!completion.met && completion.required > 0) {
      // Show risk popup if requirements not met (only once per day)
      const today = new Date().toISOString().split('T')[0];
      const lastChecked = localStorage.getItem(`risk-checked-${today}`);
      // Only check goals with requirements that were created *before* today
      const hasOldGoals = goals.some(g => g.dailyTaskRequirement && g.createdAt && g.createdAt < today);
      const isEvening = new Date().getHours() >= 17;

      // Only show if it's evening AND they have old goals that didn't meet requirements
      if (!lastChecked && isEvening && hasOldGoals) {
        const timer = setTimeout(() => {
          setRiskPopupOpen(true);
          localStorage.setItem(`risk-checked-${today}`, 'true');
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [completion.met, completion.required, markDayCompleteFromTasks, goals]);


  // Calculate today's task completion
  const todayCompleted = completion.completed;
  const todayRequired = completion.required;

  return (
    <>
      <div className="bg-forge-surface border border-forge-border p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/3 to-transparent pointer-events-none" />

        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-forge-dim mb-1">
              This Week
            </p>
            <h3 className="font-condensed font-black text-lg uppercase tracking-wider text-forge-text">
              Task Completion Tracker
            </h3>
            {todayRequired > 0 && (
              <p className="font-mono text-[13px] text-forge-dim mt-1">
                Today: {todayCompleted}/{todayRequired} tasks
              </p>
            )}
          </div>
          <div className="text-right">
            <span className="font-display text-3xl text-forge-amber">{completedCount}</span>
            <span className="font-mono text-sm text-forge-dim">/7</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES.map((day, i) => {
            const done = weekData.days[i];
            const isToday = i === todayIdx;
            const isFuture = i > todayIdx;

            return (
              <div key={day} className="flex flex-col items-center gap-2">
                <span className={cn(
                  'font-mono text-[13px] uppercase tracking-wider',
                  isToday ? 'text-forge-amber' : 'text-forge-dim'
                )}>
                  {day}
                </span>
                <div
                  className={cn(
                    'w-11 h-11 border flex items-center justify-center transition-all duration-200 text-sm relative',
                    done
                      ? 'bg-forge-amber border-forge-amber text-forge-bg animate-pulse-glow'
                      : isToday
                        ? 'border-forge-dim text-forge-dim'
                        : isFuture
                          ? 'border-forge-border text-forge-muted opacity-30'
                          : 'border-forge-border text-forge-muted'
                  )}
                >
                  {done ? (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-forge-bg font-bold"
                    >
                      ✓
                    </motion.span>
                  ) : isToday ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-forge-dim" />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {completedCount === 7 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center font-mono text-sm uppercase tracking-widest text-forge-amber"
          >
            🔥 Perfect week. Keep the streak alive.
          </motion.div>
        )}
      </div>

      <RiskPopup
        open={riskPopupOpen}
        onClose={() => setRiskPopupOpen(false)}
        completed={todayCompleted}
        required={todayRequired}
      />
    </>
  );
}
