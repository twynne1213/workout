import { Play, Check, Target } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { StagedWorkout } from '@/types';

interface StagedWorkoutCardProps {
  staged: StagedWorkout;
  onStart: () => void;
  accentColor: string;   // 'primary' | 'success' | 'warning'
}

export function StagedWorkoutCard({ staged, onStart, accentColor }: StagedWorkoutCardProps) {
  const isDone = staged.status === 'completed';
  const isSkipped = staged.status === 'skipped';

  if (isDone || isSkipped) {
    return (
      <div className="flex items-center gap-3 p-3 bg-surface-secondary/50 rounded-xl opacity-60">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <Check size={18} className="text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate line-through">{staged.title}</p>
          <p className="text-xs text-text-muted">{isDone ? 'Completed' : 'Skipped'}</p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      className={cn(
        'w-full flex items-center gap-3 p-4 rounded-2xl text-left active:scale-[0.99] transition-all',
        `bg-${accentColor}/5 border border-${accentColor}/20`
      )}
    >
      <div className={cn(
        'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
        `bg-${accentColor}`
      )}>
        <Play size={22} className="text-white ml-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Today's Plan</p>
        <p className="text-sm font-semibold truncate">{staged.title}</p>
        {staged.description && (
          <p className="text-xs text-text-secondary mt-0.5 truncate">{staged.description}</p>
        )}
        {staged.linkedGoalId && (
          <p className="text-[10px] text-primary/70 mt-0.5 flex items-center gap-0.5">
            <Target size={8} /> Working toward goal
          </p>
        )}
      </div>
      {staged.estimatedMinutes && (
        <span className="text-xs text-text-muted shrink-0">~{staged.estimatedMinutes}m</span>
      )}
    </button>
  );
}
