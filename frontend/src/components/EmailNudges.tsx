import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EMAIL_NUDGES } from '@/lib/data';
import { cn } from '@/lib/utils';

const SEVERITY_STYLES = {
  info: { dot: 'bg-blue-400', tag: 'bg-blue-500/10 text-blue-400', border: 'border-blue-900/30' },
  warning: { dot: 'bg-amber-400', tag: 'bg-amber-500/10 text-amber-400', border: 'border-amber-900/30' },
  critical: { dot: 'bg-red-400 animate-pulse', tag: 'bg-red-500/10 text-red-400', border: 'border-red-900/30' },
};

export default function EmailNudges() {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-forge-surface border border-forge-border overflow-hidden"
    >
      {/* Tabs */}
      <div className="flex border-b border-forge-border">
        {EMAIL_NUDGES.map((nudge, i) => (
          <button
            key={nudge.level}
            onClick={() => setActiveIdx(i)}
            className={cn(
              'flex items-center gap-2 px-5 py-3.5 font-mono text-xs uppercase tracking-wider border-b-2 -mb-px transition-all duration-200',
              i === activeIdx
                ? 'text-forge-amber border-forge-amber'
                : 'text-forge-dim border-transparent hover:text-forge-text'
            )}
          >
            <div className={cn('w-1.5 h-1.5 rounded-full', SEVERITY_STYLES[nudge.severity].dot)} />
            {nudge.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeIdx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {/* Email meta */}
          <div className={cn('px-6 py-4 border-b border-forge-border flex items-center gap-3', SEVERITY_STYLES[EMAIL_NUDGES[activeIdx].severity].border)}>
            <span className={cn('font-mono text-[11px] uppercase tracking-widest px-2.5 py-1', SEVERITY_STYLES[EMAIL_NUDGES[activeIdx].severity].tag)}>
              Nudge #{EMAIL_NUDGES[activeIdx].level}
            </span>
            <span className="font-body font-semibold text-sm text-forge-text">
              {EMAIL_NUDGES[activeIdx].subject}
            </span>
          </div>

          {/* Email body */}
          <div className="px-6 py-5">
            <div className="font-mono text-[11px] text-forge-dim leading-relaxed whitespace-pre-line max-h-[340px] overflow-y-auto">
              {EMAIL_NUDGES[activeIdx].body.split('\n').map((line, i) => {
                const isBold = line.startsWith('→') || (line.length < 40 && line === line.toUpperCase() && line.length > 3);
                const isQuote = line.startsWith('"') && line.endsWith('"');
                return (
                  <div key={i} className={cn(
                    'leading-relaxed',
                    isBold ? 'text-forge-text font-semibold' : '',
                    isQuote ? 'text-forge-amber italic' : '',
                    line.startsWith('→') ? 'text-forge-amber font-semibold mt-2 mb-2' : ''
                  )}>
                    {line || <br />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Simulated send button */}
          <div className="px-6 pb-5">
            <div className="flex items-center gap-3 bg-forge-surface2 border border-forge-border px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-wider text-forge-dim">
                Sends automatically via FastAPI + Celery when streak condition met
              </span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
