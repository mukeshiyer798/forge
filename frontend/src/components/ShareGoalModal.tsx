import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Copy, Check, Globe, EyeOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Goal } from '@/types';
import { cn } from '@/lib/utils';

interface ShareGoalModalProps {
  goal: Goal;
  open: boolean;
  onClose: () => void;
}

export default function ShareGoalModal({ goal, open, onClose }: ShareGoalModalProps) {
  const { toggleShareGoal } = useAppStore();
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = goal.shareToken
    ? `${window.location.origin}/share/${goal.shareToken}`
    : null;

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleShareGoal(goal.id);
    } catch (err) {
      console.error('Failed to toggle sharing:', err);
    } finally {
      setToggling(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-forge-surface border border-forge-border shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border">
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-forge-amber" />
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-forge-dim">Share Goal</span>
                </div>
                <button onClick={onClose} className="text-forge-muted hover:text-forge-text transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Goal name */}
                <div>
                  <p className="font-condensed font-black text-xl uppercase tracking-wide text-forge-text leading-tight">
                    {goal.name}
                  </p>
                  <p className="font-mono text-xs text-forge-dim mt-0.5 uppercase tracking-wider">
                    {goal.progress}% complete · {goal.status}
                  </p>
                </div>

                {/* Toggle */}
                <div className="flex items-center justify-between bg-forge-surface2 border border-forge-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    {goal.isPublic
                      ? <Globe size={14} className="text-green-400" />
                      : <EyeOff size={14} className="text-forge-muted" />
                    }
                    <div>
                      <p className="font-mono text-sm text-forge-text">
                        {goal.isPublic ? 'Publicly shared' : 'Private'}
                      </p>
                      <p className="font-mono text-[11px] text-forge-dim mt-0.5">
                        {goal.isPublic
                          ? 'Anyone with the link can view this goal'
                          : 'Only you can see this goal'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggle}
                    disabled={toggling}
                    className={cn(
                      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                      goal.isPublic ? 'bg-green-500' : 'bg-forge-border',
                      toggling && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                        goal.isPublic ? 'translate-x-[18px]' : 'translate-x-[3px]'
                      )}
                    />
                  </button>
                </div>

                {/* Share URL */}
                <AnimatePresence>
                  {goal.isPublic && shareUrl && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <p className="font-mono text-[11px] uppercase tracking-wider text-forge-dim mb-2">
                        Share link
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 bg-forge-surface2 border border-forge-border px-3 py-2 min-w-0">
                          <Link2 size={12} className="text-forge-muted shrink-0" />
                          <span className="font-mono text-xs text-forge-dim truncate">{shareUrl}</span>
                        </div>
                        <button
                          onClick={handleCopy}
                          className={cn(
                            'flex items-center gap-1.5 px-3 py-2 border font-mono text-xs uppercase tracking-wider transition-all shrink-0',
                            copied
                              ? 'border-green-500/40 text-green-400 bg-green-500/5'
                              : 'border-forge-amber/40 text-forge-amber hover:bg-forge-amber/5'
                          )}
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="font-mono text-[11px] text-forge-muted mt-2">
                        Share this link for accountability — viewers see your progress, topics, and focus time.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
