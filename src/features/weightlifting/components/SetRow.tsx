import { Check, Trophy } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { WorkoutSet } from '@/types';
import type { PreviousSetData } from '@/features/weightlifting/hooks/useExerciseHistory';

interface SetRowProps {
  set: WorkoutSet;
  previousSet?: PreviousSetData;
  isNewPR?: boolean;
  onUpdate: (updates: Partial<WorkoutSet>) => void;
  onComplete: () => void;
}

export function SetRow({ set, previousSet, isNewPR, onUpdate, onComplete }: SetRowProps) {
  const isComplete = set.completedAt !== null;

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-1.5 transition-colors',
        isComplete && !isNewPR && 'opacity-60',
        isNewPR && isComplete && 'bg-warning/5 rounded-lg -mx-1 px-1'
      )}
    >
      {/* Set number / PR badge */}
      <span className="w-6 text-center">
        {isNewPR && isComplete ? (
          <Trophy size={14} className="text-warning mx-auto" />
        ) : (
          <span className="text-xs font-medium text-text-muted">{set.setNumber}</span>
        )}
      </span>

      {/* Previous */}
      <span className="w-16 text-center text-xs text-text-muted">
        {previousSet && previousSet.weight
          ? `${previousSet.weight}×${previousSet.reps}`
          : '—'}
      </span>

      {/* Weight input */}
      <input
        type="number"
        placeholder={previousSet?.weight?.toString() ?? '0'}
        value={set.weight ?? ''}
        onChange={(e) => onUpdate({ weight: e.target.value ? Number(e.target.value) : null })}
        className="w-16 text-center text-sm font-medium bg-surface-secondary rounded-lg py-1.5 border border-transparent focus:border-primary focus:outline-none transition-colors"
        disabled={isComplete}
      />

      {/* Reps input */}
      <input
        type="number"
        placeholder={previousSet?.reps?.toString() ?? '0'}
        value={set.reps ?? ''}
        onChange={(e) => onUpdate({ reps: e.target.value ? Number(e.target.value) : null })}
        className="w-14 text-center text-sm font-medium bg-surface-secondary rounded-lg py-1.5 border border-transparent focus:border-primary focus:outline-none transition-colors"
        disabled={isComplete}
      />

      {/* Complete button */}
      <button
        onClick={onComplete}
        disabled={isComplete}
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
          isComplete
            ? isNewPR
              ? 'bg-warning text-white'
              : 'bg-success text-white'
            : 'bg-surface-secondary text-text-muted hover:bg-primary/10 hover:text-primary'
        )}
      >
        <Check size={16} />
      </button>
    </div>
  );
}
