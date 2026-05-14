import { Trophy, Clock, Dumbbell, TrendingUp, Check } from 'lucide-react';
import type { WorkoutLog, Exercise } from '@/types';
import { StatCard } from '@/shared/components/StatCard';
import { formatDuration, formatVolume } from '@/shared/utils/format';

interface WorkoutSummaryProps {
  workout: WorkoutLog;
  exerciseMap: Map<string, Exercise>;
  onDone: () => void;
}

export function WorkoutSummary({ workout, exerciseMap, onDone }: WorkoutSummaryProps) {
  const totalSets = workout.exercises.reduce(
    (count, e) => count + e.sets.filter((s) => s.completedAt).length,
    0
  );
  const totalReps = workout.exercises.reduce(
    (count, e) => count + e.sets.filter((s) => s.completedAt).reduce((r, s) => r + (s.reps ?? 0), 0),
    0
  );
  const prSets = workout.exercises.flatMap((e) =>
    e.sets.filter((s) => s.isPersonalRecord && s.completedAt)
  );

  return (
    <div className="min-h-svh bg-surface flex flex-col">
      {/* Header celebration */}
      <div className="flex flex-col items-center pt-12 pb-8 px-6">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
          <Check size={32} className="text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Workout Complete!</h1>
        <p className="text-sm text-text-secondary">{workout.name}</p>
      </div>

      {/* Stats grid */}
      <div className="px-6 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-2 gap-2 mb-6">
          <StatCard
            label="Duration"
            value={formatDuration(workout.duration)}
            className="!bg-surface-secondary"
          />
          <StatCard
            label="Volume"
            value={`${formatVolume(workout.totalVolume)} lbs`}
            className="!bg-surface-secondary"
          />
          <StatCard
            label="Sets"
            value={totalSets.toString()}
            sublabel={`${totalReps} total reps`}
            className="!bg-surface-secondary"
          />
          <StatCard
            label="Exercises"
            value={workout.exercises.length.toString()}
            className="!bg-surface-secondary"
          />
        </div>

        {/* PR badges */}
        {prSets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-1.5 mb-2">
              <Trophy size={14} className="text-warning" /> Personal Records
            </h2>
            <div className="space-y-1.5">
              {prSets.map((set) => {
                const exercise = exerciseMap.get(set.exerciseId);
                return (
                  <div
                    key={set.id}
                    className="flex items-center gap-2 p-2.5 bg-warning/5 border border-warning/20 rounded-xl"
                  >
                    <Trophy size={14} className="text-warning shrink-0" />
                    <span className="text-sm font-medium flex-1 truncate">
                      {exercise?.name ?? 'Exercise'}
                    </span>
                    <span className="text-sm font-bold text-warning">
                      {set.weight} × {set.reps}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exercise breakdown */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-text-secondary flex items-center gap-1.5 mb-2">
            <Dumbbell size={14} /> Exercises
          </h2>
          <div className="space-y-1.5">
            {workout.exercises.map((entry) => {
              const exercise = exerciseMap.get(entry.exerciseId);
              const completed = entry.sets.filter((s) => s.completedAt);
              const topSet = completed.reduce(
                (best, s) => (s.weight && s.weight > (best?.weight ?? 0) ? s : best),
                completed[0]
              );
              const volume = completed.reduce(
                (sum, s) => sum + (s.weight ?? 0) * (s.reps ?? 0),
                0
              );

              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-2.5 bg-surface-secondary rounded-xl"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {exercise?.name ?? 'Exercise'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {completed.length} sets · Top: {topSet?.weight ?? 0}×{topSet?.reps ?? 0}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-text-secondary">
                    {formatVolume(volume)} lbs
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Done button */}
        <button
          onClick={onDone}
          className="w-full py-3.5 bg-primary text-white rounded-xl font-semibold text-sm active:scale-[0.98] transition-transform mb-8"
        >
          Done
        </button>
      </div>
    </div>
  );
}
