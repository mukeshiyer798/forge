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
import { getCurrentUser } from '@/lib/api';
import { mapBackendUserToUser } from '@/store/useAppStore';

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
  const [inlineApiKey, setInlineApiKey] = useState('');

  const [aiJson, setAiJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [reviewSource, setReviewSource] = useState<'ai-prompt' | 'ai-import' | 'quick'>('ai-prompt');
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

  const handleSaveInlineKey = async () => {
    if (!inlineApiKey.trim()) return;
    setGeminiLoading(true);
    try {
      const ok = await callGemini(
        "Verify this key. Return only JSON: {\"ok\": true}",
        "google/gemini-2.0-flash-001",
        inlineApiKey.trim()
      );
      if (ok) {
        // Backend saves during generate/test calls if api_key is present
        const updatedUser = await getCurrentUser();
        if (updatedUser) {
          useAppStore.getState().updateUser(mapBackendUserToUser(updatedUser));
          setInlineApiKey('');
          toast({ title: 'Key active', description: 'Your access code is saved.', tone: 'success' });
        }
      }
    } catch (e) {
      toast({ title: 'Invalid key', description: 'Could not verify the access code.', tone: 'error' });
    } finally {
      setGeminiLoading(false);
    }
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
    const keyToUse = inlineApiKey.trim() || '';
    if (hasGeminiKey() || keyToUse) {
      setGeminiLoading(true);
      setImportError('');
      try {
        const result = await callGemini<{ goals?: Array<Record<string, unknown>>; phaseRoadmap?: Record<string, string[]> }>(
          prompt,
          "google/gemini-2.0-flash-001",
          keyToUse
        );
        if (result) {
          const goalsArray = result.goals || (Array.isArray(result) ? result as unknown as Array<Record<string, unknown>> : []);
          if (goalsArray.length > 0) {
            const mapped = goalsArray.map((raw) => mapForgeCoachGoalToGoal(raw, fallbackDeadline));
            setParsedGoalsForReview(mapped);
            setReviewSource('ai-prompt');
            setMode('ai-review');
            setGeminiLoading(false);
            if (keyToUse) {
              // The backend will have saved the key, but we need to notify the store 
              // that the user now has a key so the UI updates globally.
              try {
                const updatedUser = await getCurrentUser();
                if (updatedUser) {
                  useAppStore.getState().updateUser(mapBackendUserToUser(updatedUser));
                }
              } catch (e) {
                console.error("Failed to refresh user after key save:", e);
              }
            }
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
    toast({ title: 'Prompt copied', description: 'Paste it into your favorite AI tool and generate the JSON.', tone: 'success' });
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
    const goalsToCreate = parsedGoalsForReview.map((g) => ({
      ...g,
      dailyTaskRequirement: dailyTaskReq || undefined,
      userId: user?.id,
      // Only keep Phase 1 topics (taskNumber 1-5)
      topics: (g.topics || []).filter(t => (t.taskNumber || 0) <= 5)
    }));

    addGoals(goalsToCreate as Goal[]);
    toast({
      title: 'Goals created',
      description: `${goalsToCreate.length} added to your dashboard`,
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
          className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
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
                        Generates a robust Phase 1 (5-7 deep topics). Depth over breadth.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const emptyGoal: GoalForReview = {
                          name: 'My Custom Goal',
                          type: 'learn',
                          description: '',
                          targetDate: isoPlusDays(30),
                          priority: 1,
                          status: 'on-track',
                          subtopics: [],
                          resources: [],
                          topics: [{
                            id: generateId(),
                            name: 'Topic 1',
                            taskNumber: 1,
                            completed: false,
                            subtopics: [{ id: generateId(), name: 'Subtask 1', completed: false }],
                            resources: [],
                            build: { name: 'Build Project', completed: false },
                            interviewPrep: []
                          }]
                        };
                        setParsedGoalsForReview([emptyGoal]);
                        setReviewSource('quick');
                        setMode('ai-review');
                      }}
                      className="border border-forge-border bg-forge-surface2/40 hover:border-forge-amber p-4 text-left transition-all duration-200"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Plus size={16} className="text-forge-text" />
                        <span className="font-mono text-[11px] uppercase tracking-widest text-forge-text">Manual</span>
                      </div>
                      <p className="font-condensed font-bold text-sm uppercase tracking-wider text-forge-text">
                        Build roadmap manually
                      </p>
                      <p className="font-mono text-xs text-forge-dim mt-1">
                        Start from scratch. Add your own custom topics, subtasks, resources, and interview prep.
                      </p>
                    </button>
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
                          Connect AI for Instant Roadmaps
                        </span>
                      </div>
                      <p className="font-body text-sm text-forge-dim leading-relaxed mb-4">
                        Paste a free <strong className="text-forge-text">access code</strong> to generate personalized study plans in one click. Get one at openrouter.ai/keys — it takes 30 seconds.
                      </p>

                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[13px] uppercase tracking-widest text-forge-amber">Paste Access Code</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              className="forge-input h-9 py-0 text-xs"
                              placeholder="sk-or-v1-..."
                              value={inlineApiKey}
                              onChange={e => setInlineApiKey(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveInlineKey()}
                            />
                            <a
                              href="https://openrouter.ai/keys"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-9 flex items-center justify-center border border-forge-border px-3 font-mono text-[13px] text-forge-muted hover:text-forge-amber transition-colors uppercase"
                            >
                              Get Key
                            </a>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-1">
                          <p className="font-mono text-[13px] text-forge-muted">
                            No key? You can still copy the prompt below manually.
                          </p>
                        </div>
                      </div>
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
                      value={learnerBackground} onChange={e => setLearnerBackground(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCopyPrompt()} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">What do you want to learn? (One goal only) *</label>
                    <input className="forge-input" placeholder="e.g. Master React and build a portfolio"
                      value={learnerGoal} onChange={e => setLearnerGoal(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCopyPrompt()} />
                    <p className="font-mono text-[11px] text-forge-amber/80 mt-1">
                      Focusing on one goal at a time gives the AI better context to generate actionable steps.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Why it matters *</label>
                    <input className="forge-input" placeholder="e.g. Hate my current job, want to build things, better pay"
                      value={learnerWhyItMatters} onChange={e => setLearnerWhyItMatters(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCopyPrompt()} />
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
                      value={learnerHoursPerWeek} onChange={e => setLearnerHoursPerWeek(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCopyPrompt()} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Previously quit / dropped?</label>
                    <input className="forge-input" placeholder="e.g. Started Udemy course, dropped at week 2"
                      value={learnerPreviouslyQuit} onChange={e => setLearnerPreviouslyQuit(e.target.value)} />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Preferred Resources <span className="text-forge-muted">(optional)</span></label>
                    <textarea className="forge-input font-mono text-[14px] resize-none min-h-[80px]"
                      placeholder="e.g. Effective Java, YouTube channels like Fireship, official docs..."
                      value={learnerPreferredResources} onChange={e => setLearnerPreferredResources(e.target.value)} />
                    <p className="font-mono text-[11px] text-forge-muted mt-1">List any specific books, courses, or resources you prefer. These will be prioritized in your roadmap.</p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="forge-label">Daily Goal Target *</label>
                    <input type="number" min={1} max={20} className="forge-input" placeholder="e.g. 3"
                      value={dailyTaskRequirement} onChange={e => setDailyTaskRequirement(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCopyPrompt()} />
                    <p className="font-mono text-[11px] text-forge-muted mt-1">Subtopics to complete per day. 2-3 is realistic for most people. This gets sent to the AI so it can adjust task granularity.</p>
                  </div>

                  <div className="flex gap-3 justify-between items-center pt-2 border-t border-forge-border">
                    <button type="button" onClick={handleClose} className="forge-btn-ghost">Cancel</button>
                    <div className="flex items-center gap-3">
                      {!hasGeminiKey() && (
                        <p className="font-mono text-[13px] text-forge-muted text-right max-w-[200px]">
                          For maximum results, copy prompt and paste it in the LLM of your liking (ChatGPT, Claude).
                        </p>
                      )}
                      <button
                        type="button"
                        disabled={!learnerGoal.trim() || geminiLoading}
                        onClick={handleCopyPrompt}
                        className={cn('flex items-center gap-2 border px-4 py-2.5 font-condensed font-black text-sm uppercase tracking-wider transition-all duration-200',
                          geminiLoading
                            ? 'border-forge-amber text-forge-amber cursor-wait opacity-80'
                            : learnerGoal.trim()
                              ? 'border-forge-amber text-forge-amber hover:bg-amber-500/5 cursor-pointer'
                              : 'border-forge-border text-forge-muted cursor-not-allowed opacity-40')}
                      >
                        {geminiLoading ? (
                          <><Loader2 size={14} className="animate-spin" /> Generating...</>
                        ) : (hasGeminiKey() || inlineApiKey.trim()) ? (
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
                          toast({ title: 'Prompt copied', description: 'Paste it into your favorite AI tool and generate the JSON.', tone: 'success' });
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
                        <div className={cn('font-mono text-[13px] uppercase tracking-wider px-2 py-1',
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
                            {goal.topics.map((topic, tIdx) => {
                              // Filter out future phases from the editable review cards
                              if ((topic.taskNumber || 0) > 5) return null;
                              return (
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newSubtopics = [...(topic.subtopics || [])];
                                      newSubtopics.push({ id: generateId(), name: 'New Subtask', completed: false });
                                      const newTopics = [...goal.topics!];
                                      newTopics[tIdx] = { ...topic, subtopics: newSubtopics };
                                      updateReviewGoal(i, { topics: newTopics });
                                    }}
                                    className="text-[10px] font-mono uppercase tracking-wider text-forge-dim hover:text-forge-amber mt-2 flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Add Subtask
                                  </button>
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
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newResources = [...(topic.resources || [])];
                                      newResources.push({ id: generateId(), title: 'New Resource', type: 'docs', url: null });
                                      const newTopics = [...goal.topics!];
                                      newTopics[tIdx] = { ...topic, resources: newResources };
                                      updateReviewGoal(i, { topics: newTopics });
                                    }}
                                    className="text-[10px] font-mono uppercase tracking-wider text-forge-dim hover:text-forge-amber mt-2 flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Add Resource
                                  </button>

                                  {topic.interviewPrep && topic.interviewPrep.length > 0 && (
                                    <div className="pl-4 border-l-2 border-forge-border/30 space-y-1.5 mt-3 pt-3 border-t">
                                      <p className="font-mono text-[10px] text-forge-muted uppercase tracking-wider mb-2">Interview Prep</p>
                                      {topic.interviewPrep.map((prep, pIdx) => (
                                        <div key={pIdx} className="flex items-start gap-2 group/prep mb-2">
                                          <div className="w-1.5 h-1.5 rounded-sm bg-forge-dim mt-2.5" />
                                          <div className="flex-1 space-y-1">
                                            <input
                                              className="forge-input font-bold text-xs py-1 px-2 h-auto w-full bg-transparent border-transparent hover:border-forge-border/50 focus:border-forge-amber"
                                              value={prep.question}
                                              onChange={e => {
                                                const newPrep = [...topic.interviewPrep!];
                                                newPrep[pIdx] = { ...prep, question: e.target.value };
                                                const newTopics = [...goal.topics!];
                                                newTopics[tIdx] = { ...topic, interviewPrep: newPrep };
                                                updateReviewGoal(i, { topics: newTopics });
                                              }}
                                              placeholder="Question"
                                            />
                                            <textarea
                                              className="forge-input font-mono text-[11px] text-forge-dim py-1 px-2 h-auto w-full bg-transparent border-transparent hover:border-forge-border/50 focus:border-forge-amber resize-none min-h-[40px]"
                                              value={prep.answer || ''}
                                              onChange={e => {
                                                const newPrep = [...topic.interviewPrep!];
                                                newPrep[pIdx] = { ...prep, answer: e.target.value };
                                                const newTopics = [...goal.topics!];
                                                newTopics[tIdx] = { ...topic, interviewPrep: newPrep };
                                                updateReviewGoal(i, { topics: newTopics });
                                              }}
                                              placeholder="Answer"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newPrep = [...topic.interviewPrep!];
                                              newPrep.splice(pIdx, 1);
                                              const newTopics = [...goal.topics!];
                                              newTopics[tIdx] = { ...topic, interviewPrep: newPrep };
                                              updateReviewGoal(i, { topics: newTopics });
                                            }}
                                            className="text-forge-dim hover:text-red-400 opacity-0 group-hover/prep:opacity-100 transition-opacity mt-1.5"
                                          >
                                            <X size={12} />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newPrep = [...(topic.interviewPrep || [])];
                                      newPrep.push({ question: 'New Question', answer: '' });
                                      const newTopics = [...goal.topics!];
                                      newTopics[tIdx] = { ...topic, interviewPrep: newPrep };
                                      updateReviewGoal(i, { topics: newTopics });
                                    }}
                                    className="text-[10px] font-mono uppercase tracking-wider text-forge-dim hover:text-forge-amber mt-2 flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Add Question
                                  </button>
                                </div>
                              );
                            })}
                            <button
                              type="button"
                              onClick={() => {
                                const newTopics = [...(goal.topics || [])];
                                newTopics.push({
                                  id: generateId(),
                                  name: 'New Topic',
                                  taskNumber: 1, // Keep manual topics in Phase 1 by default
                                  completed: false,
                                  subtopics: [],
                                  resources: [],
                                  interviewPrep: []
                                });
                                updateReviewGoal(i, { topics: newTopics });
                              }}
                              className="w-full mt-4 py-2.5 border border-forge-border bg-forge-surface/40 text-forge-dim hover:text-forge-amber hover:border-forge-amber hover:bg-forge-surface transition-all text-[11px] font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                            >
                              <Plus size={12} /> Add Custom Topic
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {reviewSource !== 'quick' && (
                      <div className="border-t border-forge-border/30 pt-6 mt-8 mb-4 text-center">
                        <p className="font-condensed text-xs text-forge-amber uppercase tracking-[0.2em] mb-3 font-bold opacity-80 flex items-center justify-center gap-2">
                          <span className="w-10 h-px bg-forge-amber/20" />
                          🔒 Phase 2 & 3 Locked
                          <span className="w-10 h-px bg-forge-amber/20" />
                        </p>

                        {/* Show names of locked topics if available */}
                        {parsedGoalsForReview.some(g => g.topics && g.topics.some(t => (t.taskNumber || 0) > 5)) && (
                          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mb-4 max-w-[400px] mx-auto opacity-40">
                            {parsedGoalsForReview.flatMap(g => (g.topics || []).filter(t => (t.taskNumber || 0) > 5)).map(t => (
                              <span key={t.id} className="font-mono text-[9px] text-forge-muted uppercase tracking-wider">
                                // {t.name}
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="font-mono text-[10px] text-forge-muted max-w-[300px] mx-auto leading-relaxed">
                          AI focuses on Phase 1 for deep execution. Once you complete these topics, you can return to generate subsequent phases.
                        </p>
                      </div>
                    )}
                  </div>


                  <div className="flex gap-3 justify-between items-center pt-2 border-t border-forge-border mt-3">
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
