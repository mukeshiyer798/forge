import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { getDaysSince } from '@/lib/utils';

export default function NudgePanel() {
  const { goals, nudgeDismissed, dismissNudge, logProgressNudge } = useAppStore();

  if (nudgeDismissed) return null;

  const laggingGoal = goals.find((g) => getDaysSince(g.lastLoggedAt) >= 1 && g.status !== 'on-track');
  if (!laggingGoal) return null;

  const daysBehind = getDaysSince(laggingGoal.lastLoggedAt);
  const isNuclear = daysBehind >= 7;
  const isStern = daysBehind >= 3;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
        className={`border p-5 flex items-start gap-4 relative overflow-hidden ${isNuclear
          ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900/50'
          : isStern
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40'
            : 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30'
          }`}
      >
        {/* Pulse bar */}
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${isNuclear ? 'bg-red-500' : isStern ? 'bg-amber-500' : 'bg-blue-500'
          }`} />

        <div className="text-2xl flex-shrink-0 mt-0.5">
          {isNuclear ? '☢️' : isStern ? '⚠️' : '👀'}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className={`font-condensed font-black text-lg uppercase tracking-wide mb-1 ${isNuclear ? 'text-red-700 dark:text-red-400' : isStern ? 'text-amber-700 dark:text-amber-400' : 'text-blue-700 dark:text-blue-400'
            }`}>
            {isNuclear
              ? 'This is embarrassing. Really.'
              : isStern
                ? "You're slipping, soldier."
                : "Haven't seen you today 👀"}
          </h4>
          <p className={`text-base leading-relaxed ${isNuclear ? 'text-red-600/90 dark:text-red-300/70' : isStern ? 'text-amber-600/90 dark:text-amber-300/70' : 'text-blue-600/90 dark:text-blue-300/70'
            }`}>
            {isNuclear
              ? `${daysBehind} days since you touched "${laggingGoal.name}". Someone with your exact dream is working on it right now. The gap is growing.`
              : isStern
                ? `${daysBehind} days. Nothing. "${laggingGoal.name}" isn't going to complete itself. Your streak is dying.`
                : `"${laggingGoal.name}" hasn't been logged today. Five minutes. Keep the chain alive.`}
          </p>
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          <button onClick={logProgressNudge} className="forge-btn-primary text-sm py-2 px-4 whitespace-nowrap">
            Log Progress
          </button>
          <button onClick={dismissNudge} className="forge-btn-ghost text-sm py-1.5 px-3 whitespace-nowrap bg-forge-surface2 border-none">
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
