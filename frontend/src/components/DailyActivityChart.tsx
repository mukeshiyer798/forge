import { useMemo, useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

function toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lerpColor(a: string, b: string, t: number): string {
    const ah = parseInt(a.replace('#', ''), 16);
    const bh = parseInt(b.replace('#', ''), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg_ = (bh >> 8) & 0xff, bb = bh & 0xff;
    const rr = Math.round(ar + (br - ar) * t);
    const rg = Math.round(ag + (bg_ - ag) * t);
    const rb = Math.round(ab + (bb - ab) * t);
    return `#${((rr << 16) | (rg << 8) | rb).toString(16).padStart(6, '0')}`;
}

export default function DailyActivityChart() {
    const { goals } = useAppStore();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

    const dailyTarget = useMemo(() => {
        const g = goals.find(g => g.dailyTaskRequirement);
        return g?.dailyTaskRequirement || 3;
    }, [goals]);

    const activeGoals = useMemo(() => goals.filter(g => g.status !== 'paused'), [goals]);

    const { dates, todayStr, todayIdx, monthMarkers } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tStr = toLocalDateStr(today);

        let earliest = new Date(today);
        for (const g of activeGoals) {
            if (g.createdAt) {
                const d = new Date(g.createdAt);
                d.setHours(0, 0, 0, 0);
                if (d < earliest) earliest = d;
            }
        }

        const minStart = new Date(today);
        minStart.setDate(minStart.getDate() - 45);
        if (earliest > minStart) earliest = minStart;

        const end = new Date(today);
        end.setDate(end.getDate() + 45);

        const result: string[] = [];
        const markers: { idx: number; label: string }[] = [];
        const cursor = new Date(earliest);
        let lastMonth = -1;

        while (cursor <= end) {
            const ds = toLocalDateStr(cursor);
            result.push(ds);

            // Mark first day of each month for labels
            if (cursor.getMonth() !== lastMonth) {
                lastMonth = cursor.getMonth();
                markers.push({
                    idx: result.length - 1,
                    label: cursor.toLocaleDateString(undefined, { month: 'short' }),
                });
            }

            cursor.setDate(cursor.getDate() + 1);
        }

        const idx = result.indexOf(tStr);
        return { dates: result, todayStr: tStr, todayIdx: idx, monthMarkers: markers };
    }, [activeGoals]);

    const { dailyCounts, maxCount, todayCount } = useMemo(() => {
        const counts = new Map<string, number>();
        dates.forEach(d => counts.set(d, 0));
        let currentMax = dailyTarget;

        const increment = (iso: string) => {
            const k = toLocalDateStr(new Date(iso));
            if (counts.has(k)) {
                const v = counts.get(k)! + 1;
                counts.set(k, v);
                if (k <= todayStr && v > currentMax) currentMax = v;
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

        return { dailyCounts: counts, maxCount: currentMax, todayCount: counts.get(todayStr) || 0 };
    }, [activeGoals, dates, dailyTarget, todayStr]);

    // Auto-scroll to center today
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollRef.current && todayIdx !== -1) {
                const barW = 24;
                const pos = (todayIdx * barW) - (scrollRef.current.clientWidth / 2);
                scrollRef.current.scrollTo({ left: Math.max(0, pos), behavior: 'smooth' });
            }
        }, 150);
        return () => clearTimeout(timer);
    }, [todayIdx]);

    const toGoalText = useMemo(() => {
        const left = dailyTarget - todayCount;
        if (left <= 0) return 'GOAL CRUSHED';
        return `${left} to goal`;
    }, [dailyTarget, todayCount]);

    return (
        <div style={{
            background: 'rgb(var(--forge-surface))',
            border: '1px solid rgb(var(--forge-border))',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
        }}>
            {/* Subtle gradient overlay */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(to top, rgba(255,209,0,0.03), transparent)',
                pointerEvents: 'none', borderRadius: '0 0 12px 12px',
            }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
                <h3 style={{
                    fontFamily: '"Barlow Condensed", sans-serif',
                    fontWeight: 900,
                    fontSize: '18px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'rgb(var(--forge-text))',
                    margin: 0,
                }}>
                    Monthly Tracker
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{
                        fontFamily: '"Barlow Condensed", sans-serif',
                        fontSize: '32px',
                        fontWeight: 900,
                        color: 'rgb(var(--forge-text))',
                        lineHeight: 0.9,
                    }}>
                        {todayCount}
                    </span>
                    <span style={{
                        fontFamily: '"DM Mono", monospace',
                        fontSize: '10px',
                        color: todayCount >= dailyTarget ? '#ffd100' : 'rgb(var(--forge-dim))',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        {toGoalText}
                    </span>
                </div>
            </div>

            {/* Date subtitle */}
            <div style={{
                fontFamily: '"DM Mono", monospace',
                fontSize: '10px',
                color: 'rgb(var(--forge-muted))',
                marginBottom: '14px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1,
            }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>

            {/* Bar chart */}
            <div ref={scrollRef} style={{
                flex: 1,
                width: '100%',
                position: 'relative',
                overflowX: 'auto',
                overflowY: 'hidden',
                zIndex: 1,
            }}>
                <div style={{
                    display: 'flex',
                    gap: '0px',
                    alignItems: 'flex-end',
                    height: 'calc(100% - 18px)', // leave room for month labels
                    position: 'relative',
                    width: 'max-content',
                    minWidth: '100%',
                }}>
                    {dates.map((dateStr, i) => {
                        const count = dailyCounts.get(dateStr) || 0;
                        const isToday = dateStr === todayStr;
                        const isFuture = dateStr > todayStr;
                        const daysFromToday = i - todayIdx;

                        // Height
                        let heightPct: number;
                        if (isToday) {
                            heightPct = count > 0 ? Math.max(90, (count / maxCount) * 100) : 90;
                        } else if (isFuture) {
                            heightPct = Math.max(25, 80 - daysFromToday * 1.5);
                        } else {
                            if (count === 0) {
                                // Gradual curve getting taller near today
                                heightPct = 30 + Math.max(0, 25 - Math.abs(daysFromToday)) * 1.8;
                            } else {
                                heightPct = Math.max(50, (count / maxCount) * 100);
                            }
                        }

                        // Color
                        let color: string;
                        let shadow = 'none';
                        if (isToday) {
                            color = '#ffffff';
                            shadow = '0 0 16px rgba(255,255,255,0.4), 0 0 4px rgba(255,255,255,0.8)';
                        } else if (isFuture) {
                            const fade = Math.min(daysFromToday / 35, 1);
                            color = lerpColor('#2a2a2a', '#161616', fade);
                        } else {
                            const daysBefore = Math.abs(daysFromToday);
                            if (count === 0) {
                                color = lerpColor('#2a2a2a', '#1e1e1e', Math.min(daysBefore / 30, 1));
                            } else {
                                // Gradient: far=gold, mid=orange, near=red-orange
                                const ratio = count / dailyTarget;
                                const timeT = Math.min(daysBefore / 25, 1); // 0=near today, 1=far past
                                const baseColor = ratio >= 1 ? '#ffd100' : ratio >= 0.66 ? '#ffa200' : ratio >= 0.33 ? '#fd5a00' : '#cb2006';
                                // Shift toward yellow/gold for farther past days
                                color = timeT > 0.5 ? lerpColor(baseColor, '#ffd100', (timeT - 0.5) * 0.6) : baseColor;
                                shadow = `0 0 ${4 + ratio * 6}px ${color}33`;
                            }
                        }

                        // Check if this bar has a month marker
                        const marker = monthMarkers.find(m => m.idx === i);

                        return (
                            <div
                                key={dateStr}
                                style={{
                                    flex: '1 0 22px',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    padding: '0 1px',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        width: '100%',
                                        height: `${heightPct}%`,
                                        backgroundColor: color,
                                        borderRadius: '2px 2px 0 0',
                                        cursor: 'pointer',
                                        transition: 'height 0.6s cubic-bezier(0.16,1,0.3,1), background-color 0.3s ease',
                                        boxShadow: shadow,
                                        position: 'relative',
                                    }}
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setHoveredDay({ date: dateStr, count, x: rect.left + rect.width / 2, y: rect.top });
                                    }}
                                    onMouseLeave={() => setHoveredDay(null)}
                                />
                                {/* Month label */}
                                {marker && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '-16px',
                                        left: '0',
                                        fontFamily: '"DM Mono", monospace',
                                        fontSize: '9px',
                                        color: '#444',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.1em',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {marker.label}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tooltip */}
            {hoveredDay && (
                <div style={{
                    position: 'fixed', zIndex: 50,
                    background: 'rgba(10,10,10,0.95)',
                    border: '1px solid #333',
                    padding: '8px 12px', borderRadius: '6px', pointerEvents: 'none',
                    transform: 'translate(-50%, calc(-100% - 10px))',
                    left: hoveredDay.x, top: hoveredDay.y, whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}>
                    <p style={{ fontFamily: '"Barlow Condensed", sans-serif', fontSize: '22px', color: '#fff', fontWeight: 900, margin: 0, lineHeight: 1 }}>
                        {hoveredDay.count}
                    </p>
                    <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '10px', color: hoveredDay.count > 0 ? '#ffd100' : '#666', margin: 0, marginTop: '2px', fontWeight: 600 }}>
                        {hoveredDay.count === 1 ? '1 task completed' : `${hoveredDay.count} tasks completed`}
                    </p>
                    <p style={{ fontFamily: '"DM Mono", monospace', fontSize: '9px', color: '#555', margin: 0, marginTop: '4px' }}>
                        {hoveredDay.date === todayStr ? 'Today · ' : ''}
                        {new Date(hoveredDay.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                </div>
            )}
        </div>
    );
}
