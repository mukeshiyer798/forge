import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface RiskPopupProps {
  open: boolean;
  onClose: () => void;
  completed: number;
  required: number;
}

export default function RiskPopup({ open, onClose, completed, required }: RiskPopupProps) {
  const { goals } = useAppStore();
  const deficit = required - completed;
  const goalsAtRisk = goals.filter(g => g.dailyTaskRequirement && g.status !== 'on-track');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-red-950/90 border-2 border-red-900/50 rounded-sm p-6 max-w-md w-full pointer-events-auto backdrop-blur-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="text-red-400 flex-shrink-0">
                  <AlertTriangle size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="font-condensed font-black text-xl uppercase tracking-wide text-red-400 mb-2">
                    Daily Task Requirement Not Met
                  </h3>
                  <p className="font-mono text-sm text-red-300/80 mb-4 leading-relaxed">
                    You've completed <strong className="text-forge-text">{completed}</strong> out of <strong className="text-forge-text">{required}</strong> required tasks today.
                    You're <strong className="text-red-400">{deficit} task{deficit !== 1 ? 's' : ''} behind</strong>.
                  </p>
                  {goalsAtRisk.length > 0 && (
                    <div className="mb-4">
                      <p className="font-mono text-xs text-red-300/70 mb-2">Goals at risk:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {goalsAtRisk.slice(0, 3).map((g) => (
                          <li key={g.id} className="font-mono text-xs text-red-200">
                            {g.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="font-mono text-xs text-red-300/70 mb-4">
                    Complete more tasks to maintain your progress and avoid falling behind.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="forge-btn-primary flex-1 bg-red-600 hover:bg-red-700 border-red-600"
                    >
                      I'll Do Better
                    </button>
                    <button
                      onClick={onClose}
                      className="forge-btn-ghost flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
