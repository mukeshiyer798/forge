import { motion } from 'framer-motion';
import { Timer } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

interface PomodoroSessionProps {
  className?: string;
}

/** Floating/minimizable Pomodoro session widget */
export default function PomodoroSession({ className }: PomodoroSessionProps) {
  const { activePomodoro, goals } = useAppStore();

  if (!activePomodoro) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn('fixed bottom-6 right-6 z-50 w-72 shadow-xl', className)}
    >
      <PomodoroTimer goals={goals} compact />
    </motion.div>
  );
}
