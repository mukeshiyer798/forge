import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, ClipboardCopy, Check, ChevronRight, ArrowLeft, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { generateId } from '@/lib/utils';
import { buildForgeCoachPrompt, formatGoalsForPrompt } from '@/prompts/forge-coach-roadmap';
import type { GoalType, Goal, GoalTopic, GoalResource, GoalBuild, GoalCapstone } from '@/types';
import { cn } from '@/lib/utils';
import { GOAL_TEMPLATES } from '@/lib/goalTemplates';
import { useToast } from '@/lib/toast';
import { callGemini, hasGeminiKey } from '@/lib/gemini';

interface AddGoalModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = 'quick' | 'ai-prompt' | 'ai-paste-educate' | 'ai-import' | 'ai-review';

type GoalForReview = Omit<Goal, 'id' | 'createdAt' | 'lastLoggedAt' | 'progress'>;

const GOAL_TYPES: { value: GoalType; label: string; emoji: string }[] = [
  { value: 'learn', label: 'Learning', emoji: '📚' },
  { value: 'build', label: 'Build / Project', emoji: '🔨' },
  { value: 'habit', label: 'Habit', emoji: '🌱' },
  { value: 'fitness', label: 'Fitness', emoji: '💪' },
];

/** Map FORGE Coach JSON array item to our Goal shape */
function mapForgeCoachGoalToGoal(raw: Record<string, unknown>, fallbackDeadline: string): Omit<Goal, 'id' | 'createdAt' | 'lastLoggedAt' | 'progress'> {
  const type = (raw.type === 'learn' || raw.type === 'build' || raw.type === 'habit' || raw.type === 'fitness') ? raw.type : 'learn';
  const topicsRaw = (raw.topics ?? []) as Array<Record<string, unknown>>;
  const topics: GoalTopic[] = topicsRaw.map((t) => {
    const res = (t.resources ?? []) as Array<Record<string, unknown>>;
    const resources: GoalResource[] = res.map((r) => ({
      id: generateId(),
      title: (r.title as string) ?? '',
      detail: r.detail as string | undefined,
      type: (r.type === 'book' || r.type === 'course' || r.type === 'docs' || r.type === 'video' || r.type === 'article' || r.type === 'blog' || r.type === 'youtube') ? r.type : 'docs',
      url: (r.url as string | null) ?? null,
    }));
    const buildRaw = t.build as Record<string, unknown> | undefined;
    const build: GoalBuild = buildRaw
      ? {
        name: (buildRaw.name as string) ?? 'Build',
        description: buildRaw.description as string | undefined,
        doneWhen: buildRaw.doneWhen as string | undefined,
        estimatedHours: typeof buildRaw.estimatedHours === 'number' ? buildRaw.estimatedHours : undefined,
        completed: !!buildRaw.completed,
      }
      : { name: 'Build', completed: false };
    const st = (t.subtopics ?? []) as Array<{ id?: string; name?: string; completed?: boolean }>;
    return {
      id: (t.id as string) ?? generateId(),
      name: (t.name as string) ?? 'Topic',
      description: t.description as string | undefined,
      taskNumber: typeof t.taskNumber === 'number' ? t.taskNumber : (typeof t.weekNumber === 'number' ? t.weekNumber : 1), // Support both for backward compatibility
      completed: !!t.completed,
      resources,
      build,
      subtopics: st.map((s) => ({ id: (s.id as string) ?? generateId(), name: (s.name as string) ?? 'Sub', completed: !!s.completed })),
      activeRecallQuestion: (t.activeRecallQuestion as string | undefined) ?? undefined,
      activeRecallAnswer: (t.activeRecallAnswer as string | undefined) ?? undefined,
      interviewPrep: Array.isArray(t.interviewPrep) ? (t.interviewPrep as Array<{ question?: string; answer?: string }>).map(ip => ({
        question: ip.question ?? '',
        answer: ip.answer ?? '',
      })) : undefined,
    };
  });
  const capRaw = raw.capstone as Record<string, unknown> | undefined;
  const capstone: GoalCapstone | undefined = capRaw
    ? {
      name: (capRaw.name as string) ?? 'Capstone',
      description: capRaw.description as string | undefined,
      portfolioPitch: capRaw.portfolioPitch as string | undefined,
      doneWhen: capRaw.doneWhen as string | undefined,
      estimatedHours: typeof capRaw.estimatedHours === 'number' ? capRaw.estimatedHours : undefined,
      completed: !!capRaw.completed,
    }
    : undefined;
  return {
    name: (raw.name as string) ?? 'Goal',
    type,
    description: (raw.description as string) ?? (raw.name as string) ?? 'Goal',
    subtopics: [],
    resources: [],
    targetDate: (raw.targetDate as string) ?? fallbackDeadline,
    status: 'on-track',
    priority: typeof raw.priority === 'number' ? raw.priority : undefined,
    topics: topics.length ? topics : undefined,
    capstone,
    dailyTaskRequirement: typeof raw.dailyTaskRequirement === 'number' ? raw.dailyTaskRequirement : undefined,
    userId: typeof raw.userId === 'string' ? raw.userId : undefined,
  };
}

export default function AddGoalModal({ open, onClose }: AddGoalModalProps) {
  const { addGoal, addGoals, user } = useAppStore();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('quick');

  // Manual form state
  const [form, setForm] = useState({
    name: '', type: 'learn' as GoalType, description: '',
    subtopicsRaw: '', resources: '', targetDate: '', priority: '' as string,
  });

  // AI flow: learner profile (for prompt)
  const [learnerBackground, setLearnerBackground] = useState('');
  const [learnerGoal, setLearnerGoal] = useState('');
  const [learnerWhyItMatters, setLearnerWhyItMatters] = useState('');
  const [learnerLearningStyle, setLearnerLearningStyle] = useState('');
  const [learnerHardDeadline, setLearnerHardDeadline] = useState('');
  const [learnerPreviouslyQuit, setLearnerPreviouslyQuit] = useState('');
  const [learnerHoursPerWeek, setLearnerHoursPerWeek] = useState('');
  const [learnerPreferredResources, setLearnerPreferredResources] = useState('');
  const [dailyTaskRequirement, setDailyTaskRequirement] = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);

  const [aiJson, setAiJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [reviewSource, setReviewSource] = useState<'ai-prompt' | 'ai-import'>('ai-prompt');
  const [importError, setImportError] = useState('');
  const [parsedGoalsForReview, setParsedGoalsForReview] = useState<GoalForReview[] | null>(null);

  const reset = () => {
    setMode('quick');
    setForm({ name: '', type: 'learn', description: '', subtopicsRaw: '', resources: '', targetDate: '', priority: '' });
    setLearnerBackground(''); setLearnerGoal('');
    setLearnerWhyItMatters(''); setLearnerLearningStyle(''); setLearnerHardDeadline('');
    setLearnerPreviouslyQuit(''); setLearnerHoursPerWeek('');
    setLearnerPreferredResources(''); setDailyTaskRequirement('');
    setAiJson(''); setCopied(false); setImportError(''); setParsedGoalsForReview(null);
    setGeminiLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const isoPlusDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };


  // ── AI copy prompt (FORGE Coach) ─────────────────────────
  const handleCopyPrompt = async () => {
    if (!learnerGoal.trim()) return;
    if (!dailyTaskRequirement.trim()) {
      alert('Please set a daily goal target');
      return;
    }
    const goalsStr = learnerGoal.trim();
    const prompt = buildForgeCoachPrompt({
      BACKGROUND: learnerBackground.trim() || '[e.g. 2 years Excel, zero coding]',
      GOAL: goalsStr,
      WHY_IT_MATTERS: learnerWhyItMatters.trim() || '[Why this matters to you]',
      HOURS_PER_WEEK: learnerHoursPerWeek.trim() || '[e.g. 10 hours]',
      LEARNING_STYLE: learnerLearningStyle.trim() || '[e.g. Prefer building over reading]',
      PREVIOUSLY_QUIT: learnerPreviouslyQuit.trim() || '[e.g. Started Udemy, dropped at week 2]',
      HARD_DEADLINE: learnerHardDeadline.trim() || 'within 8 months',
      PREFERRED_RESOURCES: learnerPreferredResources.trim() || '[No specific preferences]',
    });

    // Try AI API first (OpenRouter)
    if (hasGeminiKey()) {
      setGeminiLoading(true);
      setImportError('');
      try {
        const result = await callGemini<{ goals?: Array<Record<string, unknown>>; phaseRoadmap?: Record<string, string[]> }>(prompt);
        if (result) {
          const goalsArray = result.goals || (Array.isArray(result) ? result as unknown as Array<Record<string, unknown>> : []);
          if (goalsArray.length > 0) {
            const mapped = goalsArray.map((raw) => mapForgeCoachGoalToGoal(raw, fallbackDeadline));
            setParsedGoalsForReview(mapped);
            setReviewSource('ai-prompt');
            setMode('ai-review');
            setGeminiLoading(false);
            return;
          }
        }
        setImportError('AI returned no goals — prompt copied, paste into any AI.');
      } catch (err) {
        setImportError(`AI error: ${err instanceof Error ? err.message : 'Unknown'} — prompt copied.`);
      }
      setGeminiLoading(false);
    }

    // Fallback: copy prompt to clipboard
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setMode('ai-import');
  };

  const fallbackDeadline = learnerHardDeadline.trim() || '2026-12-31';

  // ── AI parse & go to review (no create yet) ───────────────
  const handleParseAndReview = () => {
    setImportError('');
    try {
      const trimmed = aiJson.replace(/^```(?:json)?\s*([\s\S]*?)```\s*$/m, '$1').trim();
      const parsed: unknown = JSON.parse(trimmed);

      // Handle new format: { goals: [...], phaseRoadmap: {...} }
      const parsedObj = parsed as Record<string, unknown>;
      if (parsedObj.goals && Array.isArray(parsedObj.goals) && (parsedObj.goals as unknown[]).length > 0) {
        const goals: GoalForReview[] = (parsedObj.goals as Array<Record<string, unknown>>).map((raw) =>
          mapForgeCoachGoalToGoal(raw, fallbackDeadline)
        );
        setParsedGoalsForReview(goals);
        setReviewSource('ai-import');
        setMode('ai-review');
        return;
      }

      // Handle legacy array format
      if (Array.isArray(parsed) && parsed.length > 0) {
        const goals: GoalForReview[] = (parsed as Array<Record<string, unknown>>).map((raw) =>
          mapForgeCoachGoalToGoal(raw, fallbackDeadline)
        );
        setParsedGoalsForReview(goals);
        setReviewSource('ai-import');
        setMode('ai-review');
        return;
      }

      interface LegacyPlan {
        major_topic?: string;
        goal_statement?: string;
        target_completion?: string;
        sub_topics?: Array<{ name?: string }>;
        resources?: Array<{ title?: string }>;
      }
      const plan = ((parsed as Record<string, unknown>).learning_plan ?? parsed) as LegacyPlan;
      if (!plan.major_topic) { setImportError('Missing learning_plan.major_topic or paste FORGE Coach JSON array.'); return; }
      const subtopics = (plan.sub_topics ?? []).map((st) => ({
        id: generateId(), name: st.name ?? 'Sub-topic', completed: false,
      }));
      const resources = (plan.resources ?? []).map((r) => r.title ?? '').filter(Boolean);
      const single: GoalForReview = {
        name: plan.major_topic,
        type: 'learn',
        description: plan.goal_statement ?? plan.major_topic,
        subtopics: subtopics.length ? subtopics : [{ id: generateId(), name: 'Getting Started', completed: false }],
        resources,
        targetDate: plan.target_completion ?? fallbackDeadline,
        status: 'on-track',
      };
      setParsedGoalsForReview([single]);
      setReviewSource('ai-import');
      setMode('ai-review');
    } catch {
      setImportError('Could not read your plan data. Paste the full plan exactly as provided by the AI assistant.');
    }
  };

  const updateReviewGoal = (index: number, patch: Partial<GoalForReview>) => {
    setParsedGoalsForReview((prev) => {
      if (!prev) return null;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeReviewGoal = (index: number) => {
    setParsedGoalsForReview((prev) => {
      if (!prev || prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleConfirmCreateGoals = () => {
    if (!parsedGoalsForReview?.length) return;
    const dailyTaskReq = parseInt(dailyTaskRequirement, 10);
    const goalsWithDailyReq = parsedGoalsForReview.map((g) => ({
      ...g,
      dailyTaskRequirement: dailyTaskReq || undefined,
      userId: user?.id,
    }));
    addGoals(goalsWithDailyReq);
    toast({
      title: 'Goals created',
      description: `${goalsWithDailyReq.length} added to your dashboard`,
      tone: 'success',
    });
    handleClose();
  };

  const titles: Record<Mode, string> = {
    quick: 'Create a Goal',
    'ai-prompt': 'AI Roadmap — Learner Profile',
    'ai-paste-educate': 'Use an AI Assistant',
    'ai-import': 'Add Your Plan',
    'ai-review': 'Review Your Plan',
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="forge-card w-[560px] max-w-[94vw] max-h-[88vh] overflow-y-auto"
          >
            <div className="amber-bar" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-forge-border">
              <div className="flex items-center gap-3">
                {mode !== 'quick' && (
                  <button onClick={() => setMode('quick')} className="text-forge-dim hover:text-forge-text transition-colors">
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h2 className="font-condensed font-black text-2xl uppercase tracking-widest text-forge-text">
                  {titles[mode]}
                </h2>
              </div>
              <button onClick={handleClose} className="text-forge-dim hover:text-forge-text transition-colors">
                <X size={18} />
              </button>
            </div>

            <AnimatePresence mode="wait">

              {/* ── QUICK: Templates + Simple Goal ─────────────── */}
              {mode === 'quick' && (
                <motion.div
                  key="quick"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-forge-dim">
                    Start simple, or use an AI assistant for a focused Phase 1 roadmap.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMode('ai-prompt')}
                      className="bg-amber-500/5 border border-amber-500/20 hover:border-forge-amber p-4 text-left transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Wand2 size={16} className="text-forge-amber" />
                        <span className="font-mono text-[11px] uppercase tracking-widest text-forge-amber">AI</span>
                      </div>
                      <p className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-text">
                        Build a focused roadmap
                      </p>
                      <p className="font-mono text-xs text-forge-dim mt-1">
                        Generates Phase 1 (5-7 deep topics). Depth over breadth.
                      </p>
                    </button>

                    <div className="border border-forge-border bg-forge-surface2/40 p-4">
                      <p className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-text mb-2">
                        Quick goal (3 fields)
                      </p>
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="forge-label">Name</label>
                          <input
                            className="forge-input"
                            placeholder="e.g. Improve Public Speaking"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="forge-label">Description</label>
                          <input
                            className="forge-input"
                            placeholder="What you want to be able to do"
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="forge-label">Deadline</label>
                          <input
                            type="date"
                            className="forge-input"
                            value={form.targetDate || ''}
                            onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
                          />
                        </div>
                        <button
                          type="button"
                          className="forge-btn-primary"
                          onClick={() => {
                            const name = form.name.trim();
                            if (!name) return;
                            addGoal({
                              name,
                              type: form.type,
                              description: (form.description || name).trim(),
                              subtopics: [{ id: generateId(), name: 'Getting started', completed: false }],
                              resources: [],
                              targetDate: form.targetDate || isoPlusDays(30),
                              status: 'on-track',
                              userId: user?.id,
                            });
                            toast({ title: 'Goal created', description: name, tone: 'success' });
                            handleClose();
                          }}
                          disabled={!form.name.trim()}
                        >
                          Create goal
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-forge-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-condensed font-black text-lg uppercase tracking-wider text-forge-text">
                        Templates
                      </h3>
                      <span className="font-mono text-xs text-forge-dim">{GOAL_TEMPLATES.length} options</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {GOAL_TEMPLATES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            addGoal({
                              name: t.name,
                              type: t.type,
                              description: t.description,
                              subtopics: [{ id: generateId(), name: 'Step 1', completed: false }],
                              resources: [],
                              targetDate: isoPlusDays(t.suggestedTargetDays),
                              status: 'on-track',
                              dailyTaskRequirement: t.dailyTarget,
                              userId: user?.id,
                            });
                            toast({ title: 'Template added', description: t.name, tone: 'success' });
                            handleClose();
                          }}
                          className="border border-forge-border bg-forge-surface2/30 hover:border-forge-amber p-4 text-left transition-colors"
                        >
                          <p className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-text">
                            {t.name}
                          </p>
                          <p className="font-mono text-xs text-forge-dim mt-1 line-clamp-2">{t.description}</p>
                          <p className="font-mono text-[11px] text-forge-muted mt-2">
                            {t.tags.join(' · ')}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── AI PROMPT: Learner profile → Copy prompt ─── */}
              {mode === 'ai-prompt' && (
                <motion.div
                  key="ai-prompt"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-forge-dim">
                    Fill in a few details. {hasGeminiKey()
                      ? "We'll generate your focused Phase 1 roadmap using AI."
                      : "We'll create a prompt you can paste into any AI (Claude, ChatGPT, Gemini)."}
                  </p>

                  {/* API key education banner */}
                  {!hasGeminiKey() && (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={15} className="text-forge-amber" />
                        <span className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-amber">
                          Unlock 1-Click Generation
                        </span>
                      </div>
                      <p className="font-body text-sm text-forge-dim leading-relaxed mb-3">
                        Add an <strong className="text-forge-text">OpenRouter API key</strong> in Settings to generate roadmaps instantly — no copy-pasting needed. OpenRouter gives you access to GPT-4, Claude, Gemini and more through one key.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => { handleClose(); useAppStore.getState().setActiveView('settings'); }}
                          className="flex items-center gap-1.5 border border-forge-amber text-forge-amber px-3 py-1.5 font-mono text-xs uppercase tracking-wider hover:bg-forge-amber/10 transition-colors"
                        >
                          Go to Settings →
                        </button>
                        <a
                          href="https://openrouter.ai/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-forge-dim hover:text-forge-amber underline transition-colors"
                        >
                          Get a free key
                        </a>
                      </div>
                      <p className="font-mono text-xs text-forge-muted mt-2">
                        No key? No problem — you can still copy the prompt below and use it with any AI.
                      </p>
                    </div>
                  )}

                  <div className="bg-forge-surface2/60 border border-forge-border p-3 mt-1">
                    <p className="font-mono text-xs text-forge-amber uppercase tracking-wider mb-1">How this works</p>
                    <p className="font-mono text-xs text-forge-dim leading-relaxed">
                      The AI will generate 5-7 deep, actionable topics — not a 30-item overwhelming list. Each topic has specific tasks, real resources (books, courses with chapter numbers), and a build project you can put on your portfolio. When you finish Phase 1, come back to generate Phase 2.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Background *</label>
                    <input className="forge-input" placeholder="e.g. 2 years Excel, zero coding, works in finance"
                      value={learnerBackground} onChange={e => setLearnerBackground(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">What do you want to learn? (One goal only) *</label>
                    <input className="forge-input" placeholder="e.g. Master React and build a portfolio"
                      value={learnerGoal} onChange={e => setLearnerGoal(e.target.value)} />
                    <p className="font-mono text-[11px] text-forge-amber/80 mt-1">
                      Focusing on one goal at a time gives the AI better context to generate actionable steps.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Why it matters *</label>
                    <input className="forge-input" placeholder="e.g. Hate my current job, want to build things, better pay"
                      value={learnerWhyItMatters} onChange={e => setLearnerWhyItMatters(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Preferred learning style *</label>
                    <input className="forge-input" placeholder="e.g. Gets bored reading, loves building things"
                      value={learnerLearningStyle} onChange={e => setLearnerLearningStyle(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Hard deadline *</label>
                    <input className="forge-input" placeholder="e.g. Job applications start in 8 months"
                      value={learnerHardDeadline} onChange={e => setLearnerHardDeadline(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Hours per week</label>
                    <input className="forge-input" placeholder="e.g. 10 hours"
                      value={learnerHoursPerWeek} onChange={e => setLearnerHoursPerWeek(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Previously quit / dropped?</label>
                    <input className="forge-input" placeholder="e.g. Started Udemy course, dropped at week 2"
                      value={learnerPreviouslyQuit} onChange={e => setLearnerPreviouslyQuit(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Preferred Resources <span className="text-forge-muted">(optional)</span></label>
                    <textarea className="forge-input font-mono text-[11px] resize-none min-h-[80px]"
                      placeholder="e.g. Effective Java, YouTube channels like Fireship, official docs..."
                      value={learnerPreferredResources} onChange={e => setLearnerPreferredResources(e.target.value)} />
                    <p className="font-mono text-[11px] text-forge-muted mt-1">List any specific books, courses, or resources you prefer. These will be prioritized in your roadmap.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Daily Goal Target *</label>
                    <input type="number" min={1} max={20} className="forge-input" placeholder="e.g. 3"
                      value={dailyTaskRequirement} onChange={e => setDailyTaskRequirement(e.target.value)} />
                    <p className="font-mono text-[11px] text-forge-muted mt-1">Subtopics to complete per day. 2-3 is realistic for most people. This gets sent to the AI so it can adjust task granularity.</p>
                  </div>

                  <div className="flex gap-3 justify-between items-center pt-2 border-t border-forge-border">
                    <button type="button" onClick={handleClose} className="forge-btn-ghost">Cancel</button>
                    <div className="flex items-center gap-3">
                      {!hasGeminiKey() && (
                        <p className="font-mono text-[10px] text-forge-muted text-right max-w-[200px]">
                          For maximum results, copy prompt and paste it in the LLM of your liking (ChatGPT, Claude).
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={!learnerGoal.trim() || geminiLoading}
                        onClick={handleCopyPrompt}
                        className={cn('flex items-center gap-2 border px-4 py-2.5 font-condensed font-black text-sm uppercase tracking-wider transition-all duration-200',
                          learnerGoal.trim() && !geminiLoading
                            ? 'border-forge-amber text-forge-amber hover:bg-amber-500/5 cursor-pointer'
                            : 'border-forge-border text-forge-muted cursor-not-allowed opacity-40')}
                      >
                        {geminiLoading ? (
                          <><Loader2 size={14} className="animate-spin" /> Generating...</>
                        ) : hasGeminiKey() ? (
                          <><Sparkles size={14} /> Generate Roadmap</>
                        ) : (
                          <><ClipboardCopy size={14} /> Copy prompt</>
                        )}
                      </button>
                    </div>
                    {hasGeminiKey() && !geminiLoading && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!learnerGoal.trim()) return;
                          if (!dailyTaskRequirement.trim()) {
                            alert('Please set a daily goal target');
                            return;
                          }
                          const goalsStr = learnerGoal.trim();
                          const prompt = buildForgeCoachPrompt({
                            BACKGROUND: learnerBackground.trim() || '[Background]',
                            GOAL: goalsStr,
                            WHY_IT_MATTERS: learnerWhyItMatters.trim() || '[Why]',
                            HOURS_PER_WEEK: learnerHoursPerWeek.trim() || '10',
                            LEARNING_STYLE: learnerLearningStyle.trim() || '[Style]',
                            PREVIOUSLY_QUIT: learnerPreviouslyQuit.trim() || 'N/A',
                            HARD_DEADLINE: learnerHardDeadline.trim() || 'within 8 months',
                            PREFERRED_RESOURCES: learnerPreferredResources.trim() || '[No specific preferences]',
                          });
                          await navigator.clipboard.writeText(prompt);
                          setCopied(true);
                          setMode('ai-import');
                        }}
                        className="font-mono text-[8px] text-forge-muted hover:text-forge-dim transition-colors uppercase tracking-wider mt-2 block w-full text-right"
                      >
                        {copied ? '✓ copied' : 'copy prompt instead'}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── Paste to AI: educate user, OK unlocks Import ─ */}

              {/* ── AI IMPORT: Paste plan data → review ───── */}
              {mode === 'ai-import' && (
                <motion.div
                  key="ai-import"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="p-6 flex flex-col gap-5"
                >
                  <div className="flex items-center gap-2">
                    {['Learner profile', 'Copy prompt', 'Use AI assistant', 'Add your plan'].map((s, i) => (
                      <React.Fragment key={s}>
                        <div className={cn('font-mono text-[11px] uppercase tracking-wider px-2 py-1',
                          i <= 2 ? 'text-green-400 border border-green-800 bg-green-500/5' : 'text-forge-amber border border-forge-amber bg-amber-500/5')}>
                          {i < 3 ? '✓' : '4.'} {s}
                        </div>
                        {i < 3 && <div className="text-forge-muted text-xs">›</div>}
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Paste the AI assistant&apos;s plan data here</label>
                    <textarea
                      className="forge-input font-mono text-[11px] resize-none min-h-[200px] leading-relaxed"
                      placeholder={'Paste the full plan here (multiple goals supported).\n[\n  { "name": "Java Mastery", "priority": 1, "topics": [...], "capstone": {...} },\n  ...\n]'}
                      value={aiJson}
                      onChange={e => { setAiJson(e.target.value); setImportError(''); }}
                      autoFocus
                    />
                  </div>

                  <AnimatePresence>
                    {importError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="bg-red-950/30 border border-red-900/40 px-4 py-3">
                        <p className="font-mono text-[11px] text-red-400">⚠ {importError}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 justify-between items-center pt-2 border-t border-forge-border">
                    <button type="button" onClick={() => setMode('ai-prompt')} className="forge-btn-ghost">← Back</button>
                    <button
                      type="button"
                      disabled={!aiJson.trim()}
                      onClick={handleParseAndReview}
                      className="forge-btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check size={14} />
                      Review your plan
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ── AI REVIEW: Edit goals → Confirm & Create ─── */}
              {mode === 'ai-review' && parsedGoalsForReview && (
                <motion.div
                  key="ai-review"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
                >
                  <div className="bg-forge-surface2/60 border border-forge-border p-3 mb-2 flex flex-col gap-2">
                    <p className="font-mono text-[11px] text-forge-amber uppercase tracking-wider">💡 Not quite right?</p>
                    <p className="font-mono text-xs text-forge-dim leading-relaxed">
                      Edit topics, tasks, and resources below. If the plan is completely off, hit <strong>← Back</strong> to return to the import screen, or go back to the beginning to tweak the prompt and paste it into your favorite LLM (Claude, ChatGPT) for better results!
                    </p>
                  </div>
                  <div className="space-y-3">
                    {parsedGoalsForReview.map((goal, i) => (
                      <div key={i} className="border border-forge-border rounded-sm p-4 bg-forge-surface2/50 space-y-4">
                        <div className="flex items-start justify-between gap-2 border-b border-forge-border/50 pb-3 h-auto min-h-20">
                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input className="forge-input font-condensed font-bold text-lg h-auto" value={goal.name} onChange={e => updateReviewGoal(i, { name: e.target.value })} placeholder="Goal name" />
                            <input type="number" min={1} max={9} className="forge-input w-20 h-auto" value={goal.priority ?? ''} onChange={e => updateReviewGoal(i, { priority: parseInt(e.target.value, 10) || undefined })} placeholder="Priority" title="Priority" />
                            <input type="date" className="forge-input h-auto" value={goal.targetDate} onChange={e => updateReviewGoal(i, { targetDate: e.target.value })} title="Target Date" />
                          </div>
                          <button type="button" onClick={() => removeReviewGoal(i)} className="text-forge-muted hover:text-red-400 p-2 shrink-0 bg-red-500/10 rounded-sm" title="Remove goal">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <input className="forge-input font-mono text-sm w-full" value={goal.description} onChange={e => updateReviewGoal(i, { description: e.target.value })} placeholder="Goal description" />

                        {goal.topics && goal.topics.length > 0 && (
                          <div className="space-y-3 mt-4">
                            <h4 className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-amber mb-2">Topics & Tasks</h4>
                            {goal.topics.map((topic, tIdx) => (
                              <div key={topic.id} className="border border-forge-border/40 bg-forge-surface/30 p-3 rounded-sm relative group">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newTopics = [...goal.topics!];
                                    newTopics.splice(tIdx, 1);
                                    updateReviewGoal(i, { topics: newTopics });
                                  }}
                                  className="absolute top-2 right-2 text-forge-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove Topic"
                                >
                                  <Trash2 size={14} />
                                </button>
                                <input
                                  className="forge-input font-condensed font-bold text-sm w-[90%] mb-2"
                                  value={topic.name}
                                  onChange={e => {
                                    const newTopics = [...goal.topics!];
                                    newTopics[tIdx] = { ...topic, name: e.target.value };
                                    updateReviewGoal(i, { topics: newTopics });
                                  }}
                                  placeholder="Topic name"
                                />
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="pl-4 border-l-2 border-forge-border/30 space-y-1.5 mt-2">
                                    {topic.subtopics.map((sub, sIdx) => (
                                      <div key={sub.id} className="flex items-center gap-2 group/sub">
                                        <div className="w-1.5 h-1.5 rounded-full bg-forge-dim" />
                                        <input
                                          className="forge-input font-mono text-xs py-1 px-2 h-auto flex-1 bg-transparent border-transparent hover:border-forge-border/50 focus:border-forge-amber"
                                          value={sub.name}
                                          onChange={e => {
                                            const newSubtopics = [...topic.subtopics!];
                                            newSubtopics[sIdx] = { ...sub, name: e.target.value };
                                            const newTopics = [...goal.topics!];
                                            newTopics[tIdx] = { ...topic, subtopics: newSubtopics };
                                            updateReviewGoal(i, { topics: newTopics });
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newSubtopics = [...topic.subtopics!];
                                            newSubtopics.splice(sIdx, 1);
                                            const newTopics = [...goal.topics!];
                                            newTopics[tIdx] = { ...topic, subtopics: newSubtopics };
                                            updateReviewGoal(i, { topics: newTopics });
                                          }}
                                          className="text-forge-dim hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-opacity"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {topic.resources && topic.resources.length > 0 && (
                                  <div className="pl-4 border-l-2 border-forge-border/30 space-y-1.5 mt-3 pt-3 border-t">
                                    <p className="font-mono text-[10px] text-forge-muted uppercase tracking-wider mb-2">Resources</p>
                                    {topic.resources.map((res, rIdx) => (
                                      <div key={res.id || rIdx} className="flex items-start gap-2 group/res">
                                        <div className="w-1.5 h-1.5 rounded-sm bg-forge-dim mt-2.5" />
                                        <div className="flex-1 space-y-1">
                                          <input
                                            className="forge-input font-bold text-xs py-1 px-2 h-auto w-full bg-transparent border-transparent hover:border-forge-border/50 focus:border-forge-amber"
                                            value={res.title}
                                            onChange={e => {
                                              const newResources = [...topic.resources!];
                                              newResources[rIdx] = { ...res, title: e.target.value };
                                              const newTopics = [...goal.topics!];
                                              newTopics[tIdx] = { ...topic, resources: newResources };
                                              updateReviewGoal(i, { topics: newTopics });
                                            }}
                                            placeholder="Resource title"
                                          />
                                          <input
                                            className="forge-input font-mono text-[11px] text-forge-dim py-1 px-2 h-auto w-full bg-transparent border-transparent hover:border-forge-border/50 focus:border-forge-amber"
                                            value={res.detail || ''}
                                            onChange={e => {
                                              const newResources = [...topic.resources!];
                                              newResources[rIdx] = { ...res, detail: e.target.value };
                                              const newTopics = [...goal.topics!];
                                              newTopics[tIdx] = { ...topic, resources: newResources };
                                              updateReviewGoal(i, { topics: newTopics });
                                            }}
                                            placeholder="Details (e.g. Chapter 1-3)"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newResources = [...topic.resources!];
                                            newResources.splice(rIdx, 1);
                                            const newTopics = [...goal.topics!];
                                            newTopics[tIdx] = { ...topic, resources: newResources };
                                            updateReviewGoal(i, { topics: newTopics });
                                          }}
                                          className="text-forge-dim hover:text-red-400 opacity-0 group-hover/res:opacity-100 transition-opacity mt-1.5"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3 justify-between items-center pt-2 border-t border-forge-border">
                    <button type="button" onClick={() => { setMode(reviewSource); setParsedGoalsForReview(null); }} className="forge-btn-ghost">← Back</button>
                    <button type="button" onClick={handleConfirmCreateGoals} className="forge-btn-primary flex items-center gap-2" disabled={parsedGoalsForReview.length === 0}>
                      <Plus size={14} />
                      Confirm & Create {parsedGoalsForReview.length} Goal{parsedGoalsForReview.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
