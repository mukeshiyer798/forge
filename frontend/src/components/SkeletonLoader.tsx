import { cn } from '@/lib/utils';

export default function SkeletonLoader({
  className,
  lines = 3,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn('forge-card p-6 animate-pulse', className)} aria-label="Loading">
      {/* Top row: badge + status dot */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-20 bg-forge-surface2 border border-forge-border rounded-sm" />
        <div className="w-2.5 h-2.5 rounded-full bg-forge-surface2 border border-forge-border" />
      </div>
      {/* Title */}
      <div className="h-5 bg-forge-surface2 border border-forge-border mb-2 w-3/4" />
      {/* Subtitle */}
      <div className="h-3 bg-forge-surface2 border border-forge-border mb-4 w-2/3" />
      {/* Progress bar */}
      <div className="h-[3px] bg-forge-surface2 border border-forge-border mb-4 w-full" />
      {/* Topic lines */}
      {Array.from({ length: Math.max(0, lines) }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-9 bg-forge-surface2/50 border border-forge-border mb-2 rounded-sm',
            i % 2 === 0 ? 'w-full' : 'w-11/12'
          )}
        />
      ))}
    </div>
  );
}
