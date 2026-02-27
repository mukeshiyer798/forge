import type React from 'react';
import { cn } from '@/lib/utils';

export default function MetricsCard({
  label,
  value,
  hint,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'risk';
}) {
  const toneCls =
    tone === 'good'
      ? 'border-green-900/40 bg-green-950/10'
      : tone === 'warn'
        ? 'border-amber-900/40 bg-amber-950/10'
        : tone === 'risk'
          ? 'border-red-900/40 bg-red-950/10'
          : 'border-forge-border bg-forge-surface';

  return (
    <div className={cn('border p-5 relative overflow-hidden', toneCls)}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] uppercase tracking-[0.2em] text-forge-dim">{label}</p>
          <div className="font-display text-4xl text-forge-text leading-none mt-2">{value}</div>
          {hint && <p className="font-mono text-sm text-forge-muted mt-2">{hint}</p>}
        </div>
        {icon ? <div className="text-forge-amber opacity-90">{icon}</div> : null}
      </div>
    </div>
  );
}

