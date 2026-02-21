import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Filter, ChevronLeft, ChevronRight, SortAsc } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import GoalCard from '@/components/GoalCard';
import AddGoalModal from '@/components/AddGoalModal';
import NudgePanel from '@/components/NudgePanel';
import WeekTracker from '@/components/WeekTracker';
import SkeletonLoader from '@/components/SkeletonLoader';
import type { GoalStatus, GoalType } from '@/types';

const GOALS_PER_PAGE = 6;

type SortKey = 'newest' | 'priority' | 'progress-asc' | 'progress-desc';

export default function GoalsPage() {
  const { goals, goalsLoaded, user } = useAppStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<GoalType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<GoalStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Filter + sort goals
  const filtered = useMemo(() => {
    let result = [...goals];
    if (filterType !== 'all') result = result.filter((g) => g.type === filterType);
    if (filterStatus !== 'all') result = result.filter((g) => g.status === filterStatus);
    switch (sortBy) {
      case 'priority':
        result.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
        break;
      case 'progress-asc':
        result.sort((a, b) => a.progress - b.progress);
        break;
      case 'progress-desc':
        result.sort((a, b) => b.progress - a.progress);
        break;
      case 'newest':
      default:
        // Already sorted by newest from backend
        break;
    }
    return result;
  }, [goals, filterType, filterStatus, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / GOALS_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(currentPage * GOALS_PER_PAGE, (currentPage + 1) * GOALS_PER_PAGE);

  const onTrack = goals.filter((g) => g.status === 'on-track').length;
  const atRisk = goals.filter((g) => g.status === 'at-risk' || g.status === 'behind').length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-10 bg-forge-surface border-b border-forge-border px-4 lg:px-10 py-5 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-forge-dim mb-1">// Your progress</p>
          <h2 className="font-display text-3xl lg:text-4xl tracking-widest text-forge-text">MY GOALS</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="forge-btn-ghost flex items-center gap-1.5 text-xs"
          >
            <Filter size={11} />
            <span className="hidden sm:inline">Filter</span>
          </button>
          <button onClick={() => setAddModalOpen(true)} className="forge-btn-primary flex items-center gap-2">
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">New Goal</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-10 py-8 flex flex-col gap-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: goals.length, color: 'text-forge-text' },
            { label: 'On Track', value: onTrack, color: 'text-green-400' },
            { label: 'At Risk', value: atRisk, color: 'text-amber-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-forge-surface border border-forge-border p-4 text-center">
              <div className={`font-display text-4xl ${stat.color} leading-none`}>{stat.value}</div>
              <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-forge-dim mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filters panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="border border-forge-border bg-forge-surface2/50 p-4 space-y-3">
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-forge-dim">Type</label>
                    <select
                      className="forge-input text-xs py-1"
                      value={filterType}
                      onChange={(e) => { setFilterType(e.target.value as GoalType | 'all'); setPage(0); }}
                    >
                      <option value="all">All Types</option>
                      <option value="learn">📚 Learning</option>
                      <option value="build">🔨 Build</option>
                      <option value="habit">🌱 Habit</option>
                      <option value="fitness">💪 Fitness</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-forge-dim">Status</label>
                    <select
                      className="forge-input text-xs py-1"
                      value={filterStatus}
                      onChange={(e) => { setFilterStatus(e.target.value as GoalStatus | 'all'); setPage(0); }}
                    >
                      <option value="all">All Statuses</option>
                      <option value="on-track">✓ On Track</option>
                      <option value="at-risk">⚠ At Risk</option>
                      <option value="behind">✗ Behind</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] uppercase tracking-wider text-forge-dim">Sort</label>
                    <select
                      className="forge-input text-xs py-1"
                      value={sortBy}
                      onChange={(e) => { setSortBy(e.target.value as SortKey); setPage(0); }}
                    >
                      <option value="newest">Newest First</option>
                      <option value="priority">Priority</option>
                      <option value="progress-asc">Progress (Low → High)</option>
                      <option value="progress-desc">Progress (High → Low)</option>
                    </select>
                  </div>
                </div>
                {(filterType !== 'all' || filterStatus !== 'all') && (
                  <p className="font-mono text-xs text-forge-amber">
                    Showing {filtered.length} of {goals.length} goals
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nudge */}
        <NudgePanel />

        {/* Week tracker */}
        <WeekTracker />

        {/* Goals */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-condensed font-black text-xl uppercase tracking-wider text-forge-text">Active Goals</h3>
            <button onClick={() => setAddModalOpen(true)} className="forge-btn-ghost flex items-center gap-1.5 text-xs">
              <Plus size={11} /> Add
            </button>
          </div>

          {!goalsLoaded ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonLoader key={i} />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border border-dashed border-forge-border text-center py-16"
            >
              <div className="text-4xl mb-3">⚒️</div>
              <p className="font-condensed font-bold text-lg uppercase tracking-wider text-forge-dim mb-2">No Goals Yet</p>
              <p className="font-mono text-[11px] text-forge-muted mb-5">"A goal without a plan is just a wish."</p>
              <button onClick={() => setAddModalOpen(true)} className="forge-btn-primary">
                Create Your First Goal
              </button>
            </motion.div>
          ) : filtered.length === 0 ? (
            <div className="border border-dashed border-forge-border text-center py-12">
              <p className="font-condensed font-bold text-base uppercase tracking-wider text-forge-dim mb-1">No goals match your filters</p>
              <button
                onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                className="font-mono text-xs text-forge-amber hover:text-forge-text transition-colors mt-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paged.map((goal, i) => (
                  <GoalCard key={goal.id} goal={goal} index={i} />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-forge-border">
                  <button
                    onClick={() => setPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-forge-dim hover:text-forge-amber disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-7 h-7 font-mono text-xs border transition-colors ${i === currentPage
                            ? 'border-forge-amber text-forge-amber bg-amber-500/10'
                            : 'border-forge-border text-forge-dim hover:border-forge-amber hover:text-forge-amber'
                          }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-forge-dim hover:text-forge-amber disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="border-t border-forge-border pt-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-forge-muted">
            FORGE — BUILD THE PERSON YOU NEED TO BE
          </p>
        </div>
      </div>

      <AddGoalModal open={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </div>
  );
}
