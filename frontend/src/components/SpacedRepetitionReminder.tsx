import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Copy, Check } from 'lucide-react';
import {
  getDueSpacedRepetitionItems,
  getSpacedRepetitionPrompt,
  submitSpacedRepetitionReview,
  type SpacedRepetitionItemPublic,
} from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function SpacedRepetitionReminder() {
  const { isAuthenticated } = useAppStore();
  const [items, setItems] = useState<SpacedRepetitionItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    getDueSpacedRepetitionItems()
      .then((res) => setItems(res.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const fetchPrompt = async (id: string) => {
    if (prompts[id]) return prompts[id];
    try {
      const res = await getSpacedRepetitionPrompt(id);
      setPrompts((p) => ({ ...p, [id]: res.prompt }));
      return res.prompt;
    } catch {
      return '';
    }
  };

  const handleCopy = async (item: SpacedRepetitionItemPublic) => {
    const prompt = await fetchPrompt(item.id);
    if (prompt) {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleReviewed = async (item: SpacedRepetitionItemPublic, correct: boolean) => {
    try {
      await submitSpacedRepetitionReview(item.id, correct);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      // ignore
    }
  };

  if (!isAuthenticated || loading) return null;
  if (items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-forge-surface border border-forge-border overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-forge-border flex items-center gap-2">
        <BookOpen size={14} className="text-forge-amber" />
        <span className="font-mono text-xs uppercase tracking-wider text-forge-amber">
          Review Due ({items.length})
        </span>
      </div>
      <div className="p-4 space-y-3">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="border border-forge-border p-3 bg-forge-surface2/50"
            >
              <p className="font-condensed font-bold text-sm text-forge-text mb-2">
                {item.topic_name}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleCopy(item)}
                  className="flex items-center gap-1.5 px-2 py-1.5 border border-forge-amber/50 hover:bg-forge-amber/10 text-forge-amber font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={12} />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      Copy Prompt
                    </>
                  )}
                </button>
                <span className="font-mono text-[11px] text-forge-dim">Then:</span>
                <button
                  onClick={() => handleReviewed(item, true)}
                  className="px-2 py-1.5 border border-green-500/50 hover:bg-green-500/10 text-green-400 font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  Got it
                </button>
                <button
                  onClick={() => handleReviewed(item, false)}
                  className="px-2 py-1.5 border border-forge-border hover:bg-forge-surface2 text-forge-dim font-mono text-xs uppercase tracking-wider transition-colors"
                >
                  Review again
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
