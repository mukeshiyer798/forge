import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, ChevronDown, ChevronUp, ExternalLink, Trash2, Loader2, Brain } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';
import type { GoalResource, AIInsight } from '@/types';
import { apiRequest } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────

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
            <span className={cn('type-tag text-[10px] py-0', typeInfo.bg, typeInfo.color)}>
              {typeInfo.emoji} {typeInfo.label}
            </span>
            <span className={cn('font-mono text-[10px] uppercase tracking-wider px-1.5 py-0 border', freshnessStyle)}>
              {item.freshness}
            </span>
            {item.category && (
              <span className="font-mono text-[10px] text-forge-muted uppercase tracking-wider border border-forge-border px-1.5 py-0">
                {item.category}
              </span>
            )}
          </div>
        </div>

        <h3 className="font-condensed font-black text-base uppercase tracking-wide text-forge-text mb-1 leading-tight">
          {item.title}
        </h3>
        <p className="font-mono text-[13px] text-forge-dim mb-2">{item.source}</p>

        {/* Hook teaser */}
        {item.hook ? (
          <div className="border-l-2 border-forge-amber pl-3 bg-amber-500/5 py-1.5 pr-3 mb-2">
            <p className="text-sm text-forge-text font-body font-semibold leading-relaxed">{item.hook}</p>
          </div>
        ) : item.keyTakeaway ? (
          <div className="border-l-2 border-forge-amber pl-3 bg-amber-500/5 py-1.5 pr-3 mb-2">
            <p className="text-sm text-forge-text font-body font-semibold leading-relaxed">{item.keyTakeaway}</p>
          </div>
        ) : null}

        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 font-mono text-[13px] uppercase tracking-wider text-forge-amber hover:text-forge-text transition-colors">
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? 'Less' : 'Details'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              {item.before && (
                <div className="mt-3 space-y-2">
                  <div className="border border-forge-border p-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-forge-muted mb-1">Before</p>
                    <p className="text-sm text-forge-dim leading-relaxed font-body">{item.before}</p>
                  </div>
                  {item.after && (
                    <div className="border border-forge-amber/30 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-forge-amber mb-1">After</p>
                      <p className="text-sm text-forge-text leading-relaxed font-body">{item.after}</p>
                    </div>
                  )}
                  {item.whyItMatters && (
                    <div className="border border-forge-border bg-forge-surface2 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-forge-amber mb-1">Why It Matters</p>
                      <p className="text-sm text-forge-text leading-relaxed font-body">{item.whyItMatters}</p>
                    </div>
                  )}
                </div>
              )}
              {!item.before && (
                <p className="text-sm text-forge-dim leading-relaxed mt-2 mb-2 font-body">{item.summary}</p>
              )}
              {item.actionItem && (
                <div className="border border-forge-border bg-forge-surface2 px-3 py-2 mt-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-forge-amber mb-0.5">Action</p>
                  <p className="text-sm text-forge-text font-body leading-relaxed">{item.actionItem}</p>
                </div>
              )}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sm text-forge-amber hover:text-forge-text hover:underline mt-2">
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
          <span className={cn('type-tag text-[10px] py-0', catInfo.bg, catInfo.color)}>{catInfo.label}</span>
          <span className="font-mono text-[10px] text-forge-muted uppercase tracking-wider border border-forge-border px-1.5 py-0">
            {item.book}
          </span>
        </div>

        <h3 className="font-condensed font-black text-base uppercase tracking-wide text-forge-text mb-1 leading-tight">
          {item.title}
        </h3>
        <p className="font-mono text-[13px] text-forge-dim mb-2">{item.author}</p>

        <div className="border-l-2 border-purple-400 pl-3 bg-purple-500/5 py-1.5 pr-3 mb-2">
          <p className="text-sm text-forge-text font-body font-semibold leading-relaxed">{item.keyLesson}</p>
        </div>

        <button onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 font-mono text-[13px] uppercase tracking-wider text-forge-amber hover:text-forge-text transition-colors">
          {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
          {expanded ? 'Less' : 'How to Apply'}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <p className="text-sm text-forge-dim leading-relaxed mt-2 mb-2 font-body">{item.summary}</p>
              <div className="border border-forge-border bg-forge-surface2 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-purple-400 mb-0.5">Apply This</p>
                <p className="text-sm text-forge-text font-body leading-relaxed">{item.howToApply}</p>
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
import {
  fetchGoals,
  deleteGoalApi,
  GoalPublicBackend,
  fetchReadingInsights,
  deleteReadingInsightApi,
  fetchUniversalMindset,
  WisdomBackend
} from '@/lib/api';
export default function ReadingPage() {
  const { user, goals, readingInsights, addReadingInsight, deleteReadingInsight } = useAppStore();
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
    setError('');
    setLoadingInsights(true);
    try {
      const res = await apiRequest<{ data: any[]; count: number }>('/ai/intelligence-feed', {
        method: 'POST',
      });

      if (res && res.data && res.data.length > 0) {
        res.data.forEach((item: any) => {
          addReadingInsight({
            title: item.title ?? 'Untitled',
            source: item.source ?? 'Intelligence Feed',
            category: item.category ?? 'tech',
            type: item.type ?? 'industry_move',
            summary: item.whyItMatters ?? item.summary ?? '',
            keyTakeaway: item.hook ?? item.phaseConnection ?? '',
            actionItem: item.actionItem ?? '',
            relevantGoal: 'general',
            url: item.url ?? null,
            freshness: item.eventDate ?? 'this week',
            hook: item.hook ?? undefined,
            before: item.before ?? undefined,
            after: item.after ?? undefined,
            whyItMatters: item.whyItMatters ?? undefined,
          });
        });
      } else {
        setError('No feed items generated. Ensure goals exist and API key is set.');
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Unknown Error'}`);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleGetMindset = async () => {
    setError('');
    setPromptCopied(false);
    setLoadingMindset(true);
    try {
      const result = await apiRequest<{ data: any[]; count: number }>('/ai/frameworks', {
        method: 'POST',
      });
      if (result && result.data && result.data.length > 0) {
        setMindsetEntries(result.data.map((item: any, i: number) => ({
          id: item.id ?? `f-${i}`,
          title: item.frameworkName ?? 'Untitled',
          book: item.book ?? 'Unknown',
          author: item.author ?? 'Unknown',
          category: item.category ?? 'discipline',
          summary: item.coreIdea ?? '',
          keyLesson: item.appliedTo ?? '',
          howToApply: item.fiveMinuteAction ?? '',
        })));
      } else {
        setError('No frameworks generated. Ensure active API keys are set.');
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Unknown Error'}`);
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
            <p className="font-mono text-sm uppercase tracking-[0.2em] text-forge-dim mb-1">// Library</p>
            <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">READING ROOM</h2>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-forge-amber" />
            <span className="font-mono text-sm text-forge-dim uppercase tracking-wider">
              {readingInsights.length + goalResources.length + mindsetEntries.length} pieces
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-10 py-8 flex flex-col gap-8">

        {error && (
          <div className="flex items-center justify-between">
            <p className="font-mono text-[13px] text-red-400">⚠ {error}</p>
            {promptCopied && (
              <span className="font-mono text-[10px] text-forge-muted uppercase tracking-wider">prompt copied to clipboard</span>
            )}
          </div>
        )}

        {/* ── Intelligence Feed ──────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-forge-amber" />
              <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">
                Intelligence Feed
              </h3>
              {readingInsights.length > 0 && (
                <span className="font-mono text-sm text-forge-dim">{readingInsights.length}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {readingInsights.length > 0 && (
                <button onClick={() => readingInsights.forEach(i => deleteReadingInsight(i.id))}
                  className="forge-btn-ghost flex items-center gap-1 text-sm text-forge-muted">
                  <Trash2 size={11} /> Clear
                </button>
              )}
              <button onClick={handleGetInsights} disabled={loadingInsights}
                className={cn(
                  'flex items-center gap-1.5 border px-3 py-1.5 font-condensed font-bold text-sm uppercase tracking-wider transition-colors',
                  loadingInsights
                    ? 'border-forge-border text-forge-muted'
                    : 'border-forge-amber text-forge-amber hover:bg-amber-500/5'
                )}>
                {loadingInsights ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {loadingInsights ? 'Generating...' : 'Get Contextual Feed'}
              </button>

            </div>
          </div>

          {readingInsights.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {readingInsights.map((item, i) => (
                <InsightCard key={item.id} item={item} index={i} />
              ))}
            </div>
          ) : !loadingInsights ? (
            <div className="border border-dashed border-forge-border text-center py-6">
              <Sparkles size={18} className="text-forge-amber mx-auto mb-2 opacity-60" />
              <p className="font-mono text-sm text-forge-muted max-w-sm mx-auto">
                {user?.hasOpenrouterKey
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
                  'flex items-center gap-1.5 px-4 py-2 font-condensed font-bold text-sm uppercase tracking-wider transition-colors',
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
                  'flex items-center gap-1.5 px-4 py-2 font-condensed font-bold text-sm uppercase tracking-wider transition-colors',
                  bottomTab === 'mindset'
                    ? 'bg-purple-600 text-forge-text'
                    : 'text-forge-dim hover:text-forge-text'
                )}
              >
                <Brain size={12} />
                Applied Frameworks
                {mindsetEntries.length > 0 && (
                  <span className={cn('font-mono text-sm', bottomTab === 'mindset' ? 'text-forge-text/70' : 'text-forge-muted')}>
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
                    className="font-mono text-sm text-forge-muted hover:text-red-400 transition-colors">
                    Clear
                  </button>
                )}
                <button onClick={handleGetMindset} disabled={loadingMindset}
                  className={cn(
                    'flex items-center gap-1 border px-3 py-1.5 font-condensed font-bold text-sm uppercase tracking-wider transition-colors',
                    loadingMindset
                      ? 'border-forge-border text-forge-muted'
                      : 'border-purple-500/50 text-purple-400 hover:bg-purple-500/5'
                  )}>
                  {loadingMindset ? <Loader2 size={11} className="animate-spin" /> : <Brain size={11} />}
                  {loadingMindset ? 'Loading...' : 'Get Frameworks'}
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
                      <p className="font-mono text-sm uppercase tracking-wider text-forge-amber mb-1.5">{goalName}</p>
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
                                  className="font-mono text-sm text-forge-amber hover:text-forge-text hover:underline truncate block">
                                  {item.resource.title}
                                </a>
                              ) : (
                                <div className="font-mono text-sm text-forge-text truncate block"><FormattedText text={item.resource.title} /></div>
                              )}
                            </div>
                            <span className="font-mono text-[13px] text-forge-muted uppercase shrink-0">{item.resource.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-dashed border-forge-border text-center py-8">
                  <BookOpen size={18} className="text-forge-amber mx-auto mb-2 opacity-60" />
                  <p className="font-mono text-sm text-forge-muted">Resources from your goals will appear here</p>
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
                  <p className="font-mono text-sm text-forge-muted max-w-sm mx-auto">
                    {user?.hasOpenrouterKey
                      ? 'Applied frameworks (Clear, Goggins, Newport) tailored exactly to your active goals.'
                      : 'Set your API key in Settings to unlock this.'
                    }
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {goalResources.length === 0 && readingInsights.length === 0 && mindsetEntries.length === 0
          && !loadingInsights && !loadingMindset && (
            <div className="text-center py-12">
              <div className="text-3xl mb-2">📚</div>
              <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-dim">
                Your reading room is empty
              </p>
              <p className="font-mono text-sm text-forge-muted mt-1">
                Add goals or generate insights to fill it up.
              </p>
            </div>
          )}

        <div className="border-t border-forge-border pt-6 text-center">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-forge-muted">
            FORGE — BUILD THE PERSON YOU NEED TO BE
          </p>
        </div>
      </div>
    </div>
  );
}

function FormattedText({ text, className }: { text: string; className?: string }) {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s()]+)/g;
  const parts = text.split(urlRegex);

  if (parts.length === 1) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forge-amber hover:text-forge-text hover:underline mx-1 cursor-pointer font-bold"
              onClick={e => e.stopPropagation()}
            >
              [Link]
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
