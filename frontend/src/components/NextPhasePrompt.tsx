import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ClipboardCopy, Check, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Goal, GoalTopic } from '@/types';
import { callGemini, hasGeminiKey } from '@/lib/gemini';
import { buildNextPhasePrompt } from '@/prompts/forge-coach-roadmap';
import { cn } from '@/lib/utils';

interface NextPhasePromptProps {
    open: boolean;
    onClose: () => void;
    goal: Goal;
    currentPhase: number;
    completedTopicNames: string[];
    nextPhaseTopics: string[];
}

export default function NextPhasePrompt({
    open, onClose, goal, currentPhase, completedTopicNames, nextPhaseTopics,
}: NextPhasePromptProps) {
    const { addTopicsToGoal } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [manualJson, setManualJson] = useState('');
    const [showManual, setShowManual] = useState(false);

    const prompt = buildNextPhasePrompt({
        goalName: goal.name,
        goalDescription: goal.description,
        completedTopics: completedTopicNames,
        phaseNumber: currentPhase + 1,
        nextPhaseTopics,
        learnerHoursPerWeek: String(goal.dailyTaskRequirement ? goal.dailyTaskRequirement * 7 : 10),
    });

    const handleGenerate = async () => {
        setError('');
        setLoading(true);
        try {
            const result = await callGemini<{ topics: GoalTopic[] }>(prompt);
            if (result && result.topics && result.topics.length > 0) {
                // Re-number tasks continuing from existing
                const existingCount = goal.topics?.length || 0;
                const numbered = result.topics.map((t, i) => ({
                    ...t,
                    taskNumber: existingCount + i + 1,
                    completed: false,
                    subtopics: t.subtopics.map(s => ({ ...s, completed: false })),
                    build: t.build ? { ...t.build, completed: false } : t.build,
                }));
                addTopicsToGoal(goal.id, numbered);
                onClose();
            } else {
                setError('No topics generated. Try again.');
            }
        } catch (err) {
            setError(`${err instanceof Error ? err.message : 'Unknown error'}`);
            setShowManual(true);
            // Auto-copy prompt on failure
            navigator.clipboard.writeText(prompt).catch(() => { });
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPrompt = async () => {
        await navigator.clipboard.writeText(prompt);
        setCopied(true);
        setShowManual(true);
        setTimeout(() => setCopied(false), 3000);
    };

    const handleImportManual = () => {
        setError('');
        try {
            const cleaned = manualJson.replace(/^```(?:json)?\s*([\s\S]*?)```\s*$/m, '$1').trim();
            const parsed = JSON.parse(cleaned);
            const topics = parsed.topics || parsed;
            if (!Array.isArray(topics) || topics.length === 0) {
                setError('Expected a "topics" array.');
                return;
            }
            const existingCount = goal.topics?.length || 0;
            const numbered = topics.map((t: GoalTopic, i: number) => ({
                ...t,
                taskNumber: existingCount + i + 1,
                completed: false,
                subtopics: (t.subtopics || []).map(s => ({ ...s, completed: false })),
                build: t.build ? { ...t.build, completed: false } : t.build,
            }));
            addTopicsToGoal(goal.id, numbered);
            onClose();
        } catch {
            setError('Could not parse JSON. Make sure you paste the full AI response.');
        }
    };

    const content = (
        <AnimatePresence>
            {open && (
                <motion.div
                    key="next-phase-modal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
                >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="forge-card w-full max-w-lg max-h-[85vh] overflow-y-auto relative z-10"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="amber-bar" />

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-forge-border">
                            <div>
                                <p className="font-mono text-xs uppercase tracking-wider text-forge-amber mb-0.5">
                                    Phase {currentPhase + 1}
                                </p>
                                <h2 className="font-condensed font-black text-xl uppercase tracking-wide text-forge-text">
                                    Unlock Next Phase
                                </h2>
                            </div>
                            <button onClick={onClose} className="text-forge-dim hover:text-forge-text">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Completed summary */}
                            <div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-green-400 mb-2">
                                    ✓ Phase {currentPhase} Complete
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {completedTopicNames.map((name, i) => (
                                        <span key={i} className="font-mono text-[11px] text-forge-amber bg-amber-500/5 border border-amber-500/20 px-2 py-0.5">
                                            {name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Next phase preview */}
                            {nextPhaseTopics.length > 0 && (
                                <div>
                                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-forge-dim mb-2">
                                        Planned for Phase {currentPhase + 1}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {nextPhaseTopics.map((name, i) => (
                                            <span key={i} className="font-mono text-[11px] text-forge-dim bg-forge-surface2 border border-forge-border px-2 py-0.5">
                                                {name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Generate button — always shown */}
                            <button
                                onClick={hasGeminiKey() ? handleGenerate : handleCopyPrompt}
                                disabled={loading}
                                className="w-full py-3 bg-forge-amber text-forge-bg font-condensed font-black text-base uppercase tracking-wider hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Generating...</>
                                ) : hasGeminiKey() ? (
                                    <><Sparkles size={18} /> Generate Phase {currentPhase + 1}</>
                                ) : (
                                    <><ClipboardCopy size={16} /> Copy Prompt</>
                                )}
                            </button>
                            {/* Subtle copy-prompt fallback — always available */}
                            {hasGeminiKey() && (
                                <div className="flex justify-end">
                                    <button onClick={handleCopyPrompt}
                                        className="font-mono text-[8px] text-forge-muted hover:text-forge-dim transition-colors uppercase tracking-wider">
                                        {copied ? '✓ copied' : 'copy prompt instead'}
                                    </button>
                                </div>
                            )}
                            {!hasGeminiKey() && copied && (
                                <p className="font-mono text-[11px] text-forge-dim text-center">
                                    Paste into any AI, then paste the response below
                                </p>
                            )}

                            {error && (
                                <p className="font-mono text-[11px] text-red-400">⚠ {error}</p>
                            )}

                            {/* Manual JSON input (fallback) */}
                            {showManual && (
                                <div className="border-t border-forge-border pt-4 space-y-3">
                                    <p className="font-mono text-xs uppercase tracking-wider text-forge-dim">
                                        Paste AI Response
                                    </p>
                                    <textarea
                                        className="forge-input font-mono text-[11px] resize-none min-h-[120px] w-full"
                                        placeholder="Paste the JSON response here..."
                                        value={manualJson}
                                        onChange={(e) => setManualJson(e.target.value)}
                                    />
                                    <button
                                        onClick={handleImportManual}
                                        disabled={!manualJson.trim()}
                                        className="forge-btn-primary flex items-center gap-2 text-sm disabled:opacity-40"
                                    >
                                        <ArrowRight size={14} /> Import Topics
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(content, document.body);
}
