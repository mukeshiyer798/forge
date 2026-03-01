import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Eye, EyeOff, ChevronRight, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { GoalTopic } from '@/types';
import { cn } from '@/lib/utils';

interface TaskPopupProps {
  open: boolean;
  onClose: () => void;
  goalId: string;
  topic: GoalTopic;
}

export default function TaskPopup({ open, onClose, goalId, topic }: TaskPopupProps) {
  const { toggleTopicSubtopic, toggleTopicBuild, toggleTopicCompleted, addSubtopicToTopic, addResourceToTopic, updateTopicName, updateSubtopicName, updateResourceTitle, updateTopicDescription, deleteTopic } = useAppStore();
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [justCompleted, setJustCompleted] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  const completedSubtasks = topic.subtopics?.filter(s => s.completed).length || 0;
  const totalSubtasks = topic.subtopics?.length || 0;
  const buildCompleted = topic.build?.completed || false;
  const allSubtasksDone = totalSubtasks === 0 || completedSubtasks === totalSubtasks;
  const allDone = allSubtasksDone && (!topic.build || buildCompleted);
  const isCompleted = topic.completed;

  const interviewPrep = topic.interviewPrep ?? [];
  // Fallback: if no interviewPrep but has activeRecallQuestion, wrap it
  const prepQuestions = interviewPrep.length > 0
    ? interviewPrep
    : topic.activeRecallQuestion
      ? [{ question: topic.activeRecallQuestion, answer: topic.activeRecallAnswer ?? '' }]
      : [];

  const handleConfirmComplete = () => {
    if (!isCompleted) {
      toggleTopicCompleted(goalId, topic.id);
      setIsReviewing(false);
      setJustCompleted(true);
      setRevealedAnswers(new Set());
    }
  };

  const handleClose = () => {
    setJustCompleted(false);
    setIsReviewing(false);
    setRevealedAnswers(new Set());
    onClose();
  };

  const toggleAnswer = (idx: number) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const progressPct = totalSubtasks > 0
    ? Math.round(((completedSubtasks + (buildCompleted ? 1 : 0)) / (totalSubtasks + (topic.build ? 1 : 0))) * 100)
    : 0;

  const content = (
    <AnimatePresence>
      {open && (
        <motion.div
          key={`task-popup-${topic.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="forge-card w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="amber-bar" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-forge-border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm uppercase tracking-wider text-forge-amber">
                    TASK {topic.taskNumber}
                  </span>
                  {isCompleted && (
                    <span className="font-mono text-[13px] uppercase tracking-wider text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5">
                      ✓ Completed
                    </span>
                  )}
                </div>
                <input
                  className="forge-input bg-transparent border-transparent hover:border-forge-border focus:border-forge-amber font-condensed font-black text-2xl uppercase tracking-wide text-forge-text w-full px-0"
                  value={topic.name}
                  onChange={(e) => updateTopicName(goalId, topic.id, e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1 ml-3">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this topic?')) {
                      deleteTopic(goalId, topic.id);
                      onClose();
                    }
                  }}
                  className="text-forge-dim hover:text-red-500 transition-colors p-2"
                  title="Delete Topic"
                >
                  <Trash2 size={18} />
                </button>
                <button onClick={handleClose} className="text-forge-dim hover:text-forge-text transition-colors p-2">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Description */}
              <div className="relative group">
                <textarea
                  className="w-full bg-transparent border border-transparent hover:border-forge-border/50 focus:border-forge-amber focus:bg-forge-surface2 rounded font-mono text-sm text-forge-text leading-relaxed p-2 -mx-2 resize-none overflow-hidden transition-colors"
                  value={topic.description || ''}
                  placeholder="Add a description for this topic..."
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                    updateTopicDescription(goalId, topic.id, e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  rows={topic.description ? undefined : 1}
                />
              </div>

              {/* Pedagogy Note */}
              {topic.pedagogyNote && (
                <div className="bg-purple-500/5 border-l-2 border-purple-400 p-3 flex items-start gap-3">
                  <span className="text-purple-400 mt-0.5 text-lg">🧠</span>
                  <div>
                    <h4 className="font-mono text-[10px] uppercase tracking-widest text-purple-400 mb-1">Learning Science Notes</h4>
                    <p className="font-body text-[13px] text-forge-dim leading-relaxed">{topic.pedagogyNote}</p>
                  </div>
                </div>
              )}

              {/* Progress bar */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-sm uppercase tracking-wider text-forge-dim">Progress</span>
                  <span className="font-mono text-sm text-forge-amber">{progressPct}%</span>
                </div>
                <div className="bg-forge-surface2 h-[3px] relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full bg-forge-amber"
                  />
                </div>
              </div>

              {/* Primary Resources */}
              <div>
                <h3 className="font-condensed font-bold text-base uppercase tracking-wide text-forge-text mb-2">
                  Primary Resources
                </h3>
                {topic.resources && topic.resources.length > 0 ? (
                  <div className="space-y-1.5">
                    {topic.resources.map((r) => (
                      <div key={r.id} className="flex items-start gap-3 p-3 bg-forge-surface2 border border-forge-border">
                        <span className="text-forge-amber mt-0.5 text-sm">
                          {r.type === 'youtube' ? '▶' : r.type === 'blog' ? '✎' : r.type === 'docs' ? '📄' : '📚'}
                        </span>
                        <div className="flex-1 min-w-0">
                          {r.url ? (
                            <a href={r.url} target="_blank" rel="noopener noreferrer"
                              className="font-mono text-base text-forge-amber hover:text-forge-text hover:underline block truncate">
                              {r.title}
                            </a>
                          ) : (
                            <input
                              className="forge-input bg-transparent border-transparent hover:border-forge-border focus:border-forge-amber font-mono text-base text-forge-text w-full py-0 h-auto"
                              value={r.title}
                              onChange={(e) => updateResourceTitle(goalId, topic.id, r.id, e.target.value)}
                            />
                          )}
                          {r.detail && <div className="font-mono text-[13px] text-forge-dim mt-0.5"><FormattedText text={r.detail} /></div>}
                        </div>
                        <span className="font-mono text-[13px] text-forge-muted uppercase tracking-wider shrink-0">{r.type}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-forge-dim italic mb-2">No resources added yet.</p>
                )}
                <button
                  onClick={() => addResourceToTopic(goalId, topic.id, 'New Resource', 'docs')}
                  className="mt-2 text-xs font-mono uppercase tracking-widest text-forge-dim hover:text-forge-amber flex items-center gap-1.5 transition-colors"
                >
                  <span className="text-base">+</span> Add Resource
                </button>
              </div>

              {/* Hands-on Tasks */}
              <div>
                <h3 className="font-condensed font-bold text-base uppercase tracking-wide text-forge-text mb-2">
                  Hands-on ({completedSubtasks}/{totalSubtasks})
                </h3>
                {topic.subtopics.length > 0 ? (
                  <div className="space-y-1.5">
                    {topic.subtopics.map((st) => (
                      <label
                        key={st.id}
                        className={cn(
                          'flex items-start gap-3 p-3 border cursor-pointer transition-all duration-200',
                          st.completed
                            ? 'bg-amber-500/5 border-amber-500/30'
                            : 'bg-forge-surface2 border-forge-border hover:border-forge-dim'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={st.completed}
                          onChange={() => toggleTopicSubtopic(goalId, topic.id, st.id)}
                          className="mt-1 rounded border-forge-border bg-forge-surface2 text-forge-amber focus:ring-forge-amber w-4 h-4"
                        />
                        <input
                          className={cn(
                            'font-mono text-base flex-1 leading-relaxed bg-transparent border-transparent hover:border-forge-border focus:border-forge-amber py-0 h-auto',
                            st.completed ? 'text-forge-amber line-through opacity-70' : 'text-forge-text'
                          )}
                          value={st.name}
                          onChange={(e) => updateSubtopicName(goalId, topic.id, st.id, e.target.value)}
                        />
                        {st.completed && <Check size={14} className="text-forge-amber flex-shrink-0 mt-0.5" />}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-xs text-forge-dim italic mb-2">No tasks added yet.</p>
                )}
                <button
                  onClick={() => addSubtopicToTopic(goalId, topic.id, 'New Action Item')}
                  className="mt-2 text-xs font-mono uppercase tracking-widest text-forge-dim hover:text-forge-amber flex items-center gap-1.5 transition-colors"
                >
                  <span className="text-base">+</span> Add Subtask
                </button>
              </div>

              {/* Build Project */}
              {topic.build && (
                <div>
                  <h3 className="font-condensed font-bold text-base uppercase tracking-wide text-forge-text mb-2">
                    Build Project
                  </h3>
                  <label className={cn(
                    'flex items-start gap-3 p-4 border cursor-pointer transition-colors',
                    buildCompleted
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-forge-surface2 border-forge-border hover:border-forge-dim'
                  )}>
                    <input
                      type="checkbox"
                      checked={buildCompleted}
                      onChange={() => toggleTopicBuild(goalId, topic.id)}
                      className="mt-1 rounded border-forge-border bg-forge-surface2 text-forge-amber focus:ring-forge-amber w-4 h-4"
                    />
                    <div className="flex-1">
                      <span className={cn(
                        'font-condensed font-bold text-base uppercase tracking-wide block',
                        buildCompleted ? 'text-forge-amber line-through' : 'text-forge-text'
                      )}>
                        {topic.build.name}
                      </span>
                      {topic.build.description && (
                        <p className="font-mono text-xs text-forge-dim mt-1 leading-relaxed">{topic.build.description}</p>
                      )}
                      {topic.build.doneWhen && (
                        <p className="font-mono text-sm text-forge-muted mt-1.5">✓ Done when: {topic.build.doneWhen}</p>
                      )}
                      {topic.build.estimatedHours != null && (
                        <p className="font-mono text-sm text-forge-dim mt-1">~{topic.build.estimatedHours}h</p>
                      )}
                    </div>
                  </label>
                </div>
              )}

              {/* ── Complete Task Button ── */}
              {allDone && !isCompleted && !isReviewing && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="border-t border-forge-border pt-4">
                  <button
                    onClick={() => setIsReviewing(true)}
                    className="w-full py-4 bg-forge-amber text-forge-bg font-condensed font-black text-lg uppercase tracking-wider hover:bg-amber-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={20} strokeWidth={3} /> Review & Complete
                  </button>
                </motion.div>
              )}

              {/* If no prep questions, but they clicked review, just let them confirm */}
              {isReviewing && prepQuestions.length === 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="border-t border-forge-border pt-4">
                  <button
                    onClick={handleConfirmComplete}
                    className="w-full py-4 bg-green-500 text-forge-bg font-condensed font-black text-lg uppercase tracking-wider hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={20} strokeWidth={3} /> Confirm Completion
                  </button>
                </motion.div>
              )}

              {/* ── Interview Prep (shows during review or after completion) ── */}
              {(isCompleted || justCompleted || isReviewing) && prepQuestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: justCompleted ? 0.3 : 0 }}
                  className="border-t border-forge-border pt-5"
                >
                  <h3 className="font-condensed font-bold text-base uppercase tracking-wide text-forge-text mb-3 flex items-center gap-2">
                    🧠 Interview Prep
                  </h3>
                  <p className="font-mono text-[13px] text-forge-dim italic mb-3">
                    Think about each answer, then click to reveal.
                  </p>
                  <div className="space-y-3">
                    {prepQuestions.map((q, idx) => (
                      <div key={idx} className="bg-blue-500/5 border border-blue-500/20 p-4">
                        <p className="font-body text-base text-forge-text font-semibold leading-relaxed mb-2">
                          {idx + 1}. {q.question}
                        </p>
                        <button
                          onClick={() => toggleAnswer(idx)}
                          className="flex items-center gap-1.5 font-mono text-sm text-blue-400 hover:text-forge-text transition-colors mb-1"
                        >
                          {revealedAnswers.has(idx) ? <EyeOff size={12} /> : <Eye size={12} />}
                          {revealedAnswers.has(idx) ? 'Hide' : 'Reveal Answer'}
                        </button>
                        <AnimatePresence>
                          {revealedAnswers.has(idx) && q.answer && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-l-2 border-blue-400 pl-3 py-1.5 mt-2">
                                <p className="font-body text-base text-forge-text leading-relaxed">{q.answer}</p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}

                    {isReviewing && (
                      <button
                        onClick={handleConfirmComplete}
                        className="w-full mt-4 py-3 bg-green-500 hover:bg-green-400 text-forge-bg font-condensed font-black text-lg uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                      >
                        <Check size={18} strokeWidth={3} /> Confirm Completion
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Completed celebration */}
              {justCompleted && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }} className="text-center py-2">
                  <p className="font-mono text-sm uppercase tracking-[0.3em] text-forge-amber">
                    🔥 Task complete. Progress updated.
                  </p>
                </motion.div>
              )}

              {isCompleted && !justCompleted && (
                <div className="flex items-center justify-center gap-2 pt-2 border-t border-forge-border">
                  <ChevronRight size={12} className="text-forge-dim" />
                  <span className="font-mono text-sm text-forge-dim uppercase tracking-wider">
                    Move on to the next task
                  </span>
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
