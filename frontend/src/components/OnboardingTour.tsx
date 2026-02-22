import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAppStore, type ViewId } from '@/store/useAppStore';

const STORAGE_KEY = 'forge-onboarding-v3';

type TourStep = {
  title: string;
  body: string;
  targetId: string;         // DOM element id to spotlight
  view: ViewId;             // navigate here first
  position: 'bottom' | 'top' | 'left' | 'right';
  cta?: string;
  waitMs?: number;          // ms to wait before spotlighting (for render)
};

const STEPS: TourStep[] = [
  {
    title: 'Welcome to FORGE ⚒️',
    body: 'Let\'s take a quick tour. We\'ll highlight the key areas you need to get started.',
    targetId: 'nav-dashboard',
    view: 'dashboard',
    position: 'right',
    cta: 'Start Tour →',
  },
  {
    title: 'Add Your AI Key',
    body: 'Paste an OpenRouter API key here to unlock 1-click roadmap generation. Get a free key at openrouter.ai/keys.',
    targetId: 'settings-api-key',
    view: 'settings',
    position: 'top',
    cta: 'Next →',
    waitMs: 300,
  },
  {
    title: 'Create Your First Goal',
    body: 'Click this button to create a goal — use AI to auto-generate a roadmap, or set one up manually in 30 seconds.',
    targetId: 'btn-new-goal',
    view: 'dashboard',
    position: 'bottom',
    cta: 'Next →',
    waitMs: 300,
  },
  {
    title: 'Focus Timer',
    body: 'Start a Pomodoro session here. Pick your duration (15–60 min), link it to a goal, and get a reflection prompt when time\'s up.',
    targetId: 'pomodoro-header',
    view: 'dashboard',
    position: 'bottom',
    cta: 'Next →',
  },
  {
    title: 'Reading Room',
    body: 'Curated motivation stories and AI-powered articles from top blogs — tailored to your interests.',
    targetId: 'nav-reading',
    view: 'dashboard',
    position: 'right',
    cta: 'Next →',
  },
  {
    title: 'You\'re All Set!',
    body: 'Start by adding your API key in Settings, then create your first goal. Consistency over ambition — show up every day.',
    targetId: 'nav-dashboard',
    view: 'dashboard',
    position: 'right',
    cta: 'Start Forging ⚒️',
  },
];

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingTour() {
  const { setActiveView } = useAppStore();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    // Disable tour on mobile/tablet (width < 1024px)
    if (window.innerWidth < 1024) {
      if (!seen) localStorage.setItem(STORAGE_KEY, 'seen');
      return;
    }
    if (!seen) setTimeout(() => setOpen(true), 600);
  }, []);

  const spotlightTarget = useCallback(() => {
    const step = STEPS[idx];
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const r = el.getBoundingClientRect();
      const pad = 8;
      setRect({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
      });
      // Scroll into view if needed
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setRect(null);
    }
  }, [idx]);

  // Navigate + spotlight
  useEffect(() => {
    if (!open) return;
    const step = STEPS[idx];
    if (!step) return;
    setActiveView(step.view);
    const delay = step.waitMs ?? 200;
    const t = setTimeout(spotlightTarget, delay);
    return () => clearTimeout(t);
  }, [idx, open, setActiveView, spotlightTarget]);

  // Re-measure on resize
  useEffect(() => {
    if (!open) return;
    const handler = () => spotlightTarget();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [open, spotlightTarget]);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, 'seen');
    setOpen(false);
    setActiveView('dashboard');
  };

  const next = () => {
    if (idx >= STEPS.length - 1) {
      close();
      return;
    }
    setIdx(i => i + 1);
  };

  const back = () => {
    if (idx > 0) setIdx(i => i - 1);
  };

  if (!open) return null;

  const step = STEPS[idx];
  const progress = ((idx + 1) / STEPS.length) * 100;

  // Tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    const gap = 16;
    switch (step.position) {
      case 'bottom':
        return {
          top: rect.top + rect.height + gap,
          left: Math.max(16, Math.min(rect.left + rect.width / 2 - 180, window.innerWidth - 376)),
        };
      case 'top':
        return {
          top: Math.max(16, rect.top - gap - 200),
          left: Math.max(16, Math.min(rect.left + rect.width / 2 - 180, window.innerWidth - 376)),
        };
      case 'right':
        return {
          top: rect.top + rect.height / 2 - 60,
          left: rect.left + rect.width + gap,
        };
      case 'left':
        return {
          top: rect.top + rect.height / 2 - 60,
          left: Math.max(16, rect.left - gap - 360),
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'auto' }}>
      {/* Dark overlay with spotlight cutout using SVG */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={6}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Spotlight border glow */}
      {rect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="absolute border-2 border-forge-amber/60 rounded-md pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 20px rgba(245,158,11,0.3), 0 0 60px rgba(245,158,11,0.1)',
          }}
        />
      )}

      {/* Click blocker (prevents interaction with non-highlighted areas) */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="absolute w-[360px] bg-forge-surface border border-forge-border shadow-2xl"
          style={{ ...getTooltipStyle(), zIndex: 10000 }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-forge-border">
            <motion.div
              className="h-full bg-forge-amber"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-mono text-xs text-forge-dim uppercase tracking-wider mb-1">
                  {idx + 1} of {STEPS.length}
                </p>
                <h3 className="font-display text-xl tracking-widest text-forge-text">
                  {step.title}
                </h3>
              </div>
              <button
                onClick={close}
                className="text-forge-dim hover:text-forge-text transition-colors p-1 shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <p className="font-body text-sm text-forge-dim leading-relaxed mb-5">
              {step.body}
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={close}
                className="font-mono text-xs text-forge-muted hover:text-forge-dim transition-colors uppercase tracking-wider"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                {idx > 0 && (
                  <button
                    onClick={back}
                    className="font-mono text-xs text-forge-dim hover:text-forge-text transition-colors uppercase tracking-wider px-3 py-2"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={next}
                  className="bg-forge-amber text-forge-bg font-condensed font-black text-sm uppercase tracking-wider px-5 py-2.5 hover:bg-amber-400 transition-colors"
                >
                  {step.cta ?? 'Next →'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
