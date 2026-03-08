import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Copy, Check, Loader2, Wand2 } from 'lucide-react';
import {
  getDueSpacedRepetitionItems,
  submitSpacedRepetitionReview,
  generateSpacedRepetitionExplanation,
  type SpacedRepetitionItemPublic,
} from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function SpacedRepetitionReminder() {
  const { isAuthenticated } = useAppStore();
  const [items, setItems] = useState<SpacedRepetitionItemPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);

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

  const handleGenerate = async (item: SpacedRepetitionItemPublic) => {
    if (explanations[item.id]) return; // Already generated
    setLoadingExplanation(item.id);
    try {
      const res = await generateSpacedRepetitionExplanation(item.id);
      setExplanations((prev) => ({ ...prev, [item.id]: res.explanation }));
    } catch {
      setExplanations((prev) => ({ ...prev, [item.id]: 'Failed to generate explanation. Please ensure you have an active AI key.' }));
    } finally {
      setLoadingExplanation(null);
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
        <span className="font-mono text-sm uppercase tracking-wider text-forge-amber">
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
              <p className="font-condensed font-bold text-base text-forge-text mb-2">
                {item.topic_name}
              </p>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <button
                  onClick={() => handleGenerate(item)}
                  disabled={loadingExplanation === item.id || !!explanations[item.id]}
                  className="flex items-center gap-1.5 px-2 py-1.5 border border-forge-amber/50 hover:bg-forge-amber/10 text-forge-amber font-mono text-sm uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingExplanation === item.id ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Generating...
                    </>
                  ) : explanations[item.id] ? (
                    <>
                      <Check size={12} />
                      Generated
                    </>
                  ) : (
                    <>
                      <Wand2 size={12} />
                      Generate Explanation
                    </>
                  )}
                </button>
                {(explanations[item.id] || loadingExplanation === item.id) && (
                  <>
                    <span className="font-mono text-[13px] text-forge-dim ml-2 border-l border-forge-border pl-4">Rate understanding:</span>
                    <button
                      onClick={() => handleReviewed(item, true)}
                      className="px-2 py-1.5 border border-green-500/50 hover:bg-green-500/10 text-green-400 font-mono text-sm uppercase tracking-wider transition-colors"
                    >
                      Got it
                    </button>
                    <button
                      onClick={() => handleReviewed(item, false)}
                      className="px-2 py-1.5 border border-forge-border hover:bg-forge-surface2 text-forge-dim font-mono text-sm uppercase tracking-wider transition-colors"
                    >
                      Review again
                    </button>
                  </>
                )}
              </div>

              {explanations[item.id] && (
                <div className="mt-3 bg-forge-surface border border-forge-border p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <div className="prose prose-invert prose-forge prose-sm max-w-none 
                    prose-headings:font-condensed prose-headings:font-bold prose-headings:text-forge-text
                    prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h1:uppercase prose-h2:uppercase
                    prose-p:font-body prose-p:text-forge-dim prose-p:leading-relaxed
                    prose-a:text-forge-amber prose-a:no-underline hover:prose-a:underline
                    prose-strong:text-forge-text prose-strong:font-bold
                    prose-ul:list-disc prose-ol:list-decimal
                    prose-li:text-forge-dim marker:text-forge-amber my-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {explanations[item.id]}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
