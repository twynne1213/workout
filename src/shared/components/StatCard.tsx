import { cn } from '@/shared/utils/cn';

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  className?: string;
}

export function StatCard({ label, value, sublabel, className }: StatCardProps) {
  return (
    <div className={cn('bg-surface-secondary rounded-xl p-3', className)}>
      <p className="text-xs text-text-muted font-medium mb-0.5">{label}</p>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      {sublabel && <p className="text-xs text-text-secondary mt-0.5">{sublabel}</p>}
    </div>
  );
}
