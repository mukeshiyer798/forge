import { useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';

function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_GOALS = 7;

export default function WeeklyGoalTracker() {
    const { goals } = useAppStore();
    const [hoveredCell, setHoveredCell] = useState<{
        goalName: string; date: string; count: number; total: number; x: number; y: number;
    } | null>(null);

    const activeGoals = useMemo(() => goals.filter(g => g.status !== 'paused').slice(0, MAX_GOALS), [goals]);

    const { weekDates, todayStr, weekLabel } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tStr = toLocalDateStr(today);
        const dow = today.getDay();
        const toMon = dow === 0 ? 6 : dow - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - toMon);

        const dates: { dateStr: string; isToday: boolean; label: string; dayNum: number }[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const ds = toLocalDateStr(d);
            dates.push({ dateStr: ds, isToday: ds === tStr, label: DAY_LABELS[i], dayNum: d.getDate() });
        }

        const monLabel = monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const sunLabel = sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        return { weekDates: dates, todayStr: tStr, weekLabel: `${monLabel} – ${sunLabel}` };
    }, []);

    const { goalCounts, weekTotal } = useMemo(() => {
        const map = new Map<string, Map<string, number>>();
        let total = 0;

        for (const g of activeGoals) {
            const dayCounts = new Map<string, number>();
            weekDates.forEach(d => dayCounts.set(d.dateStr, 0));

            const inc = (iso: string) => {
                const k = toLocalDateStr(new Date(iso));
                if (dayCounts.has(k)) {
                    dayCounts.set(k, dayCounts.get(k)! + 1);
                    total++;
                }
            };

            if (g.topics) {
                for (const t of g.topics) {
                    for (const sub of t.subtopics || []) {
                        if (sub.completed && sub.completedAt) inc(sub.completedAt);
                    }
                    if (t.build?.completed && t.build.completedAt) inc(t.build.completedAt);
                }
            } else if (g.subtopics) {
                for (const sub of g.subtopics) {
                    if (sub.completed && sub.completedAt) inc(sub.completedAt);
                }
            }
            map.set(g.id, dayCounts);
        }
        return { goalCounts: map, weekTotal: total };
    }, [activeGoals, weekDates]);

    const goalSubtaskTotals = useMemo(() => {
        const map = new Map<string, number>();
        for (const g of activeGoals) {
            let count = 0;
            if (g.topics) {
                for (const t of g.topics) {
                    count += (t.subtopics?.length || 0) + (t.build ? 1 : 0);
                }
            } else if (g.subtopics) {
                count = g.subtopics.length;
            }
            map.set(g.id, count);
        }
        return map;
    }, [activeGoals]);

    const getCellColor = (dateStr: string, count: number): string => {
        if (dateStr > todayStr) return '#141414';
        if (count === 0) return '#1e1e1e';
        if (count === 1) return '#cb2006';
        if (count === 2) return '#fd5a00';
        if (count === 3) return '#ffa200';
        return '#ffd100';
    };

    const getCellGlow = (dateStr: string, count: number): string => {
        if (dateStr > todayStr || count === 0) return 'none';
        if (count === 1) return 'inset 0 0 6px rgba(203,32,6,0.25)';
        if (count === 2) return 'inset 0 0 6px rgba(253,90,0,0.25)';
        if (count === 3) return 'inset 0 0 8px rgba(255,162,0,0.3)';
        return 'inset 0 0 8px rgba(255,209,0,0.35)';
    };

    const emptyRows = Math.max(0, MAX_GOALS - activeGoals.length);

    // Build rows: empty placeholders at top, active goals at bottom
    const rows: { id: string; name: string; isActive: boolean }[] = [];
    for (let i = 0; i < emptyRows; i++) {
        rows.push({ id: `empty-${i}`, name: '', isActive: false });
    }
    for (const g of activeGoals) {
        rows.push({ id: g.id, name: g.name, isActive: true });
    }

    // Legend at bottom maps row numbers to goal names

    return (
        <div style={{
            background: '#0b0b0b',
            border: '1px solid rgb(var(--forge-border))',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px', flexShrink: 0 }}>
                <h3 style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 900,
                    fontSize: '18px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'rgb(var(--forge-text))',
                    margin: 0,
                }}>
                    Weekly Goals
                </h3>
                {weekTotal > 0 && (
                    <span style={{
                        fontFamily: '"DM Mono", monospace',
                        fontSize: '11px',
                        color: '#ffd100',
                        fontWeight: 700,
                    }}>
                        {weekTotal} done
                    </span>
                )}
            </div>

            {/* Week range */}
            <div style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                color: 'rgb(var(--forge-muted))',
                marginBottom: '16px',
                flexShrink: 0,
            }}>
                {weekLabel}
            </div>

            {/* The grid area — fills remaining space */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                overflow: 'hidden',
                minHeight: 0,
            }}>
                {/* Day labels row — offset left to account for row label column */}
                <div style={{
                    display: 'flex',
                    marginBottom: '6px',
                }}>
                    {/* Spacer for row labels column */}
                    <div style={{ width: '14px', flexShrink: 0 }} />
                    <div style={{
                        flex: 1,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '3px',
                    }}>
                        {weekDates.map((d, i) => (
                            <div key={i} style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontFamily: '"DM Mono", monospace',
                                    fontSize: '10px',
                                    color: d.isToday ? '#fff' : '#555',
                                    fontWeight: d.isToday ? 700 : 400,
                                    textTransform: 'uppercase',
                                    lineHeight: 1,
                                }}>
                                    {d.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Rows: each row = [label column] + [7 cells] */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    flex: 1,
                    minHeight: 0,
                }}>
                    {rows.map((row) => (
                        <div key={row.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0px',
                            flex: 1,
                            minHeight: 0,
                        }}>
                            {/* Row label */}
                            <div style={{
                                width: '14px',
                                flexShrink: 0,
                                fontFamily: '"DM Mono", monospace',
                                fontSize: '9px',
                                color: row.isActive ? '#666' : 'transparent',
                                textAlign: 'right',
                                paddingRight: '4px',
                                lineHeight: 1,
                            }}>
                                {row.isActive ? (activeGoals.findIndex(g => g.id === row.id) + 1) : ''}
                            </div>

                            {/* 7 cells */}
                            <div style={{
                                flex: 1,
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                gap: '3px',
                                height: '100%',
                            }}>
                                {weekDates.map(d => {
                                    if (!row.isActive) {
                                        return (
                                            <div key={d.dateStr} style={{
                                                backgroundColor: '#111',
                                                borderRadius: '3px',
                                                width: '100%',
                                                height: '100%',
                                            }} />
                                        );
                                    }

                                    const count = goalCounts.get(row.id)?.get(d.dateStr) || 0;
                                    const color = getCellColor(d.dateStr, count);
                                    const glow = getCellGlow(d.dateStr, count);
                                    const totalSubs = goalSubtaskTotals.get(row.id) || 0;

                                    return (
                                        <div
                                            key={d.dateStr}
                                            style={{
                                                backgroundColor: color,
                                                borderRadius: '3px',
                                                cursor: d.dateStr > todayStr ? 'default' : 'pointer',
                                                transition: 'background-color 0.3s, box-shadow 0.3s',
                                                border: d.isToday ? '2px solid rgba(255,255,255,0.5)' : 'none',
                                                boxSizing: 'border-box',
                                                boxShadow: glow,
                                                width: '100%',
                                                height: '100%',
                                            }}
                                            onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setHoveredCell({
                                                    goalName: row.name, date: d.dateStr, count,
                                                    total: totalSubs,
                                                    x: rect.left + rect.width / 2, y: rect.top,
                                                });
                                            }}
                                            onMouseLeave={() => setHoveredCell(null)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Numbered Legend */}
            {activeGoals.length > 0 && (
                <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    flexShrink: 0,
                }}>
                    {activeGoals.map((g, i) => (
                        <div key={g.id} style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            gap: '8px',
                        }}>
                            <span style={{
                                fontFamily: '"DM Mono", monospace',
                                fontSize: '9px',
                                color: '#ffd100',
                                fontWeight: 'bold',
                                width: '10px',
                                textAlign: 'right',
                                flexShrink: 0,
                            }}>
                                {i + 1}
                            </span>
                            <span style={{
                                fontFamily: '"Barlow Condensed", sans-serif',
                                fontSize: '13px',
                                color: 'rgb(var(--forge-dim))',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {g.name}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Tooltip */}
            {hoveredCell && (
                <div style={{
                    position: 'fixed', zIndex: 50,
                    background: 'rgba(10,10,10,0.95)',
                    border: '1px solid #333',
                    padding: '8px 12px', borderRadius: '6px', pointerEvents: 'none',
                    transform: 'translate(-50%, calc(-100% - 10px))',
                    left: hoveredCell.x, top: hoveredCell.y, whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}>
                    <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '12px', color: '#ffd100', margin: 0, marginBottom: '3px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {hoveredCell.goalName}
                    </p>
                    <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '13px', color: '#fff', fontWeight: 700, margin: 0 }}>
                        {hoveredCell.count} / {hoveredCell.total} subtasks
                    </p>
                    <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', color: '#555', margin: 0, marginTop: '3px' }}>
                        {hoveredCell.date === todayStr ? 'Today' : new Date(hoveredCell.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                </div>
            )}
        </div>
    );
}
