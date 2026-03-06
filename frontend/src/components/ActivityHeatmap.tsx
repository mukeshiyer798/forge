import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

/** Format Date to YYYY-MM-DD in local timezone. */
function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function ActivityHeatmap() {
    const { goals } = useAppStore();
    const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

    // Get daily target
    const dailyTarget = useMemo(() => {
        const firstGoalWithTarget = goals.find(g => g.dailyTaskRequirement);
        return firstGoalWithTarget?.dailyTaskRequirement || 3;
    }, [goals]);

    // Active goals
    const activeGoals = useMemo(() => goals.filter(g => g.status !== 'paused'), [goals]);

    // Compute dates: 13 weeks (91 days), centered on current week
    const { gridDates, monthLabels, todayStr } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tStr = toLocalDateStr(today);

        // Find Monday of the current week
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const currentWeekMonday = new Date(today);
        currentWeekMonday.setDate(today.getDate() - daysToMonday);

        // Go back 6 weeks to start so Today's week is dead center of 13 weeks
        const startDate = new Date(currentWeekMonday);
        startDate.setDate(currentWeekMonday.getDate() - (6 * 7));

        const dates: { dateStr: string, isToday: boolean, dateObj: Date }[][] = [];
        const labels: { rowIdx: number, label: string }[] = [];

        let cursor = new Date(startDate);
        let lastMonth = -1;

        for (let row = 0; row < 13; row++) {
            const week: { dateStr: string, isToday: boolean, dateObj: Date }[] = [];
            for (let col = 0; col < 7; col++) {
                const dateStr = toLocalDateStr(cursor);
                const isToday = dateStr === tStr;
                const currentMonth = cursor.getMonth();

                // Add month label if month changes on first column, or if it's the very first row
                if (col === 0 && currentMonth !== lastMonth) {
                    if (row > 0 || lastMonth === -1) {
                        labels.push({
                            rowIdx: row,
                            label: cursor.toLocaleDateString(undefined, { month: 'short' })
                        });
                    }
                    lastMonth = currentMonth;
                }

                week.push({ dateStr, isToday, dateObj: new Date(cursor) });
                cursor.setDate(cursor.getDate() + 1);
            }
            dates.push(week);
        }

        return { gridDates: dates, monthLabels: labels, todayStr: tStr };
    }, []);

    // Activity count per day
    const dailyCounts = useMemo(() => {
        const counts = new Map<string, number>();
        gridDates.flat().forEach(d => counts.set(d.dateStr, 0));

        const increment = (iso: string) => {
            const k = toLocalDateStr(new Date(iso));
            if (counts.has(k)) {
                counts.set(k, counts.get(k)! + 1);
            }
        };

        for (const g of activeGoals) {
            if (g.topics) {
                for (const t of g.topics) {
                    for (const sub of t.subtopics || []) {
                        if (sub.completed && sub.completedAt) increment(sub.completedAt);
                    }
                    if (t.build?.completed && t.build.completedAt) increment(t.build.completedAt);
                }
            } else if (g.subtopics) {
                for (const sub of g.subtopics) {
                    if (sub.completed && sub.completedAt) increment(sub.completedAt);
                }
            }
        }
        return counts;
    }, [activeGoals, gridDates]);

    // Calculate "completed this week" stat
    const weeklyTasks = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const currentMonday = new Date(today);
        currentMonday.setDate(today.getDate() - daysToMonday);
        currentMonday.setHours(0, 0, 0, 0);

        const currentSunday = new Date(currentMonday);
        currentSunday.setDate(currentMonday.getDate() + 6);

        let total = 0;
        let cursor = new Date(currentMonday);
        while (cursor <= currentSunday) {
            const dateStr = toLocalDateStr(cursor);
            total += (dailyCounts.get(dateStr) || 0);
            cursor.setDate(cursor.getDate() + 1);
        }
        return total;
    }, [dailyCounts]);

    // Graph Colors mapped to User's reference gradient
    const getBarColor = (dateStr: string, count: number, isToday: boolean) => {
        if (isToday) return 'bg-white ring-1 ring-white/30 ring-offset-1 ring-offset-forge-surface/50';
        if (dateStr > todayStr) return 'bg-[#1a1a1a]'; // Future is darker grey
        if (count === 0) return 'bg-[#2a2a2a]';        // Past no work

        const ratio = count / dailyTarget;
        if (ratio <= 0.33) return 'bg-[#cb2006]';   // Dark Red
        if (ratio <= 0.66) return 'bg-[#fd5a00]';   // Orange
        if (ratio <= 0.99) return 'bg-[#ffa200]';   // Yellow
        return 'bg-[#ffd100]';                      // Bright Gold
    };

    return (
        <div className="bg-[#0b0b0b] border border-forge-border p-6 sm:p-10 relative flex flex-col items-center justify-center min-h-[600px] font-sans rounded-xl shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />

            {/* Header (Aligned with user's reference) */}
            <div className="flex flex-col items-center text-center mb-10 relative z-10 w-full max-w-sm">
                <span className="font-condensed font-bold text-forge-dim uppercase tracking-wider text-[11px] mb-2 selection:bg-forge-amber selection:text-black">
                    This Quarter
                </span>
                <h2 className="font-condensed font-black text-5xl sm:text-6xl text-forge-text tracking-tighter uppercase leading-[0.85] selection:bg-forge-amber selection:text-black">
                    Activity<br />Tracker
                </h2>
                <div className="mt-6 flex items-baseline justify-center">
                    <span className="font-display text-4xl text-[#ffd100]">{weeklyTasks}</span>
                    <span className="font-display text-xl text-forge-dim ml-2 font-bold uppercase tracking-wide">Tasks</span>
                </div>
                <span className="font-mono text-[10px] text-forge-dim mt-2 tracking-widest uppercase selection:bg-forge-amber selection:text-black">
                    Completed this week
                </span>
            </div>

            {/* Heatmap Grid */}
            <div className="flex w-full max-w-sm relative z-10 pl-6 pr-2">

                {/* Main Grid Area */}
                <div className="flex-1 flex flex-col relative w-full">
                    {/* Left axis (Months) placed absolutely relative to the grid container */}
                    {monthLabels.map((ml, i) => (
                        <span
                            key={`ml-${i}`}
                            className="font-mono text-[10px] text-forge-dim absolute -left-8"
                            style={{
                                // row height ~ aspect-square. we map % down the 13 rows.
                                top: `calc(${(ml.rowIdx / 13) * 100}% + 1.25rem)`, // offset for days header
                                transform: 'translateY(-25%)'
                            }}
                        >
                            {ml.label}
                        </span>
                    ))}

                    {/* Top axis (Days) */}
                    <div className="flex w-full mb-3 gap-1">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="flex-1 text-center font-mono text-[9px] text-forge-dim uppercase tracking-widest leading-none">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Matrix (13x7 squares) */}
                    <div className="flex flex-col gap-[3px] w-full">
                        {gridDates.map((week, rIdx) => (
                            <div key={rIdx} className="flex gap-[3px] w-full">
                                {week.map(day => {
                                    const count = dailyCounts.get(day.dateStr) || 0;
                                    const bgColor = getBarColor(day.dateStr, count, day.isToday);

                                    return (
                                        <div
                                            key={day.dateStr}
                                            className={`flex-1 aspect-square rounded-[2px] cursor-pointer transition-all duration-300 shadow-sm relative ${bgColor}`}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredDay({
                                                    date: day.dateStr,
                                                    count,
                                                    x: rect.left + rect.width / 2,
                                                    y: rect.top,
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredDay(null)}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {hoveredDay && (
                <div
                    className="fixed z-50 bg-[#111] border border-[#333] px-3 py-2 shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md"
                    style={{ left: hoveredDay.x, top: hoveredDay.y }}
                >
                    <p className="font-mono text-xs text-white font-bold">
                        {hoveredDay.count} task{hoveredDay.count === 1 ? '' : 's'}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 mt-0.5">
                        {hoveredDay.date === todayStr ? 'Today, ' : ''}
                        {new Date(hoveredDay.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                </div>
            )}
        </div>
    );
}
