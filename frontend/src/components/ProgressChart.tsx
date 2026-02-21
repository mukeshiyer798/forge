import { cn } from '@/lib/utils';

export type ProgressPoint = { label: string; value: number };

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export default function ProgressChart({
  title,
  points,
  className,
}: {
  title: string;
  points: ProgressPoint[];
  className?: string;
}) {
  const safe = points.length ? points : [{ label: 'Now', value: 0 }];
  const max = Math.max(...safe.map((p) => p.value), 1);
  const w = 520;
  const h = 120;
  const pad = 14;

  const step = safe.length > 1 ? (w - pad * 2) / (safe.length - 1) : 0;
  const coords = safe.map((p, i) => {
    const x = pad + i * step;
    const y = pad + (1 - clamp01(p.value / max)) * (h - pad * 2);
    return { x, y, ...p };
  });
  const d = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ');

  return (
    <div className={cn('border border-forge-border bg-forge-surface p-5', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-condensed font-black text-base uppercase tracking-wider text-forge-text">{title}</h4>
        <span className="font-mono text-xs text-forge-dim">last {safe.length} checks</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]">
        <defs>
          <linearGradient id="forgeLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="rgb(245 158 11)" stopOpacity="0.2" />
            <stop offset="1" stopColor="rgb(245 158 11)" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#forgeLine)" strokeWidth="2.5" />
        {coords.map((c) => (
          <circle key={c.label} cx={c.x} cy={c.y} r="3.2" fill="rgb(245 158 11)" />
        ))}
      </svg>
      <div className="mt-3 flex justify-between gap-2">
        {safe.slice(0, 6).map((p) => (
          <div key={p.label} className="min-w-0">
            <div className="font-mono text-[11px] uppercase tracking-wider text-forge-muted truncate">{p.label}</div>
            <div className="font-mono text-xs text-forge-dim">{p.value}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

