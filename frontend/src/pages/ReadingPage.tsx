import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, ExternalLink, Trash2, Loader2, Brain } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { GoalResource } from '@/types';
import { buildReadingInsightsPrompt, inferIndustries } from '@/prompts/reading-insights';
import { callGeminiForInsights, hasGeminiKey } from '@/lib/gemini';

// ── Types ─────────────────────────────────────────────────────
interface AIInsight {
  id: string;
  title: string;
  source: string;
  category: string;
  type: string;
  summary: string;
  keyTakeaway: string;
  actionItem: string;
  relevantGoal: string;
  url: string | null;
  freshness: string;
}

interface MindsetEntry {
  id: string;
  title: string;
  book: string;
  author: string;
  category: string;
  summary: string;
  keyLesson: string;
  howToApply: string;
}

const INSIGHT_TYPE_LABELS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  industry_move: { label: 'Industry Move', emoji: '🏢', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  skill_insight: { label: 'Skill Insight', emoji: '🎯', color: 'text-green-400', bg: 'bg-green-500/10' },
  career_intel: { label: 'Career Intel', emoji: '📊', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  tool_discovery: { label: 'Tool', emoji: '🔧', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  learning_resource: { label: 'Resource', emoji: '📚', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

const FRESHNESS_COLORS: Record<string, string> = {
  'this week': 'text-green-400 border-green-700 bg-green-500/5',
  'this month': 'text-blue-400 border-blue-700 bg-blue-500/5',
  'last 3 months': 'text-forge-dim border-forge-border',
  recent: 'text-forge-dim border-forge-border',
};

const MINDSET_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  resilience: { label: '🔥 Resilience', color: 'text-red-400', bg: 'bg-red-500/10' },
  habits: { label: '⚡ Habits', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  mindset: { label: '🧠 Mindset', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  discipline: { label: '🎯 Discipline', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  motivation: { label: '💪 Drive', color: 'text-green-400', bg: 'bg-green-500/10' },
  leadership: { label: '👑 Leadership', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
};

// ── Components ──────────────────────────────────────────────

function InsightCard({ item, index }: { item: AIInsight; index: number }) {
  const typeInfo = INSIGHT_TYPE_LABELS[item.type] || INSIGHT_TYPE_LABELS.skill_insight;
  const freshnessStyle = FRESHNESS_COLORS[item.freshness] || FRESHNESS_COLORS.recent;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="forge-card"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn('type-tag text-[8px] py-0', typeInfo.bg, typeInfo.color)}>
              {typeInfo.emoji} {typeInfo.label}
            </span>
            <span className={cn('font-mono text-[8px] uppercase tracking-wider px-1.5 py-0 border', freshnessStyle)}>
              {item.freshness}
            </span>
          </div>
          {item.relevantGoal && item.relevantGoal !== 'general' && (
            <span className="font-mono text-[8px] text-forge-amber uppercase tracking-wider border border-forge-amber/30 bg-amber-500/5 px-1.5 py-0 shrink-0">
              {item.relevantGoal}
            </span>
          )}
        </div>

        <h3 className="font-condensed font-black text-base uppercase tracking-wide text-forge-text mb-1 leading-tight">
          {item.title}
        </h3>
        <p className="font-mono text-[11px] text-forge-dim mb-2">{item.source}</p>

        <div className="border-l-2 border-forge-amber pl-3 bg-amber-500/5 py-1.5 pr-3 mb-2">
          <p className="text-xs text-forge-text font-body font-semibold leading-relaxed">{item.keyTakeaway}</p>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-forge-amber hover:text-forge-text transition-colors">
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? 'Less' : 'Details'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <p className="text-xs text-forge-dim leading-relaxed mt-2 mb-2 font-body">{item.summary}</p>
              <div className="border border-forge-border bg-forge-surface2 px-3 py-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-forge-amber mb-0.5">Action</p>
                <p className="text-xs text-forge-text font-body leading-relaxed">{item.actionItem}</p>
              </div>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-forge-amber hover:text-forge-text hover:underline mt-2">
                  Source <ExternalLink size={9} />
                </a>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MindsetCard({ item, index }: { item: MindsetEntry; index: number }) {
  const catInfo = MINDSET_CATEGORIES[item.category] || MINDSET_CATEGORIES.mindset;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="forge-card"
    >
      <div className="p-5">
        <div className="flex items-center gap-1.5 mb-2">
          <span className={cn('type-tag text-[8px] py-0', catInfo.bg, catInfo.color)}>{catInfo.label}</span>
          <span className="font-mono text-[8px] text-forge-muted uppercase tracking-wider border border-forge-border px-1.5 py-0">
            {item.book}
          </span>
        </div>

        <h3 className="font-condensed font-black text-base uppercase tracking-wide text-forge-text mb-1 leading-tight">
          {item.title}
        </h3>
        <p className="font-mono text-[11px] text-forge-dim mb-2">{item.author}</p>

        <div className="border-l-2 border-purple-400 pl-3 bg-purple-500/5 py-1.5 pr-3 mb-2">
          <p className="text-xs text-forge-text font-body font-semibold leading-relaxed">{item.keyLesson}</p>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-forge-amber hover:text-forge-text transition-colors">
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? 'Less' : 'How to Apply'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <p className="text-xs text-forge-dim leading-relaxed mt-2 mb-2 font-body">{item.summary}</p>
              <div className="border border-forge-border bg-forge-surface2 px-3 py-2">
                <p className="font-mono text-[8px] uppercase tracking-[0.2em] text-purple-400 mb-0.5">Apply This</p>
                <p className="text-xs text-forge-text font-body leading-relaxed">{item.howToApply}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Mindset prompt ──────────────────────────────────────────
function buildMindsetPrompt(): string {
  return `You are a reading curator. Generate 6-8 powerful lessons from the best self-help and mindset books.

Draw from books like:
- Can't Hurt Me (David Goggins)
- Atomic Habits (James Clear)
- Mindset (Carol Dweck)
- The 5 AM Club (Robin Sharma)
- Deep Work (Cal Newport)
- Grit (Angela Duckworth)
- Man's Search for Meaning (Viktor Frankl)
- The War of Art (Steven Pressfield)
- 12 Rules for Life (Jordan Peterson)
- Think Again (Adam Grant)

For each, give:
- A punchy lesson title
- The book and author
- A 2-sentence summary of the concept
- The single key lesson (one sentence)
- How to apply it TODAY (concrete action)

Return ONLY valid JSON array:

[
  {
    "id": "m1",
    "title": "The 40% Rule",
    "book": "Can't Hurt Me",
    "author": "David Goggins",
    "category": "resilience | habits | mindset | discipline | motivation | leadership",
    "summary": "When your mind tells you you're done, you're only at 40% of your capacity. Goggins discovered this through Navy SEAL training.",
    "keyLesson": "You are capable of far more than your mind tells you. Push past the mental barrier.",
    "howToApply": "Next time you want to quit a workout, study session, or hard task — do 10 more minutes. Train your brain that 'done' is negotiable."
  }
]

RULES:
- Mix different books. Don't use the same book twice.
- Each lesson should be a specific, named concept from the book (not generic advice).
- "howToApply" must be actionable TODAY.
- Keep it varied: mix resilience, habits, mindset, discipline.`;
}

// ── Main Page ───────────────────────────────────────────────
export default function ReadingPage() {
  const { goals } = useAppStore();
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [mindsetEntries, setMindsetEntries] = useState<MindsetEntry[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [loadingMindset, setLoadingMindset] = useState(false);
  const [error, setError] = useState('');
  const [bottomTab, setBottomTab] = useState<'resources' | 'mindset'>('resources');

  // Extract and deduplicate goal resources
  const goalResources = useMemo(() => {
    const seen = new Set<string>();
    const resources: Array<{ resource: GoalResource; goalNames: string[] }> = [];
    goals.forEach((goal) => {
      if (goal.topics) {
        goal.topics.forEach((topic) => {
          topic.resources?.forEach((r) => {
            const key = `${r.title.toLowerCase().trim()}|${r.type}`;
            const existing = resources.find((_, i) => {
              const k = `${resources[i].resource.title.toLowerCase().trim()}|${resources[i].resource.type}`;
              return k === key;
            });
            if (existing) {
              if (!existing.goalNames.includes(goal.name)) {
                existing.goalNames.push(goal.name);
              }
            } else if (!seen.has(key)) {
              seen.add(key);
              resources.push({ resource: r, goalNames: [goal.name] });
            }
          });
        });
      }
    });
    return resources;
  }, [goals]);

  // Group resources by goal
  const groupedResources = useMemo(() => {
    const groups: Record<string, Array<{ resource: GoalResource; goalNames: string[] }>> = {};
    goalResources.forEach((item) => {
      const primary = item.goalNames[0];
      if (!groups[primary]) groups[primary] = [];
      groups[primary].push(item);
    });
    return groups;
  }, [goalResources]);

  const [lastPrompt, setLastPrompt] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);

  const handleGetInsights = async () => {
    if (!hasGeminiKey()) {
      setError('Set your API key in Settings first.');
      return;
    }
    setError('');
    setPromptCopied(false);
    setLoadingInsights(true);
    try {
      const goalNames = goals.map(g => g.name);
      const goalTypes = [...new Set(goals.map(g => g.type))];
      const industries = inferIndustries(goalNames, goalTypes);
      const prompt = buildReadingInsightsPrompt({ goalNames, goalTypes, industries });
      setLastPrompt(prompt);
      const result = await callGeminiForInsights<AIInsight>(prompt);
      if (result && result.length > 0) {
        setAiInsights(result.map((item, i) => ({
          id: item.id ?? `ai-${i}`,
          title: item.title ?? 'Untitled',
          source: item.source ?? 'Unknown',
          category: item.category ?? 'tech',
          type: item.type ?? 'skill_insight',
          summary: item.summary ?? '',
          keyTakeaway: item.keyTakeaway ?? '',
          actionItem: item.actionItem ?? '',
          relevantGoal: item.relevantGoal ?? 'general',
          url: item.url ?? null,
          freshness: item.freshness ?? 'recent',
        })));
      } else {
        setError('No insights generated. Try again.');
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Unknown'}`);
      // Auto-copy prompt on failure
      if (lastPrompt) {
        navigator.clipboard.writeText(lastPrompt).then(() => setPromptCopied(true)).catch(() => { });
      }
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleGetMindset = async () => {
    if (!hasGeminiKey()) {
      setError('Set your API key in Settings first.');
      return;
    }
    setError('');
    setPromptCopied(false);
    setLoadingMindset(true);
    try {
      const prompt = buildMindsetPrompt();
      setLastPrompt(prompt);
      const result = await callGeminiForInsights<MindsetEntry>(prompt);
      if (result && result.length > 0) {
        setMindsetEntries(result.map((item, i) => ({
          id: item.id ?? `m-${i}`,
          title: item.title ?? 'Untitled',
          book: item.book ?? 'Unknown',
          author: item.author ?? 'Unknown',
          category: item.category ?? 'mindset',
          summary: item.summary ?? '',
          keyLesson: item.keyLesson ?? '',
          howToApply: item.howToApply ?? '',
        })));
      } else {
        setError('No entries generated. Try again.');
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Unknown'}`);
      if (lastPrompt) {
        navigator.clipboard.writeText(lastPrompt).then(() => setPromptCopied(true)).catch(() => { });
      }
    } finally {
      setLoadingMindset(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-10 bg-forge-surface border-b border-forge-border px-4 lg:px-10 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-forge-dim mb-1">// Library</p>
            <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">READING ROOM</h2>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-forge-amber" />
            <span className="font-mono text-xs text-forge-dim uppercase tracking-wider">
              {aiInsights.length + goalResources.length + mindsetEntries.length} pieces
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-10 py-8 flex flex-col gap-8">

        {error && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] text-red-400">⚠ {error}</p>
            {promptCopied && (
              <span className="font-mono text-[8px] text-forge-muted uppercase tracking-wider">prompt copied to clipboard</span>
            )}
          </div>
        )}

        {/* ── Fresh Insights ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-forge-amber" />
              <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">
                Fresh Insights
              </h3>
              {aiInsights.length > 0 && (
                <span className="font-mono text-xs text-forge-dim">{aiInsights.length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {aiInsights.length > 0 && (
                <button onClick={() => setAiInsights([])}
                  className="forge-btn-ghost flex items-center gap-1 text-xs text-forge-muted">
                  <Trash2 size={11} /> Clear
                </button>
              )}
              <button onClick={handleGetInsights} disabled={loadingInsights}
                className={cn(
                  'flex items-center gap-1.5 border px-3 py-1.5 font-condensed font-bold text-xs uppercase tracking-wider transition-colors',
                  loadingInsights
                    ? 'border-forge-border text-forge-muted'
                    : 'border-forge-amber text-forge-amber hover:bg-amber-500/5'
                )}>
                {loadingInsights ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {loadingInsights ? 'Generating...' : 'Get Fresh Insights'}
              </button>
            </div>
          </div>

          {aiInsights.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {aiInsights.map((item, i) => (
                <InsightCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : !loadingInsights ? (
            <div className="border border-dashed border-forge-border text-center py-6">
              <Sparkles size={18} className="text-forge-amber mx-auto mb-2 opacity-60" />
              <p className="font-mono text-xs text-forge-muted max-w-sm mx-auto">
                {hasGeminiKey()
                  ? `Get personalized insights based on your ${goals.length} goal${goals.length !== 1 ? 's' : ''}.`
                  : 'Set your API key in Settings to get started.'
                }
              </p>
            </div>
          ) : null}
        </section>

        {/* ── Resources / Mindset tab toggle ──────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            {/* Tab buttons */}
            <div className="flex border border-forge-border">
              <button
                onClick={() => setBottomTab('resources')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 font-condensed font-bold text-xs uppercase tracking-wider transition-colors',
                  bottomTab === 'resources'
                    ? 'bg-forge-amber text-forge-bg'
                    : 'text-forge-dim hover:text-forge-text'
                )}
              >
                <BookOpen size={12} />
                My Resources
                {goalResources.length > 0 && (
                  <span className={cn('font-mono text-xs', bottomTab === 'resources' ? 'text-forge-bg/70' : 'text-forge-muted')}>
                    {goalResources.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setBottomTab('mindset')}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 font-condensed font-bold text-xs uppercase tracking-wider transition-colors',
                  bottomTab === 'mindset'
                    ? 'bg-purple-600 text-forge-text'
                    : 'text-forge-dim hover:text-forge-text'
                )}
              >
                <Brain size={12} />
                Mindset
                {mindsetEntries.length > 0 && (
                  <span className={cn('font-mono text-xs', bottomTab === 'mindset' ? 'text-forge-text/70' : 'text-forge-muted')}>
                    {mindsetEntries.length}
                  </span>
                )}
              </button>
            </div>

            {/* Actions for active tab */}
            {bottomTab === 'mindset' && (
              <div className="flex items-center gap-2">
                {mindsetEntries.length > 0 && (
                  <button onClick={() => setMindsetEntries([])}
                    className="font-mono text-xs text-forge-muted hover:text-red-400 transition-colors">
                    Clear
                  </button>
                )}
                <button onClick={handleGetMindset} disabled={loadingMindset}
                  className={cn(
                    'flex items-center gap-1 border px-3 py-1.5 font-condensed font-bold text-xs uppercase tracking-wider transition-colors',
                    loadingMindset
                      ? 'border-forge-border text-forge-muted'
                      : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/5'
                  )}>
                  {loadingMindset ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
                  {loadingMindset ? 'Loading...' : 'Get Wisdom'}
                </button>
              </div>
            )}
          </div>

          {/* Tab content */}
          {bottomTab === 'resources' && (
            <div>
              {goalResources.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(groupedResources).map(([goalName, items]) => (
                    <div key={goalName}>
                      <p className="font-mono text-xs uppercase tracking-wider text-forge-amber mb-1.5">{goalName}</p>
                      <div className="space-y-1">
                        {items.map((item, i) => (
                          <div key={`${item.resource.id}-${i}`}
                            className="flex items-center gap-2 px-3 py-2 bg-forge-surface2/50 border border-forge-border hover:border-forge-dim transition-colors">
                            <span className="text-sm shrink-0">
                              {item.resource.type === 'youtube' ? '▶' : item.resource.type === 'blog' ? '✎' : item.resource.type === 'docs' ? '📄' : '📚'}
                            </span>
                            <div className="flex-1 min-w-0">
                              {item.resource.url ? (
                                <a href={item.resource.url} target="_blank" rel="noopener noreferrer"
                                  className="font-mono text-xs text-forge-amber hover:text-forge-text hover:underline truncate block">
                                  {item.resource.title}
                                </a>
                              ) : (
                                <span className="font-mono text-xs text-forge-text truncate block">{item.resource.title}</span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] text-forge-muted uppercase shrink-0">{item.resource.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-forge-border text-center py-8">
                  <BookOpen size={18} className="text-forge-amber mx-auto mb-2 opacity-60" />
                  <p className="font-mono text-xs text-forge-muted">Resources from your goals will appear here</p>
                </div>
              )}
            </div>
          )}

          {bottomTab === 'mindset' && (
            <div>
              {mindsetEntries.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {mindsetEntries.map((item, i) => (
                    <MindsetCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              ) : !loadingMindset ? (
                <div className="border border-dashed border-forge-border text-center py-8">
                  <Brain size={18} className="text-purple-400 mx-auto mb-2 opacity-60" />
                  <p className="font-mono text-xs text-forge-muted max-w-sm mx-auto">
                    {hasGeminiKey()
                      ? 'Lessons from Goggins, Clear, Dweck, Newport and more.'
                      : 'Set your API key in Settings to unlock this.'
                    }
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {goalResources.length === 0 && aiInsights.length === 0 && mindsetEntries.length === 0
          && !loadingInsights && !loadingMindset && (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">📚</div>
              <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-dim">
                Your reading room is empty
              </p>
              <p className="font-mono text-xs text-forge-muted mt-1">
                Add goals or generate insights to fill it up.
              </p>
            </div>
          )}

        <div className="border-t border-forge-border pt-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">
            FORGE — BUILD THE PERSON YOU NEED TO BE
          </p>
        </div>
      </div>
    </div>
  );
}
