import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function StreakCelebration() {
  const { celebrateVisible, streak, setCelebrate } = useAppStore();

  useEffect(() => {
    if (celebrateVisible) {
      const timer = setTimeout(() => setCelebrate(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [celebrateVisible, setCelebrate]);

  const confettiPieces = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ['#f59e0b', '#ffffff', '#ff6b00', '#fbbf24', '#ef4444', '#34d399'][Math.floor(Math.random() * 6)],
    size: Math.random() * 10 + 5,
    delay: Math.random() * 0.8,
    duration: Math.random() * 2 + 1.5,
    rotate: Math.random() * 720,
    isCircle: Math.random() > 0.5,
  }));

  return (
    <AnimatePresence>
      {celebrateVisible && (
        <>
          {/* Confetti */}
          <div className="fixed inset-0 pointer-events-none z-[998] overflow-hidden">
            {confettiPieces.map((p) => (
              <motion.div
                key={p.id}
                initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
                animate={{ y: '110vh', opacity: 0, rotate: p.rotate }}
                transition={{ duration: p.duration, delay: p.delay, ease: 'linear' }}
                style={{
                  position: 'absolute',
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: p.isCircle ? '50%' : '0',
                  top: 0,
                  left: 0,
                }}
              />
            ))}
          </div>

          {/* Banner */}
          <motion.div
            key="celebrate-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center",
              celebrateVisible ? "pointer-events-auto" : "pointer-events-none"
            )}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className="bg-forge-surface border-2 border-forge-amber text-center px-16 py-12 relative max-w-sm"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-forge-amber" />

              <motion.div
                animate={{ rotate: [-5, 5, -5], scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                className="text-6xl mb-3 block"
              >
                🔥
              </motion.div>

              <h2 className="font-display text-5xl text-forge-amber tracking-widest mb-1">
                STREAK!
              </h2>
              <div className="font-display text-2xl text-forge-text tracking-wider mb-2">
                {streak} Days Strong
              </div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-forge-dim mb-6">
                // Consistency compounds. Keep going.
              </p>

              <button
                onClick={() => setCelebrate(false)}
                className="forge-btn-primary w-full"
              >
                KEEP GOING →
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
