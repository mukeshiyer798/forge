import { motion, AnimatePresence } from 'framer-motion';
import { useQuote } from '@/hooks/useQuote';

export default function HeroBanner() {
  const quote = useQuote(30000);

  return (
    <div className="relative bg-forge-surface border-b border-forge-border px-4 lg:px-10 py-10 lg:py-12 overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none select-none overflow-hidden hidden lg:block">
        <span className="font-display text-[200px] text-[#f0ebe0]/[0.04] dark:text-forge-text/[0.06] leading-none tracking-widest">FORGE</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-forge-amber/30 to-transparent" />
      <div className="absolute top-0 left-10 w-40 h-40 bg-amber-500/5 blur-[60px] pointer-events-none" />

      <div className="relative z-10">
        <p className="font-mono text-sm uppercase tracking-[0.25em] text-forge-amber mb-3">// Daily Mantra</p>
        <h1 className="font-display text-[clamp(40px,7vw,80px)] leading-[0.92] text-forge-text tracking-wide mb-6">
          CONSISTENCY<br />
          OVER{' '}
          <span className="text-forge-amber relative">
            AMBITION.
            <span className="absolute -bottom-1 left-0 right-0 h-px bg-forge-amber/50" />
          </span>
        </h1>

        <AnimatePresence mode="wait">
          <motion.div
            key={quote.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="border-l-2 border-forge-amber pl-5 max-w-[560px]"
          >
            <p className="font-body font-light text-[15px] lg:text-[17px] text-forge-text leading-relaxed italic mb-2">
              "{quote.text}"
            </p>
            <p className="font-mono text-sm uppercase tracking-[0.12em] text-forge-amber">
              — {quote.author}
              {quote.source && <span className="text-forge-dim">, {quote.source}</span>}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
