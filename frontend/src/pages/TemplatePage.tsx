import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, ChevronDown, ChevronUp, Plus, Wand2 } from 'lucide-react';
import { JSON_TEMPLATE } from '@/lib/data';
import { useAppStore } from '@/store/useAppStore';
import { generateId } from '@/lib/utils';
import AddGoalModal from '@/components/AddGoalModal';

function syntaxHighlight(json: string): string {
  return json
    .replace(/("[\w_]+")\s*:/g, '<span class="text-blue-400">$1</span>:')
    .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="text-green-400">$1</span>')
    .replace(/:\s*(\d+)/g, ': <span class="text-orange-400">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="text-purple-400">$1</span>');
}

const PROMPT_TEMPLATES = [
  {
    label: 'General Learning',
    prompt: `Fill this learning plan template for [YOUR TOPIC]. Replace every placeholder with real, specific, actionable content. Be detailed with chapters, real book titles, real course names, and realistic practice ideas. Return ONLY valid plan data.`,
  },
  {
    label: 'Software Engineering',
    prompt: `Fill this learning plan template for becoming a proficient software engineer specializing in [LANGUAGE/STACK]. Include real resources (books, courses, YouTube channels), specific chapters, and portfolio-worthy practice projects. Return ONLY valid plan data.`,
  },
  {
    label: 'Self-Improvement',
    prompt: `Fill this learning plan template for [SKILL e.g. public speaking, writing, negotiation]. Include books, courses, daily practices, and practical exercises that test the skill in real situations. Return ONLY valid plan data.`,
  },
];

export default function TemplatePage() {
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(true);
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { addGoal } = useAppStore();

  const raw = JSON.stringify(JSON_TEMPLATE, null, 2);

  const handleCopyJson = async () => {
    await navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyPrompt = async (idx: number, prompt: string) => {
    const fullPrompt = prompt + '\n\n' + raw;
    await navigator.clipboard.writeText(fullPrompt);
    setPromptCopied(idx);
    setTimeout(() => setPromptCopied(null), 2500);
  };

  const handleImport = () => {
    setImportError('');
    setImportSuccess(false);
    try {
      const parsed = JSON.parse(jsonInput);
      const plan = parsed.learning_plan ?? parsed;

      if (!plan.major_topic) {
        setImportError('The plan must include a learning_plan.major_topic field.');
        return;
      }

      const subtopics = (plan.sub_topics ?? []).map((st: { name: string }) => ({
        id: generateId(),
        name: st.name ?? 'Sub-topic',
        completed: false,
      }));

      const resources = (plan.resources ?? []).map((r: { title: string }) => r.title ?? '').filter(Boolean);

      addGoal({
        name: plan.major_topic,
        type: 'learn',
        description: plan.goal_statement ?? plan.major_topic,
        subtopics: subtopics.length ? subtopics : [{ id: generateId(), name: 'Getting Started', completed: false }],
        resources,
        targetDate: plan.target_completion ?? '2026-12-31',
        status: 'on-track',
      });

      setImportSuccess(true);
      setJsonInput('');
      setTimeout(() => setImportSuccess(false), 3000);
    } catch {
      setImportError('Could not read the plan data. Make sure you pasted the complete response from your AI assistant.');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-10 bg-forge-surface border-b border-forge-border px-4 lg:px-10 py-5">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-forge-dim mb-1">// AI-powered planning</p>
        <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">PLAN TEMPLATE</h2>
      </div>

      <div className="px-4 lg:px-10 py-8 flex flex-col gap-8">

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '01', icon: '📋', title: 'Copy Template', desc: 'Grab the plan template below' },
            { step: '02', icon: '🤖', title: 'Use an AI assistant', desc: 'Claude, ChatGPT, Gemini — all work' },
            { step: '03', icon: '🎯', title: 'Add as a goal', desc: 'Paste the result back here' },
          ].map((s) => (
            <div key={s.step} className="bg-forge-surface border border-forge-border p-4 relative overflow-hidden">
              <div className="absolute top-3 right-3 font-display text-4xl text-forge-muted/30">{s.step}</div>
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="font-condensed font-black text-base uppercase tracking-wider text-forge-text mb-1">{s.title}</p>
              <p className="font-mono text-sm text-forge-dim">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Prompt Templates */}
        <section>
          <div className="mb-4">
            <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">Prompt Starters</h3>
            <p className="font-mono text-sm text-forge-dim mt-0.5">Copy a prompt — it includes the template automatically</p>
          </div>
          <div className="flex flex-col gap-3">
            {PROMPT_TEMPLATES.map((pt, i) => (
              <div key={i} className="bg-forge-surface border border-forge-border p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-amber mb-1">{pt.label}</p>
                  <p className="font-mono text-[13px] text-forge-dim leading-relaxed line-clamp-2">{pt.prompt}</p>
                </div>
                <button
                  onClick={() => handleCopyPrompt(i, pt.prompt)}
                  className={`flex items-center gap-1.5 flex-shrink-0 border px-3 py-2 font-mono text-sm uppercase tracking-wider transition-all duration-200 ${promptCopied === i
                      ? 'border-green-500 text-green-400'
                      : 'border-forge-border text-forge-dim hover:border-forge-amber hover:text-forge-amber'
                    }`}
                >
                  {promptCopied === i ? <Check size={11} /> : <Copy size={11} />}
                  {promptCopied === i ? 'Copied' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Learning plan template */}
        <section>
          <div className="bg-forge-surface border border-forge-border overflow-hidden">
            <div className="bg-forge-surface2 px-5 py-4 border-b border-forge-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-condensed font-black text-lg uppercase tracking-wider text-forge-text">Learning Plan Template</span>
                <span className="bg-forge-amber text-forge-bg font-mono text-[13px] uppercase tracking-widest px-2 py-0.5">
                  Paste into an AI assistant
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJson(!showJson)}
                  className="forge-btn-ghost flex items-center gap-1.5 py-1.5"
                >
                  {showJson ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  <span className="hidden sm:inline">{showJson ? 'Collapse' : 'Expand'}</span>
                </button>
                <button
                  onClick={handleCopyJson}
                  className={`flex items-center gap-1.5 border px-4 py-2 font-mono text-sm uppercase tracking-wider transition-all duration-200 ${copied
                      ? 'border-green-500 text-green-400'
                      : 'border-forge-border text-forge-dim hover:border-forge-amber hover:text-forge-amber'
                    }`}
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {showJson && (
              <div className="flex">
                <div className="px-3 py-4 bg-forge-bg/50 border-r border-forge-border select-none overflow-hidden">
                  {raw.split('\n').map((_, i) => (
                    <div key={i} className="font-mono text-sm text-forge-muted leading-[1.7] text-right min-w-[24px]">{i + 1}</div>
                  ))}
                </div>
                <pre
                  className="flex-1 px-5 py-4 font-mono text-[13px] leading-[1.7] text-forge-dim overflow-x-auto max-h-[360px] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: syntaxHighlight(raw) }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Import from AI response */}
        <section>
          <div className="mb-4">
            <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">Add AI Result as a Goal</h3>
            <p className="font-mono text-sm text-forge-dim mt-0.5">
              Paste the filled plan back here — it will create a goal automatically
            </p>
          </div>

          <div className="bg-forge-surface border border-forge-border overflow-hidden">
            <div className="bg-forge-surface2 px-5 py-3 border-b border-forge-border">
              <p className="font-mono text-sm uppercase tracking-wider text-forge-dim flex items-center gap-2">
                <Wand2 size={11} className="text-forge-amber" />
                Paste your AI's response below
              </p>
            </div>
            <div className="p-4">
              <textarea
                className="forge-input font-mono text-[13px] resize-none min-h-[160px] leading-relaxed"
                placeholder={'{\n  "learning_plan": {\n    "major_topic": "Python",\n    ...\n  }\n}'}
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); setImportError(''); }}
              />

              {importError && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-[13px] text-red-400 mt-2"
                >
                  ⚠ {importError}
                </motion.p>
              )}

              {importSuccess && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-mono text-[13px] text-green-400 mt-2"
                >
                  ✓ Goal created! Check My Goals.
                </motion.p>
              )}

              <div className="flex gap-3 mt-3">
                <button
                  onClick={handleImport}
                  disabled={!jsonInput.trim()}
                  className="forge-btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={13} />
                  Create goal
                </button>
                <button onClick={() => setAddModalOpen(true)} className="forge-btn-ghost flex items-center gap-1.5">
                  Add Manually
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="border-t border-forge-border pt-6 text-center">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-forge-muted">
            FORGE — BUILD THE PERSON YOU NEED TO BE
          </p>
        </div>
      </div>

      <AddGoalModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
